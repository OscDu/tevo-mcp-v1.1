#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testUniversalFinder() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  const tests = [
    {
      name: 'Giants Patriots (should find quickly)',
      query: 'Giants Patriots',
      budget: 500,
      quantity: 1
    },
    {
      name: 'Rays Cubs Chicago (with location)',
      query: 'Rays Cubs',
      location: 'Chicago',
      date: '2025-09-12',
      budget: 150,
      quantity: 2
    },
    {
      name: 'Wild Blues (should find via team search)',
      query: 'Wild Blues',
      budget: 500,
      quantity: 6
    },
    {
      name: 'Canelo Crawford (boxing search)',
      query: 'Canelo Crawford',
      location: 'Las Vegas',
      budget: 2500,
      quantity: 2
    }
  ];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST ${i+1}: ${test.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Query: "${test.query}"`);
    if (test.location) console.log(`Location: ${test.location}`);
    if (test.date) console.log(`Date: ${test.date}`);
    if (test.budget) console.log(`Budget: $${test.budget}/ticket`);
    console.log(`Quantity: ${test.quantity || 2}`);
    console.log('');

    try {
      const params = {
        query: test.query,
        ...(test.location && { location: test.location }),
        ...(test.date && { date: test.date }),
        ...(test.budget && { budget_per_ticket: test.budget }),
        ...(test.quantity && { requested_quantity: test.quantity })
      };

      const result = await handleUniversalEventFinder(apiClient, cache, params);

      if (result.success) {
        console.log(`✅ SUCCESS - Strategy: ${result.strategy_used}`);
        console.log(`📊 API calls: ${result.search_summary.api_calls_made}`);
        console.log(`🎯 Events found: ${result.events_found.length}`);
        
        result.events_found.forEach((event, index) => {
          console.log(`\n🎭 EVENT ${index + 1}: ${event.name}`);
          console.log(`   📅 ${event.date} at ${event.time}`);
          console.log(`   🏟️ ${event.venue}, ${event.city} ${event.state}`);
          console.log(`   🆔 ID: ${event.event_id}`);
          
          if (event.tickets && event.tickets.best_options.length > 0) {
            console.log(`   🎫 ${event.tickets.available_within_budget} tickets within budget`);
            console.log(`   💰 Best: Section ${event.tickets.best_options[0].section} - $${event.tickets.best_options[0].price_per_ticket}/ticket`);
          } else if (test.budget) {
            console.log(`   ❌ No tickets within $${test.budget} budget`);
          }
        });
        
      } else {
        console.log(`❌ FAILED - No events found`);
        console.log(`📊 API calls: ${result.search_summary.api_calls_made}`);
        console.log(`🔍 Strategies tried: ${result.search_summary.strategies_tried.join(', ')}`);
      }

    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏁 UNIVERSAL EVENT FINDER TESTING COMPLETE`);
  console.log(`${'='.repeat(60)}`);
}

testUniversalFinder();