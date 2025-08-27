import axios from 'axios';
import { TevoHttpClient } from '../http';
import { TevoConfig } from '../../types/tevo';
import { TEVO_ERROR_CODES } from '../../utils/errors';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TevoHttpClient', () => {
  const mockConfig: TevoConfig = {
    env: 'sandbox',
    apiToken: 'test-token',
    apiSecret: 'test-secret',
    baseUrl: 'https://api.sandbox.ticketevolution.com/v9',
    timeoutMs: 5000,
    maxRetries: 2
  };

  let client: TevoHttpClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      create: jest.fn().mockReturnThis(),
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn()
        },
        response: {
          use: jest.fn()
        }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    client = new TevoHttpClient(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful requests', () => {
    it('should make GET request with proper headers and signature', async () => {
      const mockResponse = { data: { test: 'data' } };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.get('/test', { param: 'value' });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          params: { param: 'value' },
          headers: expect.objectContaining({
            'X-Token': 'test-token',
            'X-Signature': expect.any(String)
          })
        })
      );

      expect(result).toEqual({ test: 'data' });
    });

    it('should make POST request with proper signature', async () => {
      const mockResponse = { data: { success: true } };
      const postData = { test: 'data' };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.post('/test', postData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/test',
          data: postData,
          headers: expect.objectContaining({
            'X-Token': 'test-token',
            'X-Signature': expect.any(String)
          })
        })
      );

      expect(result).toEqual({ success: true });
    });
  });

  describe('Error handling', () => {
    it('should handle 401 authentication errors', async () => {
      const error = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Invalid signature' }
        }
      };
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(client.get('/test')).rejects.toMatchObject({
        code: TEVO_ERROR_CODES.AUTH_ERROR,
        statusCode: 401
      });
    });

    it('should handle 404 not found errors', async () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Event not found' }
        }
      };
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(client.get('/test')).rejects.toMatchObject({
        code: TEVO_ERROR_CODES.NOT_FOUND,
        statusCode: 404
      });
    });

    it('should handle 429 rate limit errors', async () => {
      const error = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: { message: 'Rate limit exceeded' }
        }
      };
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(client.get('/test')).rejects.toMatchObject({
        code: TEVO_ERROR_CODES.RATE_LIMITED,
        statusCode: 429
      });
    });

    it('should handle 500 server errors', async () => {
      const error = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Server error' }
        }
      };
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(client.get('/test')).rejects.toMatchObject({
        code: TEVO_ERROR_CODES.SERVER_ERROR,
        statusCode: 500
      });
    });

    it('should handle timeout errors', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout'
      };
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(client.get('/test')).rejects.toMatchObject({
        code: TEVO_ERROR_CODES.TIMEOUT_ERROR
      });
    });

    it('should handle network errors', async () => {
      const error = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND'
      };
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(client.get('/test')).rejects.toMatchObject({
        code: TEVO_ERROR_CODES.NETWORK_ERROR
      });
    });
  });

  describe('Retry logic', () => {
    it('should retry on retryable errors', async () => {
      const error = {
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      };
      
      mockAxiosInstance.request
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ data: { success: true } });

      const result = await client.get('/test');

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('should not retry on non-retryable errors', async () => {
      const error = {
        response: {
          status: 400,
          statusText: 'Bad Request'
        }
      };
      
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(client.get('/test')).rejects.toMatchObject({
        code: TEVO_ERROR_CODES.BAD_REQUEST
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should respect max retry limit', async () => {
      const error = {
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      };
      
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(client.get('/test')).rejects.toMatchObject({
        code: TEVO_ERROR_CODES.SERVER_ERROR
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3); // 1 + 2 retries
    });
  });
});