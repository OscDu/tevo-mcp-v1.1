#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findWildBestSeats() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('🏒 FINDING BEST SEATS FOR MINNESOTA WILD');
    console.log('📅 October 9th, 2025');
    console.log('🎫 Need: 6 tickets');
    console.log('💰 Budget: $3,000 total ($500 per ticket)\n');

    // Search Minneapolis area for Wild games on Oct 9, 2025
    const targetDate = new Date('2025-10-09');
    const searchStart = new Date(targetDate);
    searchStart.setHours(0, 0, 0, 0);
    const searchEnd = new Date(targetDate);
    searchEnd.setHours(23, 59, 59, 999);
    
    // Minneapolis coordinates (Xcel Energy Center area)
    const minneapolisLat = 44.9778;
    const minneapolisLon = -93.2650;
    
    console.log('🔍 Searching Minneapolis area for Wild games on 10/9/2025...');
    
    const eventsResponse = await apiClient.listEvents({
      lat: minneapolisLat,
      lon: minneapolisLon,
      within: 20,
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 50
    });

    console.log(`✅ Found ${eventsResponse.events?.length || 0} events in Minneapolis area on 10/9/2025`);

    if (eventsResponse.events && eventsResponse.events.length > 0) {
      console.log('\n📋 Events on 10/9/2025:');
      
      let foundWildGame = null;
      
      eventsResponse.events.forEach(event => {
        const eventTime = new Date(event.occurs_at);
        console.log(`   - ${event.name} (${eventTime.toLocaleTimeString()}) at ${event.venue?.name || 'Unknown'}`);
        
        // Look for Wild games
        const eventName = event.name.toLowerCase();
        if (eventName.includes('wild') || eventName.includes('minnesota')) {
          foundWildGame = event;
        }
      });
      
      if (foundWildGame) {
        console.log(`\n🏒 FOUND WILD GAME: ${foundWildGame.name}`);
        console.log(`📅 ${new Date(foundWildGame.occurs_at).toLocaleDateString()} at ${new Date(foundWildGame.occurs_at).toLocaleTimeString()}`);
        console.log(`🏟️ ${foundWildGame.venue?.name || 'Xcel Energy Center'}`);
        console.log(`🆔 Event ID: ${foundWildGame.id}\n`);
        
        console.log('🎫 Finding BEST seats for 6 people under $500/ticket...');
        
        try {
          const listingsResponse = await apiClient.getListings(foundWildGame.id);
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
              format: tg.format || 'Unknown',
              instant_delivery: tg.instant_delivery || false
            })) || [];

          if (eligibleTickets.length > 0) {
            console.log(`\n✅ Found ${eligibleTickets.length} options for 6+ people under $500/ticket`);
            
            // BEST SEATS: Lower level (100-level at Xcel Energy Center)
            const lowerLevel = eligibleTickets.filter(tg => {
              const section = tg.section || '';
              return section.match(/^1\d\d/) || // 100-level sections
                     section.includes('Club') ||
                     section.includes('Box') ||
                     section.match(/^[1-9]$/) || // Single digit sections
                     section.match(/^[1-5]\d$/) // 10-59 sections (lower bowl)
            }).sort((a, b) => b.price_per_ticket - a.price_per_ticket); // Sort by highest price (best seats)

            if (lowerLevel.length > 0) {
              console.log('\n🏆 BEST SEATS - LOWER LEVEL/CLUB LEVEL:');
              console.log('='.repeat(70));
              lowerLevel.slice(0, 5).forEach((ticket, i) => {
                console.log(`\n${i+1}. Section ${ticket.section}, Row ${ticket.row}`);
                console.log(`   💰 $${ticket.price_per_ticket.toFixed(2)} per ticket`);
                console.log(`   💵 $${ticket.total_cost.toFixed(2)} total for 6 tickets`);
                console.log(`   🎫 ${ticket.available_quantity} available`);
                console.log(`   📱 Format: ${ticket.format}`);
                console.log(`   ⚡ Instant: ${ticket.instant_delivery ? 'Yes' : 'No'}`);
              });
            }

            // PREMIUM SEATS: Highest priced within budget
            const premiumSeats = [...eligibleTickets]
              .sort((a, b) => b.price_per_ticket - a.price_per_ticket)
              .slice(0, 5);

            console.log('\n💎 MOST PREMIUM SEATS (within $500 budget):');
            console.log('='.repeat(70));
            premiumSeats.forEach((ticket, i) => {
              console.log(`\n${i+1}. Section ${ticket.section}, Row ${ticket.row}`);
              console.log(`   💰 $${ticket.price_per_ticket.toFixed(2)} per ticket`);
              console.log(`   💵 $${ticket.total_cost.toFixed(2)} total for 6 tickets`);
              console.log(`   🎫 ${ticket.available_quantity} available`);
            });

            // CENTER ICE seats (sections around center ice)
            const centerIceSections = ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110',
                                     '111', '112', '113', '114', '115', '116', '117', '118', '119', '120',
                                     'Club', 'Premium', 'Center'];
            
            const centerIceSeats = eligibleTickets.filter(tg => {
              const section = (tg.section || '').toLowerCase();
              return centerIceSections.some(sec => 
                section.includes(sec.toLowerCase()) || 
                section === sec.toLowerCase()
              );
            }).sort((a, b) => b.price_per_ticket - a.price_per_ticket);

            if (centerIceSeats.length > 0) {
              console.log('\n🏒 CENTER ICE AREA SEATS:');
              console.log('='.repeat(50));
              centerIceSeats.slice(0, 3).forEach((ticket, i) => {
                console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.price_per_ticket}/ticket ($${ticket.total_cost.toFixed(2)} total)`);
              });
            }

            // GIVE RECOMMENDATION
            const bestOption = premiumSeats[0];
            const budgetRemaining = 3000 - bestOption.total_cost;
            
            console.log(`\n🎯 TOP RECOMMENDATION:`);
            console.log(`   Section ${bestOption.section}, Row ${bestOption.row}`);
            console.log(`   💰 $${bestOption.price_per_ticket}/ticket × 6 = $${bestOption.total_cost.toFixed(2)} total`);
            console.log(`   💸 Under budget by: $${budgetRemaining.toFixed(2)}`);
            console.log(`   🏒 These are premium seats - best view and experience!`);
            
            // Show value options too
            const valueSeats = eligibleTickets
              .filter(t => t.price_per_ticket >= 200 && t.price_per_ticket <= 350)
              .sort((a, b) => b.price_per_ticket - a.price_per_ticket);
              
            if (valueSeats.length > 0) {
              console.log(`\n💰 GOOD VALUE OPTIONS ($200-350/ticket):`);
              valueSeats.slice(0, 3).forEach((ticket, i) => {
                console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.price_per_ticket}/ticket ($${ticket.total_cost.toFixed(2)} total)`);
              });
            }
            
          } else {
            console.log('\n❌ No seats available for 6+ people under $500 per ticket');
            
            // Check what's available at higher prices
            const allTickets = listingsResponse.ticket_groups
              ?.filter(tg => 
                tg.available_quantity >= 6 &&
                !tg.section?.toLowerCase().includes('parking')
              )
              ?.sort((a, b) => a.retail_price - b.retail_price)
              ?.slice(0, 5) || [];
              
            if (allTickets.length > 0) {
              console.log('\n💰 Available options for 6+ people (any price):');
              allTickets.forEach((ticket, i) => {
                console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.retail_price}/ticket ($${(ticket.retail_price * 6).toFixed(2)} total)`);
              });
            }
          }
          
        } catch (error) {
          console.log('❌ Error getting ticket listings:', error.message);
        }
        
      } else {
        console.log('\n❌ No Wild games found on 10/9/2025');
        console.log('The game might be scheduled differently or not available yet');
        
        // Show what events we did find
        console.log('\n📋 Other events found that day:');
        eventsResponse.events.slice(0, 5).forEach(event => {
          console.log(`   - ${event.name}`);
        });
      }
      
    } else {
      console.log('❌ No events found in Minneapolis area on 10/9/2025');
    }

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

findWildBestSeats();