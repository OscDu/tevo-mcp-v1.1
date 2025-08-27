import { ProductionValidator } from './production-validation.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  type: string;
  message: string;
  context?: string;
  correlation_id?: string;
  duration_ms?: number;
  error_code?: string;
  metadata?: Record<string, any>;
  stack_trace?: string;
}

export class ProductionLogger {
  private static instance: ProductionLogger;
  private currentLogLevel: LogLevel = LogLevel.INFO;
  private maxLogBuffer = 1000;
  private logBuffer: LogEntry[] = [];
  private stats = {
    total_logs: 0,
    errors_last_hour: 0,
    warnings_last_hour: 0,
    last_reset: Date.now()
  };

  private constructor() {
    // Private constructor for singleton
    this.setupPeriodicStats();
  }

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
    this.info('log_level_changed', `Log level set to ${LogLevel[level]}`, 'system');
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  private createLogEntry(
    level: LogLevel,
    type: string,
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      type,
      message
    };

    if (context !== undefined) {
      entry.context = context;
    }

    if (metadata) {
      entry.metadata = ProductionValidator.sanitizeForLog(metadata);
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxLogBuffer) {
      this.logBuffer.shift(); // Remove oldest entry
    }

    // Update stats
    this.stats.total_logs++;
    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.CRITICAL) {
      this.stats.errors_last_hour++;
    } else if (entry.level === LogLevel.WARN) {
      this.stats.warnings_last_hour++;
    }

    // Output to stderr for MCP compliance
    console.error(JSON.stringify(entry));
  }

  debug(type: string, message: string, context?: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, type, message, context, metadata);
      this.writeLog(entry);
    }
  }

  info(type: string, message: string, context?: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, type, message, context, metadata);
      this.writeLog(entry);
    }
  }

  warn(type: string, message: string, context?: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.createLogEntry(LogLevel.WARN, type, message, context, metadata);
      this.writeLog(entry);
    }
  }

  error(type: string, message: string, context?: string, metadata?: Record<string, any>, error?: Error): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry(LogLevel.ERROR, type, message, context, metadata);
      if (error) {
        if (error.stack !== undefined) {
          entry.stack_trace = error.stack;
        }
        if ((error as any).code !== undefined) {
          entry.error_code = (error as any).code;
        }
      }
      this.writeLog(entry);
    }
  }

  critical(type: string, message: string, context?: string, metadata?: Record<string, any>, error?: Error): void {
    const entry = this.createLogEntry(LogLevel.CRITICAL, type, message, context, metadata);
    if (error) {
      if (error.stack !== undefined) {
        entry.stack_trace = error.stack;
      }
      if ((error as any).code !== undefined) {
        entry.error_code = (error as any).code;
      }
    }
    this.writeLog(entry);
  }

  // Specialized logging methods for different scenarios
  logRequestStart(method: string, path: string, correlationId: string, metadata?: Record<string, any>): void {
    this.debug('request_start', `${method} ${path}`, 'http', {
      correlation_id: correlationId,
      ...metadata
    });
  }

  logRequestComplete(
    method: string, 
    path: string, 
    correlationId: string, 
    durationMs: number, 
    statusCode?: number
  ): void {
    const level = (statusCode && statusCode >= 400) ? LogLevel.WARN : LogLevel.INFO;
    const entry = this.createLogEntry(
      level,
      'request_complete',
      `${method} ${path} completed`,
      'http',
      { correlation_id: correlationId, status_code: statusCode }
    );
    entry.duration_ms = durationMs;
    if (correlationId !== undefined) {
      entry.correlation_id = correlationId;
    }
    this.writeLog(entry);
  }

  logSearchStart(query: string, strategy: string, correlationId?: string): void {
    this.info('search_start', `Starting search with strategy: ${strategy}`, 'search', {
      query: ProductionValidator.sanitizeForLog(query),
      strategy,
      correlation_id: correlationId
    });
  }

  logSearchComplete(
    query: string, 
    strategy: string, 
    resultsFound: number, 
    durationMs: number, 
    correlationId?: string
  ): void {
    const entry = this.createLogEntry(
      LogLevel.INFO,
      'search_complete',
      `Search completed: ${resultsFound} results`,
      'search',
      {
        query: ProductionValidator.sanitizeForLog(query),
        strategy,
        results_found: resultsFound,
        correlation_id: correlationId
      }
    );
    entry.duration_ms = durationMs;
    this.writeLog(entry);
  }

  logCacheHit(key: string, ttl?: number): void {
    this.debug('cache_hit', `Cache hit for key: ${key}`, 'cache', { 
      cache_key: key, 
      ttl_remaining: ttl 
    });
  }

  logCacheMiss(key: string): void {
    this.debug('cache_miss', `Cache miss for key: ${key}`, 'cache', { 
      cache_key: key 
    });
  }

  logBusinessLogic(event: string, details: Record<string, any>, context?: string): void {
    this.info('business_event', event, context || 'business', details);
  }

  logPerformanceMetric(metric: string, value: number, unit: string, context?: string): void {
    this.info('performance_metric', `${metric}: ${value}${unit}`, context || 'performance', {
      metric_name: metric,
      metric_value: value,
      metric_unit: unit
    });
  }

  logUserAction(action: string, userId?: string, metadata?: Record<string, any>): void {
    this.info('user_action', action, 'user', {
      user_id: userId ? ProductionValidator.sanitizeForLog(userId) : 'anonymous',
      ...metadata
    });
  }

  // Get current stats and recent logs for monitoring
  getStats(): Record<string, any> {
    return {
      ...this.stats,
      current_log_level: LogLevel[this.currentLogLevel],
      buffer_size: this.logBuffer.length,
      timestamp: new Date().toISOString()
    };
  }

  getRecentLogs(count: number = 100, level?: LogLevel): LogEntry[] {
    let logs = this.logBuffer.slice(-count);
    
    if (level !== undefined) {
      logs = logs.filter(log => log.level >= level);
    }
    
    return logs;
  }

  getRecentErrors(count: number = 50): LogEntry[] {
    return this.logBuffer
      .filter(log => log.level >= LogLevel.ERROR)
      .slice(-count);
  }

  private setupPeriodicStats(): void {
    // Reset hourly stats every hour
    setInterval(() => {
      this.stats.errors_last_hour = 0;
      this.stats.warnings_last_hour = 0;
      this.stats.last_reset = Date.now();
      
      this.info('stats_reset', 'Hourly stats reset', 'system', this.getStats());
    }, 3600000); // 1 hour
  }

  // Health check for logging system
  healthCheck(): { status: 'healthy' | 'degraded' | 'unhealthy', details: Record<string, any> } {
    const stats = this.getStats();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check error rate
    if (stats.errors_last_hour > 100) {
      status = 'unhealthy';
    } else if (stats.errors_last_hour > 50) {
      status = 'degraded';
    }
    
    // Check if logging is working
    const recentLogs = this.getRecentLogs(10);
    if (recentLogs.length === 0) {
      status = 'unhealthy';
    }
    
    return {
      status,
      details: {
        ...stats,
        recent_log_count: recentLogs.length
      }
    };
  }
}

// Export singleton instance
export const logger = ProductionLogger.getInstance();

// Convenience functions for common use cases
export function logError(message: string, error?: Error, context?: string, metadata?: Record<string, any>): void {
  logger.error('application_error', message, context, metadata, error);
}

export function logWarning(message: string, context?: string, metadata?: Record<string, any>): void {
  logger.warn('application_warning', message, context, metadata);
}

export function logInfo(message: string, context?: string, metadata?: Record<string, any>): void {
  logger.info('application_info', message, context, metadata);
}

export function logDebug(message: string, context?: string, metadata?: Record<string, any>): void {
  logger.debug('application_debug', message, context, metadata);
}