import { MemoryCache } from '../memory-cache';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  describe('Basic cache operations', () => {
    it('should store and retrieve data', () => {
      const data = { test: 'value' };
      cache.set('test-key', data, 1000);

      const result = cache.get('test-key');
      expect(result).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should expire data after TTL', async () => {
      const data = { test: 'value' };
      cache.set('test-key', data, 10); // 10ms TTL

      expect(cache.get('test-key')).toEqual(data);

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(cache.get('test-key')).toBeNull();
    });

    it('should clear all cached data', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 1000);

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('Request-scoped cache', () => {
    it('should store and retrieve request-scoped data', () => {
      const data = { test: 'value' };
      cache.setRequestScoped('test-key', data);

      const result = cache.getRequestScoped('test-key');
      expect(result).toEqual(data);
    });

    it('should return null for non-existent request-scoped keys', () => {
      const result = cache.getRequestScoped('non-existent');
      expect(result).toBeNull();
    });

    it('should expire request-scoped data after TTL', async () => {
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      const data = { test: 'value' };
      cache.setRequestScoped('test-key', data);

      expect(cache.getRequestScoped('test-key')).toEqual(data);

      currentTime += 300001; // Move beyond 5 minute TTL

      expect(cache.getRequestScoped('test-key')).toBeNull();

      Date.now = originalNow;
    });

    it('should clear request-scoped data independently', () => {
      cache.set('main-key', 'main-value', 1000);
      cache.setRequestScoped('request-key', 'request-value');

      cache.clearRequestScoped();

      expect(cache.get('main-key')).toBe('main-value');
      expect(cache.getRequestScoped('request-key')).toBeNull();
    });
  });

  describe('Key generation', () => {
    it('should generate consistent keys for same parameters', () => {
      const params1 = { a: 1, b: 2, c: 3 };
      const params2 = { c: 3, a: 1, b: 2 }; // Different order

      const key1 = cache.generateKey('prefix', params1);
      const key2 = cache.generateKey('prefix', params2);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different parameters', () => {
      const params1 = { a: 1, b: 2 };
      const params2 = { a: 1, b: 3 };

      const key1 = cache.generateKey('prefix', params1);
      const key2 = cache.generateKey('prefix', params2);

      expect(key1).not.toBe(key2);
    });

    it('should include prefix in generated key', () => {
      const params = { a: 1, b: 2 };
      const key = cache.generateKey('test-prefix', params);

      expect(key).toContain('test-prefix');
    });

    it('should sort parameters alphabetically in key', () => {
      const params = { z: 1, a: 2, m: 3 };
      const key = cache.generateKey('prefix', params);

      expect(key).toBe('prefix:a=2&m=3&z=1');
    });
  });

  describe('Cache statistics', () => {
    it('should provide accurate cache statistics', () => {
      cache.set('key1', 'value1', 1000);
      cache.set('key2', 'value2', 1000);
      cache.setRequestScoped('req-key1', 'value1');

      const stats = cache.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.requestSize).toBe(1);
    });

    it('should clean up expired entries when getting stats', async () => {
      cache.set('key1', 'value1', 10); // Short TTL
      cache.set('key2', 'value2', 1000); // Long TTL

      await new Promise(resolve => setTimeout(resolve, 20));

      const stats = cache.getCacheStats();

      expect(stats.size).toBe(1); // Only the non-expired entry
    });
  });

  describe('Data types', () => {
    it('should handle different data types correctly', () => {
      const stringData = 'test string';
      const numberData = 42;
      const objectData = { key: 'value', nested: { data: true } };
      const arrayData = [1, 2, 3, { item: 'value' }];

      cache.set('string', stringData, 1000);
      cache.set('number', numberData, 1000);
      cache.set('object', objectData, 1000);
      cache.set('array', arrayData, 1000);

      expect(cache.get('string')).toBe(stringData);
      expect(cache.get('number')).toBe(numberData);
      expect(cache.get('object')).toEqual(objectData);
      expect(cache.get('array')).toEqual(arrayData);
    });
  });
});