# PDF Logging Implementation Guide

## Quick Start Implementation

This guide provides step-by-step instructions to add comprehensive logging to the PDF upload process for troubleshooting.

## Phase 1: Core Logging Infrastructure (Immediate Implementation)

### Step 1: Create Frontend Logger Utility

**File**: `care-tracker/src/utils/logger.ts`

```typescript
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export enum LogCategory {
  UPLOAD_LIFECYCLE = 'UPLOAD_LIFECYCLE',
  VALIDATION = 'VALIDATION',
  API_COMMUNICATION = 'API_COMMUNICATION',
  STATE_MANAGEMENT = 'STATE_MANAGEMENT',
  USER_INTERACTION = 'USER_INTERACTION',
  ERROR_HANDLING = 'ERROR_HANDLING'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  component: string;
  uploadId?: string;
  message: string;
  data?: any;
  error?: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private log(level: LogLevel, category: LogCategory, component: string, message: string, data?: any, error?: any, uploadId?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      component,
      uploadId,
      message,
      data,
      error
    };

    if (this.isDevelopment) {
      const prefix = `[${level}][${category}][${component}]${uploadId ? `[${uploadId.slice(0, 8)}]` : ''}`;
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(prefix, message, data, error);
          break;
        case LogLevel.WARN:
          console.warn(prefix, message, data);
          break;
        case LogLevel.INFO:
          console.info(prefix, message, data);
          break;
        case LogLevel.DEBUG:
          console.debug(prefix, message, data);
          break;
      }
    }

    // In production, send to logging service
    // this.sendToLoggingService(entry);
  }

  debug(category: LogCategory, component: string, message: string, data?: any, uploadId?: string) {
    this.log(LogLevel.DEBUG, category, component, message, data, undefined, uploadId);
  }

  info(category: LogCategory, component: string, message: string, data?: any, uploadId?: string) {
    this.log(LogLevel.INFO, category, component, message, data, undefined, uploadId);
  }

  warn(category: LogCategory, component: string, message: string, data?: any, uploadId?: string) {
    this.log(LogLevel.WARN, category, component, message, data, undefined, uploadId);
  }

  error(category: LogCategory, component: string, message: string, error?: any, data?: any, uploadId?: string) {
    this.log(LogLevel.ERROR, category, component, message, data, error, uploadId);
  }
}

export const logger = new Logger();
```

### Step 2: Add Logging to Upload Manager

**File**: `care-tracker/src/services/uploadManager.ts`

Add these imports at the top:
```typescript
import { logger, LogCategory } from '../utils/logger';
```

Add logging to key methods:

**In `uploadPdf()` method (line 25):**
```typescript
async uploadPdf(uploadPackage: PdfUploadPackage, onProgress?: (status: UploadStatus) => void): Promise<UploadResponse> {
  const uploadId = uploadPackage.uploadMetadata.uploadId;
  
  logger.info(LogCategory.UPLOAD_LIFECYCLE, 'UploadManager', 'Starting PDF upload', {
    fileName: uploadPackage.uploadMetadata.fileName,
    fileSize: uploadPackage.uploadMetadata.fileSize
  }, uploadId);
  
  // ... rest of existing code
}
```

**In `performUpload()` method (line 221):**
```typescript
private async performUpload(uploadPackage: PdfUploadPackage, signal: AbortSignal, onProgress?: (status: UploadStatus) => void): Promise<UploadResponse> {
  const uploadId = uploadPackage.uploadMetadata.uploadId;
  
  logger.debug(LogCategory.API_COMMUNICATION, 'UploadManager', 'Converting Base64 to File', {
    base64Length: uploadPackage.fileData.base64Content.length
  }, uploadId);

  try {
    // ... existing Base64 conversion code ...

    logger.info(LogCategory.API_COMMUNICATION, 'UploadManager', 'Making API request to backend', {
      url: 'http://localhost:5000/api/upload',
      fileSize: file.size
    }, uploadId);

    const response = await fetch('http://localhost:5000/api/upload', {
      method: 'POST',
      body: formData,
      signal,
    });

    logger.info(LogCategory.API_COMMUNICATION, 'UploadManager', 'Received API response', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    }, uploadId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(LogCategory.ERROR_HANDLING, 'UploadManager', 'API request failed', 
        new Error(`${response.status} ${response.statusText}`), 
        { errorText }, uploadId);
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    logger.info(LogCategory.API_COMMUNICATION, 'UploadManager', 'Parsed API response', {
      resultKeys: Object.keys(result),
      hasTimeFrames: !!result.time_frames,
      timeFramesCount: result.time_frames?.length || 0
    }, uploadId);

    // ... rest of existing code
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      logger.error(LogCategory.ERROR_HANDLING, 'UploadManager', 'Backend connection failed', error, {
        message: 'Cannot connect to backend server'
      }, uploadId);
    } else {
      logger.error(LogCategory.ERROR_HANDLING, 'UploadManager', 'Upload failed', error, {}, uploadId);
    }
    throw error;
  }
}
```

