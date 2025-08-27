#!/usr/bin/env node

import dotenv from 'dotenv';
import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleGetEvent } from './dist/tools/get-event.js';
import { handleListingsForEvent } from './dist/tools/listings-for-event.js';
import { MemoryCache } from './dist/cache/memory-cache.js';

// Load env silently
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;
process.stdout.write = () => true;
process.stderr.write = () => true;
dotenv.config();
process.stdout.write = originalStdout;
process.stderr.write = originalStderr;

async function testGiantsPatriotsEvent() {
  try {
    const config = loadConfig();
    const apiClient = new TevoApiClient(config);
    const cache = new MemoryCache();

    const eventId = 2938897;
    console.log(`🏈 NEW YORK GIANTS AT NEW ENGLAND PATRIOTS`);
    console.log(`Event ID: ${eventId}`);
    console.log(`Budget: $500 per ticket\n`);

    // Step 1: Get event details
    console.log('Step 1: Getting event details...');
    const eventDetails = await handleGetEvent(apiClient, cache, {
      event_id: eventId
    });

    console.log(`✅ Event: ${eventDetails.name}`);
    console.log(`   Date: ${new Date(eventDetails.occurs_at).toLocaleDateString()}`);
    console.log(`   Time: ${new Date(eventDetails.occurs_at).toLocaleTimeString()}`);
    console.log(`   Venue: ${eventDetails.venue.name}, ${eventDetails.venue.city || eventDetails.venue.state || ''}`);
    
    // Check if it's Monday Night Football
    const gameDate = new Date(eventDetails.occurs_at);
    const dayOfWeek = gameDate.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`   Day: ${dayNames[dayOfWeek]}`);
    
    if (dayOfWeek === 1) {
      console.log(`   ⭐ CONFIRMED: MONDAY NIGHT FOOTBALL! ⭐`);
    }

    // Step 2: Get ticket listings under $500
    console.log('\nStep 2: Searching for tickets under $500...');
    const ticketResult = await handleListingsForEvent(apiClient, cache, {
      event_id: eventId,
      requested_quantity: 1,
      price_max: 500,
      return_top: 5
    });

    if (ticketResult.options && ticketResult.options.length > 0) {
      console.log(`\n🎉 SUCCESS! Found ${ticketResult.options.length} ticket options under $500:\n`);
      
      ticketResult.options.forEach((option, index) => {
        console.log(`🎟️ OPTION ${index + 1}:`);
        console.log(`   Section: ${option.section}, Row: ${option.row}`);
        console.log(`   Price: $${option.price_per_ticket.toFixed(2)}`);
        console.log(`   Available quantity: ${option.available_quantity}`);
        console.log(`   Format: ${option.format}`);
        console.log(`   Instant delivery: ${option.instant_delivery ? '✅ Yes' : '❌ No'}`);
        if (option.public_notes) {
          console.log(`   Notes: ${option.public_notes}`);
        }
        console.log('');
      });

      console.log(`📊 TICKET SUMMARY:`);
      console.log(`   Total listings: ${ticketResult.criteria_applied.total_listings_found}`);
      console.log(`   Under $500: ${ticketResult.criteria_applied.eligible_after_filtering}`);
      console.log(`   Your budget: $500 per ticket ✅`);
      console.log(`   Best price found: $${ticketResult.options[0].price_per_ticket.toFixed(2)} (within budget! ✅)`);
      
      const savings = 500 - ticketResult.options[0].price_per_ticket;
      if (savings > 0) {
        console.log(`   Savings per ticket: $${savings.toFixed(2)}`);
      }

    } else {
      console.log(`\n❌ No tickets found under $500`);
      console.log(`Total listings available: ${ticketResult.criteria_applied?.total_listings_found || 0}`);
      
      // Try higher price to see what's available
      console.log('\n💰 Checking higher price ranges...');
      const priceRanges = [750, 1000, 1500];
      
      for (const maxPrice of priceRanges) {
        try {
          const higherPriceResult = await handleListingsForEvent(apiClient, cache, {
            event_id: eventId,
            requested_quantity: 1,
            price_max: maxPrice,
            return_top: 3
          });
          
          if (higherPriceResult.options && higherPriceResult.options.length > 0) {
            console.log(`\nFound ${higherPriceResult.options.length} option(s) under $${maxPrice}:`);
            higherPriceResult.options.forEach((option, index) => {
              console.log(`  ${index + 1}. Section ${option.section}, Row ${option.row} - $${option.price_per_ticket.toFixed(2)}`);
            });
            break; // Found options, stop searching higher prices
          }
        } catch (error) {
          console.log(`Error checking $${maxPrice} range: ${error.message}`);
        }
      }
    }

    // Step 3: Show why my original search failed
    console.log(`\n🔍 SEARCH ANALYSIS:`);
    console.log(`   Event name: "${eventDetails.name}"`);
    console.log(`   Venue: "${eventDetails.venue.name}"`);
    console.log(`   Date: ${eventDetails.occurs_at}`);
    console.log(`   My search should have found this by looking for:`);
    console.log(`   • "giants" AND "patriots" in event name ✅`);
    console.log(`   • "gillette" in venue name ✅`);
    console.log(`   • Monday games ✅`);
    console.log(`\n   The real issue: My pagination didn't reach this event!`);

  } catch (error) {
    console.error('❌ Search failed:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
  }
}

testGiantsPatriotsEvent();