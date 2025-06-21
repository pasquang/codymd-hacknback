'use client';

import { useState, useCallback, useRef } from 'react';
import { useCareStore } from '../store/careStore';
import { pdfProcessingService } from '../services/pdfProcessingService';
import { uploadManager } from '../services/uploadManager';
import { 
  UploadStatus, 
  ProcessingResult, 
  ValidationResult,
  PdfUploadPackage 
} from '../types/pdfTypes';

export interface UsePdfUploadReturn {
  uploadFile: (file: File) => Promise<void>;
  status: UploadStatus | null;
  isUploading: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  progress: number;
  error: string | null;
  result: ProcessingResult | null;
  validation: ValidationResult | null;
  reset: () => void;
  cancel: () => void;
  retry: () => Promise<void>;
}

export function usePdfUpload(): UsePdfUploadReturn {
  const { userProfile, setUserProfile, addTask } = useCareStore();
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const lastUploadPackage = useRef<PdfUploadPackage | null>(null);
  const lastFile = useRef<File | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!userProfile) {
      throw new Error('User profile is required for PDF upload');
    }

    try {
      // Reset state
      setError(null);
      setResult(null);
      setValidation(null);
      lastFile.current = file;

      // Step 1: Validate file
      setStatus({
        uploadId: 'validating',
        status: 'uploading',
        progress: 5,
        message: 'Validating PDF file...',
      });

      const validationResult = await pdfProcessingService.validatePdfFile(file);
      setValidation(validationResult);

      if (!validationResult.isValid) {
        throw new Error(`File validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Step 2: Create upload package
      const uploadPackage = await pdfProcessingService.createUploadPackage(
        file,
        userProfile,
        (stage, progress) => {
          setStatus({
            uploadId: 'processing',
            status: 'uploading',
            progress: Math.min(progress, 25),
            message: stage,
          });
        }
      );

      lastUploadPackage.current = uploadPackage;

      // Step 3: Validate package
      const packageValidation = pdfProcessingService.validateUploadPackage(uploadPackage);
      if (!packageValidation.isValid) {
        throw new Error(`Package validation failed: ${packageValidation.errors.join(', ')}`);
      }

      // Step 4: Upload to backend
      await uploadManager.uploadPdf(uploadPackage, (uploadStatus) => {
        setStatus(uploadStatus);
        
        // Handle completion
        if (uploadStatus.status === 'completed' && uploadStatus.result) {
          setResult(uploadStatus.result);
          
          // Update store with extracted tasks
          if (uploadStatus.result.tasks.length > 0) {
            // Clear existing tasks and add new ones
            // Note: In a real implementation, you might want to merge or replace selectively
            uploadStatus.result.tasks.forEach(task => {
              addTask({
                type: task.type,
                title: task.title,
                description: task.description,
                scheduledTime: task.scheduledTime,
                estimatedDuration: task.estimatedDuration,
                actionType: task.actionType,
                category: task.category,
                instructions: task.instructions,
                reminders: task.reminders || [],
                dependencies: task.dependencies || [],
                metadata: task.metadata,
              });
            });
          }
          
          // Update emergency info if available
          if (uploadStatus.result.emergencyInfo) {
            const updatedProfile = {
              ...userProfile,
              medicalInfo: {
                ...userProfile.medicalInfo,
                doctorContact: uploadStatus.result.emergencyInfo.doctorContact,
              },
            };
            setUserProfile(updatedProfile);
          }
        }
        
        // Handle errors
        if (uploadStatus.status === 'failed' && uploadStatus.error) {
          setError(uploadStatus.error);
        }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setStatus({
        uploadId: 'error',
        status: 'failed',
        progress: 0,
        message: 'Upload failed',
        error: errorMessage,
      });
    }
  }, [userProfile, addTask, setUserProfile]);

  const cancel = useCallback(() => {
    if (status?.uploadId) {
      uploadManager.cancelUpload(status.uploadId);
    }
    setStatus(null);
    setError(null);
    setResult(null);
  }, [status?.uploadId]);

  const retry = useCallback(async () => {
    if (lastFile.current && lastUploadPackage.current) {
      await uploadFile(lastFile.current);
    } else {
      throw new Error('No previous upload to retry');
    }
  }, [uploadFile]);

  const reset = useCallback(() => {
    setStatus(null);
    setError(null);
    setResult(null);
    setValidation(null);
    lastUploadPackage.current = null;
    lastFile.current = null;
    
    // Cancel any active uploads
    if (status?.uploadId) {
      uploadManager.cancelUpload(status.uploadId);
    }
  }, [status?.uploadId]);

  // Derived state
  const isUploading = status?.status === 'uploading';
  const isProcessing = status?.status === 'processing';
  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';
  const progress = status?.progress || 0;

  return {
    uploadFile,
    status,
    isUploading,
    isProcessing,
    isCompleted,
    isFailed,
    progress,
    error,
    result,
    validation,
    reset,
    cancel,
    retry,
  };
}

// Additional hook for just status polling
export function useUploadStatus(uploadId: string | null) {
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const startPolling = useCallback((id: string) => {
    setIsPolling(true);
    uploadManager.startStatusPolling(id, (newStatus) => {
      setStatus(newStatus);
      if (newStatus.status === 'completed' || newStatus.status === 'failed') {
        setIsPolling(false);
      }
    });
  }, []);

  const stopPolling = useCallback(() => {
    if (uploadId) {
      uploadManager.stopStatusPolling(uploadId);
    }
    setIsPolling(false);
  }, [uploadId]);

  const refresh = useCallback(async () => {
    if (uploadId) {
      try {
        const newStatus = await uploadManager.pollStatus(uploadId);
        setStatus(newStatus);
      } catch (error) {
        console.error('Failed to refresh status:', error);
      }
    }
  }, [uploadId]);

  return {
    status,
    isPolling,
    startPolling,
    stopPolling,
    refresh,
  };
}