import { UserProfile } from '../types';
import { 
  PdfUploadPackage, 
  ValidationResult, 
  PdfProcessingOptions, 
  DEFAULT_PROCESSING_OPTIONS 
} from '../types/pdfTypes';

export class PdfProcessingService {
  private options: PdfProcessingOptions;

  constructor(options: Partial<PdfProcessingOptions> = {}) {
    this.options = { ...DEFAULT_PROCESSING_OPTIONS, ...options };
  }

  /**
   * Validates a PDF file for upload
   */
  async validatePdfFile(file: File): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file type
    if (!this.options.allowedMimeTypes.includes(file.type)) {
      errors.push(`Invalid file type. Expected PDF, got ${file.type}`);
    }

    // Check file extension as backup
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      errors.push('File must have .pdf extension');
    }

    // Check file size
    if (file.size > this.options.maxFileSize) {
      errors.push(`File too large. Maximum size is ${this.formatFileSize(this.options.maxFileSize)}, got ${this.formatFileSize(file.size)}`);
    }

    // Check for empty file
    if (file.size === 0) {
      errors.push('File is empty');
    }

    // Warn about large files
    if (file.size > 5 * 1024 * 1024) { // 5MB
      warnings.push('Large file may take longer to process');
    }

    // Basic file corruption check
    try {
      const header = await this.readFileHeader(file);
      if (!header.startsWith('%PDF-')) {
        errors.push('File appears to be corrupted or not a valid PDF');
      }
    } catch (error) {
      errors.push('Unable to read file header');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo: {
        size: file.size,
        type: file.type,
        name: file.name,
        lastModified: file.lastModified,
      },
    };
  }

  /**
   * Converts a file to Base64 string
   */
  async convertToBase64(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result as string;
          // Remove the data URL prefix (data:application/pdf;base64,)
          const base64 = result.split(',')[1];
          resolve(base64);
        } catch (error) {
          reject(new Error('Failed to convert file to Base64'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Generates SHA-256 checksum for content
   */
  async generateChecksum(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Creates a complete upload package
   */
  async createUploadPackage(
    file: File, 
    userProfile: UserProfile,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<PdfUploadPackage> {
    // Stage 1: Validation
    onProgress?.('Validating file...', 10);
    const validation = await this.validatePdfFile(file);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Stage 2: Convert to Base64
    onProgress?.('Converting file...', 30);
    const base64Content = await this.convertToBase64(file, (progress) => {
      onProgress?.('Converting file...', 30 + (progress * 0.4));
    });

    // Stage 3: Generate checksums
    onProgress?.('Generating checksums...', 80);
    const fileChecksum = await this.generateChecksum(base64Content);
    const metadataChecksum = await this.generateChecksum(JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      lastModified: file.lastModified,
    }));

    // Stage 4: Package creation
    onProgress?.('Creating package...', 95);
    const uploadId = crypto.randomUUID();
    
    const uploadPackage: PdfUploadPackage = {
      uploadMetadata: {
        uploadId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        fileSize: file.size,
        fileName: file.name,
        checksum: metadataChecksum,
      },
      userContext: {
        userId: userProfile.id,
        name: userProfile.name,
        procedure: userProfile.procedure,
        dischargeDate: userProfile.dischargeDate.toISOString(),
        timezone: userProfile.preferences.timeZone,
      },
      fileData: {
        base64Content,
        mimeType: file.type,
        checksum: fileChecksum,
      },
      processingOptions: {
        extractTasks: true,
        generateTimeline: true,
        identifyMedications: true,
        extractEmergencyInfo: true,
        confidenceThreshold: this.options.confidenceThreshold,
      },
    };

    onProgress?.('Package ready', 100);
    return uploadPackage;
  }

  /**
   * Estimates processing time based on file size
   */
  estimateProcessingTime(fileSize: number): number {
    // Base time: 10 seconds
    // Additional time: 1 second per 100KB
    const baseTime = 10000; // 10 seconds
    const additionalTime = Math.floor(fileSize / (100 * 1024)) * 1000;
    return Math.min(baseTime + additionalTime, 120000); // Max 2 minutes
  }

  /**
   * Validates upload package before sending
   */
  validateUploadPackage(uploadPackage: PdfUploadPackage): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!uploadPackage.uploadMetadata.uploadId) errors.push('Missing upload ID');
    if (!uploadPackage.userContext.userId) errors.push('Missing user ID');
    if (!uploadPackage.fileData.base64Content) errors.push('Missing file content');
    if (!uploadPackage.fileData.checksum) errors.push('Missing file checksum');

    // Validate Base64 content
    try {
      atob(uploadPackage.fileData.base64Content);
    } catch {
      errors.push('Invalid Base64 content');
    }

    // Check file size consistency
    const estimatedSize = (uploadPackage.fileData.base64Content.length * 3) / 4;
    const sizeDifference = Math.abs(estimatedSize - uploadPackage.uploadMetadata.fileSize);
    if (sizeDifference > 1024) { // Allow 1KB difference for encoding overhead
      errors.push('File size mismatch between metadata and content');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Creates a demo package for testing (without real file)
   */
  createDemoPackage(userProfile: UserProfile): PdfUploadPackage {
    const uploadId = crypto.randomUUID();
    
    return {
      uploadMetadata: {
        uploadId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        fileSize: 245760, // ~240KB
        fileName: 'sample-discharge-instructions.pdf',
        checksum: 'demo-checksum-' + Date.now(),
      },
      userContext: {
        userId: userProfile.id,
        name: userProfile.name,
        procedure: userProfile.procedure,
        dischargeDate: userProfile.dischargeDate.toISOString(),
        timezone: userProfile.preferences.timeZone,
      },
      fileData: {
        base64Content: 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PgplbmRvYmoK', // Minimal PDF header
        mimeType: 'application/pdf',
        checksum: 'demo-file-checksum-' + Date.now(),
      },
      processingOptions: {
        extractTasks: true,
        generateTimeline: true,
        identifyMedications: true,
        extractEmergencyInfo: true,
        confidenceThreshold: this.options.confidenceThreshold,
      },
    };
  }

  // Private helper methods
  private async readFileHeader(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const blob = file.slice(0, 1024); // Read first 1KB
      
      reader.onload = () => {
        const result = reader.result as ArrayBuffer;
        const decoder = new TextDecoder('utf-8');
        resolve(decoder.decode(result));
      };
      
      reader.onerror = () => reject(new Error('Failed to read file header'));
      reader.readAsArrayBuffer(blob);
    });
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const pdfProcessingService = new PdfProcessingService();
