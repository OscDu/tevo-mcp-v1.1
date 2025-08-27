#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleSmartNflFinder } from './dist/tools/smart-nfl-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

// Load env silently
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;
process.stdout.write = () => true;
process.stderr.write = () => true;
dotenv.config();
process.stdout.write = originalStdout;
process.stderr.write = originalStderr;

async function quickTest() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  try {
    console.log('🔍 Searching for Giants at Patriots Monday Night Football...');
    console.log('💰 Budget: $500 per ticket\n');

    const result = await handleSmartNflFinder(apiClient, cache, {
      away_team: 'Giants',
      home_team: 'Patriots',
      weeks_ahead: 20,
      budget_per_ticket: 500,
      requested_quantity: 1,
      return_top: 5
    });

    if (result.success && result.games_found.length > 0) {
      const game = result.games_found[0];
      console.log('🏈 FOUND: ' + game.event_name);
      console.log('📅 Date: ' + game.date + ' (' + game.day_of_week + ')');
      console.log('⏰ Time: ' + game.time);
      console.log('🏟️ Venue: ' + game.venue);
      console.log('⭐ Monday Night Football: ' + (game.day_of_week === 'Monday' ? 'YES ✅' : 'No'));
      
      if (game.tickets && game.tickets.best_options.length > 0) {
        console.log('\n💰 Tickets under $500: ' + game.tickets.within_budget);
        console.log('🎫 Best options:');
        game.tickets.best_options.forEach((ticket, i) => {
          console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row} - $${ticket.price_per_ticket.toFixed(2)} ${ticket.instant_delivery ? '⚡' : ''}`);
        });
        
        const savings = 500 - game.tickets.best_options[0].price_per_ticket;
        console.log(`\n💸 You save $${savings.toFixed(2)} per ticket vs your $500 budget!`);
      } else {
        console.log('\n❌ No tickets found under $500');
      }
    } else {
      console.log('❌ No Giants at Patriots games found in the next 8 weeks');
      console.log('Try increasing the search window or check the NFL schedule');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

quickTest();