**In `processBackendResponse()` method (line 385):**
```typescript
private processBackendResponse(backendResponse: any): ProcessingResult {
  logger.debug(LogCategory.UPLOAD_LIFECYCLE, 'UploadManager', 'Processing backend response', {
    responseKeys: Object.keys(backendResponse),
    hasAIFormat: !!backendResponse.parsed?.content?.[0]?.text,
    hasRuleFormat: !!backendResponse.time_frames
  });

  let timeFrames: any[] = [];
  
  if (backendResponse.parsed?.content?.[0]?.text) {
    logger.debug(LogCategory.UPLOAD_LIFECYCLE, 'UploadManager', 'Detected AI backend response format');
    try {
      const parsedContent = JSON.parse(backendResponse.parsed.content[0].text);
      timeFrames = parsedContent.time_frames || [];
      logger.info(LogCategory.UPLOAD_LIFECYCLE, 'UploadManager', 'Parsed AI response', {
        timeFramesCount: timeFrames.length
      });
    } catch (error) {
      logger.error(LogCategory.ERROR_HANDLING, 'UploadManager', 'Failed to parse AI backend response', error);
      timeFrames = [];
    }
  } else if (backendResponse.time_frames) {
    logger.debug(LogCategory.UPLOAD_LIFECYCLE, 'UploadManager', 'Detected rule-based backend response format');
    timeFrames = backendResponse.time_frames;
  } else {
    logger.warn(LogCategory.ERROR_HANDLING, 'UploadManager', 'Unknown backend response format', {
      response: backendResponse
    });
  }

  logger.info(LogCategory.UPLOAD_LIFECYCLE, 'UploadManager', 'Converting time frames to tasks', {
    timeFramesCount: timeFrames.length
  });

  // ... rest of existing conversion code

  const tasks = timeFrames.map((frame: any, index: number) => {
    logger.debug(LogCategory.UPLOAD_LIFECYCLE, 'UploadManager', 'Converting frame to task', {
      frameIndex: index,
      frameType: frame.type,
      frameMessage: frame.message?.substring(0, 50) + '...'
    });
    
    // ... existing task conversion code
  });

  logger.info(LogCategory.UPLOAD_LIFECYCLE, 'UploadManager', 'Task conversion complete', {
    tasksCreated: tasks.length,
    restrictionsCreated: restrictions.length
  });

  return {
    tasks,
    emergencyInfo: this.createMockProcessingResult().emergencyInfo,
    medications: [],
    restrictions,
    confidence: 0.85,
    processingTime: 2000,
  };
}
```

### Step 3: Add Logging to PDF Processing Service

**File**: `care-tracker/src/services/pdfProcessingService.ts`

Add imports and logging to validation:

```typescript
import { logger, LogCategory } from '../utils/logger';

async validatePdfFile(file: File): Promise<ValidationResult> {
  logger.info(LogCategory.VALIDATION, 'PdfProcessingService', 'Starting file validation', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
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

  // ... rest of validation with similar logging

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

  logger.info(LogCategory.VALIDATION, 'PdfProcessingService', 'File validation complete', {
    isValid: result.isValid,
    errorCount: errors.length,
    warningCount: warnings.length
  });

  return result;
}
```

### Step 4: Add Backend Logging

**File**: `pdf-reader-ai.py`

Add logging configuration at the top:

