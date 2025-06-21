'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, WarningCircle, X, ArrowClockwise } from 'phosphor-react';
import { usePdfUpload } from '../../hooks/usePdfUpload';
import { useToast } from '../../hooks/useToast';
import { ValidationResult } from '../../types/pdfTypes';

interface PdfUploadZoneProps {
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  maxFileSize?: number;
  className?: string;
}

export function PdfUploadZone({
  onUploadComplete,
  onUploadError,
  disabled = false,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  className = '',
}: PdfUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  
  const { success, error: showError } = useToast();
  const {
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
    retry,
  } = usePdfUpload();

  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled) return;

    try {
      setUploadedFileName(file.name);
      await uploadFile(file);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      showError('Upload Failed', errorMessage);
      onUploadError?.(errorMessage);
    }
  }, [uploadFile, disabled, showError, onUploadError]);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const file = event.dataTransfer.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showError('Invalid File Type', 'Please select a PDF file.');
        return;
      }
      handleFileSelect(file);
    }
  }, [handleFileSelect, disabled, showError]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading && !isProcessing) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading, isProcessing]);

  const handleReset = useCallback(() => {
    reset();
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [reset]);

  const handleRetry = useCallback(async () => {
    try {
      await retry();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Retry failed';
      showError('Retry Failed', errorMessage);
    }
  }, [retry, showError]);

  // Handle completion and errors with useEffect to prevent render side effects
  useEffect(() => {
    if (isCompleted && result) {
      success('PDF Processed Successfully', 'Your care timeline has been generated.');
      onUploadComplete?.(result);
    }
  }, [isCompleted, result, success, onUploadComplete]);

  useEffect(() => {
    if (isFailed && error) {
      showError('Processing Failed', error);
      onUploadError?.(error);
    }
  }, [isFailed, error, showError, onUploadError]);

  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle className="w-8 h-8 text-green-500" />;
    if (isFailed) return <WarningCircle className="w-8 h-8 text-red-500" />;
    if (isUploading || isProcessing) return <ArrowClockwise className="w-8 h-8 text-blue-500 animate-spin" />;
    return <Upload className="w-8 h-8 text-gray-400" />;
  };

  const getStatusMessage = () => {
    if (isCompleted) return 'PDF processed successfully!';
    if (isFailed) return error || 'Upload failed';
    if (status?.message) return status.message;
    if (uploadedFileName) return `Ready to upload: ${uploadedFileName}`;
    return 'Click to upload or drag and drop your PDF';
  };

  const getProgressColor = () => {
    if (isCompleted) return 'bg-green-500';
    if (isFailed) return 'bg-red-500';
    if (isProcessing) return 'bg-blue-500';
    return 'bg-primary-500';
  };

  return (
    <div className={`pdf-upload-zone ${className}`}>
      <div
        className={`
          upload-dropzone
          ${isDragOver ? 'drag-over' : ''}
          ${disabled ? 'disabled' : ''}
          ${isUploading || isProcessing ? 'uploading' : ''}
          ${isCompleted ? 'completed' : ''}
          ${isFailed ? 'failed' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <div className="upload-content">
          {getStatusIcon()}
          
          <div className="upload-text">
            <h3 className="upload-title">
              {isCompleted ? 'Upload Complete' : 
               isFailed ? 'Upload Failed' :
               isUploading || isProcessing ? 'Processing...' :
               'Upload PDF'}
            </h3>
            <p className="upload-message">
              {getStatusMessage()}
            </p>
          </div>

          {(isUploading || isProcessing) && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${getProgressColor()}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="progress-text">{Math.round(progress)}%</span>
            </div>
          )}

          {validation && !validation.isValid && (
            <div className="validation-errors">
              <h4 className="error-title">Validation Errors:</h4>
              <ul className="error-list">
                {validation.errors.map((error, index) => (
                  <li key={index} className="error-item">{error}</li>
                ))}
              </ul>
            </div>
          )}

          {validation && validation.warnings.length > 0 && (
            <div className="validation-warnings">
              <h4 className="warning-title">Warnings:</h4>
              <ul className="warning-list">
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="warning-item">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {uploadedFileName && !isUploading && !isProcessing && !isCompleted && (
            <div className="file-info">
              <div className="file-details">
                <FileText className="w-4 h-4" />
                <span className="file-name">{uploadedFileName}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="remove-file-btn"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {isFailed && (
            <div className="action-buttons">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetry();
                }}
                className="retry-btn"
              >
                <ArrowClockwise className="w-4 h-4" />
                Retry Upload
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="reset-btn"
              >
                <X className="w-4 h-4" />
                Start Over
              </button>
            </div>
          )}

          {isCompleted && result && (
            <div className="success-info">
              <div className="result-summary">
                <p className="result-text">
                  Extracted {result.tasks?.length || 0} care tasks with {Math.round((result.confidence || 0) * 100)}% confidence
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="upload-another-btn"
              >
                Upload Another PDF
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="upload-help">
        <p className="help-text">
          <strong>Supported:</strong> PDF files up to {Math.round(maxFileSize / (1024 * 1024))}MB
        </p>
        <p className="help-text">
          Your PDF will be processed to extract care instructions and create a personalized timeline.
        </p>
      </div>
    </div>
  );
}