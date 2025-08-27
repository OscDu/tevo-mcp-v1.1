#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findYankeesInFlorida() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  console.log('⚾ YANKEES GAMES IN FLORIDA');
  console.log('🎯 4 tickets, $4,000 budget ($1,000 per ticket max)');
  console.log('🌴 Spring Training + Regular Season games');
  console.log('=' .repeat(60));

  try {
    // Step 1: Use universal finder for Yankees
    console.log('\n🔍 STEP 1: Finding Yankees games using smart search');
    
    const yankeesResult = await handleUniversalEventFinder(apiClient, cache, {
      query: 'Yankees',
      weeks_ahead: 26, // Look well into next season
      budget_per_ticket: 1000, // $4000 / 4 tickets
      requested_quantity: 4
    });

    let allYankeesGames = [];

    if (yankeesResult.success && yankeesResult.events_found.length > 0) {
      console.log(`✅ Universal finder found ${yankeesResult.events_found.length} Yankees games`);
      
      // Filter for Florida games
      const floridaGames = yankeesResult.events_found.filter(event => {
        const venue = (event.venue || '').toLowerCase();
        const city = (event.city || '').toLowerCase();
        const name = event.name.toLowerCase();
        
        return venue.includes('florida') || 
               city.includes('tampa') || 
               city.includes('miami') || 
               city.includes('st. petersburg') ||
               city.includes('saint petersburg') ||
               venue.includes('steinbrenner') ||
               venue.includes('marlins') ||
               venue.includes('tropicana') ||
               name.includes('spring training');
      });
      
      if (floridaGames.length > 0) {
        console.log(`🌴 Found ${floridaGames.length} Yankees games in Florida!`);
        allYankeesGames = floridaGames;
      }
    }

    // Step 2: Direct venue searches in Florida
    if (allYankeesGames.length === 0) {
      console.log('\n🔍 STEP 2: Searching Florida venues directly');
      
      const floridaVenues = [
        {
          name: 'Steinbrenner Field (Tampa - Spring Training)',
          lat: 27.9506,
          lon: -82.4572
        },
        {
          name: 'Tropicana Field (St. Petersburg - Rays)',
          lat: 27.7683,
          lon: -82.6534
        },
        {
          name: 'loanDepot park (Miami - Marlins)', 
          lat: 25.7781,
          lon: -80.2198
        }
      ];

      const now = new Date();
      const futureDate = new Date();
      futureDate.setMonth(now.getMonth() + 8); // 8 months to cover next spring training

      for (const venue of floridaVenues) {
        console.log(`\n📍 Searching ${venue.name}...`);
        
        try {
          const venueEvents = await apiClient.listEvents({
            lat: venue.lat,
            lon: venue.lon,
            within: 3,
            occurs_at_gte: now.toISOString(),
            occurs_at_lt: futureDate.toISOString(),
            per_page: 50
          });
          
          const yankeesGames = venueEvents.events?.filter(event => {
            const name = event.name.toLowerCase();
            return name.includes('yankees') || 
                   name.includes('new york yankees') ||
                   name.includes('ny yankees');
          }) || [];
          
          console.log(`   Found ${yankeesGames.length} Yankees games`);
          
          if (yankeesGames.length > 0) {
            yankeesGames.forEach(game => {
              console.log(`      ⚾ ${game.name} (${new Date(game.occurs_at).toLocaleDateString()})`);
              
              // Add unique games
              if (!allYankeesGames.some(existing => existing.id === game.id)) {
                allYankeesGames.push({
                  event_id: game.id,
                  name: game.name,
                  date: new Date(game.occurs_at).toLocaleDateString(),
                  time: new Date(game.occurs_at).toLocaleTimeString(),
                  venue: game.venue?.name || venue.name.split(' (')[0],
                  city: game.venue?.city || venue.name.split(' - ')[1]?.replace(')', '') || 'Florida'
                });
              }
            });
          }
          
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    if (allYankeesGames.length === 0) {
      console.log('\n❌ No Yankees games found in Florida');
      console.log('💡 This could mean:');
      console.log('   - Spring training schedule not released yet');
      console.log('   - No upcoming series vs Rays/Marlins');
      console.log('   - Games not in the system yet');
      return;
    }

    // Sort by date
    allYankeesGames.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(a.occurs_at);
      const dateB = b.date ? new Date(b.date) : new Date(b.occurs_at);
      return dateA - dateB;
    });

    console.log(`\n✅ FOUND ${allYankeesGames.length} YANKEES GAMES IN FLORIDA!`);
    console.log('=' .repeat(60));

    // Step 3: Get ticket details for each game
    for (let i = 0; i < Math.min(allYankeesGames.length, 5); i++) {
      const game = allYankeesGames[i];
      
      console.log(`\n⚾ GAME ${i + 1}: ${game.name}`);
      console.log(`📅 ${game.date} at ${game.time || 'TBD'}`);
      console.log(`🏟️ ${game.venue}, ${game.city}`);
      console.log(`🆔 Event ID: ${game.event_id}`);
      console.log('-'.repeat(50));

      try {
        const listingsResponse = await apiClient.getListings(game.event_id, {
          per_page: 30 // Limit to avoid timeouts
        });
        
        console.log(`📊 Found ${listingsResponse.ticket_groups?.length || 0} ticket groups`);
        
        if (!listingsResponse.ticket_groups || listingsResponse.ticket_groups.length === 0) {
          console.log('💡 No tickets available yet');
          continue;
        }

        // Filter for 4 tickets within budget
        const goodTickets = listingsResponse.ticket_groups
          .filter(tg => {
            const total = tg.retail_price * 4;
            return total <= 4000 && 
                   tg.available_quantity >= 4 &&
                   !(tg.section || '').toLowerCase().includes('parking');
          })
          .map(tg => ({
            section: tg.section || 'N/A',
            row: tg.row || 'N/A',
            price: tg.retail_price,
            total: tg.retail_price * 4,
            available: tg.available_quantity,
            format: tg.format || 'Unknown',
            instant: tg.instant_delivery || false
          }))
          .sort((a, b) => a.price - b.price); // Cheapest first

        if (goodTickets.length === 0) {
          console.log('❌ No tickets for 4 people within $4,000 budget');
          
          // Show cheapest option
          const cheapest = listingsResponse.ticket_groups
            .filter(tg => tg.available_quantity >= 4)
            .sort((a, b) => a.retail_price - b.retail_price)[0];
            
          if (cheapest) {
            const total = cheapest.retail_price * 4;
            console.log(`💡 Cheapest for 4: $${total.toLocaleString()} total ($${cheapest.retail_price}/ticket)`);
          }
          continue;
        }

        console.log(`✅ Found ${goodTickets.length} options within budget!`);
        
        // Show top 5 options
        console.log('\n🎫 TOP 5 TICKET OPTIONS:');
        goodTickets.slice(0, 5).forEach((ticket, index) => {
          console.log(`${index + 1}. $${ticket.total.toLocaleString()} total ($${ticket.price}/ticket)`);
          console.log(`   Section ${ticket.section}, Row ${ticket.row}`);
          console.log(`   ${ticket.available} available | ${ticket.format}${ticket.instant ? ' (Instant)' : ''}`);
        });

        // Best recommendation for this game
        const best = goodTickets[0];
        console.log(`\n🏆 BEST DEAL: Section ${best.section} - $${best.total.toLocaleString()} total`);
        console.log(`💰 Budget remaining: $${(4000 - best.total).toLocaleString()}`);
        
      } catch (error) {
        console.log(`⚠️ Could not get tickets: ${error.message}`);
      }
      
      if (i < Math.min(allYankeesGames.length, 5) - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Final summary
    console.log('\n🎯 SUMMARY:');
    console.log('=' .repeat(40));
    console.log(`⚾ Yankees games in Florida: ${allYankeesGames.length}`);
    console.log(`💰 Budget: $4,000 for 4 tickets`);
    console.log(`🌴 Venues: Spring Training & Regular Season`);
    
    if (allYankeesGames.length > 5) {
      console.log(`\n📋 Additional games found (not detailed above):`);
      allYankeesGames.slice(5).forEach((game, index) => {
        console.log(`   ${index + 6}. ${game.name} (${game.date})`);
      });
    }

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

findYankeesInFlorida();