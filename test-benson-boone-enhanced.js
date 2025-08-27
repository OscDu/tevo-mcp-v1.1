#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleEntertainmentEventFinder } from './dist/tools/entertainment-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testBensonBooneEnhanced() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  console.log('🎵 TESTING ENHANCED ENTERTAINMENT EVENT FINDER');
  console.log('=' .repeat(60));
  console.log('Testing the exact parameters that failed before:');
  console.log('');

  const testParams = {
    date: "2025-09-05",
    query: "Benson Boone", 
    event_type: "concert",
    budget_per_ticket: 1000,
    requested_quantity: 6
  };

  console.log('📋 TEST PARAMETERS:');
  console.log(`   Query: "${testParams.query}"`);
  console.log(`   Date: ${testParams.date}`);
  console.log(`   Event Type: ${testParams.event_type}`);
  console.log(`   Budget per ticket: $${testParams.budget_per_ticket}`);
  console.log(`   Quantity needed: ${testParams.requested_quantity}`);
  console.log('');

  console.log('🔍 EXPECTED ENHANCEMENTS:');
  console.log('   ✓ New "direct_date_msg_search" strategy (searches MSG specifically)');
  console.log('   ✓ Expanded date ranges (±7 days instead of ±3 days)');
  console.log('   ✓ Better venue mapping');
  console.log('   ✓ Should find event ID 2987307 that was missed before');
  console.log('');

  try {
    console.log('🚀 RUNNING ENHANCED FINDER...');
    console.log('');

    const result = await handleEntertainmentEventFinder(apiClient, cache, testParams);

    if (result.success) {
      console.log('✅ SUCCESS! Enhanced finder worked!');
      console.log(`📊 Strategy used: ${result.strategy_used}`);
      console.log(`🔗 API calls made: ${result.search_summary.api_calls_made}`);
      console.log(`📈 Events found: ${result.events_found.length}`);
      console.log(`🎯 Strategies tried: ${result.search_summary.strategies_tried.join(', ')}`);
      console.log('');

      // Check if we found the specific event ID we were looking for
      const targetEventId = 2987307;
      const foundTargetEvent = result.events_found.find(event => event.event_id === targetEventId);
      
      if (foundTargetEvent) {
        console.log('🎯 CRITICAL SUCCESS: Found the previously missed event!');
        console.log(`   Event ID: ${targetEventId}`);
        console.log(`   Event Name: ${foundTargetEvent.name}`);
        console.log('');
      } else {
        console.log('⚠️ NOTE: Target event ID 2987307 not found in results');
        console.log('   This might mean:');
        console.log('   - Event is no longer available');
        console.log('   - Event date has changed');  
        console.log('   - Event doesn\'t match our search criteria');
        console.log('');
      }

      result.events_found.forEach((event, index) => {
        console.log(`🎭 EVENT ${index + 1}: ${event.name}`);
        console.log(`   📅 ${event.date} at ${event.time}`);
        console.log(`   🏟️ ${event.venue}, ${event.city} ${event.state}`);
        console.log(`   🆔 Event ID: ${event.event_id}`);
        
        if (event.tickets && event.tickets.best_options.length > 0) {
          console.log(`   🎫 ${event.tickets.available_within_budget} tickets under $${testParams.budget_per_ticket}`);
          console.log(`   💰 Price range: $${event.tickets.price_range.min} - $${event.tickets.price_range.max}`);
          console.log(`   🎪 Best option: Section ${event.tickets.best_options[0].section} - $${event.tickets.best_options[0].price_per_ticket}/ticket`);
        } else {
          console.log(`   🎫 No tickets found within budget/quantity requirements`);
        }
        console.log('');
      });

    } else {
      console.log('❌ FAILED - No events found');
      console.log(`📊 API calls made: ${result.search_summary.api_calls_made}`);
      console.log(`🔍 Strategies tried: ${result.search_summary.strategies_tried.join(', ')}`);
      console.log('');
      console.log('🔧 DEBUGGING INFO:');
      console.log(`   Artist recognized: ${result.search_summary.artist_recognized}`);
      console.log(`   Keywords matched: ${result.search_summary.keywords_matched?.join(', ') || 'none'}`);
    }

  } catch (error) {
    console.log(`💥 ERROR: ${error.message}`);
    console.log('');
    console.log('Stack trace:', error.stack);
  }

  console.log('=' .repeat(60));
  console.log('🏁 BENSON BOONE ENHANCED TEST COMPLETE');
  console.log('=' .repeat(60));
}

testBensonBooneEnhanced();