#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findDodgersTonight() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  console.log('⚾ DODGERS TICKETS - TONIGHT OR TOMORROW');
  console.log('🎯 4 tickets, $1,000 budget ($250 per ticket max)');
  console.log('🏆 Finding the BEST seats available');
  console.log('=' .repeat(60));

  try {
    const result = await handleUniversalEventFinder(apiClient, cache, {
      query: 'Dodgers',
      weeks_ahead: 1, // Only next 7 days
      budget_per_ticket: 250, // $1000 / 4 tickets
      requested_quantity: 4
    });

    if (result.success && result.events_found.length > 0) {
      console.log(`\n✅ Found ${result.events_found.length} Dodgers games!`);
      console.log(`📊 Strategy: ${result.strategy_used}`);
      
      // Filter for games in next 2 days
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 2);
      
      const upcomingGames = result.events_found.filter(game => {
        const gameDate = new Date(game.date);
        return gameDate >= now && gameDate <= tomorrow;
      });
      
      if (upcomingGames.length === 0) {
        console.log('\n❌ No Dodgers games tonight or tomorrow');
        console.log('\n📅 Next available games:');
        result.events_found.slice(0, 3).forEach((game, i) => {
          console.log(`${i+1}. ${game.name} - ${game.date}`);
        });
        return;
      }
      
      console.log(`\n🎮 GAMES TONIGHT/TOMORROW (${upcomingGames.length}):`);
      console.log('=' .repeat(50));
      
      let allBestTickets = [];
      
      for (const game of upcomingGames) {
        console.log(`\n⚾ ${game.name}`);
        console.log(`📅 ${game.date} at ${game.time}`);
        console.log(`🏟️ ${game.venue}, ${game.city}`);
        console.log(`🆔 Event ID: ${game.event_id}`);
        
        if (game.tickets && game.tickets.best_options.length > 0) {
          console.log(`\n🎫 AVAILABLE TICKETS (${game.tickets.available_within_budget} within budget):`);
          
          // Get all tickets and sort by price descending (best seats first)
          const bestTickets = game.tickets.best_options
            .sort((a, b) => b.price_per_ticket - a.price_per_ticket)
            .slice(0, 5);
          
          bestTickets.forEach((ticket, i) => {
            const total = ticket.price_per_ticket * 4;
            console.log(`${i+1}. Section ${ticket.section}, Row ${ticket.row}`);
            console.log(`   💰 $${ticket.price_per_ticket}/ticket ($${total} total)`);
            console.log(`   📦 ${ticket.available_quantity} available`);
            
            allBestTickets.push({
              ...ticket,
              game: game.name,
              date: game.date,
              time: game.time,
              venue: game.venue,
              total_cost: total
            });
          });
        } else {
          console.log('\n💡 No tickets within budget for this game');
        }
      }
      
      if (allBestTickets.length > 0) {
        console.log('\n🏆 TOP 5 BEST TICKETS ACROSS ALL GAMES:');
        console.log('=' .repeat(60));
        
        const top5 = allBestTickets
          .sort((a, b) => b.price_per_ticket - a.price_per_ticket)
          .slice(0, 5);
        
        top5.forEach((ticket, i) => {
          console.log(`\n${i+1}. 💎 PREMIUM: Section ${ticket.section}, Row ${ticket.row}`);
          console.log(`   🎮 ${ticket.game}`);
          console.log(`   📅 ${ticket.date} at ${ticket.time}`);
          console.log(`   🏟️ ${ticket.venue}`);
          console.log(`   💰 $${ticket.total_cost} total ($${ticket.price_per_ticket}/ticket)`);
          console.log(`   📦 ${ticket.available_quantity} seats available`);
          console.log(`   💵 Budget remaining: $${1000 - ticket.total_cost}`);
        });
        
        console.log(`\n🎯 RECOMMENDATION:`);
        const best = top5[0];
        console.log(`🏆 Go with Section ${best.section}, Row ${best.row}`);
        console.log(`💰 $${best.total_cost} for 4 premium seats`);
        console.log(`🎮 ${best.game}`);
      }
      
    } else {
      console.log('❌ No Dodgers games found in the next week');
      console.log('💡 They might be on a road trip or in the off-season');
    }

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

findDodgersTonight();