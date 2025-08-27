#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleSearchSuggestions } from './dist/tools/search-suggestions.js';
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

async function findCaneloEvent() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  try {
    console.log('🥊 SEARCHING FOR CANELO VS CRAWFORD');
    console.log('📅 Date: September 13, 2025');
    console.log('🏟️ Venue: Allegiant Stadium, Las Vegas');
    console.log('💰 Budget: $2,500 per ticket');
    console.log('🎫 Need: 2 tickets\n');

    // Search for Canelo events
    console.log('🔍 Searching for "Canelo Crawford"...');
    const searchResult = await handleSearchSuggestions(apiClient, cache, {
      q: 'Canelo Crawford',
      limit: 10
    });

    if (searchResult.events && searchResult.events.length > 0) {
      console.log(`✅ Found ${searchResult.events.length} event(s):`);
      
      for (const event of searchResult.events) {
        console.log(`\n🥊 ${event.name}`);
        console.log(`📅 ${new Date(event.occurs_at).toLocaleDateString()} at ${new Date(event.occurs_at).toLocaleTimeString()}`);
        console.log(`🏟️ ${event.venue_name}, ${event.venue_location}`);
        console.log(`🆔 Event ID: ${event.id}`);
        
        // Check if this matches our target event
        const eventDate = new Date(event.occurs_at);
        const targetDate = new Date('2025-09-13');
        const isCorrectDate = eventDate.toDateString() === targetDate.toDateString();
        const isAllegiant = event.venue_name?.toLowerCase().includes('allegiant');
        
        if (isCorrectDate && isAllegiant) {
          console.log('🎯 THIS IS THE MATCH! Getting ticket listings...');
          
          try {
            const listingsResponse = await apiClient.getListings(event.id);
            
            // Filter tickets for 2+ seats under $2500
            const eligibleTickets = listingsResponse.ticket_groups
              ?.filter(tg => 
                tg.retail_price <= 2500 && 
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
              const savings = (2500 - cheapest.price_per_ticket) * 2;
              
              console.log(`\n💸 SAVINGS: $${savings.toFixed(2)} vs your $5,000 budget for 2 tickets!`);
              console.log(`🏆 BEST DEAL: Section ${cheapest.section} at $${cheapest.price_per_ticket}/ticket`);
              
            } else {
              console.log('\n❌ No tickets available for 2+ people under $2,500 per ticket');
              
              // Check what's available at higher prices
              const allTickets = listingsResponse.ticket_groups
                ?.filter(tg => tg.available_quantity >= 2)
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
          
          break; // Found the right event
        }
      }
      
    } else {
      console.log('❌ No events found for "Canelo Crawford"');
      
      // Try alternative searches
      console.log('\n🔍 Trying alternative search "Canelo"...');
      const caneloSearch = await handleSearchSuggestions(apiClient, cache, {
        q: 'Canelo',
        limit: 10
      });
      
      if (caneloSearch.events && caneloSearch.events.length > 0) {
        console.log(`Found ${caneloSearch.events.length} Canelo events:`);
        caneloSearch.events.forEach(event => {
          console.log(`   - ${event.name} (${new Date(event.occurs_at).toLocaleDateString()}) at ${event.venue_name}`);
        });
      }
    }

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

findCaneloEvent();