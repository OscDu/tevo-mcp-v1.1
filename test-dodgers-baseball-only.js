#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testDodgersBaseballOnly() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  console.log('⚾ DODGERS BASEBALL GAMES ONLY - TICKET SEARCH');
  console.log('🎯 Finding ACTUAL Dodgers baseball games with tickets under $500 total (2 tickets)');
  console.log('=' .repeat(80));

  try {
    // Search strategy: Look for actual Dodgers baseball games
    const searchStrategies = [
      {
        name: 'Dodger Stadium - Home Games',
        search: {
          lat: 34.0739,
          lon: -118.2400,
          within: 2, // Very tight radius around Dodger Stadium
          per_page: 50
        },
        keywords: ['dodgers', 'los angeles dodgers']
      },
      {
        name: 'San Diego - Padres vs Dodgers',
        search: {
          lat: 32.7073,
          lon: -117.1566,
          within: 3, // Petco Park area
          per_page: 50
        },
        keywords: ['dodgers', 'los angeles', 'padres']
      },
      {
        name: 'San Francisco - Giants vs Dodgers',
        search: {
          lat: 37.7786,
          lon: -122.3893,
          within: 3, // Oracle Park area
          per_page: 50
        },
        keywords: ['dodgers', 'los angeles', 'giants']
      },
      {
        name: 'Colorado - Rockies vs Dodgers',
        search: {
          lat: 39.7559,
          lon: -104.9942,
          within: 3, // Coors Field area
          per_page: 50
        },
        keywords: ['dodgers', 'los angeles', 'rockies']
      }
    ];

    let allBaseballGames = [];
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + (12 * 7)); // 12 weeks ahead

    console.log('\n🔍 SEARCHING FOR ACTUAL DODGERS BASEBALL GAMES...');
    console.log('-'.repeat(60));

    for (const strategy of searchStrategies) {
      console.log(`\n📍 ${strategy.name}`);
      
      try {
        const searchParams = {
          ...strategy.search,
          occurs_at_gte: now.toISOString(),
          occurs_at_lt: futureDate.toISOString()
        };
        
        const eventsResponse = await apiClient.listEvents(searchParams);
        const totalEvents = eventsResponse.events?.length || 0;
        console.log(`   Found ${totalEvents} total events in area`);
        
        // Filter for Dodgers baseball games specifically
        const dodgerGames = eventsResponse.events?.filter(event => {
          const name = event.name.toLowerCase();
          
          // Must contain Dodgers reference
          const hasDodgers = strategy.keywords.some(keyword => name.includes(keyword.toLowerCase()));
          
          // Must be a baseball game (exclude concerts, etc.)
          const isBaseball = !name.includes('concert') && 
                            !name.includes('tour') && 
                            !name.includes('show') &&
                            !name.includes('festival') &&
                            !name.includes('soccer') &&
                            !name.includes('football') &&
                            !name.includes('fire fc') &&
                            !name.includes('union');
          
          // Look for typical baseball game patterns
          const hasBaseballPattern = name.includes(' at ') || 
                                   name.includes(' vs ') || 
                                   name.includes(' v ');
          
          return hasDodgers && isBaseball && hasBaseballPattern;
        }) || [];
        
        console.log(`   Found ${dodgerGames.length} Dodgers baseball games`);
        
        if (dodgerGames.length > 0) {
          dodgerGames.forEach(game => {
            console.log(`      ⚾ ${game.name} (${new Date(game.occurs_at).toLocaleDateString()})`);
          });
          
          // Add unique games
          dodgerGames.forEach(game => {
            if (!allBaseballGames.some(existing => existing.id === game.id)) {
              allBaseballGames.push(game);
            }
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      // Small delay between searches
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (allBaseballGames.length === 0) {
      console.log('\n❌ No Dodgers baseball games found');
      console.log('💡 This might be the off-season, or games may not be available yet in the system');
      
      // Try a broader search to see if ANY baseball games exist
      console.log('\n🔍 Checking if ANY baseball games exist in the system...');
      
      try {
        const broadSearch = await apiClient.listEvents({
          lat: 34.0522, // Los Angeles
          lon: -118.2437,
          within: 100, // Very broad search
          occurs_at_gte: now.toISOString(),
          occurs_at_lt: futureDate.toISOString(),
          per_page: 100
        });
        
        const anyBaseball = broadSearch.events?.filter(event => {
          const name = event.name.toLowerCase();
          return (name.includes('angels') || 
                  name.includes('padres') || 
                  name.includes('giants') || 
                  name.includes('athletics') ||
                  name.includes('diamondbacks') ||
                  name.includes('rockies')) &&
                 (name.includes(' at ') || name.includes(' vs '));
        }) || [];
        
        if (anyBaseball.length > 0) {
          console.log(`📊 Found ${anyBaseball.length} other baseball games in the system:`);
          anyBaseball.slice(0, 5).forEach(game => {
            console.log(`   - ${game.name} (${new Date(game.occurs_at).toLocaleDateString()})`);
          });
          console.log('🎯 Dodgers games may be scheduled later or not yet available');
        } else {
          console.log('📊 No baseball games found in the system - likely off-season');
        }
        
      } catch (error) {
        console.log('❌ Error checking for other baseball games:', error.message);
      }
      
      return;
    }

    // Sort games by date
    allBaseballGames.sort((a, b) => new Date(a.occurs_at) - new Date(b.occurs_at));

    console.log(`\n✅ FOUND ${allBaseballGames.length} DODGERS BASEBALL GAMES!`);
    console.log('=' .repeat(60));

    // Process each game for tickets
    const allTicketOptions = [];
    
    for (let i = 0; i < allBaseballGames.length; i++) {
      const game = allBaseballGames[i];
      console.log(`\n⚾ GAME ${i + 1}: ${game.name}`);
      console.log(`📅 ${new Date(game.occurs_at).toLocaleDateString()} at ${new Date(game.occurs_at).toLocaleTimeString()}`);
      console.log(`🏟️ ${game.venue?.name || 'Unknown venue'}`);
      console.log(`🆔 Event ID: ${game.id}`);

      try {
        const listingsResponse = await apiClient.getListings(game.id);
        console.log(`📊 Found ${listingsResponse.ticket_groups?.length || 0} ticket groups`);
        
        // Filter for affordable tickets
        const affordableTickets = listingsResponse.ticket_groups
          ?.filter(tg => {
            const totalCost = tg.retail_price * 2;
            return totalCost <= 500 && 
                   tg.available_quantity >= 2 &&
                   !tg.section?.toLowerCase().includes('parking');
          })
          ?.map(tg => ({
            game_name: game.name,
            game_date: new Date(game.occurs_at).toLocaleDateString(),
            game_time: new Date(game.occurs_at).toLocaleTimeString(),
            venue: game.venue?.name || 'Unknown',
            city: game.venue?.city || '',
            section: tg.section || 'N/A',
            row: tg.row || 'N/A',
            price_per_ticket: tg.retail_price,
            total_cost: tg.retail_price * 2,
            available: tg.available_quantity,
            format: tg.format || 'Unknown',
            instant: tg.instant_delivery || false
          }))
          ?.sort((a, b) => a.price_per_ticket - b.price_per_ticket)
          || [];

        if (affordableTickets.length > 0) {
          console.log(`✅ Found ${affordableTickets.length} options under $500 total`);
          
          // Show top 3 options for this game
          affordableTickets.slice(0, 3).forEach((ticket, index) => {
            console.log(`   ${index + 1}. Section ${ticket.section}, Row ${ticket.row} - $${ticket.price_per_ticket}/ticket ($${ticket.total_cost} total)`);
          });
          
          // Add all options to master list
          allTicketOptions.push(...affordableTickets);
        } else {
          console.log('❌ No tickets under $500 total available');
        }
        
      } catch (error) {
        console.log(`❌ Error getting tickets: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Final results
    if (allTicketOptions.length === 0) {
      console.log('\n❌ No tickets found under $500 total for any Dodgers baseball games');
      return;
    }

    // Sort all options by price
    allTicketOptions.sort((a, b) => a.total_cost - b.total_cost);

    console.log('\n🏆 FINAL RESULTS - BEST DODGERS BASEBALL TICKETS');
    console.log('=' .repeat(80));
    console.log(`✅ Found ${allTicketOptions.length} ticket options under $500 total`);
    console.log(`💰 Price range: $${allTicketOptions[0].total_cost} - $${allTicketOptions[allTicketOptions.length - 1].total_cost}`);

    // Show top 10 deals
    console.log('\n🥇 TOP 10 BEST DEALS:');
    console.log('-'.repeat(50));

    const topDeals = allTicketOptions.slice(0, 10);
    topDeals.forEach((ticket, index) => {
      console.log(`\n${index + 1}. 💰 $${ticket.total_cost} TOTAL ($${ticket.price_per_ticket}/ticket)`);
      console.log(`   ⚾ ${ticket.game_name}`);
      console.log(`   📅 ${ticket.game_date} at ${ticket.game_time}`);
      console.log(`   🏟️ ${ticket.venue}, ${ticket.city}`);
      console.log(`   🎫 Section ${ticket.section}, Row ${ticket.row}`);
      console.log(`   📦 ${ticket.available} available | 📱 ${ticket.format}${ticket.instant ? ' (Instant)' : ''}`);
    });

    console.log('\n🎉 DODGERS BASEBALL SEARCH COMPLETED!');

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

testDodgersBaseballOnly();