```python
import logging
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('pdf_processing.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Add request logging to upload endpoint
@app.route('/api/upload', methods=['POST'])
def api_upload():
    request_id = str(uuid.uuid4())[:8]
    logger.info(f"[{request_id}] PDF upload request received")
    
    if 'pdf_file' not in request.files:
        logger.error(f"[{request_id}] No file part in request")
        return jsonify({"error": "No file part"}), 400

    file = request.files['pdf_file']
    logger.info(f"[{request_id}] File details: name={file.filename}, size={len(file.read())}")
    file.seek(0)  # Reset file pointer
    
    if file.filename == '':
        logger.error(f"[{request_id}] No selected file")
        return jsonify({"error": "No selected file"}), 400

    if file and file.filename.lower().endswith('.pdf'):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        logger.info(f"[{request_id}] File saved to {filepath}")

        try:
            # 1. Extract text from PDF
            logger.info(f"[{request_id}] Starting PDF text extraction")
            pdf_text = extract_pdf_text(filepath)
            logger.info(f"[{request_id}] PDF text extracted, length: {len(pdf_text)}")

            # 2. Send to Claude
            logger.info(f"[{request_id}] Sending request to Claude API")
            prompt = build_prompt(pdf_text)
            claude_response = call_claude(prompt)
            logger.info(f"[{request_id}] Claude API response received")

            # 3. Process response
            logger.info(f"[{request_id}] Processing Claude response")
            text = claude_response["content"][0]["text"]
            if text.startswith("```json"):
                text = text.removeprefix("```json").removesuffix("```").strip()
            elif text.startswith("```"):
                text = text.removeprefix("```").removesuffix("```").strip()

            # 4. Parse JSON
            logger.info(f"[{request_id}] Parsing JSON response")
            parsed_json = json.loads(text)
            logger.info(f"[{request_id}] JSON parsed successfully, keys: {list(parsed_json.keys())}")

            return jsonify(parsed_json), 200

        except Exception as e:
            logger.error(f"[{request_id}] Processing failed: {str(e)}", exc_info=True)
            return jsonify({"error": "Failed to parse Claude JSON", "details": str(e)}), 500

    logger.error(f"[{request_id}] Invalid file type")
    return jsonify({"error": "Invalid file type"}), 400
```

### Step 5: Add Onboarding Flow Logging

**File**: `care-tracker/src/components/onboarding/OnboardingFlow.tsx`

Add logging to the completion handler:

```typescript
import { logger, LogCategory } from '../../utils/logger';

const handleComplete = async () => {
  logger.info(LogCategory.UPLOAD_LIFECYCLE, 'OnboardingFlow', 'Onboarding completion started', {
    currentStep,
    pdfProcessingSuccess,
    tasksCount: tasks.length
  });

  setUserProfile(formData);
  
  // Wait for PDF processing to complete
  logger.debug(LogCategory.UPLOAD_LIFECYCLE, 'OnboardingFlow', 'Waiting for PDF processing', {
    delay: '30 seconds'
  });
  
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  const currentTasks = useCareStore.getState().tasks;
  logger.info(LogCategory.UPLOAD_LIFECYCLE, 'OnboardingFlow', 'Checking task count after delay', {
    currentTasksCount: currentTasks.length,
    pdfProcessingSuccess
  });

  if (!pdfProcessingSuccess || currentTasks.length === 0) {
    logger.info(LogCategory.UPLOAD_LIFECYCLE, 'OnboardingFlow', 'Loading sample data as fallback', {
      reason: !pdfProcessingSuccess ? 'PDF processing failed' : 'No tasks extracted'
    });
    loadSampleData();
  } else {
    logger.info(LogCategory.UPLOAD_LIFECYCLE, 'OnboardingFlow', 'Using PDF-extracted tasks', {
      tasksCount: currentTasks.length
    });
  }

  setIsCompleted(true);
};
```

## Testing the Logging

### 1. Test Frontend Logging
1. Open browser DevTools Console
2. Upload a PDF file
3. Look for structured log messages with prefixes like `[INFO][UPLOAD_LIFECYCLE][UploadManager]`

### 2. Test Backend Logging
1. Check terminal output where `pdf-reader-ai.py` is running
2. Check `pdf_processing.log` file for detailed logs
3. Look for request IDs to correlate frontend and backend logs

### 3. Common Log Patterns to Look For

**Successful Upload:**
```
[INFO][UPLOAD_LIFECYCLE][UploadManager] Starting PDF upload
[INFO][API_COMMUNICATION][UploadManager] Making API request to backend
[INFO][API_COMMUNICATION][UploadManager] Received API response
[INFO][UPLOAD_LIFECYCLE][UploadManager] Task conversion complete
```

**Backend Connection Failure:**
```
[ERROR][ERROR_HANDLING][UploadManager] Backend connection failed
```

**PDF Processing Issues:**
```
[WARN][ERROR_HANDLING][UploadManager] Unknown backend response format
[ERROR][ERROR_HANDLING][UploadManager] Failed to parse AI backend response
```

## Next Steps After Implementation

1. Test with known problematic PDFs
2. Identify common failure patterns
3. Add more specific logging based on findings
4. Create log analysis scripts for common issues
5. Document troubleshooting workflows based on log patterns

This logging infrastructure will provide comprehensive visibility into the PDF upload process and help quickly identify where issues occur.