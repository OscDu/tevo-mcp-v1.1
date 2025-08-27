import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { TevoConfig } from '../types/tevo.js';
import { TevoError } from '../types/mcp.js';
import { generateXSignature } from '../auth/signature.js';
import { 
  createTevoError, 
  mapHttpStatusToTevoError, 
  isRetryableError, 
  TEVO_ERROR_CODES 
} from '../utils/errors.js';

export class TevoHttpClient {
  private axios: AxiosInstance;
  private config: TevoConfig;
  private requestCount = 0;
  private lastRequestTime = 0;
  private static readonly MAX_REQUESTS_PER_SECOND = 10;

  constructor(config: TevoConfig) {
    this.config = config;
    this.axios = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.axios.interceptors.request.use((config) => {
      const correlationId = this.generateCorrelationId();
      config.headers['X-Correlation-ID'] = correlationId;
      
      const startTime = Date.now();
      (config as any).metadata = { startTime, correlationId };
      
      return config;
    });

    this.axios.interceptors.response.use(
      (response) => {
        this.logResponse(response);
        return response;
      },
      (error) => {
        this.logError(error);
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private generateCorrelationId(): string {
    return `tevo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logResponse(response: AxiosResponse): void {
    const { config } = response;
    const duration = Date.now() - ((config as any).metadata?.startTime || 0);
    
    console.error(JSON.stringify({
      type: 'http_response',
      correlation_id: (config as any).metadata?.correlationId,
      method: config.method?.toUpperCase(),
      path: config.url,
      status: response.status,
      duration_ms: duration,
      result_count: this.getResultCount(response.data)
    }));
  }

  private logError(error: any): void {
    const { config } = error;
    const duration = config ? Date.now() - ((config as any).metadata?.startTime || 0) : 0;
    
    console.error(JSON.stringify({
      type: 'http_error',
      correlation_id: (config as any)?.metadata?.correlationId,
      method: config?.method?.toUpperCase(),
      path: config?.url,
      status: error.response?.status,
      duration_ms: duration,
      error_message: error.message
    }));
  }

  private getResultCount(data: any): number {
    if (Array.isArray(data)) return data.length;
    if (data?.events) return data.events.length;
    if (data?.listings) return data.listings.length;
    if (data?.ticket_groups) return data.ticket_groups.length;
    if (data?.performers) return data.performers.length;
    if (data?.venues) return data.venues.length;
    return 1;
  }

  private handleError(error: any): TevoError {
    if (error.code === 'ECONNABORTED') {
      return createTevoError('Request timeout', TEVO_ERROR_CODES.TIMEOUT_ERROR);
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return createTevoError('Network error', TEVO_ERROR_CODES.NETWORK_ERROR);
    }

    if (error.response) {
      const message = error.response.data?.message || error.response.statusText || 'Unknown error';
      return mapHttpStatusToTevoError(error.response.status, message);
    }

    return createTevoError(error.message || 'Unknown error', TEVO_ERROR_CODES.SERVER_ERROR);
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>('GET', path, params);
  }

  async getWithHeaders<T>(path: string, params?: Record<string, any>, testHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, params, undefined, testHeaders);
  }

  async post<T>(path: string, data?: any): Promise<T> {
    return this.request<T>('POST', path, undefined, data);
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counter every second
    if (now - this.lastRequestTime > 1000) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }
    
    // If we've hit the rate limit, wait
    if (this.requestCount >= TevoHttpClient.MAX_REQUESTS_PER_SECOND) {
      const waitTime = 1000 - (now - this.lastRequestTime);
      if (waitTime > 0) {
        await this.delay(waitTime);
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
      }
    }
    
    this.requestCount++;
  }
  
  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, any>,
    data?: any,
    testHeaders?: Record<string, string>
  ): Promise<T> {
    // Enforce rate limiting
    await this.enforceRateLimit();
    
    const url = new URL(this.config.baseUrl);
    url.pathname = url.pathname + path;  // Append path to preserve /v9
    const host = url.host;
    const pathname = url.pathname;
    
    let attempt = 0;
    const maxAttempts = this.config.maxRetries + 1;

    while (attempt < maxAttempts) {
      try {
        const signature = generateXSignature({
          method,
          host,
          path: pathname,
          query: params || undefined,
          body: data ? JSON.stringify(data) : undefined,
          secret: this.config.apiSecret
        });


        const config: AxiosRequestConfig = {
          method,
          url: path,
          params,
          data,
          headers: {
            'X-Token': this.config.apiToken,
            'X-Signature': signature,
            ...testHeaders
          }
        };

        const response = await this.axios.request<T>(config);
        return response.data;

      } catch (error) {
        const tevoError = error as TevoError;
        
        if (attempt === maxAttempts - 1 || !isRetryableError(tevoError)) {
          throw tevoError;
        }

        const delayMs = this.calculateBackoffDelay(attempt, tevoError);
        await this.delay(delayMs);
        attempt++;
      }
    }

    throw createTevoError('Max retries exceeded', TEVO_ERROR_CODES.SERVER_ERROR);
  }

  private calculateBackoffDelay(attempt: number, error: TevoError): number {
    if (error.code === TEVO_ERROR_CODES.RATE_LIMITED) {
      return Math.min(1000 * Math.pow(2, attempt), 30000);
    }
    return Math.min(500 * Math.pow(2, attempt), 5000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}