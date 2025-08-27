#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testSportsFilter() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  console.log('🏈 TESTING SPORTS FILTER: Yankees Search');
  console.log('🎯 Should ONLY return live sports events');
  console.log('❌ Should EXCLUDE concerts, tours, shows');
  console.log('=' .repeat(60));

  try {
    const result = await handleUniversalEventFinder(apiClient, cache, {
      query: 'Yankees',
      weeks_ahead: 20,
      budget_per_ticket: 500,
      requested_quantity: 4
    });

    if (result.success && result.events_found.length > 0) {
      console.log(`\n✅ Found ${result.events_found.length} SPORTS events`);
      console.log(`📊 Strategy used: ${result.strategy_used}`);
      
      if (result.search_summary.sports_events_only !== undefined) {
        console.log(`🏀 Sports events only: ${result.search_summary.sports_events_only}`);
        console.log(`🚫 Non-sports filtered out: ${result.search_summary.non_sports_filtered_out}`);
      }

      console.log('\n🏈 EVENTS FOUND (SPORTS ONLY):');
      console.log('-'.repeat(60));
      
      result.events_found.forEach((event, index) => {
        console.log(`${index + 1}. ${event.name}`);
        console.log(`   📅 ${event.date} at ${event.time}`);
        console.log(`   🏟️ ${event.venue}, ${event.city}`);
        
        // Verify it's a sports event
        const name = event.name.toLowerCase();
        if (name.includes('concert') || name.includes('tour') || name.includes('show')) {
          console.log(`   🚨 WARNING: NON-SPORTS EVENT DETECTED!`);
        } else {
          console.log(`   ✅ Verified as sports event`);
        }
        console.log('');
      });

    } else {
      console.log('❌ No sports events found');
      if (result.search_summary?.non_sports_filtered_out > 0) {
        console.log(`🚫 ${result.search_summary.non_sports_filtered_out} non-sports events were filtered out`);
      }
    }

    console.log('\n🎯 FILTER TEST SUMMARY:');
    console.log('=' .repeat(40));
    console.log(`Total events discovered: ${result.search_summary?.events_discovered || 0}`);
    console.log(`Sports events only: ${result.search_summary?.sports_events_only || 0}`);
    console.log(`Non-sports filtered out: ${result.search_summary?.non_sports_filtered_out || 0}`);
    console.log(`API calls made: ${result.search_summary?.api_calls_made || 0}`);

    if (result.search_summary?.non_sports_filtered_out > 0) {
      console.log(`\n✅ SUCCESS: Filter working! Blocked ${result.search_summary.non_sports_filtered_out} non-sports events`);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testSportsFilter();