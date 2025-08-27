#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findWildBluesOct9() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('🏒 SEARCHING FOR WILD VS BLUES ON OCTOBER 9TH, 2025');
    console.log('🎫 Need: 6 tickets, Budget: $3,000 total ($500/ticket)\n');

    // Search specifically for Oct 9, 2025
    const targetDate = new Date('2025-10-09');
    const searchStart = new Date(targetDate);
    searchStart.setHours(0, 0, 0, 0);
    const searchEnd = new Date(targetDate);
    searchEnd.setHours(23, 59, 59, 999);
    
    // Minneapolis coordinates (Xcel Energy Center)
    const minneapolisLat = 44.9778;
    const minneapolisLon = -93.2650;
    
    console.log('🔍 Searching for ALL events in Minneapolis on 10/9/2025...');
    
    const eventsResponse = await apiClient.listEvents({
      lat: minneapolisLat,
      lon: minneapolisLon,
      within: 25,
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 100
    });

    console.log(`✅ Found ${eventsResponse.events?.length || 0} total events on 10/9/2025`);

    if (eventsResponse.events && eventsResponse.events.length > 0) {
      console.log('\n📋 ALL events on 10/9/2025:');
      
      let wildBluesGame = null;
      
      eventsResponse.events.forEach((event, index) => {
        const eventTime = new Date(event.occurs_at);
        console.log(`   ${index+1}. ${event.name} (${eventTime.toLocaleTimeString()}) at ${event.venue?.name || 'Unknown'} - ID: ${event.id}`);
        
        // Look for Wild vs Blues or Blues vs Wild
        const eventName = event.name.toLowerCase();
        if ((eventName.includes('wild') && eventName.includes('blues')) || 
            (eventName.includes('blues') && eventName.includes('wild')) ||
            (eventName.includes('minnesota') && eventName.includes('blues')) ||
            (eventName.includes('st. louis') && eventName.includes('wild')) ||
            (eventName.includes('saint louis') && eventName.includes('wild'))) {
          wildBluesGame = event;
          console.log(`   🎯 ^^ THIS IS THE WILD VS BLUES GAME! ^^`);
        }
      });
      
      if (wildBluesGame) {
        console.log(`\n🏒 FOUND WILD VS BLUES: ${wildBluesGame.name}`);
        console.log(`📅 ${new Date(wildBluesGame.occurs_at).toLocaleDateString()} at ${new Date(wildBluesGame.occurs_at).toLocaleTimeString()}`);
        console.log(`🏟️ ${wildBluesGame.venue?.name || 'Xcel Energy Center'}`);
        console.log(`🆔 Event ID: ${wildBluesGame.id}\n`);
        
        console.log('🎫 Getting BEST seats for 6 people under $500/ticket...');
        
        try {
          const listingsResponse = await apiClient.getListings(wildBluesGame.id);
          console.log(`📊 Found ${listingsResponse.ticket_groups?.length || 0} total listings`);
          
          // Filter for 6+ tickets under $500 (no parking)
          const eligibleTickets = listingsResponse.ticket_groups
            ?.filter(tg => 
              tg.retail_price <= 500 && 
              tg.available_quantity >= 6 &&
              !tg.section?.toLowerCase().includes('parking') &&
              !tg.section?.toLowerCase().includes('lot')
            )
            ?.map(tg => ({
              section: tg.section || 'N/A',
              row: tg.row || 'N/A',
              price_per_ticket: tg.retail_price,
              available_quantity: tg.available_quantity,
              total_cost: tg.retail_price * 6,
              format: tg.format || 'Unknown'
            }))
            ?.sort((a, b) => b.price_per_ticket - a.price_per_ticket) || []; // Sort by highest price = best seats

          if (eligibleTickets.length > 0) {
            console.log(`\n🏆 FOUND ${eligibleTickets.length} OPTIONS FOR 6+ PEOPLE - SHOWING BEST SEATS:`);
            console.log('='.repeat(80));
            
            eligibleTickets.slice(0, 8).forEach((ticket, i) => {
              console.log(`\n${i+1}. Section ${ticket.section}, Row ${ticket.row}`);
              console.log(`   💰 $${ticket.price_per_ticket.toFixed(2)} per ticket`);
              console.log(`   💵 $${ticket.total_cost.toFixed(2)} total for 6 tickets`);
              console.log(`   🎫 ${ticket.available_quantity} available`);
              console.log(`   📱 Format: ${ticket.format}`);
            });
            
            const bestSeats = eligibleTickets[0];
            const budgetRemaining = 3000 - bestSeats.total_cost;
            
            console.log(`\n🎯 TOP RECOMMENDATION (BEST SEATS):`);
            console.log(`   Section ${bestSeats.section}, Row ${bestSeats.row}`);
            console.log(`   💰 $${bestSeats.price_per_ticket}/ticket × 6 = $${bestSeats.total_cost.toFixed(2)} total`);
            console.log(`   💸 Under budget by: $${budgetRemaining.toFixed(2)}`);
            console.log(`   🏒 These are the premium seats - best view of the action!`);
            
            // Show some mid-range options too
            const midRange = eligibleTickets.filter(t => t.price_per_ticket >= 200 && t.price_per_ticket <= 400);
            if (midRange.length > 0) {
              console.log(`\n💰 GOOD VALUE OPTIONS ($200-400/ticket):`);
              midRange.slice(0, 3).forEach((ticket, i) => {
                console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.price_per_ticket}/ticket ($${ticket.total_cost.toFixed(2)} total)`);
              });
            }
            
          } else {
            console.log('\n❌ No seats for 6+ people under $500/ticket');
            
            // Show what's available at any price
            const allTickets = listingsResponse.ticket_groups
              ?.filter(tg => 
                tg.available_quantity >= 6 &&
                !tg.section?.toLowerCase().includes('parking')
              )
              ?.sort((a, b) => a.retail_price - b.retail_price)
              ?.slice(0, 5) || [];
              
            if (allTickets.length > 0) {
              console.log('\n💰 Available for 6+ people (any price):');
              allTickets.forEach((ticket, i) => {
                console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.retail_price}/ticket ($${(ticket.retail_price * 6).toFixed(2)} total)`);
              });
            }
          }
          
        } catch (error) {
          console.log('❌ Error getting ticket listings:', error.message);
        }
        
      } else {
        console.log('\n❌ No Wild vs Blues game found on 10/9/2025');
        console.log('Let me check if there are any hockey/Wild events I missed...');
        
        // Look for ANY Wild or hockey events
        const hockeyEvents = eventsResponse.events.filter(event => {
          const name = event.name.toLowerCase();
          return name.includes('wild') || 
                 name.includes('hockey') || 
                 name.includes('nhl') ||
                 name.includes('minnesota') ||
                 event.venue?.name?.toLowerCase().includes('xcel');
        });
        
        if (hockeyEvents.length > 0) {
          console.log('\n🏒 Hockey/Wild related events found:');
          hockeyEvents.forEach(event => {
            console.log(`   - ${event.name} at ${event.venue?.name || 'Unknown'} - ID: ${event.id}`);
          });
        }
      }
      
    } else {
      console.log('❌ No events found in Minneapolis area on 10/9/2025');
    }

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

findWildBluesOct9();