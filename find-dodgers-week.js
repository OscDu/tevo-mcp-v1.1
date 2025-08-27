#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findDodgersWeek() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  try {
    console.log('⚾ FINDING ALL DODGERS GAMES THIS WEEK');
    console.log('🎯 Looking for BEST seats for each game');
    console.log('📅 Week of August 21-27, 2025\n');

    // Get current week date range
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)

    console.log(`🔍 Searching ${startOfWeek.toLocaleDateString()} to ${endOfWeek.toLocaleDateString()}...`);

    // Search for Dodgers games this week using enhanced finder
    const result = await handleUniversalEventFinder(apiClient, cache, {
      query: 'Dodgers',
      weeks_ahead: 1,
      requested_quantity: 2
    });

    if (!result.success || result.events_found.length === 0) {
      console.log('❌ No Dodgers games found this week using universal finder');
      console.log('🔍 Trying direct venue search at Dodger Stadium...');
      
      // Fallback: Direct search at Dodger Stadium
      const dodgerStadiumLat = 34.0739;
      const dodgerStadiumLon = -118.2400;
      
      const directSearch = await apiClient.listEvents({
        lat: dodgerStadiumLat,
        lon: dodgerStadiumLon,
        within: 2, // Very tight radius around Dodger Stadium
        occurs_at_gte: startOfWeek.toISOString(),
        occurs_at_lt: endOfWeek.toISOString(),
        per_page: 50
      });

      const dodgerGames = directSearch.events?.filter(event => 
        event.name.toLowerCase().includes('dodgers') ||
        event.name.toLowerCase().includes('los angeles')
      ) || [];

      if (dodgerGames.length === 0) {
        console.log('❌ No Dodgers games found at Dodger Stadium this week');
        
        // Try wider search - away games
        console.log('🔍 Searching for Dodgers away games nationwide...');
        
        const wideSearch = await apiClient.listEvents({
          occurs_at_gte: startOfWeek.toISOString(),
          occurs_at_lt: endOfWeek.toISOString(),
          per_page: 100
        });

        const awayGames = wideSearch.events?.filter(event => {
          const name = event.name.toLowerCase();
          return name.includes('dodgers') || name.includes('los angeles dodgers');
        }) || [];

        if (awayGames.length === 0) {
          console.log('❌ No Dodgers games found anywhere this week');
          console.log('💡 The Dodgers might not have games scheduled this week');
          return;
        } else {
          console.log(`✅ Found ${awayGames.length} Dodgers away game(s) this week!`);
          await processDodgerGames(awayGames, apiClient);
        }
      } else {
        console.log(`✅ Found ${dodgerGames.length} Dodgers home game(s) this week!`);
        await processDodgerGames(dodgerGames, apiClient);
      }
    } else {
      console.log(`✅ Universal finder found ${result.events_found.length} Dodgers game(s)!`);
      
      // Convert to game format and process
      const games = result.events_found.map(event => ({
        id: event.event_id,
        name: event.name,
        occurs_at: new Date(`${event.date} ${event.time}`).toISOString(),
        venue: { name: event.venue }
      }));
      
      await processDodgerGames(games, apiClient);
    }

  } catch (error) {
    console.log('❌ Error searching for Dodgers games:', error.message);
  }
}

async function processDodgerGames(games, apiClient) {
  console.log(`\n🏟️ PROCESSING ${games.length} DODGERS GAME(S):`);
  console.log('='.repeat(80));

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    
    console.log(`\n⚾ GAME ${i + 1}: ${game.name}`);
    console.log(`📅 ${new Date(game.occurs_at).toLocaleDateString()} at ${new Date(game.occurs_at).toLocaleTimeString()}`);
    console.log(`🏟️ ${game.venue?.name || 'Unknown venue'}`);
    console.log(`🆔 Event ID: ${game.id}`);

    try {
      console.log('🎫 Getting BEST seats (top 5 options)...');
      
      const listingsResponse = await apiClient.getListings(game.id);
      console.log(`📊 Found ${listingsResponse.ticket_groups?.length || 0} total listings`);
      
      // Get BEST seats (highest priced = premium seats)
      const bestSeats = listingsResponse.ticket_groups
        ?.filter(tg => 
          tg.available_quantity >= 2 &&
          !tg.section?.toLowerCase().includes('parking') &&
          !tg.section?.toLowerCase().includes('lot')
        )
        ?.map(tg => ({
          section: tg.section || 'N/A',
          row: tg.row || 'N/A',
          price_per_ticket: tg.retail_price,
          available_quantity: tg.available_quantity,
          total_cost: tg.retail_price * 2,
          format: tg.format || 'Unknown'
        }))
        ?.sort((a, b) => b.price_per_ticket - a.price_per_ticket) // Highest price = best seats
        ?.slice(0, 5) || [];

      if (bestSeats.length > 0) {
        console.log('\n🏆 TOP 5 BEST SEATS:');
        console.log('='.repeat(50));
        
        bestSeats.forEach((seat, index) => {
          console.log(`\n${index + 1}. Section ${seat.section}, Row ${seat.row}`);
          console.log(`   💰 $${seat.price_per_ticket.toFixed(2)} per ticket`);
          console.log(`   💵 $${seat.total_cost.toFixed(2)} total for 2 tickets`);
          console.log(`   🎫 ${seat.available_quantity} available`);
          console.log(`   📱 Format: ${seat.format}`);
        });
        
        // Show price range
        const cheapest = bestSeats[bestSeats.length - 1];
        const mostExpensive = bestSeats[0];
        console.log(`\n📈 Price range: $${cheapest.price_per_ticket.toFixed(2)} - $${mostExpensive.price_per_ticket.toFixed(2)} per ticket`);
        console.log(`🏆 Premium recommendation: Section ${mostExpensive.section}, Row ${mostExpensive.row}`);
        
      } else {
        console.log('\n❌ No seats available for 2+ people');
        
        // Show what's available for any quantity
        const anySeats = listingsResponse.ticket_groups
          ?.filter(tg => !tg.section?.toLowerCase().includes('parking'))
          ?.sort((a, b) => b.retail_price - a.retail_price)
          ?.slice(0, 3) || [];
          
        if (anySeats.length > 0) {
          console.log('\n💰 Best available seats (any quantity):');
          anySeats.forEach((seat, index) => {
            console.log(`   ${index + 1}. Section ${seat.section} - $${seat.retail_price}/ticket (${seat.available_quantity} available)`);
          });
        }
      }
      
    } catch (error) {
      console.log(`❌ Error getting tickets for game ${i + 1}:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 SUMMARY: Found ${games.length} Dodgers game(s) this week with premium seating options`);
  console.log(`⚾ All games analyzed for BEST available seats`);
  console.log(`${'='.repeat(80)}`);
}

findDodgersWeek();