import { TevoConfig } from '../types/tevo.js';
import { createTevoError, TEVO_ERROR_CODES } from './errors.js';

export function loadConfig(): TevoConfig {
  const env = process.env.TEVO_ENV || 'sandbox';
  const apiToken = process.env.TEVO_API_TOKEN;
  const apiSecret = process.env.TEVO_API_SECRET;
  const timeoutMs = parseInt(process.env.TEVO_TIMEOUT_MS || '8000', 10);
  const maxRetries = parseInt(process.env.TEVO_MAX_RETRIES || '2', 10);

  if (!apiToken) {
    throw createTevoError('TEVO_API_TOKEN environment variable is required', TEVO_ERROR_CODES.VALIDATION_ERROR);
  }

  if (!apiSecret) {
    throw createTevoError('TEVO_API_SECRET environment variable is required', TEVO_ERROR_CODES.VALIDATION_ERROR);
  }

  if (env !== 'sandbox' && env !== 'production') {
    throw createTevoError('TEVO_ENV must be either "sandbox" or "production"', TEVO_ERROR_CODES.VALIDATION_ERROR);
  }

  const baseUrl = getBaseUrl(env);

  return {
    env: env as 'sandbox' | 'production',
    apiToken,
    apiSecret,
    baseUrl,
    timeoutMs,
    maxRetries
  };
}

function getBaseUrl(env: string): string {
  switch (env) {
    case 'sandbox':
      return 'https://api.sandbox.ticketevolution.com/v9';
    case 'production':
      return 'https://api.ticketevolution.com/v9';
    default:
      throw createTevoError(`Unknown environment: ${env}`, TEVO_ERROR_CODES.VALIDATION_ERROR);
  }
}

export function validateConfig(config: TevoConfig): void {
  if (!config.apiToken) {
    throw createTevoError('API token is required', TEVO_ERROR_CODES.VALIDATION_ERROR);
  }

  if (!config.apiSecret) {
    throw createTevoError('API secret is required', TEVO_ERROR_CODES.VALIDATION_ERROR);
  }

  if (!config.baseUrl) {
    throw createTevoError('Base URL is required', TEVO_ERROR_CODES.VALIDATION_ERROR);
  }

  if (config.timeoutMs <= 0) {
    throw createTevoError('Timeout must be positive', TEVO_ERROR_CODES.VALIDATION_ERROR);
  }

  if (config.maxRetries < 0) {
    throw createTevoError('Max retries must be non-negative', TEVO_ERROR_CODES.VALIDATION_ERROR);
  }
}