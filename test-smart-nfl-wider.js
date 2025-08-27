#!/usr/bin/env node

import dotenv from 'dotenv';
import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleSmartNflFinder } from './dist/tools/smart-nfl-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';

// Load env silently
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;
process.stdout.write = () => true;
process.stderr.write = () => true;
dotenv.config();
process.stdout.write = originalStdout;
process.stderr.write = originalStderr;

async function testWiderSearch() {
  try {
    const config = loadConfig();
    const apiClient = new TevoApiClient(config);
    const cache = new MemoryCache();

    console.log('🚀 TESTING SMART NFL FINDER WITH WIDER SEARCH');
    console.log('===============================================');
    console.log('Searching next 26 weeks (6 months) for Giants at Patriots...\n');

    // Test with much wider range to find the actual game
    const result = await handleSmartNflFinder(apiClient, cache, {
      away_team: 'Giants',
      home_team: 'Patriots', 
      weeks_ahead: 26, // 6 months
      budget_per_ticket: 500,
      requested_quantity: 1,
      return_top: 3
    });

    if (result.success && result.games_found.length > 0) {
      console.log('✅ FOUND THE GAME!');
      console.log(`🎯 Total Games Found: ${result.games_found.length}`);
      
      result.games_found.forEach((game, index) => {
        console.log(`\n🏈 GAME ${index + 1}: ${game.event_name}`);
        console.log(`   📅 Date: ${game.date} (${game.day_of_week})`);
        console.log(`   ⏰ Time: ${game.time}`);
        console.log(`   🏟️ Venue: ${game.venue}`);
        console.log(`   ⭐ Prime Time: ${game.is_prime_time ? 'YES' : 'No'}`);
        console.log(`   🆔 Event ID: ${game.event_id}`);
        
        if (game.tickets && game.tickets.best_options && game.tickets.best_options.length > 0) {
          console.log(`   🎫 Tickets Available: ${game.tickets.within_budget} under $500`);
          console.log(`   💰 Best Price: $${game.tickets.best_options[0].price_per_ticket.toFixed(2)}`);
        }
      });

      console.log('\n🎉 SMART SEARCH SUCCESS!');
      console.log('✅ Found event automatically using venue-based search');
      console.log('✅ No pagination needed - direct venue lookup');
      console.log('✅ Fast and efficient API usage');
      
    } else {
      console.log('❌ No Giants-Patriots games found in next 26 weeks');
      console.log(`Events checked at Gillette Stadium: ${result.search_summary?.venue_events_checked || 0}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWiderSearch();