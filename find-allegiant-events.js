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

async function findAllegiantEvents() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('🥊 SEARCHING FOR CANELO VS CRAWFORD AT ALLEGIANT STADIUM');
    console.log('📅 Target Date: September 13, 2025');
    console.log('💰 Budget: $2,500 per ticket for 2 tickets\n');

    // Allegiant Stadium venue ID (from our NFL venues list)
    const allegiantVenueId = 2308;
    
    // Search events at Allegiant Stadium around September 2025
    const targetDate = new Date('2025-09-13');
    const searchStart = new Date(targetDate);
    searchStart.setDate(targetDate.getDate() - 7); // Week before
    const searchEnd = new Date(targetDate);
    searchEnd.setDate(targetDate.getDate() + 7); // Week after
    
    console.log(`🔍 Searching Allegiant Stadium events from ${searchStart.toLocaleDateString()} to ${searchEnd.toLocaleDateString()}...`);
    
    const eventsResponse = await apiClient.listEvents({
      venue_id: allegiantVenueId,
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 50
    });

    console.log(`✅ Found ${eventsResponse.events?.length || 0} events at Allegiant Stadium`);

    if (eventsResponse.events && eventsResponse.events.length > 0) {
      console.log('\n📋 Events during target week:');
      
      let foundCaneloEvent = null;
      
      eventsResponse.events.forEach(event => {
        const eventDate = new Date(event.occurs_at);
        console.log(`   - ${event.name} (${eventDate.toLocaleDateString()}) ID: ${event.id}`);
        
        // Look for Canelo/Crawford/boxing related keywords
        const eventName = event.name.toLowerCase();
        if (eventName.includes('canelo') || eventName.includes('crawford') || eventName.includes('boxing')) {
          foundCaneloEvent = event;
        }
      });
      
      if (foundCaneloEvent) {
        console.log(`\n🎯 FOUND BOXING EVENT: ${foundCaneloEvent.name}`);
        console.log(`📅 Date: ${new Date(foundCaneloEvent.occurs_at).toLocaleDateString()}`);
        console.log(`🆔 Event ID: ${foundCaneloEvent.id}`);
        console.log('\n🎫 Getting ticket listings...');
        
        try {
          const listingsResponse = await apiClient.getListings(foundCaneloEvent.id);
          
          // Filter for 2+ tickets under $2500
          const eligibleTickets = listingsResponse.ticket_groups
            ?.filter(tg => 
              tg.retail_price <= 2500 && 
              tg.available_quantity >= 2 &&
              !tg.section?.toLowerCase().includes('parking')
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
            console.log(`\n🎫 FOUND ${eligibleTickets.length} TICKET OPTIONS:`);
            console.log('='.repeat(50));
            
            eligibleTickets.slice(0, 8).forEach((ticket, i) => {
              console.log(`${i+1}. Section ${ticket.section}, Row ${ticket.row}`);
              console.log(`   💰 $${ticket.price_per_ticket}/ticket × 2 = $${ticket.total_cost.toFixed(2)} total`);
              console.log(`   🎫 ${ticket.available_quantity} available\n`);
            });
            
            console.log(`🏆 BEST DEAL: Section ${eligibleTickets[0].section} at $${eligibleTickets[0].price_per_ticket}/ticket`);
            console.log(`💵 Total cost for 2 tickets: $${eligibleTickets[0].total_cost.toFixed(2)}`);
            
          } else {
            console.log('❌ No tickets available for 2+ people under $2,500/ticket');
          }
          
        } catch (error) {
          console.log('❌ Error getting listings:', error.message);
        }
        
      } else {
        console.log('\n❌ No boxing/Canelo events found during that week');
        console.log('The event might be scheduled differently or not yet available');
      }
      
    } else {
      console.log('❌ No events found at Allegiant Stadium during target week');
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

findAllegiantEvents();