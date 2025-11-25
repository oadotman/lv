// =====================================================
// APPLICATION LOGGER
// Structured logging for application events and errors
// =====================================================

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class AppLogger {
  private isDevelopment: boolean;
  private minLevel: LogLevel;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.minLevel = this.getMinLogLevel();
  }

  private getMinLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase();
    switch (level) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      case 'fatal':
        return LogLevel.FATAL;
      default:
        return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
      LogLevel.FATAL,
    ];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Human-readable format for development
      const parts = [
        `[${entry.timestamp}]`,
        `[${entry.level.toUpperCase()}]`,
        entry.context ? `[${entry.context}]` : '',
        entry.message,
      ].filter(Boolean);

      let formatted = parts.join(' ');

      if (entry.metadata) {
        formatted += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
      }

      if (entry.error) {
        formatted += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
        if (entry.error.stack) {
          formatted += `\n${entry.error.stack}`;
        }
      }

      return formatted;
    } else {
      // JSON format for production (easier to parse by log aggregators)
      return JSON.stringify(entry);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = this.formatLog(entry);

    // Log to appropriate stream
    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      console.error(formatted);

      // Send to error monitoring service (Sentry)
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        this.sendToSentry(entry);
      }
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    // Send to log aggregation service if configured
    if (process.env.LOG_AGGREGATOR_URL) {
      this.sendToAggregator(entry);
    }
  }

  private async sendToSentry(entry: LogEntry): Promise<void> {
    try {
      // Sentry is already initialized in the app
      // This is a placeholder for additional custom error tracking
      if (typeof window !== 'undefined') {
        const Sentry = await import('@sentry/nextjs');
        if (entry.error) {
          Sentry.captureException(new Error(entry.error.message), {
            contexts: {
              app: {
                context: entry.context,
                metadata: entry.metadata,
              },
            },
          });
        } else {
          Sentry.captureMessage(entry.message, {
            level: entry.level as any,
            contexts: {
              app: {
                context: entry.context,
                metadata: entry.metadata,
              },
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to send log to Sentry:', error);
    }
  }

  private async sendToAggregator(entry: LogEntry): Promise<void> {
    try {
      const url = process.env.LOG_AGGREGATOR_URL;
      if (!url) return;

      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LOG_AGGREGATOR_TOKEN}`,
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      console.error('Failed to send log to aggregator:', error);
    }
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  error(
    message: string,
    error?: Error,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.ERROR, message, context, metadata, error);
  }

  fatal(
    message: string,
    error?: Error,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.FATAL, message, context, metadata, error);
  }

  // Specialized logging methods
  api(method: string, path: string, statusCode: number, duration: number): void {
    this.info(`${method} ${path} ${statusCode} ${duration}ms`, 'API', {
      method,
      path,
      statusCode,
      duration,
    });
  }

  database(operation: string, table: string, duration: number, error?: Error): void {
    if (error) {
      this.error(`Database ${operation} failed on ${table}`, error, 'Database', {
        operation,
        table,
        duration,
      });
    } else {
      this.debug(`Database ${operation} on ${table} (${duration}ms)`, 'Database', {
        operation,
        table,
        duration,
      });
    }
  }

  external(service: string, operation: string, statusCode?: number, error?: Error): void {
    if (error) {
      this.error(`External service ${service} ${operation} failed`, error, 'External', {
        service,
        operation,
        statusCode,
      });
    } else {
      this.info(`External service ${service} ${operation} succeeded`, 'External', {
        service,
        operation,
        statusCode,
      });
    }
  }

  security(event: string, userId?: string, metadata?: Record<string, any>): void {
    this.warn(`Security event: ${event}`, 'Security', {
      event,
      userId,
      ...metadata,
    });
  }

  performance(metric: string, value: number, unit: string = 'ms'): void {
    this.debug(`Performance: ${metric} = ${value}${unit}`, 'Performance', {
      metric,
      value,
      unit,
    });
  }
}

// Export singleton instance
export const logger = new AppLogger();

// Export convenience functions
export const {
  debug,
  info,
  warn,
  error,
  fatal,
  api,
  database,
  external,
  security,
  performance,
} = logger;
