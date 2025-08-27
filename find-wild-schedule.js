#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findWildSchedule() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('🏒 SEARCHING FOR MINNESOTA WILD GAMES IN OCTOBER 2025');
    console.log('🎫 Need: 6 tickets, Budget: $3,000 total\n');

    // Search Minneapolis area for Wild games in October 2025
    const searchStart = new Date('2025-10-01');
    const searchEnd = new Date('2025-10-31');
    
    // Minneapolis/St. Paul coordinates (Xcel Energy Center)
    const minneapolisLat = 44.9778;
    const minneapolisLon = -93.2650;
    
    console.log('🔍 Searching Minneapolis area for Wild games in October 2025...');
    
    const eventsResponse = await apiClient.listEvents({
      lat: minneapolisLat,
      lon: minneapolisLon,
      within: 25,
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 100
    });

    console.log(`✅ Found ${eventsResponse.events?.length || 0} events in Minneapolis area in October 2025`);

    if (eventsResponse.events && eventsResponse.events.length > 0) {
      console.log('\n🔍 Looking for Wild games...');
      
      const wildGames = eventsResponse.events.filter(event => {
        const eventName = event.name.toLowerCase();
        return eventName.includes('wild') || 
               (eventName.includes('minnesota') && 
                (eventName.includes('hockey') || eventName.includes('nhl')));
      });
      
      if (wildGames.length > 0) {
        console.log(`\n🏒 FOUND ${wildGames.length} WILD GAME(S) IN OCTOBER:`);
        console.log('='.repeat(60));
        
        for (let i = 0; i < wildGames.length && i < 5; i++) {
          const game = wildGames[i];
          console.log(`\n🏒 GAME ${i+1}: ${game.name}`);
          console.log(`📅 ${new Date(game.occurs_at).toLocaleDateString()} at ${new Date(game.occurs_at).toLocaleTimeString()}`);
          console.log(`🏟️ ${game.venue?.name || 'Xcel Energy Center'}`);
          console.log(`🆔 Event ID: ${game.id}`);
          
          // Get tickets for this game
          console.log('🎫 Getting best seats for 6 people...');
          
          try {
            const listingsResponse = await apiClient.getListings(game.id);
            
            const eligibleTickets = listingsResponse.ticket_groups
              ?.filter(tg => 
                tg.retail_price <= 500 && 
                tg.available_quantity >= 6 &&
                !tg.section?.toLowerCase().includes('parking')
              )
              ?.sort((a, b) => b.retail_price - a.retail_price) // Sort by highest price (best seats)
              ?.slice(0, 5) || [];

            if (eligibleTickets.length > 0) {
              console.log(`✅ Found ${eligibleTickets.length} options for 6+ people:`);
              
              eligibleTickets.forEach((ticket, j) => {
                const totalCost = ticket.retail_price * 6;
                console.log(`   ${j+1}. Section ${ticket.section}, Row ${ticket.row || 'N/A'}`);
                console.log(`      💰 $${ticket.retail_price}/ticket × 6 = $${totalCost.toFixed(2)} total`);
                console.log(`      🎫 ${ticket.available_quantity} available`);
              });
              
              const bestOption = eligibleTickets[0];
              const totalCost = bestOption.retail_price * 6;
              console.log(`\n🏆 BEST SEATS: Section ${bestOption.section} at $${bestOption.retail_price}/ticket`);
              console.log(`💵 Total cost: $${totalCost.toFixed(2)} (under budget by $${(3000 - totalCost).toFixed(2)})`);
              
            } else {
              console.log('❌ No seats for 6+ people under $500/ticket');
              
              // Show cheapest available for 6
              const anyTickets = listingsResponse.ticket_groups
                ?.filter(tg => tg.available_quantity >= 6)
                ?.sort((a, b) => a.retail_price - b.retail_price)
                ?.slice(0, 3) || [];
                
              if (anyTickets.length > 0) {
                console.log('💰 Cheapest available for 6:');
                anyTickets.forEach((ticket, j) => {
                  console.log(`   ${j+1}. Section ${ticket.section} - $${ticket.retail_price}/ticket ($${(ticket.retail_price * 6).toFixed(2)} total)`);
                });
              }
            }
            
          } catch (error) {
            console.log('❌ Error getting tickets:', error.message);
          }
          
          console.log(''); // spacing
        }
        
      } else {
        console.log('\n❌ No Wild games found in October 2025');
        
        // Show sample events to verify search is working
        console.log('\n📋 Sample events found (to verify search is working):');
        eventsResponse.events.slice(0, 5).forEach(event => {
          console.log(`   - ${event.name} (${new Date(event.occurs_at).toLocaleDateString()})`);
        });
        
        // Try searching wider date range
        console.log('\n🔍 Trying wider search for Wild games...');
        
        const widerSearch = await apiClient.listEvents({
          lat: minneapolisLat,
          lon: minneapolisLon,
          within: 25,
          occurs_at_gte: '2025-09-01T00:00:00Z',
          occurs_at_lt: '2025-12-31T23:59:59Z',
          per_page: 100
        });
        
        const allWildGames = widerSearch.events?.filter(event => {
          const eventName = event.name.toLowerCase();
          return eventName.includes('wild');
        }) || [];
        
        if (allWildGames.length > 0) {
          console.log(`\n🏒 Found ${allWildGames.length} Wild games in fall 2025:`);
          allWildGames.slice(0, 10).forEach(game => {
            console.log(`   - ${game.name} (${new Date(game.occurs_at).toLocaleDateString()})`);
          });
        }
      }
      
    } else {
      console.log('❌ No events found in Minneapolis area in October 2025');
    }

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

findWildSchedule();