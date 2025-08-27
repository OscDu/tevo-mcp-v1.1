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

async function findRaysCubs() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('⚾ SEARCHING FOR RAYS VS CUBS');
    console.log('📅 Date: September 12, 2025 at 2:20 PM');
    console.log('🏟️ Venue: Chicago, IL (likely Wrigley Field)');
    console.log('💰 Budget: $150 per ticket');
    console.log('🎫 Need: 2 tickets\n');

    // Search Chicago area for baseball events on 9/12/2025
    const targetDate = new Date('2025-09-12');
    const searchStart = new Date(targetDate);
    searchStart.setHours(0, 0, 0, 0);
    const searchEnd = new Date(targetDate);
    searchEnd.setHours(23, 59, 59, 999);
    
    // Chicago coordinates
    const chicagoLat = 41.8781;
    const chicagoLon = -87.6298;
    
    console.log('🔍 Searching Chicago area for baseball games on 9/12/2025...');
    
    const eventsResponse = await apiClient.listEvents({
      lat: chicagoLat,
      lon: chicagoLon,
      within: 15, // 15 mile radius
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 50
    });

    console.log(`✅ Found ${eventsResponse.events?.length || 0} events in Chicago area on 9/12/2025`);

    if (eventsResponse.events && eventsResponse.events.length > 0) {
      console.log('\n📋 Events on 9/12/2025:');
      
      let foundGame = null;
      
      eventsResponse.events.forEach(event => {
        const eventTime = new Date(event.occurs_at);
        console.log(`   - ${event.name} (${eventTime.toLocaleTimeString()}) at ${event.venue?.name || 'Unknown'}`);
        
        // Look for Rays vs Cubs or Cubs vs Rays
        const eventName = event.name.toLowerCase();
        if ((eventName.includes('rays') && eventName.includes('cubs')) || 
            (eventName.includes('cubs') && eventName.includes('rays')) ||
            (eventName.includes('tampa bay') && eventName.includes('cubs')) ||
            (eventName.includes('cubs') && eventName.includes('tampa'))) {
          foundGame = event;
        }
      });
      
      if (foundGame) {
        console.log(`\n⚾ FOUND THE GAME: ${foundGame.name}`);
        console.log(`📅 ${new Date(foundGame.occurs_at).toLocaleDateString()} at ${new Date(foundGame.occurs_at).toLocaleTimeString()}`);
        console.log(`🏟️ ${foundGame.venue?.name || 'Unknown venue'}`);
        console.log(`🆔 Event ID: ${foundGame.id}`);
        console.log('\n🎫 Getting ticket listings...');
        
        try {
          const listingsResponse = await apiClient.getListings(foundGame.id);
          
          // Filter for 2+ tickets under $150
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
              total_cost: tg.retail_price * 2,
              format: tg.format || 'Unknown',
              instant_delivery: tg.instant_delivery || false
            }))
            ?.sort((a, b) => a.price_per_ticket - b.price_per_ticket) || [];

          if (eligibleTickets.length > 0) {
            console.log(`\n🎫 FOUND ${eligibleTickets.length} TICKET OPTIONS FOR 2+ PEOPLE:`);
            console.log('='.repeat(60));
            
            eligibleTickets.slice(0, 10).forEach((ticket, i) => {
              console.log(`\n${i+1}. Section ${ticket.section}, Row ${ticket.row}`);
              console.log(`   💰 $${ticket.price_per_ticket.toFixed(2)} per ticket`);
              console.log(`   💵 $${ticket.total_cost.toFixed(2)} total for 2 tickets`);
              console.log(`   🎫 ${ticket.available_quantity} available`);
              console.log(`   📱 Format: ${ticket.format}`);
              console.log(`   ⚡ Instant: ${ticket.instant_delivery ? 'Yes' : 'No'}`);
            });
            
            const cheapest = eligibleTickets[0];
            const savings = (150 - cheapest.price_per_ticket) * 2;
            
            console.log(`\n💸 SAVINGS: $${savings.toFixed(2)} vs your $300 budget for 2 tickets!`);
            console.log(`🏆 BEST DEAL: Section ${cheapest.section} at $${cheapest.price_per_ticket}/ticket`);
            
            // Show some premium options too
            const premium = eligibleTickets.filter(t => t.price_per_ticket > 100).slice(0, 3);
            if (premium.length > 0) {
              console.log(`\n💎 PREMIUM OPTIONS ($100+ per ticket):`);
              premium.forEach((ticket, i) => {
                console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.price_per_ticket}/ticket`);
              });
            }
            
          } else {
            console.log('\n❌ No tickets available for 2+ people under $150 per ticket');
            
            // Check what's available at higher prices
            const allTickets = listingsResponse.ticket_groups
              ?.filter(tg => 
                tg.available_quantity >= 2 &&
                !tg.section?.toLowerCase().includes('parking')
              )
              ?.sort((a, b) => a.retail_price - b.retail_price)
              ?.slice(0, 5) || [];
              
            if (allTickets.length > 0) {
              console.log('\n💰 Available options for 2+ people (any price):');
              allTickets.forEach((ticket, i) => {
                console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.retail_price}/ticket ($${(ticket.retail_price * 2).toFixed(2)} total)`);
              });
            }
          }
          
        } catch (error) {
          console.log('❌ Error getting ticket listings:', error.message);
        }
        
      } else {
        console.log('\n❌ No Rays vs Cubs game found on 9/12/2025');
        console.log('The game might be scheduled differently or not available yet');
        
        // Look for any Cubs games that day
        const cubsGames = eventsResponse.events.filter(event => 
          event.name.toLowerCase().includes('cubs')
        );
        
        if (cubsGames.length > 0) {
          console.log('\n⚾ Cubs games found that day:');
          cubsGames.forEach(game => {
            console.log(`   - ${game.name} at ${new Date(game.occurs_at).toLocaleTimeString()}`);
          });
        }
      }
      
    } else {
      console.log('❌ No events found in Chicago area on 9/12/2025');
      console.log('Try checking if the game date is correct or if it\'s scheduled for a different day');
    }

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

findRaysCubs();