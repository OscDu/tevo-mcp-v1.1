import { TevoError } from '../types/mcp.js';

export const TEVO_ERROR_CODES = {
  AUTH_ERROR: 'TEVO_AUTH_ERROR',
  RATE_LIMITED: 'TEVO_RATE_LIMITED',
  BAD_REQUEST: 'TEVO_BAD_REQUEST',
  NOT_FOUND: 'TEVO_NOT_FOUND',
  SERVER_ERROR: 'TEVO_SERVER_ERROR',
  NETWORK_ERROR: 'TEVO_NETWORK_ERROR',
  TIMEOUT_ERROR: 'TEVO_TIMEOUT_ERROR',
  VALIDATION_ERROR: 'TEVO_VALIDATION_ERROR',
  CIRCUIT_BREAKER_OPEN: 'TEVO_CIRCUIT_BREAKER_OPEN',
  SERVICE_UNAVAILABLE: 'TEVO_SERVICE_UNAVAILABLE',
  SEARCH_FAILED: 'TEVO_SEARCH_FAILED',
  DATA_CORRUPTION: 'TEVO_DATA_CORRUPTION'
} as const;

export function createTevoError(
  message: string,
  code: string,
  statusCode?: number,
  tevoErrorCode?: string
): TevoError {
  const error = new Error(message) as TevoError;
  error.code = code;
  error.statusCode = statusCode;
  error.tevoErrorCode = tevoErrorCode;
  return error;
}

export function mapHttpStatusToTevoError(statusCode: number, message: string): TevoError {
  switch (statusCode) {
    case 400:
      return createTevoError(message, TEVO_ERROR_CODES.BAD_REQUEST, statusCode);
    case 401:
    case 403:
      return createTevoError(message, TEVO_ERROR_CODES.AUTH_ERROR, statusCode);
    case 404:
      return createTevoError(message, TEVO_ERROR_CODES.NOT_FOUND, statusCode);
    case 429:
      return createTevoError(message, TEVO_ERROR_CODES.RATE_LIMITED, statusCode);
    case 500:
    case 502:
    case 503:
    case 504:
      return createTevoError(message, TEVO_ERROR_CODES.SERVER_ERROR, statusCode);
    default:
      return createTevoError(message, TEVO_ERROR_CODES.SERVER_ERROR, statusCode);
  }
}

export function isRetryableError(error: TevoError): boolean {
  return (
    error.code === TEVO_ERROR_CODES.RATE_LIMITED ||
    error.code === TEVO_ERROR_CODES.SERVER_ERROR ||
    error.code === TEVO_ERROR_CODES.TIMEOUT_ERROR ||
    error.code === TEVO_ERROR_CODES.NETWORK_ERROR ||
    error.code === TEVO_ERROR_CODES.SERVICE_UNAVAILABLE
  );
}

export function isTemporaryError(error: TevoError): boolean {
  return (
    error.code === TEVO_ERROR_CODES.RATE_LIMITED ||
    error.code === TEVO_ERROR_CODES.TIMEOUT_ERROR ||
    error.code === TEVO_ERROR_CODES.NETWORK_ERROR ||
    (error.code === TEVO_ERROR_CODES.SERVER_ERROR && (error.statusCode ?? 0) >= 500)
  );
}

export function shouldCircuitBreak(error: TevoError): boolean {
  return (
    error.code === TEVO_ERROR_CODES.SERVER_ERROR ||
    error.code === TEVO_ERROR_CODES.SERVICE_UNAVAILABLE ||
    (error.statusCode !== undefined && error.statusCode >= 500)
  );
}

export function getErrorSeverity(error: TevoError): 'low' | 'medium' | 'high' | 'critical' {
  switch (error.code) {
    case TEVO_ERROR_CODES.NOT_FOUND:
    case TEVO_ERROR_CODES.BAD_REQUEST:
      return 'low';
    case TEVO_ERROR_CODES.RATE_LIMITED:
    case TEVO_ERROR_CODES.TIMEOUT_ERROR:
      return 'medium';
    case TEVO_ERROR_CODES.AUTH_ERROR:
    case TEVO_ERROR_CODES.NETWORK_ERROR:
      return 'high';
    case TEVO_ERROR_CODES.SERVER_ERROR:
    case TEVO_ERROR_CODES.SERVICE_UNAVAILABLE:
    case TEVO_ERROR_CODES.DATA_CORRUPTION:
      return 'critical';
    default:
      return 'medium';
  }
}

export class ProductionErrorHandler {
  private static errorCounts = new Map<string, { count: number, lastOccurrence: number }>();
  private static circuitBreakerState = new Map<string, { isOpen: boolean, lastFailure: number, failureCount: number }>();
  
  static recordError(error: TevoError, context: string): void {
    const key = `${context}:${error.code}`;
    const now = Date.now();
    const existing = this.errorCounts.get(key) || { count: 0, lastOccurrence: 0 };
    
    // Reset count if last error was more than 1 hour ago
    if (now - existing.lastOccurrence > 3600000) {
      existing.count = 0;
    }
    
    existing.count++;
    existing.lastOccurrence = now;
    this.errorCounts.set(key, existing);
    
    // Log structured error for monitoring
    console.error(JSON.stringify({
      type: 'production_error',
      context,
      error_code: error.code,
      error_message: error.message,
      status_code: error.statusCode,
      severity: getErrorSeverity(error),
      occurrence_count: existing.count,
      timestamp: new Date().toISOString()
    }));
    
    // Update circuit breaker if needed
    if (shouldCircuitBreak(error)) {
      this.updateCircuitBreaker(context, error);
    }
  }
  
  private static updateCircuitBreaker(context: string, _error: TevoError): void {
    const existing = this.circuitBreakerState.get(context) || { isOpen: false, lastFailure: 0, failureCount: 0 };
    existing.failureCount++;
    existing.lastFailure = Date.now();
    
    // Open circuit breaker after 5 failures in 5 minutes
    if (existing.failureCount >= 5 && Date.now() - existing.lastFailure < 300000) {
      existing.isOpen = true;
      console.error(JSON.stringify({
        type: 'circuit_breaker_opened',
        context,
        failure_count: existing.failureCount,
        timestamp: new Date().toISOString()
      }));
    }
    
    this.circuitBreakerState.set(context, existing);
  }
  
  static isCircuitOpen(context: string): boolean {
    const state = this.circuitBreakerState.get(context);
    if (!state || !state.isOpen) return false;
    
    // Auto-reset circuit breaker after 5 minutes
    if (Date.now() - state.lastFailure > 300000) {
      state.isOpen = false;
      state.failureCount = 0;
      this.circuitBreakerState.set(context, state);
      console.error(JSON.stringify({
        type: 'circuit_breaker_reset',
        context,
        timestamp: new Date().toISOString()
      }));
      return false;
    }
    
    return true;
  }
  
  static getErrorStats(): Record<string, any> {
    return {
      error_counts: Object.fromEntries(this.errorCounts),
      circuit_breakers: Object.fromEntries(this.circuitBreakerState),
      timestamp: new Date().toISOString()
    };
  }
}