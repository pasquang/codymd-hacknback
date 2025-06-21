import { CareTask, UserProfile } from './index';

export interface PdfUploadPackage {
  uploadMetadata: {
    uploadId: string;
    timestamp: string;
    userAgent: string;
    fileSize: number;
    fileName: string;
    checksum: string;
  };
  userContext: {
    userId: string;
    name: string;
    procedure: string;
    dischargeDate: string;
    timezone: string;
  };
  fileData: {
    base64Content: string;
    mimeType: string;
    checksum: string;
  };
  processingOptions: {
    extractTasks: boolean;
    generateTimeline: boolean;
    identifyMedications: boolean;
    extractEmergencyInfo: boolean;
    confidenceThreshold: number;
  };
}

export interface UploadStatus {
  uploadId: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: ProcessingResult;
  error?: string;
  estimatedTimeRemaining?: number;
}

export interface ProcessingResult {
  tasks: CareTask[];
  emergencyInfo: EmergencyInfo;
  medications: Medication[];
  restrictions: Restriction[];
  confidence: number;
  extractedText?: string;
  processingTime: number;
}

export interface EmergencyInfo {
  warningSignsTitle: string;
  warningSignsDescription: string;
  warningSignsList: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  doctorContact: {
    name: string;
    phone: string;
    specialty: string;
  };
  hospitalInfo?: {
    name: string;
    phone: string;
    address: string;
  };
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  sideEffects?: string[];
  interactions?: string[];
}

export interface Restriction {
  id: string;
  type: 'activity' | 'dietary' | 'medication' | 'lifestyle';
  description: string;
  duration: string;
  severity: 'mild' | 'moderate' | 'severe';
  consequences?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    size: number;
    type: string;
    name: string;
    lastModified: number;
  };
}

export interface UploadResponse {
  success: boolean;
  uploadId: string;
  status: string;
  estimatedTime: string;
  statusUrl: string;
  error?: string;
}

export interface UploadProgress {
  uploadId: string;
  stage: 'validation' | 'encoding' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  bytesUploaded?: number;
  totalBytes?: number;
  speed?: number;
}

export interface PdfProcessingOptions {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  processingTimeout: number; // in milliseconds
  retryAttempts: number;
  pollingInterval: number; // in milliseconds
  confidenceThreshold: number;
}

export const DEFAULT_PROCESSING_OPTIONS: PdfProcessingOptions = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['application/pdf'],
  processingTimeout: 120000, // 2 minutes
  retryAttempts: 3,
  pollingInterval: 2000, // 2 seconds
  confidenceThreshold: 0.7,
};

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
};