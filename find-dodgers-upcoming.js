#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findDodgersUpcoming() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('⚾ FINDING ALL UPCOMING DODGERS GAMES');
    console.log('🎯 Looking for BEST seats for each game');
    console.log('📅 Next 8 weeks\n');

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 56); // 8 weeks ahead

    console.log(`🔍 Searching ${now.toLocaleDateString()} to ${futureDate.toLocaleDateString()}...`);

    // Search multiple ways to find Dodgers games
    const searches = [
      // 1. Dodger Stadium (home games)
      {
        name: 'Dodger Stadium (home games)',
        params: {
          lat: 34.0739,
          lon: -118.2400,
          within: 2,
          occurs_at_gte: now.toISOString(),
          occurs_at_lt: futureDate.toISOString(),
          per_page: 50
        }
      },
      // 2. Los Angeles area (wide search)
      {
        name: 'Los Angeles area',
        params: {
          lat: 34.0522,
          lon: -118.2437,
          within: 50,
          occurs_at_gte: now.toISOString(),
          occurs_at_lt: futureDate.toISOString(),
          per_page: 100
        }
      }
    ];

    let allDodgerGames = [];

    for (const search of searches) {
      console.log(`🔍 Searching ${search.name}...`);
      
      try {
        const eventsResponse = await apiClient.listEvents(search.params);
        console.log(`   Found ${eventsResponse.events?.length || 0} total events`);
        
        const dodgerGames = eventsResponse.events?.filter(event => {
          const name = event.name.toLowerCase();
          return name.includes('dodgers') || 
                 name.includes('los angeles dodgers') ||
                 (name.includes('los angeles') && name.includes('at')) ||
                 (name.includes('la ') && (name.includes('at') || name.includes('vs')));
        }) || [];
        
        console.log(`   Found ${dodgerGames.length} Dodgers games`);
        
        // Add unique games only
        dodgerGames.forEach(game => {
          if (!allDodgerGames.some(existing => existing.id === game.id)) {
            allDodgerGames.push(game);
          }
        });
        
        if (dodgerGames.length > 0) {
          console.log(`   ✅ Added ${dodgerGames.length} unique Dodgers games`);
          break; // Found games, no need to search further
        }
        
      } catch (error) {
        console.log(`   ❌ Error searching ${search.name}: ${error.message}`);
      }
    }

    if (allDodgerGames.length === 0) {
      console.log('\n❌ No Dodgers games found in the next 8 weeks');
      console.log('💡 They might be in the off-season or games not yet available in the system');
      
      // Try a very wide search to see if any baseball games exist
      console.log('\n🔍 Checking if any baseball games exist in the system...');
      const wideSearch = await apiClient.listEvents({
        lat: 34.0522,
        lon: -118.2437,
        within: 200,
        occurs_at_gte: now.toISOString(),
        occurs_at_lt: futureDate.toISOString(),
        per_page: 50
      });
      
      const baseballGames = wideSearch.events?.filter(event => {
        const name = event.name.toLowerCase();
        return name.includes('baseball') || 
               name.includes('mlb') ||
               name.includes('angels') ||
               name.includes('giants') ||
               name.includes('padres');
      }) || [];
      
      if (baseballGames.length > 0) {
        console.log(`📊 Found ${baseballGames.length} other baseball games in the system:`);
        baseballGames.slice(0, 5).forEach(game => {
          console.log(`   - ${game.name} (${new Date(game.occurs_at).toLocaleDateString()})`);
        });
      } else {
        console.log('📊 No baseball games found - might be off-season');
      }
      
      return;
    }

    console.log(`\n✅ Found ${allDodgerGames.length} total Dodgers games!`);
    
    // Sort games by date
    allDodgerGames.sort((a, b) => new Date(a.occurs_at) - new Date(b.occurs_at));
    
    await processDodgerGames(allDodgerGames.slice(0, 10), apiClient); // Process up to 10 games

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
          !tg.section?.toLowerCase().includes('lot') &&
          !tg.section?.toLowerCase().includes('garage')
        )
        ?.map(tg => ({
          section: tg.section || 'N/A',
          row: tg.row || 'N/A',
          price_per_ticket: tg.retail_price,
          available_quantity: tg.available_quantity,
          total_cost: tg.retail_price * 2,
          format: tg.format || 'Unknown',
          instant_delivery: tg.instant_delivery || false
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
          console.log(`   ⚡ Instant: ${seat.instant_delivery ? 'Yes' : 'No'}`);
        });
        
        // Show price range and recommendation
        const cheapest = bestSeats[bestSeats.length - 1];
        const mostExpensive = bestSeats[0];
        console.log(`\n📈 Premium seat range: $${cheapest.price_per_ticket.toFixed(2)} - $${mostExpensive.price_per_ticket.toFixed(2)} per ticket`);
        console.log(`🏆 BEST RECOMMENDATION: Section ${mostExpensive.section}, Row ${mostExpensive.row} - $${mostExpensive.price_per_ticket.toFixed(2)}/ticket`);
        console.log(`💎 These are the premium seats with the best view and experience!`);
        
      } else {
        console.log('\n❌ No premium seats available for 2+ people');
        
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
    
    // Short delay between API calls
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 SUMMARY: Found ${games.length} Dodgers game(s) with premium seating analysis`);
  console.log(`⚾ All games analyzed for TOP 5 BEST available seats`);
  console.log(`💎 Recommendations focus on premium sections with best views`);
  console.log(`${'='.repeat(80)}`);
}

findDodgersUpcoming();