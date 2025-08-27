#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testChargers() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  console.log('🏈 CHARGERS GAME SEARCH');
  console.log('🎯 Looking for Chargers season opener');
  console.log('💰 Budget: $5,000 for 6 seats');
  console.log('=' .repeat(50));

  try {
    // Use the universal event finder to search for Chargers
    const result = await handleUniversalEventFinder(apiClient, cache, {
      query: 'Los Angeles Chargers',
      weeks_ahead: 20,
      budget_per_ticket: 833, // $5000 / 6 seats
      requested_quantity: 6
    });

    if (result.success && result.events_found.length > 0) {
      console.log(`\n✅ Found ${result.events_found.length} Chargers events!`);
      console.log(`📊 Strategy used: ${result.strategy_used}`);
      console.log(`🔧 API calls made: ${result.search_summary.api_calls_made}`);

      // Show the first game (season opener)
      const opener = result.events_found[0];
      console.log('\n🏈 SEASON OPENER:');
      console.log('=' .repeat(40));
      console.log(`🎮 ${opener.name}`);
      console.log(`📅 ${opener.date} at ${opener.time}`);
      console.log(`🏟️ ${opener.venue}`);
      console.log(`🆔 Event ID: ${opener.event_id}`);

      if (opener.tickets && opener.tickets.best_options.length > 0) {
        console.log('\n🎫 AVAILABLE TICKET OPTIONS:');
        console.log('-'.repeat(40));
        
        opener.tickets.best_options.forEach((ticket, index) => {
          const totalFor6 = ticket.price_per_ticket * 6;
          console.log(`\n${index + 1}. Section ${ticket.section}, Row ${ticket.row}`);
          console.log(`   💰 $${ticket.price_per_ticket}/ticket ($${totalFor6.toLocaleString()} for 6)`);
          console.log(`   📦 ${ticket.available_quantity} available`);
          
          if (totalFor6 <= 5000) {
            console.log(`   ✅ WITHIN BUDGET!`);
          } else {
            console.log(`   ❌ Over budget by $${(totalFor6 - 5000).toLocaleString()}`);
          }
        });
        
        console.log(`\n📊 Total options within budget: ${opener.tickets.available_within_budget}`);
        
      } else {
        console.log('\n💡 No ticket pricing available yet - tickets may not be on sale');
      }

      // Show all games found
      console.log('\n🗓️ ALL CHARGERS GAMES FOUND:');
      console.log('-'.repeat(50));
      result.events_found.forEach((game, index) => {
        console.log(`${index + 1}. ${game.name} (${game.date})`);
      });

    } else {
      console.log('❌ No Chargers events found');
      console.log(`📊 Strategy attempted: ${result.strategy_used || 'none'}`);
      console.log(`🔧 API calls made: ${result.search_summary?.api_calls_made || 0}`);
      
      if (result.search_summary?.strategies_tried) {
        console.log(`🔍 Strategies tried: ${result.search_summary.strategies_tried.join(', ')}`);
      }
    }

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

testChargers();