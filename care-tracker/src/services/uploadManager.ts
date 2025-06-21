import { 
  PdfUploadPackage, 
  UploadStatus, 
  UploadResponse, 
  ProcessingResult,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  ApiError 
} from '../types/pdfTypes';

export class UploadManager {
  private retryConfig: RetryConfig;
  private activeUploads: Map<string, AbortController> = new Map();
  private statusPollers: Map<string, NodeJS.Timeout> = new Map();

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
   * Performs the actual upload (simulated for now)
   */
  private async performUpload(
    uploadPackage: PdfUploadPackage,
    signal: AbortSignal,
    onProgress?: (status: UploadStatus) => void
  ): Promise<UploadResponse> {
    // Simulate upload progress
    const uploadId = uploadPackage.uploadMetadata.uploadId;
    
    // Simulate network delay and progress
    for (let progress = 30; progress <= 90; progress += 10) {
      if (signal.aborted) {
        throw new Error('Upload cancelled');
      }
      
      onProgress?.({
        uploadId,
        status: 'uploading',
        progress,
        message: 'Uploading to server...',
      });
      
      await this.sleep(200); // Simulate upload time
    }

    // Simulate final upload completion
    onProgress?.({
      uploadId,
      status: 'processing',
      progress: 100,
      message: 'Upload complete, processing...',
    });

    // In a real implementation, this would be an actual HTTP request:
    // const response = await fetch('/api/pdf/upload', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(uploadPackage),
    //   signal
    // });

    // Simulate successful response
    return {
      success: true,
      uploadId,
      status: 'processing',
      estimatedTime: '30-60 seconds',
      statusUrl: `/api/pdf/status/${uploadId}`,
    };
  }

  /**
   * Simulates status checking (replace with real API call)
   */
  private async simulateStatusCheck(uploadId: string): Promise<UploadStatus> {
    // Simulate processing time
    await this.sleep(1000);

    // Simulate different stages of processing
    const now = Date.now();
    const uploadTime = parseInt(uploadId.split('-')[0], 16) || now;
    const elapsed = now - uploadTime;

    if (elapsed < 5000) {
      return {
        uploadId,
        status: 'processing',
        progress: Math.min((elapsed / 5000) * 80, 80),
        message: 'Extracting text from PDF...',
      };
    } else if (elapsed < 10000) {
      return {
        uploadId,
        status: 'processing',
        progress: 80 + Math.min(((elapsed - 5000) / 5000) * 15, 15),
        message: 'Analyzing care instructions...',
      };
    } else {
      // Simulate completion with mock result
      return {
        uploadId,
        status: 'completed',
        progress: 100,
        message: 'Processing complete!',
        result: this.createMockProcessingResult(),
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
   * Utility function for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const uploadManager = new UploadManager();