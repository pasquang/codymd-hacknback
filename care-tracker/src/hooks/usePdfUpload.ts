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
import { logger, LogCategory } from '../utils/logger';

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
    const uploadId = crypto.randomUUID();
    
    logger.info(LogCategory.UPLOAD_LIFECYCLE, 'usePdfUpload', 'Upload file initiated', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      hasUserProfile: !!userProfile
    }, uploadId);

    if (!userProfile) {
      logger.error(LogCategory.ERROR_HANDLING, 'usePdfUpload', 'Upload failed - no user profile',
        new Error('User profile is required'), {}, uploadId);
      throw new Error('User profile is required for PDF upload');
    }

    try {
      // Reset state
      logger.debug(LogCategory.STATE_MANAGEMENT, 'usePdfUpload', 'Resetting upload state', {}, uploadId);
      setError(null);
      setResult(null);
      setValidation(null);
      lastFile.current = file;

      // Step 1: Validate file
      logger.debug(LogCategory.UPLOAD_LIFECYCLE, 'usePdfUpload', 'Step 1: Starting file validation', {}, uploadId);
      setStatus({
        uploadId: uploadId,
        status: 'uploading',
        progress: 5,
        message: 'Validating PDF file...',
      });

      const validationResult = await pdfProcessingService.validatePdfFile(file);
      setValidation(validationResult);

      logger.info(LogCategory.VALIDATION, 'usePdfUpload', 'File validation completed', {
        isValid: validationResult.isValid,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length
      }, uploadId);

      if (!validationResult.isValid) {
        logger.error(LogCategory.ERROR_HANDLING, 'usePdfUpload', 'File validation failed',
          new Error('Validation failed'), { errors: validationResult.errors }, uploadId);
        throw new Error(`File validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Step 2: Create upload package
      logger.debug(LogCategory.UPLOAD_LIFECYCLE, 'usePdfUpload', 'Step 2: Creating upload package', {}, uploadId);
      const uploadPackage = await pdfProcessingService.createUploadPackage(
        file,
        userProfile,
        (stage, progress) => {
          logger.debug(LogCategory.UPLOAD_LIFECYCLE, 'usePdfUpload', 'Package creation progress', {
            stage,
            progress
          }, uploadId);
          setStatus({
            uploadId: uploadId,
            status: 'uploading',
            progress: Math.min(progress, 25),
            message: stage,
          });
        }
      );

      lastUploadPackage.current = uploadPackage;

      // Step 3: Validate package
      logger.debug(LogCategory.UPLOAD_LIFECYCLE, 'usePdfUpload', 'Step 3: Validating upload package', {}, uploadId);
      const packageValidation = pdfProcessingService.validateUploadPackage(uploadPackage);
      if (!packageValidation.isValid) {
        logger.error(LogCategory.ERROR_HANDLING, 'usePdfUpload', 'Package validation failed',
          new Error('Package validation failed'), { errors: packageValidation.errors }, uploadId);
        throw new Error(`Package validation failed: ${packageValidation.errors.join(', ')}`);
      }

      logger.info(LogCategory.UPLOAD_LIFECYCLE, 'usePdfUpload', 'Package validation passed', {
        packageSize: JSON.stringify(uploadPackage).length
      }, uploadId);

      // Step 4: Upload to backend
      logger.debug(LogCategory.UPLOAD_LIFECYCLE, 'usePdfUpload', 'Step 4: Starting backend upload', {}, uploadId);
      await uploadManager.uploadPdf(uploadPackage, (uploadStatus) => {
        logger.debug(LogCategory.STATE_MANAGEMENT, 'usePdfUpload', 'Upload status update', {
          status: uploadStatus.status,
          progress: uploadStatus.progress,
          message: uploadStatus.message
        }, uploadStatus.uploadId);
        
        setStatus(uploadStatus);
        
        // Handle completion
        if (uploadStatus.status === 'completed' && uploadStatus.result) {
          logger.info(LogCategory.UPLOAD_LIFECYCLE, 'usePdfUpload', 'Upload completed successfully', {
            tasksExtracted: uploadStatus.result.tasks.length,
            confidence: uploadStatus.result.confidence
          }, uploadStatus.uploadId);
          
          setResult(uploadStatus.result);
          
          // Update store with extracted tasks
          if (uploadStatus.result.tasks.length > 0) {
            logger.info(LogCategory.STATE_MANAGEMENT, 'usePdfUpload', 'Adding extracted tasks to store', {
              taskCount: uploadStatus.result.tasks.length
            }, uploadStatus.uploadId);
            
            // Clear existing tasks and add new ones
            // Note: In a real implementation, you might want to merge or replace selectively
            uploadStatus.result.tasks.forEach((task, index) => {
              logger.debug(LogCategory.STATE_MANAGEMENT, 'usePdfUpload', 'Adding task to store', {
                taskIndex: index,
                taskType: task.type,
                taskTitle: task.title,
                actionType: task.actionType
              }, uploadStatus.uploadId);
              
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
          } else {
            logger.warn(LogCategory.UPLOAD_LIFECYCLE, 'usePdfUpload', 'No tasks extracted from PDF', {}, uploadStatus.uploadId);
          }
          
          // Update emergency info if available
          if (uploadStatus.result.emergencyInfo) {
            logger.info(LogCategory.STATE_MANAGEMENT, 'usePdfUpload', 'Updating emergency info in profile', {
              hasDoctorContact: !!uploadStatus.result.emergencyInfo.doctorContact
            }, uploadStatus.uploadId);
            
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
          logger.error(LogCategory.ERROR_HANDLING, 'usePdfUpload', 'Upload failed',
            new Error(uploadStatus.error), {}, uploadStatus.uploadId);
          setError(uploadStatus.error);
        }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error(LogCategory.ERROR_HANDLING, 'usePdfUpload', 'Upload process failed', err, {
        errorMessage
      }, uploadId);
      
      setError(errorMessage);
      setStatus({
        uploadId: uploadId,
        status: 'failed',
        progress: 0,
        message: 'Upload failed',
        error: errorMessage,
      });
    }
  }, [userProfile, addTask, setUserProfile]);

  const cancel = useCallback(() => {
    logger.info(LogCategory.USER_INTERACTION, 'usePdfUpload', 'Upload cancelled by user', {
      uploadId: status?.uploadId,
      currentStatus: status?.status
    }, status?.uploadId);
    
    if (status?.uploadId) {
      uploadManager.cancelUpload(status.uploadId);
    }
    setStatus(null);
    setError(null);
    setResult(null);
  }, [status?.uploadId]);

  const retry = useCallback(async () => {
    logger.info(LogCategory.USER_INTERACTION, 'usePdfUpload', 'Upload retry initiated', {
      hasLastFile: !!lastFile.current,
      hasLastPackage: !!lastUploadPackage.current,
      lastFileName: lastFile.current?.name
    });
    
    if (lastFile.current && lastUploadPackage.current) {
      await uploadFile(lastFile.current);
    } else {
      logger.error(LogCategory.ERROR_HANDLING, 'usePdfUpload', 'Retry failed - no previous upload data',
        new Error('No previous upload to retry'));
      throw new Error('No previous upload to retry');
    }
  }, [uploadFile]);

  const reset = useCallback(() => {
    logger.info(LogCategory.USER_INTERACTION, 'usePdfUpload', 'Upload state reset', {
      uploadId: status?.uploadId,
      currentStatus: status?.status
    }, status?.uploadId);
    
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