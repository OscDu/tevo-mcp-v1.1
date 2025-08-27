#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
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

async function checkRaysWhiteSox() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('⚾ FOUND: TAMPA BAY RAYS AT CHICAGO WHITE SOX');
    console.log('📅 September 12, 2025');
    console.log('🏟️ Rate Field (Guaranteed Rate Field)');
    console.log('💡 Note: This is Rays vs White Sox, not Rays vs Cubs\n');

    // Search for the specific game
    const targetDate = new Date('2025-09-12');
    const searchStart = new Date(targetDate);
    searchStart.setHours(0, 0, 0, 0);
    const searchEnd = new Date(targetDate);
    searchEnd.setHours(23, 59, 59, 999);
    
    const chicagoLat = 41.8781;
    const chicagoLon = -87.6298;
    
    const eventsResponse = await apiClient.listEvents({
      lat: chicagoLat,
      lon: chicagoLon,
      within: 15,
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 50
    });

    const raysGame = eventsResponse.events?.find(event => 
      event.name.toLowerCase().includes('rays') && 
      event.name.toLowerCase().includes('white sox')
    );

    if (raysGame) {
      console.log(`⚾ GAME: ${raysGame.name}`);
      console.log(`📅 ${new Date(raysGame.occurs_at).toLocaleDateString()} at ${new Date(raysGame.occurs_at).toLocaleTimeString()}`);
      console.log(`🏟️ ${raysGame.venue?.name || 'Rate Field'}`);
      console.log(`🆔 Event ID: ${raysGame.id}\n`);
      
      console.log('🎫 Getting tickets for 2 people under $150...');
      
      try {
        const listingsResponse = await apiClient.getListings(raysGame.id);
        
        const eligibleTickets = listingsResponse.ticket_groups
          ?.filter(tg => 
            tg.retail_price <= 150 && 
            tg.available_quantity >= 2 &&
            !tg.section?.toLowerCase().includes('parking') &&
            !tg.section?.toLowerCase().includes('lot')
          )
          ?.map(tg => ({
            section: tg.section || 'N/A',
            row: tg.row || 'N/A',
            price_per_ticket: tg.retail_price,
            available_quantity: tg.available_quantity,
            total_cost: tg.retail_price * 2
          }))
          ?.sort((a, b) => a.price_per_ticket - b.price_per_ticket) || [];

        if (eligibleTickets.length > 0) {
          console.log(`\n✅ FOUND ${eligibleTickets.length} TICKET OPTIONS:`);
          console.log('='.repeat(50));
          
          eligibleTickets.slice(0, 8).forEach((ticket, i) => {
            console.log(`${i+1}. Section ${ticket.section}, Row ${ticket.row}`);
            console.log(`   💰 $${ticket.price_per_ticket}/ticket × 2 = $${ticket.total_cost.toFixed(2)} total`);
            console.log(`   🎫 ${ticket.available_quantity} available\n`);
          });
          
          const cheapest = eligibleTickets[0];
          console.log(`🏆 BEST DEAL: Section ${cheapest.section} at $${cheapest.price_per_ticket}/ticket`);
          console.log(`💵 Total for 2 tickets: $${cheapest.total_cost.toFixed(2)}`);
          console.log(`💸 Under budget by: $${(300 - cheapest.total_cost).toFixed(2)}`);
          
        } else {
          console.log('\n❌ No tickets for 2+ people under $150/ticket');
          
          // Show cheapest available
          const cheapest = listingsResponse.ticket_groups
            ?.filter(tg => tg.available_quantity >= 2)
            ?.sort((a, b) => a.retail_price - b.retail_price)
            ?.slice(0, 3) || [];
            
          if (cheapest.length > 0) {
            console.log('\n💰 Cheapest available for 2:');
            cheapest.forEach((ticket, i) => {
              console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.retail_price}/ticket ($${(ticket.retail_price * 2).toFixed(2)} total)`);
            });
          }
        }
        
      } catch (error) {
        console.log('❌ Error getting tickets:', error.message);
      }
      
    } else {
      console.log('❌ Could not find the Rays game');
    }

    // Also check if there are any Cubs games that week
    console.log('\n🔍 Checking for Cubs games around that time...');
    
    const weekStart = new Date('2025-09-08');
    const weekEnd = new Date('2025-09-15');
    
    const weekEventsResponse = await apiClient.listEvents({
      lat: chicagoLat,
      lon: chicagoLon,
      within: 15,
      occurs_at_gte: weekStart.toISOString(),
      occurs_at_lt: weekEnd.toISOString(),
      per_page: 100
    });

    const cubsGames = weekEventsResponse.events?.filter(event => 
      event.name.toLowerCase().includes('cubs')
    ) || [];

    if (cubsGames.length > 0) {
      console.log(`\n⚾ Cubs games that week (Sep 8-15):`);
      cubsGames.forEach(game => {
        console.log(`   - ${game.name} (${new Date(game.occurs_at).toLocaleDateString()})`);
      });
    } else {
      console.log('\n📅 No Cubs games found that week');
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkRaysWhiteSox();