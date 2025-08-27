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

async function searchCaneloEvents() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('🥊 BROAD SEARCH FOR CANELO VS CRAWFORD');
    console.log('📅 Looking for boxing events in Fall 2025\n');

    // Search for boxing events in Las Vegas area in September-October 2025
    const searchStart = new Date('2025-09-01');
    const searchEnd = new Date('2025-10-31');
    
    console.log('🔍 Searching all Las Vegas events September-October 2025...');
    
    // Search by geographic location (Las Vegas coordinates)
    const vegasLat = 36.1699;
    const vegasLon = -115.1398;
    
    const eventsResponse = await apiClient.listEvents({
      lat: vegasLat,
      lon: vegasLon,
      within: 25, // 25 mile radius
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 100
    });

    console.log(`✅ Found ${eventsResponse.events?.length || 0} events in Las Vegas area`);

    if (eventsResponse.events && eventsResponse.events.length > 0) {
      console.log('\n🔍 Looking for boxing/fight events...');
      
      const boxingEvents = eventsResponse.events.filter(event => {
        const name = event.name.toLowerCase();
        return name.includes('boxing') || 
               name.includes('fight') || 
               name.includes('canelo') || 
               name.includes('crawford') || 
               name.includes('vs') && (name.includes('boxing') || name.includes('fight'));
      });
      
      if (boxingEvents.length > 0) {
        console.log(`\n🥊 FOUND ${boxingEvents.length} BOXING/FIGHT EVENT(S):`);
        console.log('='.repeat(60));
        
        for (const event of boxingEvents) {
          console.log(`\n🥊 ${event.name}`);
          console.log(`📅 ${new Date(event.occurs_at).toLocaleDateString()} at ${new Date(event.occurs_at).toLocaleTimeString()}`);
          console.log(`🏟️ ${event.venue?.name || 'Unknown venue'}`);
          console.log(`🆔 Event ID: ${event.id}`);
          
          // If this looks like our target event, get tickets
          const eventName = event.name.toLowerCase();
          if (eventName.includes('canelo') && eventName.includes('crawford')) {
            console.log('🎯 THIS MATCHES! Getting tickets...');
            
            try {
              const listingsResponse = await apiClient.getListings(event.id);
              
              const eligibleTickets = listingsResponse.ticket_groups
                ?.filter(tg => 
                  tg.retail_price <= 2500 && 
                  tg.available_quantity >= 2 &&
                  !tg.section?.toLowerCase().includes('parking')
                )
                ?.sort((a, b) => a.retail_price - b.retail_price)
                ?.slice(0, 5) || [];

              if (eligibleTickets.length > 0) {
                console.log('\n🎫 TICKET OPTIONS FOR 2:');
                eligibleTickets.forEach((ticket, i) => {
                  console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.retail_price}/ticket ($${(ticket.retail_price * 2).toFixed(2)} total)`);
                });
              } else {
                console.log('\n❌ No tickets available for 2+ under $2,500');
              }
              
            } catch (error) {
              console.log('❌ Error getting tickets:', error.message);
            }
          }
        }
        
      } else {
        console.log('\n❌ No boxing/fight events found in Las Vegas for Sept-Oct 2025');
        
        // Show some sample events to verify we're getting data
        console.log('\n📋 Sample events found (to verify search is working):');
        eventsResponse.events.slice(0, 5).forEach(event => {
          console.log(`   - ${event.name} (${new Date(event.occurs_at).toLocaleDateString()})`);
        });
      }
      
    } else {
      console.log('❌ No events found in Las Vegas area during that timeframe');
    }

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

searchCaneloEvents();