import {
  PdfUploadPackage,
  UploadStatus,
  UploadResponse,
  ProcessingResult,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  ApiError
} from '../types/pdfTypes';
import { TaskType, TaskStatus, TaskActionType, TaskCategory } from '../types';

export class UploadManager {
  private retryConfig: RetryConfig;
  private activeUploads: Map<string, AbortController> = new Map();
  private statusPollers: Map<string, NodeJS.Timeout> = new Map();
  private backendResponses: Map<string, any> = new Map();

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Uploads a PDF package to the backend
   */
  async uploadPdf(
    uploadPackage: PdfUploadPackage,
    onProgress?: (status: UploadStatus) => void
  ): Promise<UploadResponse> {
    const uploadId = uploadPackage.uploadMetadata.uploadId;
    
    // Create abort controller for this upload
    const abortController = new AbortController();
    this.activeUploads.set(uploadId, abortController);

    try {
      onProgress?.({
        uploadId,
        status: 'uploading',
        progress: 0,
        message: 'Starting upload...',
      });

      const response = await this.uploadWithRetry(uploadPackage, abortController.signal, onProgress);
      
      // Start status polling if upload was successful
      if (response.success && onProgress) {
        this.startStatusPolling(uploadId, onProgress);
      }

      return response;
    } catch (error) {
      this.cleanup(uploadId);
      throw error;
    }
  }

  /**
   * Polls upload status until completion
   */
  async pollStatus(uploadId: string): Promise<UploadStatus> {
    try {
      // In a real implementation, this would call the backend API
      // For now, we'll simulate the API response
      const response = await this.simulateStatusCheck(uploadId);
      return response;
    } catch (error) {
      throw new Error(`Failed to get status for upload ${uploadId}: ${error}`);
    }
  }

  /**
   * Starts automatic status polling
   */
  startStatusPolling(uploadId: string, onStatusUpdate: (status: UploadStatus) => void): void {
    // Clear any existing poller
    this.stopStatusPolling(uploadId);

    const poll = async () => {
      try {
        const status = await this.pollStatus(uploadId);
        onStatusUpdate(status);

        // Continue polling if still processing
        if (status.status === 'processing' || status.status === 'uploading') {
          const timeout = setTimeout(poll, 2000); // Poll every 2 seconds
          this.statusPollers.set(uploadId, timeout);
        } else {
          // Upload completed or failed, cleanup
          this.cleanup(uploadId);
        }
      } catch (error) {
        onStatusUpdate({
          uploadId,
          status: 'failed',
          progress: 0,
          message: 'Failed to check status',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        this.cleanup(uploadId);
      }
    };

    // Start polling after a short delay
    const timeout = setTimeout(poll, 1000);
    this.statusPollers.set(uploadId, timeout);
  }

  /**
   * Stops status polling for an upload
   */
  stopStatusPolling(uploadId: string): void {
    const timeout = this.statusPollers.get(uploadId);
    if (timeout) {
      clearTimeout(timeout);
      this.statusPollers.delete(uploadId);
    }
  }

  /**
   * Cancels an active upload
   */
  cancelUpload(uploadId: string): void {
    const abortController = this.activeUploads.get(uploadId);
    if (abortController) {
      abortController.abort();
    }
    this.cleanup(uploadId);
  }

  /**
   * Retries a failed upload
   */
  async retryUpload(
    uploadPackage: PdfUploadPackage,
    onProgress?: (status: UploadStatus) => void
  ): Promise<UploadResponse> {
    // Generate new upload ID for retry
    const newUploadId = crypto.randomUUID();
    const retryPackage = {
      ...uploadPackage,
      uploadMetadata: {
        ...uploadPackage.uploadMetadata,
        uploadId: newUploadId,
        timestamp: new Date().toISOString(),
      },
    };

    return this.uploadPdf(retryPackage, onProgress);
  }

  /**
   * Gets all active uploads
   */
  getActiveUploads(): string[] {
    return Array.from(this.activeUploads.keys());
  }

  /**
   * Cleans up resources for an upload
   */
  private cleanup(uploadId: string): void {
    this.activeUploads.delete(uploadId);
    this.stopStatusPolling(uploadId);
  }

  /**
   * Uploads with retry logic
   */
  private async uploadWithRetry(
    uploadPackage: PdfUploadPackage,
    signal: AbortSignal,
    onProgress?: (status: UploadStatus) => void
  ): Promise<UploadResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        if (signal.aborted) {
          throw new Error('Upload cancelled');
        }

        onProgress?.({
          uploadId: uploadPackage.uploadMetadata.uploadId,
          status: 'uploading',
          progress: Math.min((attempt - 1) * 10, 30),
          message: attempt === 1 ? 'Uploading...' : `Retry attempt ${attempt}...`,
        });

        const response = await this.performUpload(uploadPackage, signal, onProgress);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (signal.aborted || attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1),
          this.retryConfig.maxDelay
        );
        
        onProgress?.({
          uploadId: uploadPackage.uploadMetadata.uploadId,
          status: 'uploading',
          progress: attempt * 10,
          message: `Retrying in ${Math.round(delay / 1000)} seconds...`,
        });

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Upload failed after all retry attempts');
  }

