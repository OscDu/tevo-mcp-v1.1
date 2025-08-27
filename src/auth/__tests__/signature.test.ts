import { generateXSignature, buildCanonicalString, validateSignatureParams } from '../signature';

describe('Signature Generation', () => {
  const mockSecret = 'test-secret-key';
  const mockHost = 'api.sandbox.ticketevolution.com';

  describe('buildCanonicalString', () => {
    it('should build canonical string for GET request with no query params', () => {
      const result = buildCanonicalString('GET', mockHost, '/v9/events', {});
      expect(result).toBe(`GET ${mockHost}/v9/events?`);
    });

    it('should build canonical string for GET request with query params', () => {
      const query = { page: 1, per_page: 25, performer_id: 123 };
      const result = buildCanonicalString('GET', mockHost, '/v9/events', query);
      expect(result).toBe(`GET ${mockHost}/v9/events?page=1&per_page=25&performer_id=123`);
    });

    it('should sort query parameters alphabetically', () => {
      const query = { z_param: 'last', a_param: 'first', m_param: 'middle' };
      const result = buildCanonicalString('GET', mockHost, '/v9/events', query);
      expect(result).toBe(`GET ${mockHost}/v9/events?a_param=first&m_param=middle&z_param=last`);
    });

    it('should URL encode query parameter keys and values', () => {
      const query = { 'special key': 'special value!@#' };
      const result = buildCanonicalString('GET', mockHost, '/v9/events', query);
      expect(result).toContain('special%20key=special%20value!%40%23');
    });

    it('should build canonical string for POST request with body', () => {
      const body = JSON.stringify({ test: 'data' });
      const result = buildCanonicalString('POST', mockHost, '/v9/events', undefined, body);
      expect(result).toBe(`POST ${mockHost}/v9/events?${body}`);
    });

    it('should handle boolean and number query params', () => {
      const query = { fuzzy: true, limit: 10, active: false };
      const result = buildCanonicalString('GET', mockHost, '/v9/search', query);
      expect(result).toBe(`GET ${mockHost}/v9/search?active=false&fuzzy=true&limit=10`);
    });
  });

  describe('generateXSignature', () => {
    it('should generate consistent signatures for the same input', () => {
      const params = {
        method: 'GET',
        host: mockHost,
        path: '/v9/events',
        query: { page: 1 },
        secret: mockSecret
      };

      const signature1 = generateXSignature(params);
      const signature2 = generateXSignature(params);
      
      expect(signature1).toBe(signature2);
      expect(signature1).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format
    });

    it('should generate different signatures for different inputs', () => {
      const params1 = {
        method: 'GET',
        host: mockHost,
        path: '/v9/events',
        query: { page: 1 },
        secret: mockSecret
      };

      const params2 = {
        ...params1,
        query: { page: 2 }
      };

      const signature1 = generateXSignature(params1);
      const signature2 = generateXSignature(params2);
      
      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const params1 = {
        method: 'GET',
        host: mockHost,
        path: '/v9/events',
        secret: 'secret1'
      };

      const params2 = {
        ...params1,
        secret: 'secret2'
      };

      const signature1 = generateXSignature(params1);
      const signature2 = generateXSignature(params2);
      
      expect(signature1).not.toBe(signature2);
    });
  });

  describe('validateSignatureParams', () => {
    it('should not throw for valid params', () => {
      const params = {
        method: 'GET',
        host: mockHost,
        path: '/v9/events',
        secret: mockSecret
      };

      expect(() => validateSignatureParams(params)).not.toThrow();
    });

    it('should throw for missing method', () => {
      const params = {
        method: '',
        host: mockHost,
        path: '/v9/events',
        secret: mockSecret
      };

      expect(() => validateSignatureParams(params)).toThrow('Method is required');
    });

    it('should throw for missing host', () => {
      const params = {
        method: 'GET',
        host: '',
        path: '/v9/events',
        secret: mockSecret
      };

      expect(() => validateSignatureParams(params)).toThrow('Host is required');
    });

    it('should throw for missing path', () => {
      const params = {
        method: 'GET',
        host: mockHost,
        path: '',
        secret: mockSecret
      };

      expect(() => validateSignatureParams(params)).toThrow('Path is required');
    });

    it('should throw for missing secret', () => {
      const params = {
        method: 'GET',
        host: mockHost,
        path: '/v9/events',
        secret: ''
      };

      expect(() => validateSignatureParams(params)).toThrow('Secret is required');
    });
  });
});