import { UserProfile } from '../types';
import {
  PdfUploadPackage,
  ValidationResult,
  PdfProcessingOptions,
  DEFAULT_PROCESSING_OPTIONS
} from '../types/pdfTypes';
import { logger, LogCategory } from '../utils/logger';

export class PdfProcessingService {
  private options: PdfProcessingOptions;

  constructor(options: Partial<PdfProcessingOptions> = {}) {
    this.options = { ...DEFAULT_PROCESSING_OPTIONS, ...options };
  }

  /**
   * Validates a PDF file for upload
   */
  async validatePdfFile(file: File): Promise<ValidationResult> {
    logger.info(LogCategory.VALIDATION, 'PdfProcessingService', 'Starting file validation', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file type
    if (!this.options.allowedMimeTypes.includes(file.type)) {
      const error = `Invalid file type. Expected PDF, got ${file.type}`;
      errors.push(error);
      logger.warn(LogCategory.VALIDATION, 'PdfProcessingService', 'File type validation failed', {
        expected: this.options.allowedMimeTypes,
        actual: file.type
      });
    }

    // Check file extension as backup
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      const error = 'File must have .pdf extension';
      errors.push(error);
      logger.warn(LogCategory.VALIDATION, 'PdfProcessingService', 'File extension validation failed', {
        fileName: file.name,
        extension: file.name.split('.').pop()
      });
    }

    // Check file size
    if (file.size > this.options.maxFileSize) {
      const error = `File too large. Maximum size is ${this.formatFileSize(this.options.maxFileSize)}, got ${this.formatFileSize(file.size)}`;
      errors.push(error);
      logger.warn(LogCategory.VALIDATION, 'PdfProcessingService', 'File size validation failed', {
        maxSize: this.options.maxFileSize,
        actualSize: file.size,
        maxSizeFormatted: this.formatFileSize(this.options.maxFileSize),
        actualSizeFormatted: this.formatFileSize(file.size)
      });
    }

    // Check for empty file
    if (file.size === 0) {
      const error = 'File is empty';
      errors.push(error);
      logger.warn(LogCategory.VALIDATION, 'PdfProcessingService', 'Empty file detected');
    }

    // Warn about large files
    if (file.size > 5 * 1024 * 1024) { // 5MB
      const warning = 'Large file may take longer to process';
      warnings.push(warning);
      logger.warn(LogCategory.VALIDATION, 'PdfProcessingService', 'Large file warning', {
        fileSize: file.size,
        threshold: 5 * 1024 * 1024
      });
    }

    // Basic file corruption check
    try {
      logger.debug(LogCategory.VALIDATION, 'PdfProcessingService', 'Reading file header for corruption check');
      const header = await this.readFileHeader(file);
      if (!header.startsWith('%PDF-')) {
        const error = 'File appears to be corrupted or not a valid PDF';
        errors.push(error);
        logger.warn(LogCategory.VALIDATION, 'PdfProcessingService', 'PDF header validation failed', {
          headerStart: header.substring(0, 20),
          expectedStart: '%PDF-'
        });
      } else {
        logger.debug(LogCategory.VALIDATION, 'PdfProcessingService', 'PDF header validation passed', {
          headerStart: header.substring(0, 20)
        });
      }
    } catch (error) {
      const errorMsg = 'Unable to read file header';
      errors.push(errorMsg);
      logger.error(LogCategory.VALIDATION, 'PdfProcessingService', 'File header read failed', error);
    }

    const result = {
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

    logger.info(LogCategory.VALIDATION, 'PdfProcessingService', 'File validation completed', {
      isValid: result.isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors: errors,
      warnings: warnings
    });

    return result;
  }

  /**
   * Converts a file to Base64 string
   */
  async convertToBase64(file: File, onProgress?: (progress: number) => void): Promise<string> {
    logger.debug(LogCategory.VALIDATION, 'PdfProcessingService', 'Starting Base64 conversion', {
      fileName: file.name,
      fileSize: file.size
    });

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result as string;
          // Remove the data URL prefix (data:application/pdf;base64,)
          const base64 = result.split(',')[1];
          
          logger.info(LogCategory.VALIDATION, 'PdfProcessingService', 'Base64 conversion completed', {
            originalSize: file.size,
            base64Length: base64.length,
            compressionRatio: (base64.length / file.size).toFixed(2)
          });
          
          resolve(base64);
        } catch (error) {
          logger.error(LogCategory.ERROR_HANDLING, 'PdfProcessingService', 'Base64 conversion failed', error);
          reject(new Error('Failed to convert file to Base64'));
        }
      };

      reader.onerror = () => {
        logger.error(LogCategory.ERROR_HANDLING, 'PdfProcessingService', 'File read error during Base64 conversion');
        reject(new Error('Failed to read file'));
      };

      reader.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          logger.debug(LogCategory.VALIDATION, 'PdfProcessingService', 'Base64 conversion progress', {
            progress: Math.round(progress),
            loaded: event.loaded,
            total: event.total
          });
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
    const uploadId = crypto.randomUUID();
    
    logger.info(LogCategory.UPLOAD_LIFECYCLE, 'PdfProcessingService', 'Starting upload package creation', {
      fileName: file.name,
      fileSize: file.size,
      userId: userProfile.id,
      procedure: userProfile.procedure
    }, uploadId);

    // Stage 1: Validation
    onProgress?.('Validating file...', 10);
    logger.debug(LogCategory.VALIDATION, 'PdfProcessingService', 'Stage 1: File validation', {}, uploadId);
    const validation = await this.validatePdfFile(file);
    if (!validation.isValid) {
      logger.error(LogCategory.ERROR_HANDLING, 'PdfProcessingService', 'Package creation failed - validation errors',
        new Error('Validation failed'), { errors: validation.errors }, uploadId);
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Stage 2: Convert to Base64
    onProgress?.('Converting file...', 30);
    logger.debug(LogCategory.VALIDATION, 'PdfProcessingService', 'Stage 2: Base64 conversion', {}, uploadId);
    const base64Content = await this.convertToBase64(file, (progress) => {
      onProgress?.('Converting file...', 30 + (progress * 0.4));
    });

    // Stage 3: Generate checksums
    onProgress?.('Generating checksums...', 80);
    logger.debug(LogCategory.VALIDATION, 'PdfProcessingService', 'Stage 3: Checksum generation', {}, uploadId);
    const fileChecksum = await this.generateChecksum(base64Content);
    const metadataChecksum = await this.generateChecksum(JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      lastModified: file.lastModified,
    }));

    logger.debug(LogCategory.VALIDATION, 'PdfProcessingService', 'Checksums generated', {
      fileChecksum: fileChecksum.substring(0, 16) + '...',
      metadataChecksum: metadataChecksum.substring(0, 16) + '...'
    }, uploadId);

    // Stage 4: Package creation
    onProgress?.('Creating package...', 95);
    logger.debug(LogCategory.VALIDATION, 'PdfProcessingService', 'Stage 4: Package assembly', {}, uploadId);
    
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

    logger.info(LogCategory.UPLOAD_LIFECYCLE, 'PdfProcessingService', 'Upload package created successfully', {
      packageSize: JSON.stringify(uploadPackage).length,
      base64Size: base64Content.length,
      processingOptions: uploadPackage.processingOptions
    }, uploadId);

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