  /**
   * Performs the actual upload to the backend API
   */
  private async performUpload(
    uploadPackage: PdfUploadPackage,
    signal: AbortSignal,
    onProgress?: (status: UploadStatus) => void
  ): Promise<UploadResponse> {
    const uploadId = uploadPackage.uploadMetadata.uploadId;
    
    try {
      // Convert Base64 back to File for FormData
      const base64Data = uploadPackage.fileData.base64Content;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: uploadPackage.fileData.mimeType });
      const file = new File([blob], uploadPackage.uploadMetadata.fileName, {
        type: uploadPackage.fileData.mimeType,
      });

      // Create FormData for the Python backend
      const formData = new FormData();
      formData.append('pdf_file', file);

      onProgress?.({
        uploadId,
        status: 'uploading',
        progress: 30,
        message: 'Uploading to server...',
      });

      // Make the actual API call to Python backend
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
        signal,
      });

      onProgress?.({
        uploadId,
        status: 'uploading',
        progress: 70,
        message: 'Processing response...',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      onProgress?.({
        uploadId,
        status: 'processing',
        progress: 100,
        message: 'Upload complete, processing...',
      });

      // Store the backend response for status polling
      this.storeBackendResponse(uploadId, result);

      return {
        success: true,
        uploadId,
        status: 'processing',
        estimatedTime: '10-30 seconds',
        statusUrl: `/api/pdf/status/${uploadId}`,
      };

    } catch (error) {
      if (signal.aborted) {
        throw new Error('Upload cancelled');
      }
      
      // Handle network errors gracefully
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to backend server. Please ensure the Python backend is running on http://localhost:5000');
      }
      
      throw error;
    }
  }

  /**
   * Processes backend response and returns status
   */
  private async simulateStatusCheck(uploadId: string): Promise<UploadStatus> {
    const backendResponse = this.backendResponses.get(uploadId);
    
    if (!backendResponse) {
      return {
        uploadId,
        status: 'processing',
        progress: 50,
        message: 'Processing PDF...',
      };
    }

    // Process the backend response immediately since it's already complete
    try {
      const processedResult = this.processBackendResponse(backendResponse);
      
      return {
        uploadId,
        status: 'completed',
        progress: 100,
        message: 'Processing complete!',
        result: processedResult,
      };
    } catch (error) {
      return {
        uploadId,
        status: 'failed',
        progress: 0,
        message: 'Failed to process backend response',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Creates mock processing result for demo
   */
  private createMockProcessingResult(): ProcessingResult {
    return {
      tasks: [], // Would be populated with extracted tasks
      emergencyInfo: {
        warningSignsTitle: 'When to Call 911',
        warningSignsDescription: 'Call emergency services immediately if you experience:',
        warningSignsList: [
          'Severe chest pain or pressure',
          'Difficulty breathing or shortness of breath',
          'Excessive bleeding from procedure site',
          'Signs of infection (fever, chills, redness)',
        ],
        emergencyContact: {
          name: 'Emergency Services',
          phone: '911',
          relationship: 'emergency',
        },
        doctorContact: {
          name: 'Dr. Smith',
          phone: '(555) 987-6543',
          specialty: 'Cardiology',
        },
      },
      medications: [],
      restrictions: [],
      confidence: 0.92,
      processingTime: 8500,
    };
  }

  /**
   * Stores backend response for later processing
   */
  private storeBackendResponse(uploadId: string, response: any): void {
    this.backendResponses.set(uploadId, response);
  }

  /**
   * Processes backend response and converts to frontend format
   */
  private processBackendResponse(backendResponse: any): ProcessingResult {
    // Handle both AI and rule-based backend responses
    let timeFrames: any[] = [];
    
    if (backendResponse.parsed?.content?.[0]?.text) {
      // AI backend response format
      try {
        const parsedContent = JSON.parse(backendResponse.parsed.content[0].text);
        timeFrames = parsedContent.time_frames || [];
      } catch (error) {
        console.warn('Failed to parse AI backend response:', error);
        timeFrames = [];
      }
    } else if (backendResponse.time_frames) {
      // Rule-based backend response format
      timeFrames = backendResponse.time_frames;
    }

    // Convert backend time_frames to frontend tasks
    const tasks = timeFrames.map((frame: any, index: number) => ({
      id: `task-${index + 1}`,
      type: this.mapFrameTypeToTaskType(frame.type),
      title: this.generateTaskTitle(frame),
      description: frame.message || '',
      status: TaskStatus.PENDING,
      scheduledTime: this.calculateScheduledTime(frame),
      estimatedDuration: 15, // Default 15 minutes
      actionType: frame.type === 1 ? TaskActionType.DO_NOT : TaskActionType.DO,
      category: this.mapFrameTypeToCategory(frame.type),
      instructions: [frame.message || ''],
      reminders: [],
      dependencies: [],
      metadata: {
        confidence: 0.8,
        source: 'pdf_extraction',
        pageNumber: 1,
        originalText: frame.message,
      },
    }));

    // Create restrictions from DO_NOT tasks
    const restrictions = timeFrames
      .filter((frame: any) => frame.type === 1)
      .map((frame: any, index: number) => ({
        id: `restriction-${index + 1}`,
        type: 'activity' as const,
        description: frame.message || '',
        duration: this.formatDuration(frame.time, frame.unit),
        severity: 'moderate' as const,
        consequences: 'May interfere with recovery process',
      }));

    return {
      tasks,
      emergencyInfo: this.createMockProcessingResult().emergencyInfo,
      medications: [],
      restrictions,
      confidence: 0.85,
      processingTime: 2000,
    };
  }

  /**
   * Maps backend frame type to frontend task type
   */
  private mapFrameTypeToTaskType(type: number): TaskType {
    return type === 1 ? TaskType.ACTIVITY_RESTRICTION : TaskType.MEDICATION;
  }

  /**
   * Maps backend frame type to frontend category
   */
  private mapFrameTypeToCategory(type: number): TaskCategory {
    return type === 1 ? TaskCategory.IMMEDIATE : TaskCategory.SHORT_TERM;
  }

  /**
   * Formats duration from time and unit
   */
  private formatDuration(time: number, unit: string): string {
    if (!time || !unit) return 'As needed';
    return `${time} ${unit}${time > 1 ? 's' : ''}`;
  }

  /**
   * Generates a task title from the frame data
   */
  private generateTaskTitle(frame: any): string {
    const message = frame.message || '';
    if (message.length > 50) {
      return message.substring(0, 47) + '...';
    }
    return message || 'Care Task';
  }

  /**
   * Calculates scheduled time based on frame data
   */
  private calculateScheduledTime(frame: any): Date {
    const now = new Date();
    if (frame.time && frame.unit) {
      const hours = this.convertToHours(frame.time, frame.unit);
      return new Date(now.getTime() + (hours * 60 * 60 * 1000));
    }
    return now;
  }

  /**
   * Converts time units to hours
   */
  private convertToHours(time: number, unit: string): number {
    switch (unit.toLowerCase()) {
      case 'minute':
      case 'minutes':
        return time / 60;
      case 'hour':
      case 'hours':
        return time;
      case 'day':
      case 'days':
        return time * 24;
      case 'week':
      case 'weeks':
        return time * 24 * 7;
      default:
        return 1; // Default to 1 hour
    }
  }

  /**
   * Utility function for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const uploadManager = new UploadManager();