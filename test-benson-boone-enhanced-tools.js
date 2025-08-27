#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { handleEntertainmentEventFinder } from './dist/tools/entertainment-event-finder.js';

async function testBothEnhancedTools() {
  console.log('🎵 Testing Enhanced Search Tools for Benson Boone Concert (Event ID 2987307)');
  console.log('='.repeat(80));

  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  // Test parameters as specified
  const testParams = {
    query: "Benson Boone",
    date: "2025-09-05", 
    location: "New York",
    budget_per_ticket: 1000,
    requested_quantity: 6
  };

  console.log('Test Parameters:');
  console.log(JSON.stringify(testParams, null, 2));
  console.log('');

  // Test 1: Enhanced Universal Event Finder
  console.log('🔍 TEST 1: Enhanced Universal Event Finder');
  console.log('-'.repeat(50));
  
  try {
    const universalResult = await handleUniversalEventFinder(apiClient, cache, testParams);
    
    console.log('✅ Universal Event Finder Result:');
    console.log(`Success: ${universalResult.success}`);
    console.log(`Strategy Used: ${universalResult.strategy_used}`);
    console.log(`Events Found: ${universalResult.events_found.length}`);
    console.log(`API Calls Made: ${universalResult.search_summary.api_calls_made}`);
    console.log(`Strategies Tried: ${universalResult.search_summary.strategies_tried.join(', ')}`);
    
    if (universalResult.success && universalResult.events_found.length > 0) {
      console.log('\n📍 Events Details:');
      universalResult.events_found.forEach((event, index) => {
        console.log(`${index + 1}. ${event.name}`);
        console.log(`   Event ID: ${event.event_id}`);
        console.log(`   Date: ${event.date} at ${event.time}`);
        console.log(`   Venue: ${event.venue}, ${event.city}, ${event.state}`);
        
        if (event.tickets) {
          console.log(`   Tickets Available: ${event.tickets.available_within_budget}`);
          if (event.tickets.best_options.length > 0) {
            console.log(`   Best Option: ${event.tickets.best_options[0].section} - $${event.tickets.best_options[0].price_per_ticket}/ticket`);
          }
        }
        console.log('');
      });
      
      // Check if we found the specific event
      const bensonBooneEvent = universalResult.events_found.find(event => 
        event.event_id === 2987307 || event.name.toLowerCase().includes('benson boone')
      );
      
      if (bensonBooneEvent) {
        console.log('🎯 FOUND TARGET EVENT! Event matches Benson Boone criteria');
        if (bensonBooneEvent.event_id === 2987307) {
          console.log('✨ EXACT MATCH: Found event ID 2987307');
        }
      } else {
        console.log('❌ Target Benson Boone concert (ID 2987307) not found');
      }
    } else {
      console.log('❌ No events found by Universal Event Finder');
    }
    
  } catch (error) {
    console.error('❌ Universal Event Finder Error:', error.message);
  }

  console.log('\n' + '='.repeat(80));

  // Test 2: Enhanced Entertainment Event Finder
  console.log('🎭 TEST 2: Enhanced Entertainment Event Finder');
  console.log('-'.repeat(50));
  
  try {
    const entertainmentParams = {
      ...testParams,
      event_type: "concert"
    };
    
    const entertainmentResult = await handleEntertainmentEventFinder(apiClient, cache, entertainmentParams);
    
    console.log('✅ Entertainment Event Finder Result:');
    console.log(`Success: ${entertainmentResult.success}`);
    console.log(`Strategy Used: ${entertainmentResult.strategy_used}`);
    console.log(`Events Found: ${entertainmentResult.events_found.length}`);
    console.log(`API Calls Made: ${entertainmentResult.search_summary.api_calls_made}`);
    console.log(`Strategies Tried: ${entertainmentResult.search_summary.strategies_tried.join(', ')}`);
    console.log(`Artist Recognized: ${entertainmentResult.search_summary.artist_recognized}`);
    
    if (entertainmentResult.success && entertainmentResult.events_found.length > 0) {
      console.log('\n📍 Events Details:');
      entertainmentResult.events_found.forEach((event, index) => {
        console.log(`${index + 1}. ${event.name}`);
        console.log(`   Event ID: ${event.event_id}`);
        console.log(`   Date: ${event.date} at ${event.time}`);
        console.log(`   Venue: ${event.venue}, ${event.city}, ${event.state}`);
        console.log(`   Event Type: ${event.event_type}`);
        
        if (event.tickets) {
          console.log(`   Tickets Available: ${event.tickets.available_within_budget}`);
          console.log(`   Price Range: $${event.tickets.price_range.min} - $${event.tickets.price_range.max}`);
          if (event.tickets.best_options.length > 0) {
            console.log(`   Best Option: ${event.tickets.best_options[0].section} - $${event.tickets.best_options[0].price_per_ticket}/ticket`);
          }
        }
        console.log('');
      });
      
      // Check if we found the specific event
      const bensonBooneEvent = entertainmentResult.events_found.find(event => 
        event.event_id === 2987307 || event.name.toLowerCase().includes('benson boone')
      );
      
      if (bensonBooneEvent) {
        console.log('🎯 FOUND TARGET EVENT! Event matches Benson Boone criteria');
        if (bensonBooneEvent.event_id === 2987307) {
          console.log('✨ EXACT MATCH: Found event ID 2987307');
        }
      } else {
        console.log('❌ Target Benson Boone concert (ID 2987307) not found');
      }
    } else {
      console.log('❌ No events found by Entertainment Event Finder');
    }
    
  } catch (error) {
    console.error('❌ Entertainment Event Finder Error:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  
  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('-'.repeat(50));
  console.log('Key improvements tested:');
  console.log('1. ✅ Added entertainment-focused search strategy to Universal finder');
  console.log('2. ✅ Added direct MSG search strategy to Entertainment finder');  
  console.log('3. ✅ Expanded date ranges from ±3 to ±7 days');
  console.log('4. ✅ Added location parameter ("New York") which was missing in previous failed test');
  console.log('');
  console.log('Expected outcome: Both tools should now successfully find the Benson Boone concert at MSG');
  console.log('Target event: Benson Boone concert on 2025-09-05 at Madison Square Garden (Event ID: 2987307)');
}

// Run the test
testBothEnhancedTools().catch(console.error);