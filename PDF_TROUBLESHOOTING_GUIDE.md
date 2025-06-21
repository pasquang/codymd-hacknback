# PDF Upload Troubleshooting Guide

## Quick Diagnostic Steps

### 1. Check Browser Console Logs

Open browser DevTools (F12) and look for structured log messages:

```
[INFO][UPLOAD_LIFECYCLE][UploadManager][abc12345] Starting PDF upload
[INFO][API_COMMUNICATION][UploadManager][abc12345] Making API request to backend
[ERROR][ERROR_HANDLING][UploadManager][abc12345] Backend connection failed
```

### 2. Check Backend Logs

Look at the terminal where `pdf-reader-ai.py` is running or check `pdf_processing.log`:

```
2025-06-21 14:00:00 - __main__ - INFO - [req12345] - PDF upload request received
2025-06-21 14:00:01 - __main__ - ERROR - [req12345] - Claude API request failed
```

### 3. Use Browser Logging Tools

Access the logger directly in browser console:
```javascript
// View all logs for a specific upload
window.pdfLogger.getLogs('abc12345')

// Export logs to file
window.pdfLogger.exportLogs('abc12345')

// View only error logs
window.pdfLogger.getLogs(null, 'ERROR_HANDLING')
```

## Common Issues and Solutions

### Issue 1: "Cannot connect to backend server"

**Symptoms:**
- Frontend log: `[ERROR][ERROR_HANDLING][UploadManager] Backend connection failed`
- Network tab shows failed requests to localhost:5000

**Diagnosis:**
```javascript
// Check if backend is reachable
fetch('http://localhost:5000/api/upload')
  .then(r => console.log('Backend reachable:', r.status))
  .catch(e => console.log('Backend unreachable:', e.message))
```

**Solutions:**
1. Start the Python backend: `python pdf-reader-ai.py`
2. Check if port 5000 is available: `lsof -i :5000`
3. Verify CORS configuration in backend
4. Check firewall/antivirus blocking localhost connections

### Issue 2: "File validation failed"

**Symptoms:**
- Frontend log: `[WARN][VALIDATION][PdfProcessingService] File type validation failed`
- User sees "Invalid file type" error

**Diagnosis:**
Look for validation logs:
```
[INFO][VALIDATION][PdfProcessingService] Starting file validation
[WARN][VALIDATION][PdfProcessingService] File type validation failed
```

**Solutions:**
1. Ensure file is actually a PDF (check file extension and MIME type)
2. Try with a different PDF file
3. Check file size limits (default 10MB)
4. Verify PDF is not corrupted

### Issue 3: "PDF processing completed but no tasks extracted"

**Symptoms:**
- Frontend log: `[WARN][UPLOAD_LIFECYCLE][OnboardingFlow] PDF processing completed but no tasks extracted`
- User sees sample data instead of PDF tasks

**Diagnosis:**
Check backend processing logs:
```
[INFO] Claude API request completed
[ERROR] JSON parsing failed
```

**Solutions:**
1. Check if Claude API key is configured: `echo $ANTHROPIC_API_KEY`
2. Verify PDF contains medical instructions (not just images)
3. Check Claude API response format in backend logs
4. Try with a different PDF with clearer text

### Issue 4: "Sample data loads instead of PDF tasks"

**Symptoms:**
- Frontend log: `[INFO][UPLOAD_LIFECYCLE][OnboardingFlow] Loading sample data as fallback`
- User uploaded PDF but sees generic tasks

**Diagnosis:**
Check the decision logic:
```
[INFO][UPLOAD_LIFECYCLE][OnboardingFlow] Checking task count after delay
currentTasksCount: 0, pdfProcessingSuccess: false
```

**Solutions:**
1. Increase the 30-second delay if processing is slow
2. Check if PDF upload actually completed successfully
3. Verify tasks were added to the store during processing
4. Check for timing issues between upload and completion check

### Issue 5: "Claude API failures"

**Symptoms:**
- Backend log: `Claude API request failed`
- 500 errors from backend

**Diagnosis:**
Check backend logs for:
```
[ERROR] Failed to parse Claude JSON
[ERROR] Claude API response: 401 Unauthorized
```

**Solutions:**
1. Verify Anthropic API key is valid and has credits
2. Check API rate limits
3. Verify prompt format is correct
4. Test with smaller/simpler PDF files

## Advanced Debugging

### Enable Debug Logging

Add to browser console:
```javascript
// Enable debug level logging
localStorage.setItem('logLevel', 'DEBUG')
```

### Correlate Frontend and Backend Logs

1. Find upload ID in frontend logs: `[abc12345]`
2. Search backend logs for same timeframe
3. Match request patterns and timing

### Performance Analysis

Check timing logs:
```
[INFO][UPLOAD_LIFECYCLE] Starting PDF upload (timestamp: 14:00:00)
[INFO][API_COMMUNICATION] Making API request (timestamp: 14:00:05)
[INFO][UPLOAD_LIFECYCLE] Upload completed (timestamp: 14:00:30)
```

### Memory and Resource Issues

Monitor for:
- Large file processing timeouts
- Base64 conversion failures
- Browser memory limits

## Log Analysis Patterns

### Successful Upload Pattern
```
[INFO][UPLOAD_LIFECYCLE] Starting PDF upload
[INFO][VALIDATION] File validation completed - isValid: true
[INFO][API_COMMUNICATION] Making API request to backend
[INFO][API_COMMUNICATION] Received API response - status: 200
[INFO][UPLOAD_LIFECYCLE] Task conversion completed - tasksCreated: 6
[INFO][STATE_MANAGEMENT] Adding extracted tasks to store
[INFO][UPLOAD_LIFECYCLE] Using PDF-extracted tasks
```

### Failed Upload Pattern
```
[INFO][UPLOAD_LIFECYCLE] Starting PDF upload
[ERROR][ERROR_HANDLING] Backend connection failed
[ERROR][ERROR_HANDLING] Upload failed
```

### Processing Failure Pattern
```
[INFO][UPLOAD_LIFECYCLE] Starting PDF upload
[INFO][API_COMMUNICATION] Received API response - status: 200
[WARN][ERROR_HANDLING] Unknown backend response format
[INFO][UPLOAD_LIFECYCLE] Loading sample data as fallback
```

## Testing Commands

### Backend Health Check
```bash
curl -X POST -F "pdf_file=@sample-data/FILE_0617.pdf" http://localhost:5000/api/upload
```

### Frontend Log Export
```javascript
// Export all logs
window.pdfLogger.exportLogs()

// Export logs for specific upload
window.pdfLogger.exportLogs('abc12345')

// Get logs as string
console.log(window.pdfLogger.getLogsAsString())
```

### Clear Logs
```javascript
window.pdfLogger.clearLogs()
```

## Environment Verification

### Check Required Environment Variables
```bash
echo "ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY"
```

### Verify File Permissions
```bash
ls -la uploads/
ls -la pdf_processing.log
```

### Check Network Connectivity
```bash
curl -I http://localhost:5000
netstat -an | grep 5000
```

## Common Log Messages Reference

| Log Message | Meaning | Action |
|-------------|---------|--------|
| `Backend connection failed` | Cannot reach Python server | Start backend server |
| `File validation failed` | PDF file is invalid | Check file format/size |
| `JSON parsing failed` | Claude response malformed | Check API key/response |
| `No tasks extracted` | PDF processing found no tasks | Try different PDF |
| `Loading sample data as fallback` | Using demo data instead of PDF | Check PDF processing success |
| `Package validation failed` | Upload package corrupted | Retry upload |
| `Upload cancelled by user` | User cancelled upload | Normal user action |

## Performance Benchmarks

### Expected Timing
- File validation: < 1 second
- Base64 conversion: 1-3 seconds (depending on file size)
- Backend upload: 2-5 seconds
- Claude API processing: 10-30 seconds
- Total pipeline: 15-40 seconds

### Warning Thresholds
- File validation > 5 seconds: Large file or slow device
- Backend upload > 10 seconds: Network issues
- Claude processing > 60 seconds: API issues or complex PDF
- Total pipeline > 90 seconds: Multiple issues

This logging system provides comprehensive visibility into the PDF upload process and should help quickly identify and resolve issues.