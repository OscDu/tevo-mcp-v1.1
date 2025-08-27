#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testDodgers5BestPerEvent() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  console.log('⚾ DODGERS GAMES - 5 BEST TICKET PAIRS PER EVENT');
  console.log('🎯 Under $500 total for 2 tickets');
  console.log('=' .repeat(80));

  try {
    // First, find all Dodgers events
    console.log('\n🔍 Finding all Dodgers events...');
    
    const dodgersResult = await handleUniversalEventFinder(apiClient, cache, {
      query: 'Dodgers',
      weeks_ahead: 12,
      requested_quantity: 2
    });

    if (!dodgersResult.success || dodgersResult.events_found.length === 0) {
      console.log('❌ No Dodgers events found');
      return;
    }

    console.log(`✅ Found ${dodgersResult.events_found.length} Dodgers events`);

    // Process each event and get exactly 5 best options
    for (let i = 0; i < dodgersResult.events_found.length; i++) {
      const event = dodgersResult.events_found[i];
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`⚾ EVENT ${i + 1}/${dodgersResult.events_found.length}: ${event.name}`);
      console.log(`📅 ${event.date} at ${event.time}`);
      console.log(`🏟️ ${event.venue}, ${event.city}`);
      console.log(`🆔 Event ID: ${event.event_id}`);
      console.log(`${'='.repeat(80)}`);

      try {
        console.log('🔍 Searching for tickets...');
        
        const listingsResponse = await apiClient.getListings(event.event_id);
        const totalListings = listingsResponse.ticket_groups?.length || 0;
        console.log(`📊 Total ticket groups found: ${totalListings}`);
        
        // Filter and sort tickets under $500 total for 2 tickets
        const affordableTickets = listingsResponse.ticket_groups
          ?.filter(tg => {
            const totalCost = tg.retail_price * 2;
            return totalCost <= 500 && 
                   tg.available_quantity >= 2 &&
                   !tg.section?.toLowerCase().includes('parking') &&
                   !tg.section?.toLowerCase().includes('lot') &&
                   !tg.section?.toLowerCase().includes('garage');
          })
          ?.map(tg => ({
            section: tg.section || 'N/A',
            row: tg.row || 'N/A',
            price_per_ticket: tg.retail_price,
            total_cost_2_tickets: tg.retail_price * 2,
            available_quantity: tg.available_quantity,
            format: tg.format || 'Unknown',
            instant_delivery: tg.instant_delivery || false,
            wheelchair_accessible: tg.wheelchair_accessible || false,
            section_type: tg.section?.toLowerCase().includes('club') ? 'Club' :
                         tg.section?.toLowerCase().includes('box') ? 'Box' :
                         tg.section?.toLowerCase().includes('field') ? 'Field' :
                         tg.section?.toLowerCase().includes('pavilion') ? 'Pavilion' :
                         tg.section?.toLowerCase().includes('reserve') ? 'Reserve' :
                         tg.section?.toLowerCase().includes('top') ? 'Top Deck' : 'General'
          }))
          ?.sort((a, b) => a.price_per_ticket - b.price_per_ticket) // Sort by price (cheapest first)
          || [];

        if (affordableTickets.length === 0) {
          console.log('❌ No tickets under $500 total found for this event');
          
          // Show what IS available for reference
          const anyTickets = listingsResponse.ticket_groups
            ?.filter(tg => tg.available_quantity >= 2 && !tg.section?.toLowerCase().includes('parking'))
            ?.sort((a, b) => a.retail_price - b.retail_price)
            ?.slice(0, 3) || [];
            
          if (anyTickets.length > 0) {
            console.log('\n💡 Cheapest available options:');
            anyTickets.forEach((ticket, index) => {
              const total = ticket.retail_price * 2;
              console.log(`   ${index + 1}. Section ${ticket.section} - $${ticket.retail_price}/ticket ($${total} total) - ${ticket.available_quantity} available`);
            });
          }
          continue;
        }

        console.log(`✅ Found ${affordableTickets.length} ticket groups under $500 total`);
        console.log(`💰 Price range: $${affordableTickets[0].total_cost_2_tickets} - $${affordableTickets[Math.min(affordableTickets.length - 1, 4)].total_cost_2_tickets} total`);

        // Show exactly 5 best options
        const top5Options = affordableTickets.slice(0, 5);
        
        console.log('\n🏆 TOP 5 BEST TICKET PAIRS:');
        console.log('-'.repeat(60));

        top5Options.forEach((ticket, index) => {
          console.log(`\n${index + 1}. 💰 $${ticket.total_cost_2_tickets} TOTAL ($${ticket.price_per_ticket} per ticket)`);
          console.log(`   🎫 Section: ${ticket.section} | Row: ${ticket.row}`);
          console.log(`   🏷️ Type: ${ticket.section_type} seating`);
          console.log(`   📦 Available: ${ticket.available_quantity} tickets`);
          console.log(`   📱 Format: ${ticket.format}${ticket.instant_delivery ? ' (Instant Delivery)' : ''}`);
          console.log(`   ♿ Wheelchair: ${ticket.wheelchair_accessible ? 'Yes' : 'No'}`);
          
          // Add value assessment
          if (ticket.price_per_ticket < 50) {
            console.log(`   ⭐ VALUE: Excellent deal!`);
          } else if (ticket.price_per_ticket < 100) {
            console.log(`   ⭐ VALUE: Good value`);
          } else if (ticket.price_per_ticket < 200) {
            console.log(`   ⭐ VALUE: Standard pricing`);
          } else {
            console.log(`   ⭐ VALUE: Premium pricing`);
          }
        });

        // Summary for this event
        console.log(`\n📊 EVENT SUMMARY:`);
        console.log(`   • Total affordable options: ${affordableTickets.length}`);
        console.log(`   • Cheapest pair: $${affordableTickets[0].total_cost_2_tickets}`);
        console.log(`   • Most expensive in top 5: $${top5Options[top5Options.length - 1].total_cost_2_tickets}`);
        console.log(`   • Section types available: ${[...new Set(top5Options.map(t => t.section_type))].join(', ')}`);
        
      } catch (error) {
        console.log(`❌ Error getting tickets for this event: ${error.message}`);
      }
      
      // Small delay between events to be respectful to the API
      if (i < dodgersResult.events_found.length - 1) {
        console.log('\n⏳ Processing next event...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Final summary across all events
    console.log('\n' + '='.repeat(80));
    console.log('🎉 COMPLETE DODGERS TICKET ANALYSIS FINISHED');
    console.log('='.repeat(80));
    console.log(`✅ Analyzed ${dodgersResult.events_found.length} Dodgers events`);
    console.log(`🎫 Showed top 5 ticket pairs for each event under $500 total`);
    console.log(`📊 Ready for your sales team to use!`);
    console.log('='.repeat(80));

  } catch (error) {
    console.log('❌ Analysis failed:', error.message);
    console.error('Error details:', error);
  }
}

testDodgers5BestPerEvent();