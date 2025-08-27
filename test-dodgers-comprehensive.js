#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testDodgersComprehensive() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  console.log('⚾ COMPREHENSIVE DODGERS TICKET SEARCH');
  console.log('🎯 Finding ALL Dodgers events with best tickets under $500 total (2 tickets)');
  console.log('=' .repeat(80));

  try {
    // Step 1: Find ALL Dodgers events using enhanced universal finder
    console.log('\n🔍 STEP 1: Finding ALL Dodgers Events');
    console.log('-'.repeat(50));
    
    const dodgersResult = await handleUniversalEventFinder(apiClient, cache, {
      query: 'Dodgers',
      weeks_ahead: 16, // Search 16 weeks ahead for comprehensive coverage
      budget_per_ticket: 250, // $250 per ticket = $500 total for 2
      requested_quantity: 2
    });

    if (!dodgersResult.success || dodgersResult.events_found.length === 0) {
      console.log('❌ No Dodgers events found with universal finder');
      console.log('🔍 Trying direct venue searches...');
      
      // Fallback: Direct searches at multiple venues
      const venueSearches = [
        // Home games at Dodger Stadium
        {
          name: 'Dodger Stadium (Home Games)',
          params: {
            lat: 34.0739,
            lon: -118.2400,
            within: 2,
            per_page: 100
          }
        },
        // Away games in major markets
        {
          name: 'San Diego (Padres vs Dodgers)',
          params: {
            lat: 32.7157,
            lon: -117.1611,
            within: 25,
            per_page: 100
          }
        },
        {
          name: 'San Francisco (Giants vs Dodgers)',
          params: {
            lat: 37.7749,
            lon: -122.4194,
            within: 25,
            per_page: 100
          }
        },
        {
          name: 'Arizona (Diamondbacks vs Dodgers)',
          params: {
            lat: 33.4452,
            lon: -112.0667,
            within: 25,
            per_page: 100
          }
        }
      ];

      let allDodgerEvents = [];
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + (16 * 7)); // 16 weeks ahead

      for (const search of venueSearches) {
        console.log(`   🔍 Searching ${search.name}...`);
        
        try {
          const searchParams = {
            ...search.params,
            occurs_at_gte: now.toISOString(),
            occurs_at_lt: futureDate.toISOString()
          };
          
          const eventsResponse = await apiClient.listEvents(searchParams);
          const dodgerGames = eventsResponse.events?.filter(event => {
            const name = event.name.toLowerCase();
            return name.includes('dodgers') || 
                   name.includes('los angeles dodgers') ||
                   (name.includes('los angeles') && (name.includes(' at ') || name.includes(' vs ')));
          }) || [];
          
          console.log(`      Found ${dodgerGames.length} Dodgers games`);
          
          // Add unique events
          dodgerGames.forEach(game => {
            if (!allDodgerEvents.some(existing => existing.id === game.id)) {
              allDodgerEvents.push(game);
            }
          });
          
        } catch (error) {
          console.log(`      ❌ Error searching ${search.name}: ${error.message}`);
        }
      }

      if (allDodgerEvents.length === 0) {
        console.log('❌ No Dodgers events found in any venue');
        return;
      }

      console.log(`\n✅ Found ${allDodgerEvents.length} total Dodgers events from direct venue searches`);
      
      // Convert to the format expected by the rest of the script
      dodgersResult.events_found = allDodgerEvents.map(event => ({
        event_id: event.id,
        name: event.name,
        date: new Date(event.occurs_at).toLocaleDateString(),
        time: new Date(event.occurs_at).toLocaleTimeString(),
        venue: event.venue?.name || 'Unknown venue',
        city: event.venue?.city || '',
        state: event.venue?.state || ''
      }));
      dodgersResult.success = true;
    }

    console.log(`\n✅ FOUND ${dodgersResult.events_found.length} DODGERS EVENTS!`);
    console.log(`📊 Search Strategy: ${dodgersResult.strategy_used || 'venue_fallback'}`);
    if (dodgersResult.search_summary) {
      console.log(`🔧 API Calls Made: ${dodgersResult.search_summary.api_calls_made}`);
    }

    // Step 2: Process each event to find best tickets under $500 total
    console.log('\n🎫 STEP 2: Finding Best Tickets Under $500 Total (2 Tickets)');
    console.log('-'.repeat(60));

    const allTicketOptions = [];
    let processedEvents = 0;
    
    for (const event of dodgersResult.events_found) {
      processedEvents++;
      console.log(`\n⚾ EVENT ${processedEvents}/${dodgersResult.events_found.length}: ${event.name}`);
      console.log(`   📅 ${event.date} at ${event.time}`);
      console.log(`   🏟️ ${event.venue}, ${event.city} ${event.state}`);
      console.log(`   🆔 Event ID: ${event.event_id}`);

      try {
        console.log('   🔍 Searching for tickets...');
        
        const listingsResponse = await apiClient.getListings(event.event_id);
        console.log(`   📊 Found ${listingsResponse.ticket_groups?.length || 0} total ticket groups`);
        
        // Filter for tickets under $500 total (2 tickets) and minimum quantity available
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
            event_id: event.event_id,
            event_name: event.name,
            event_date: event.date,
            event_time: event.time,
            venue: event.venue,
            section: tg.section || 'N/A',
            row: tg.row || 'N/A',
            price_per_ticket: tg.retail_price,
            total_cost_2_tickets: tg.retail_price * 2,
            available_quantity: tg.available_quantity,
            format: tg.format || 'Unknown',
            instant_delivery: tg.instant_delivery || false,
            wheelchair_accessible: tg.wheelchair_accessible || false
          }))
          ?.sort((a, b) => a.price_per_ticket - b.price_per_ticket) // Sort by price (cheapest first)
          || [];

        if (affordableTickets.length > 0) {
          console.log(`   ✅ Found ${affordableTickets.length} ticket groups under $500 total`);
          console.log(`   💰 Price range: $${affordableTickets[0].total_cost_2_tickets} - $${affordableTickets[affordableTickets.length - 1].total_cost_2_tickets} total`);
          
          // Take top 5 options for this event
          const topOptions = affordableTickets.slice(0, 5);
          allTicketOptions.push(...topOptions);
          
          // Show preview of best options
          topOptions.slice(0, 3).forEach((ticket, index) => {
            console.log(`      ${index + 1}. Section ${ticket.section}, Row ${ticket.row} - $${ticket.price_per_ticket}/ticket ($${ticket.total_cost_2_tickets} total)`);
          });
        } else {
          console.log(`   ❌ No tickets found under $500 total for 2 people`);
          
          // Show what's available for reference
          const anyTickets = listingsResponse.ticket_groups
            ?.filter(tg => 
              tg.available_quantity >= 2 && 
              !tg.section?.toLowerCase().includes('parking')
            )
            ?.sort((a, b) => a.retail_price - b.retail_price)
            ?.slice(0, 2) || [];
            
          if (anyTickets.length > 0) {
            console.log(`   💡 Cheapest available: $${anyTickets[0].retail_price}/ticket ($${anyTickets[0].retail_price * 2} total) in Section ${anyTickets[0].section}`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error getting tickets: ${error.message}`);
      }
      
      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Step 3: Show comprehensive results
    console.log('\n🏆 STEP 3: COMPREHENSIVE RESULTS');
    console.log('=' .repeat(80));

    if (allTicketOptions.length === 0) {
      console.log('❌ No tickets found under $500 total across all Dodgers events');
      return;
    }

    // Sort all options by total cost
    allTicketOptions.sort((a, b) => a.total_cost_2_tickets - b.total_cost_2_tickets);

    console.log(`\n✅ FOUND ${allTicketOptions.length} TICKET OPTIONS UNDER $500 TOTAL!`);
    console.log(`💰 Price range: $${allTicketOptions[0].total_cost_2_tickets} - $${allTicketOptions[allTicketOptions.length - 1].total_cost_2_tickets}`);

    // Show TOP 10 BEST DEALS
    console.log('\n🥇 TOP 10 BEST DEALS (Under $500 Total for 2 Tickets):');
    console.log('=' .repeat(80));

    const topDeals = allTicketOptions.slice(0, 10);
    topDeals.forEach((ticket, index) => {
      console.log(`\n${index + 1}. 💰 $${ticket.total_cost_2_tickets} TOTAL ($${ticket.price_per_ticket}/ticket)`);
      console.log(`   🎮 ${ticket.event_name}`);
      console.log(`   📅 ${ticket.event_date} at ${ticket.event_time}`);
      console.log(`   🏟️ ${ticket.venue}`);
      console.log(`   🎫 Section ${ticket.section}, Row ${ticket.row}`);
      console.log(`   📦 ${ticket.available_quantity} available`);
      console.log(`   📱 Format: ${ticket.format}${ticket.instant_delivery ? ' (Instant)' : ''}`);
      console.log(`   ♿ Wheelchair: ${ticket.wheelchair_accessible ? 'Yes' : 'No'}`);
    });

    // Summary statistics
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log('=' .repeat(50));
    
    const priceRanges = {
      under300: allTicketOptions.filter(t => t.total_cost_2_tickets < 300).length,
      range300to400: allTicketOptions.filter(t => t.total_cost_2_tickets >= 300 && t.total_cost_2_tickets < 400).length,
      range400to500: allTicketOptions.filter(t => t.total_cost_2_tickets >= 400 && t.total_cost_2_tickets <= 500).length
    };
    
    const uniqueEvents = new Set(allTicketOptions.map(t => t.event_id)).size;
    const averagePrice = (allTicketOptions.reduce((sum, t) => sum + t.total_cost_2_tickets, 0) / allTicketOptions.length).toFixed(2);
    
    console.log(`🎯 Events with affordable tickets: ${uniqueEvents}/${dodgersResult.events_found.length}`);
    console.log(`🎫 Total ticket options found: ${allTicketOptions.length}`);
    console.log(`💵 Average total cost: $${averagePrice}`);
    console.log(`📈 Price distribution:`);
    console.log(`   Under $300: ${priceRanges.under300} options`);
    console.log(`   $300-$400: ${priceRanges.range300to400} options`);
    console.log(`   $400-$500: ${priceRanges.range400to500} options`);

    console.log('\n🎉 DODGERS COMPREHENSIVE SEARCH COMPLETED!');
    console.log('=' .repeat(80));

  } catch (error) {
    console.log('❌ Comprehensive search failed:', error.message);
    console.error('Error details:', error);
  }
}

testDodgersComprehensive();