interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessedAt: number;
  size?: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private requestCache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000; // Max number of entries
  private maxMemoryMB = 100; // Max memory usage in MB
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    total_requests: 0
  };

  set<T>(key: string, data: T, ttlMs: number): void {
    const now = Date.now();
    const expiresAt = now + ttlMs;
    const entry: CacheEntry<T> = {
      data,
      expiresAt,
      createdAt: now,
      accessCount: 0,
      lastAccessedAt: now,
      size: this.estimateSize(data)
    };
    
    // Check if we need to evict entries
    this.enforceMemoryLimits();
    
    this.cache.set(key, entry);
    this.stats.sets++;
    
    console.error(JSON.stringify({
      type: 'cache_set',
      key: this.sanitizeKey(key),
      ttl_ms: ttlMs,
      estimated_size: entry.size,
      timestamp: new Date().toISOString()
    }));
  }

  get<T>(key: string): T | null {
    this.stats.total_requests++;
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      console.error(JSON.stringify({
        type: 'cache_miss',
        key: this.sanitizeKey(key),
        timestamp: new Date().toISOString()
      }));
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      console.error(JSON.stringify({
        type: 'cache_expired',
        key: this.sanitizeKey(key),
        expired_since_ms: now - entry.expiresAt,
        timestamp: new Date().toISOString()
      }));
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessedAt = now;
    this.stats.hits++;
    
    console.error(JSON.stringify({
      type: 'cache_hit',
      key: this.sanitizeKey(key),
      access_count: entry.accessCount,
      age_ms: now - entry.createdAt,
      ttl_remaining_ms: entry.expiresAt - now,
      timestamp: new Date().toISOString()
    }));

    return entry.data;
  }

  setRequestScoped<T>(key: string, data: T): void {
    const now = Date.now();
    this.requestCache.set(key, { 
      data, 
      expiresAt: now + 300000, // 5 minutes for request scope
      createdAt: now,
      accessCount: 0,
      lastAccessedAt: now
    });
  }

  getRequestScoped<T>(key: string): T | null {
    const entry = this.requestCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.requestCache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  clearRequestScoped(): void {
    this.requestCache.clear();
  }

  getCacheStats(): Record<string, any> {
    this.cleanup();
    
    const memoryUsage = this.calculateMemoryUsage();
    const hitRate = this.stats.total_requests > 0 
      ? (this.stats.hits / this.stats.total_requests * 100).toFixed(2)
      : '0.00';
    
    return {
      size: this.cache.size,
      request_size: this.requestCache.size,
      max_size: this.maxSize,
      memory_usage_mb: memoryUsage.toFixed(2),
      max_memory_mb: this.maxMemoryMB,
      hit_rate_percent: hitRate,
      ...this.stats,
      timestamp: new Date().toISOString()
    };
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    for (const [key, entry] of this.requestCache.entries()) {
      if (now > entry.expiresAt) {
        this.requestCache.delete(key);
      }
    }
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => {
        const value = params[key];
        // Truncate long values to prevent key bloat
        const stringValue = typeof value === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...'
          : String(value);
        return `${key}=${stringValue}`;
      })
      .join('&');
    return `${prefix}:${sortedParams}`;
  }
  
  private estimateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // Rough estimate: 2 bytes per character
    } catch {
      return 1024; // Default 1KB if can't serialize
    }
  }
  
  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0;
    }
    return totalSize / (1024 * 1024); // Convert to MB
  }
  
  private enforceMemoryLimits(): void {
    // Check size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed(Math.floor(this.maxSize * 0.1)); // Evict 10%
    }
    
    // Check memory limit
    const memoryUsage = this.calculateMemoryUsage();
    if (memoryUsage > this.maxMemoryMB) {
      this.evictLeastRecentlyUsed(Math.floor(this.cache.size * 0.2)); // Evict 20%
    }
  }
  
  private evictLeastRecentlyUsed(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt)
      .slice(0, count);
    
    for (const [key] of entries) {
      this.cache.delete(key);
      this.stats.evictions++;
    }
    
    if (entries.length > 0) {
      console.error(JSON.stringify({
        type: 'cache_eviction',
        evicted_count: entries.length,
        reason: 'memory_limit',
        remaining_entries: this.cache.size,
        timestamp: new Date().toISOString()
      }));
    }
  }
  
  private sanitizeKey(key: string): string {
    // Remove sensitive information from keys for logging
    return key.replace(/([?&])(token|key|secret|auth)=[^&]*/gi, '$1$2=[REDACTED]');
  }
  
  // Health check for cache system
  healthCheck(): { status: 'healthy' | 'degraded' | 'unhealthy', details: Record<string, any> } {
    const stats = this.getCacheStats();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check memory usage
    const memoryUsage = parseFloat(stats.memory_usage_mb);
    if (memoryUsage > this.maxMemoryMB * 0.9) {
      status = 'degraded';
    }
    if (memoryUsage > this.maxMemoryMB) {
      status = 'unhealthy';
    }
    
    // Check hit rate
    const hitRate = parseFloat(stats.hit_rate_percent);
    if (hitRate < 50) {
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }
    
    return { status, details: stats };
  }
  
  // Production cache prewarming
  preWarm<T>(key: string, dataProvider: () => Promise<T>, ttlMs: number): Promise<void> {
    return dataProvider()
      .then(data => {
        this.set(key, data, ttlMs);
        console.error(JSON.stringify({
          type: 'cache_prewarmed',
          key: this.sanitizeKey(key),
          timestamp: new Date().toISOString()
        }));
      })
      .catch(error => {
        console.error(JSON.stringify({
          type: 'cache_prewarm_failed',
          key: this.sanitizeKey(key),
          error: error.message,
          timestamp: new Date().toISOString()
        }));
      });
  }
}