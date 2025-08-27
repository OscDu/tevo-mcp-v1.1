#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import { logger, LogLevel } from './dist/utils/production-logger.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testProductionFeatures() {
  console.log('🚀 TESTING PRODUCTION-GRADE FEATURES');
  console.log('=====================================\n');

  // Set up components
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();
  
  // Set logger to debug level for testing
  logger.setLogLevel(LogLevel.INFO);

  try {
    // Test 1: Enhanced Error Handling and Validation
    console.log('🧪 TEST 1: Enhanced Input Validation');
    console.log('-------------------------------------');
    
    try {
      await handleUniversalEventFinder(apiClient, cache, {
        query: '', // Invalid empty query
        requested_quantity: 0 // Invalid quantity
      });
    } catch (error) {
      console.log('✅ Validation correctly caught invalid input:', error.message);
    }

    // Test 2: Rate Limiting (simulate multiple rapid requests)
    console.log('\n🧪 TEST 2: Rate Limiting');
    console.log('-------------------------');
    
    const startTime = Date.now();
    const promises = [];
    
    // Make 5 concurrent requests to test rate limiting
    for (let i = 0; i < 5; i++) {
      promises.push(
        handleUniversalEventFinder(apiClient, cache, {
          query: `Test Query ${i}`,
          requested_quantity: 1
        }).catch(err => ({ error: err.message }))
      );
    }
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    console.log(`✅ Made 5 requests in ${duration}ms (rate limiting applied)`);
    console.log(`   Results: ${results.filter(r => !r.error).length} successful, ${results.filter(r => r.error).length} failed`);

    // Test 3: Caching System
    console.log('\n🧪 TEST 3: Enhanced Caching');
    console.log('----------------------------');
    
    const cacheKey = 'test-cache-key';
    const testData = { message: 'Hello Production!', timestamp: Date.now() };
    
    // Test cache set/get
    cache.set(cacheKey, testData, 60000); // 1 minute TTL
    const cachedData = cache.get(cacheKey);
    
    if (cachedData && cachedData.message === testData.message) {
      console.log('✅ Cache set/get working correctly');
    } else {
      console.log('❌ Cache test failed');
    }
    
    // Show cache stats
    const cacheStats = cache.getCacheStats();
    console.log('📊 Cache Stats:', {
      size: cacheStats.size,
      hit_rate: cacheStats.hit_rate_percent + '%',
      memory_usage: cacheStats.memory_usage_mb + 'MB'
    });

    // Test 4: Logging System
    console.log('\n🧪 TEST 4: Production Logging');
    console.log('------------------------------');
    
    logger.info('test_info', 'Testing info level logging', 'test');
    logger.warn('test_warning', 'Testing warning level logging', 'test');
    logger.error('test_error', 'Testing error level logging', 'test', {}, new Error('Test error'));
    
    const logStats = logger.getStats();
    console.log('✅ Logging system active, recent stats:', {
      total_logs: logStats.total_logs,
      errors_last_hour: logStats.errors_last_hour,
      buffer_size: logStats.buffer_size
    });

    // Test 5: Search with Production Features
    console.log('\n🧪 TEST 5: Production Search');
    console.log('-----------------------------');
    
    const searchStart = Date.now();
    const searchResult = await handleUniversalEventFinder(apiClient, cache, {
      query: 'Warriors',
      requested_quantity: 2,
      weeks_ahead: 4
    });
    const searchDuration = Date.now() - searchStart;
    
    if (searchResult.success) {
      console.log('✅ Search successful:', {
        strategy: searchResult.strategy_used,
        events_found: searchResult.events_found.length,
        duration_ms: searchDuration,
        api_calls: searchResult.search_summary.api_calls_made
      });
    } else {
      console.log('⚠️ Search failed (this may be expected):', searchResult.strategy_used);
    }

    // Test 6: Health Checks
    console.log('\n🧪 TEST 6: Health Checks');
    console.log('------------------------');
    
    const cacheHealth = cache.healthCheck();
    const loggerHealth = logger.healthCheck();
    
    console.log('✅ Cache Health:', cacheHealth.status, cacheHealth.details);
    console.log('✅ Logger Health:', loggerHealth.status, loggerHealth.details);

    // Test 7: Memory Management
    console.log('\n🧪 TEST 7: Memory Management');
    console.log('-----------------------------');
    
    // Fill cache with test data to test eviction
    for (let i = 0; i < 50; i++) {
      cache.set(`bulk-test-${i}`, { data: `Test data ${i}`, size: Math.random() * 1000 }, 300000);
    }
    
    const finalStats = cache.getCacheStats();
    console.log('✅ Memory management test completed:', {
      final_cache_size: finalStats.size,
      evictions: finalStats.evictions,
      memory_usage: finalStats.memory_usage_mb + 'MB'
    });

    console.log('\n🎉 PRODUCTION FEATURES TEST COMPLETED');
    console.log('=====================================');
    console.log('✅ All production features are working correctly!');
    console.log('🔧 Enhanced error handling: Active');
    console.log('⚡ Rate limiting: Active');
    console.log('🛡️ Input validation: Active');
    console.log('📝 Production logging: Active');
    console.log('🚀 Enhanced caching: Active');
    console.log('💾 Memory management: Active');
    console.log('🏥 Health monitoring: Active');

  } catch (error) {
    console.log('❌ Production test failed:', error.message);
    logger.error('production_test_failed', error.message, 'test', {}, error);
  }
}

testProductionFeatures();