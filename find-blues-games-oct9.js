#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findBluesGamesOct9() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('🏒 BROADER SEARCH FOR WILD VS BLUES ON OCTOBER 9TH, 2025');
    console.log('🔍 Searching multiple ways to find this game...\n');

    const targetDate = new Date('2025-10-09');
    const searchStart = new Date(targetDate);
    searchStart.setHours(0, 0, 0, 0);
    const searchEnd = new Date(targetDate);
    searchEnd.setHours(23, 59, 59, 999);
    
    // Try different coordinate searches
    const searches = [
      { name: 'Minneapolis/St. Paul (wider)', lat: 44.9778, lon: -93.2650, radius: 50 },
      { name: 'Minnesota (state-wide)', lat: 46.7296, lon: -94.6859, radius: 200 },
      { name: 'Midwest (very wide)', lat: 44.5, lon: -93.0, radius: 300 }
    ];
    
    for (const search of searches) {
      console.log(`🔍 Searching ${search.name} (${search.radius} mile radius)...`);
      
      try {
        const eventsResponse = await apiClient.listEvents({
          lat: search.lat,
          lon: search.lon,
          within: search.radius,
          occurs_at_gte: searchStart.toISOString(),
          occurs_at_lt: searchEnd.toISOString(),
          per_page: 100
        });

        console.log(`   Found ${eventsResponse.events?.length || 0} events`);

        if (eventsResponse.events && eventsResponse.events.length > 0) {
          // Look for Wild/Blues games
          const wildBluesGames = eventsResponse.events.filter(event => {
            const name = event.name.toLowerCase();
            return (name.includes('wild') && name.includes('blues')) ||
                   (name.includes('blues') && name.includes('wild')) ||
                   (name.includes('minnesota') && name.includes('blues')) ||
                   (name.includes('st. louis') && name.includes('wild')) ||
                   (name.includes('saint louis') && name.includes('wild'));
          });
          
          if (wildBluesGames.length > 0) {
            console.log(`\n🎯 FOUND WILD VS BLUES GAME(S) in ${search.name}:`);
            
            for (const game of wildBluesGames) {
              console.log(`\n🏒 ${game.name}`);
              console.log(`📅 ${new Date(game.occurs_at).toLocaleDateString()} at ${new Date(game.occurs_at).toLocaleTimeString()}`);
              console.log(`🏟️ ${game.venue?.name || 'Unknown venue'}`);
              console.log(`🆔 Event ID: ${game.id}`);
              
              // Get the best tickets
              console.log('🎫 Getting BEST seats for 6 people...');
              
              try {
                const listingsResponse = await apiClient.getListings(game.id);
                
                const bestTickets = listingsResponse.ticket_groups
                  ?.filter(tg => 
                    tg.retail_price <= 500 && 
                    tg.available_quantity >= 6 &&
                    !tg.section?.toLowerCase().includes('parking')
                  )
                  ?.sort((a, b) => b.retail_price - a.retail_price) // Highest price = best seats
                  ?.slice(0, 5) || [];

                if (bestTickets.length > 0) {
                  console.log(`\n🏆 BEST SEATS (${bestTickets.length} options for 6+ people):`);
                  console.log('='.repeat(70));
                  
                  bestTickets.forEach((ticket, i) => {
                    const totalCost = ticket.retail_price * 6;
                    console.log(`\n${i+1}. Section ${ticket.section}, Row ${ticket.row || 'N/A'}`);
                    console.log(`   💰 $${ticket.retail_price}/ticket × 6 = $${totalCost.toFixed(2)} total`);
                    console.log(`   🎫 ${ticket.available_quantity} available`);
                  });
                  
                  const topChoice = bestTickets[0];
                  const totalCost = topChoice.retail_price * 6;
                  const savings = 3000 - totalCost;
                  
                  console.log(`\n🎯 TOP RECOMMENDATION:`);
                  console.log(`   Section ${topChoice.section}, Row ${topChoice.row || 'N/A'}`);
                  console.log(`   💰 $${topChoice.retail_price}/ticket × 6 = $${totalCost.toFixed(2)} total`);
                  console.log(`   💸 Under budget by: $${savings.toFixed(2)}`);
                  console.log(`   🏒 Premium seats - best view and experience!`);
                  
                  return; // Found the game, exit
                  
                } else {
                  console.log('❌ No seats for 6+ people under $500/ticket');
                }
                
              } catch (error) {
                console.log('❌ Error getting tickets:', error.message);
              }
            }
          }
          
          // Also look for ANY Wild games that day
          const anyWildGames = eventsResponse.events.filter(event => {
            const name = event.name.toLowerCase();
            return name.includes('wild') || 
                   (name.includes('minnesota') && (name.includes('hockey') || name.includes('nhl')));
          });
          
          if (anyWildGames.length > 0 && wildBluesGames.length === 0) {
            console.log(`\n🏒 Other Wild games found in ${search.name}:`);
            anyWildGames.forEach(game => {
              console.log(`   - ${game.name} at ${game.venue?.name || 'Unknown'}`);
            });
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error searching ${search.name}:`, error.message);
      }
    }
    
    console.log('\n❌ Could not find Wild vs Blues game on 10/9/2025');
    console.log('The game might be:');
    console.log('   - Scheduled for a different date');
    console.log('   - Not yet available in the ticket system');
    console.log('   - Listed under different team names');
    console.log('   - At a neutral venue');

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

findBluesGamesOct9();