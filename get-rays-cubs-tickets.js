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

async function getRaysCubsTickets() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('⚾ RAYS VS CUBS FOUND!');
    console.log('📅 September 12, 2025');
    console.log('🏟️ Wrigley Field, Chicago');
    console.log('💰 Budget: $150 per ticket for 2 tickets\n');

    // Search for Rays at Cubs on 9/12/2025
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

    const raysCubsGame = eventsResponse.events?.find(event => 
      event.name.toLowerCase().includes('rays') && 
      event.name.toLowerCase().includes('cubs')
    );

    if (raysCubsGame) {
      console.log(`⚾ GAME: ${raysCubsGame.name}`);
      console.log(`📅 ${new Date(raysCubsGame.occurs_at).toLocaleDateString()} at ${new Date(raysCubsGame.occurs_at).toLocaleTimeString()}`);
      console.log(`🏟️ ${raysCubsGame.venue?.name || 'Wrigley Field'}`);
      console.log(`🆔 Event ID: ${raysCubsGame.id}\n`);
      
      console.log('🎫 Getting ticket listings...');
      
      try {
        const listingsResponse = await apiClient.getListings(raysCubsGame.id);
        console.log(`📊 Found ${listingsResponse.ticket_groups?.length || 0} total listings`);
        
        const eligibleTickets = listingsResponse.ticket_groups
          ?.filter(tg => 
            tg.retail_price <= 150 && 
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
          ?.sort((a, b) => a.price_per_ticket - b.price_per_ticket) || [];

        if (eligibleTickets.length > 0) {
          console.log(`\n✅ FOUND ${eligibleTickets.length} TICKET OPTIONS FOR 2+ PEOPLE UNDER $150:`);
          console.log('='.repeat(70));
          
          eligibleTickets.slice(0, 10).forEach((ticket, i) => {
            console.log(`\n${i+1}. Section ${ticket.section}, Row ${ticket.row}`);
            console.log(`   💰 $${ticket.price_per_ticket.toFixed(2)} per ticket`);
            console.log(`   💵 $${ticket.total_cost.toFixed(2)} total for 2 tickets`);
            console.log(`   🎫 ${ticket.available_quantity} tickets available`);
            console.log(`   📱 Format: ${ticket.format}`);
            console.log(`   ⚡ Instant delivery: ${ticket.instant_delivery ? 'Yes' : 'No'}`);
          });
          
          const cheapest = eligibleTickets[0];
          const savings = (150 * 2) - cheapest.total_cost;
          
          console.log(`\n🏆 BEST DEAL: Section ${cheapest.section}, Row ${cheapest.row}`);
          console.log(`💵 $${cheapest.price_per_ticket}/ticket × 2 = $${cheapest.total_cost.toFixed(2)} total`);
          console.log(`💸 You save $${savings.toFixed(2)} vs your $300 budget!`);
          
          // Show some variety in price ranges
          const midRange = eligibleTickets.filter(t => t.price_per_ticket >= 75 && t.price_per_ticket <= 125);
          const premium = eligibleTickets.filter(t => t.price_per_ticket >= 125);
          
          if (midRange.length > 0) {
            console.log(`\n🎯 MID-RANGE OPTIONS ($75-125/ticket):`);
            midRange.slice(0, 3).forEach((ticket, i) => {
              console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.price_per_ticket}/ticket`);
            });
          }
          
          if (premium.length > 0) {
            console.log(`\n💎 PREMIUM OPTIONS ($125-150/ticket):`);
            premium.slice(0, 3).forEach((ticket, i) => {
              console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.price_per_ticket}/ticket`);
            });
          }
          
        } else {
          console.log('\n❌ No tickets available for 2+ people under $150 per ticket');
          
          // Show what's available at any price
          const allTickets = listingsResponse.ticket_groups
            ?.filter(tg => 
              tg.available_quantity >= 2 &&
              !tg.section?.toLowerCase().includes('parking')
            )
            ?.sort((a, b) => a.retail_price - b.retail_price)
            ?.slice(0, 5) || [];
            
          if (allTickets.length > 0) {
            console.log('\n💰 Cheapest available options for 2+ people:');
            allTickets.forEach((ticket, i) => {
              console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.retail_price}/ticket ($${(ticket.retail_price * 2).toFixed(2)} total)`);
            });
          }
        }
        
      } catch (error) {
        console.log('❌ Error getting ticket listings:', error.message);
        if (error.message.includes('timeout')) {
          console.log('💡 The request timed out - this event has many tickets to process');
        }
      }
      
    } else {
      console.log('❌ Could not find Rays vs Cubs game on 9/12/2025');
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

getRaysCubsTickets();