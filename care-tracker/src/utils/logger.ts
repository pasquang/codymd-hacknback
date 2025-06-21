/**
 * Frontend logging utility for PDF upload troubleshooting
 */

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
  private logs: LogEntry[] = [];
  
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

    // Store log entry
    this.logs.push(entry);
    
    // Keep only last 1000 logs to prevent memory issues
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

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

  // Utility methods for debugging
  getLogs(uploadId?: string, category?: LogCategory): LogEntry[] {
    return this.logs.filter(log => {
      if (uploadId && log.uploadId !== uploadId) return false;
      if (category && log.category !== category) return false;
      return true;
    });
  }

  getLogsAsString(uploadId?: string, category?: LogCategory): string {
    const logs = this.getLogs(uploadId, category);
    return logs.map(log => {
      const prefix = `[${log.timestamp}][${log.level}][${log.category}][${log.component}]${log.uploadId ? `[${log.uploadId.slice(0, 8)}]` : ''}`;
      return `${prefix} ${log.message}${log.data ? ` | Data: ${JSON.stringify(log.data)}` : ''}${log.error ? ` | Error: ${log.error.message || log.error}` : ''}`;
    }).join('\n');
  }

  exportLogs(uploadId?: string): void {
    const logs = this.getLogs(uploadId);
    const logText = this.getLogsAsString(uploadId);
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf-upload-logs-${uploadId || 'all'}-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearLogs(): void {
    this.logs = [];
    console.clear();
  }
}

export const logger = new Logger();

// Global access for debugging
if (typeof window !== 'undefined') {
  (window as any).pdfLogger = logger;
}