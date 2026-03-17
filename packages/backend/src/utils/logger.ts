enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
  }

  private output(entry: LogEntry): void {
    const logString = JSON.stringify(entry);
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.INFO:
        console.info(logString);
        break;
      case LogLevel.DEBUG:
        console.debug(logString);
        break;
    }
  }

  error(message: string, context?: any): void {
    this.output(this.formatLog(LogLevel.ERROR, message, context));
  }

  warn(message: string, context?: any): void {
    this.output(this.formatLog(LogLevel.WARN, message, context));
  }

  info(message: string, context?: any): void {
    this.output(this.formatLog(LogLevel.INFO, message, context));
  }

  debug(message: string, context?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.output(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }
}

export const logger = new Logger();
