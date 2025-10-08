#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';

async function findUSOpenSept4th2025() {
  console.log('🎾 US OPEN TENNIS EVENTS ON SEPTEMBER 4th, 2025');
  console.log('='.repeat(60));

  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  const usOpenEvents = [];

  try {
    // Search September 4, 2025
    console.log('\n📅 SEPTEMBER 4, 2025:');
    console.log('-'.repeat(40));
    
    const results2025 = await apiClient.listEvents({
      occurs_at_gte: "2025-09-04T00:00:00Z",
      occurs_at_lt: "2025-09-05T00:00:00Z",
      per_page: 100
    });

    console.log(`Found ${results2025.total_entries} total events on September 4th, 2025`);

    // Check first 100 results
    if (results2025.events) {
      const usOpenMatches2025 = results2025.events.filter(event => {
        const eventNameLower = event.name.toLowerCase();
        return eventNameLower.includes('us open') && eventNameLower.includes('tennis');
      });
      
      usOpenMatches2025.forEach(event => {
        console.log(`✅ ${event.name} (ID: ${event.id})`);
        console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
        console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
        console.log('');
        usOpenEvents.push(event);
      });
    }

    // Check if there are more pages for 2025
    if (results2025.total_entries > 100) {
      const totalPages = Math.ceil(results2025.total_entries / 100);
      console.log(`Searching ${totalPages} total pages...`);
      
      for (let page = 2; page <= totalPages; page++) {
        console.log(`Checking page ${page}...`);
        const additionalResults = await apiClient.listEvents({
          occurs_at_gte: "2025-09-04T00:00:00Z",
          occurs_at_lt: "2025-09-05T00:00:00Z",
          per_page: 100,
          page: page
        });
        
        if (additionalResults.events) {
          const usOpenMatches = additionalResults.events.filter(event => {
            const eventNameLower = event.name.toLowerCase();
            return eventNameLower.includes('us open') && eventNameLower.includes('tennis');
          });
          
          usOpenMatches.forEach(event => {
            console.log(`✅ ${event.name} (ID: ${event.id})`);
            console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
            console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
            console.log('');
            usOpenEvents.push(event);
          });
        }
      }
    }

    // Also try broader search terms if we didn't find specific "US Open Tennis" events
    if (usOpenEvents.length === 0) {
      console.log('\n🔍 Trying broader search for "US Open" events...');
      console.log('-'.repeat(40));
      
      const broadResults = await apiClient.listEvents({
        occurs_at_gte: "2025-09-04T00:00:00Z",
        occurs_at_lt: "2025-09-05T00:00:00Z",
        per_page: 100,
        q: "US Open"
      });

      if (broadResults.events) {
        const potentialUSOpenEvents = broadResults.events.filter(event => {
          const eventNameLower = event.name.toLowerCase();
          return eventNameLower.includes('us open');
        });
        
        potentialUSOpenEvents.forEach(event => {
          console.log(`🔍 ${event.name} (ID: ${event.id})`);
          console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
          console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
          console.log('');
          usOpenEvents.push(event);
        });
      }
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(40));
    console.log(`Total US Open events found on September 4th, 2025: ${usOpenEvents.length}`);
    
    if (usOpenEvents.length > 0) {
      console.log('\n🎾 ALL US OPEN EVENTS ON SEPTEMBER 4th, 2025:');
      usOpenEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.name} (ID: ${event.id})`);
        console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
        console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
        console.log('');
      });
      
      // Return the events for ticket searching
      return usOpenEvents;
    } else {
      console.log('❌ No US Open events found on September 4th, 2025');
      
      // Let's also check if there are any tennis events at all on that date
      console.log('\n🔍 Checking for ANY tennis events on September 4th, 2025...');
      const tennisResults = await apiClient.listEvents({
        occurs_at_gte: "2025-09-04T00:00:00Z",
        occurs_at_lt: "2025-09-05T00:00:00Z",
        per_page: 50,
        q: "tennis"
      });

      if (tennisResults.events && tennisResults.events.length > 0) {
        console.log(`Found ${tennisResults.events.length} tennis events:`);
        tennisResults.events.forEach(event => {
          console.log(`- ${event.name} (ID: ${event.id})`);
          console.log(`  Venue: ${event.venue?.name || 'Unknown'}`);
          console.log(`  Time: ${new Date(event.occurs_at).toLocaleString()}`);
          console.log('');
        });
      } else {
        console.log('No tennis events found on September 4th, 2025');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  
  return usOpenEvents;
}

// Run the search and then get ticket listings if events are found
async function searchAndGetTickets() {
  const events = await findUSOpenSept4th2025();
  
  if (events && events.length > 0) {
    console.log('\n🎫 GETTING TICKET LISTINGS FOR FOUND EVENTS...');
    console.log('='.repeat(60));
    
    const config = loadConfig();
    const apiClient = new TevoApiClient(config);
    
    for (const event of events) {
      try {
        console.log(`\n📋 Tickets for: ${event.name}`);
        console.log('-'.repeat(50));
        
        const listings = await apiClient.getListings(event.id, {
          per_page: 50
        });
        
        if (listings.ticket_groups && listings.ticket_groups.length > 0) {
          // Filter for budget of $500 total (max $250 per ticket for 2 tickets)
          const affordableListings = listings.ticket_groups.filter(listing => {
            const totalPrice = parseFloat(listing.retail_price) * 2; // 2 tickets
            return totalPrice <= 500;
          });
          
          console.log(`Found ${listings.ticket_groups.length} total listings`);
          console.log(`Found ${affordableListings.length} listings within $500 budget for 2 tickets`);
          
          if (affordableListings.length > 0) {
            // Sort by price
            affordableListings.sort((a, b) => parseFloat(a.retail_price) - parseFloat(b.retail_price));
            
            console.log('\n💰 AFFORDABLE OPTIONS (within $500 for 2 tickets):');
            affordableListings.slice(0, 10).forEach((listing, index) => {
              const totalFor2 = parseFloat(listing.retail_price) * 2;
              console.log(`${index + 1}. Section: ${listing.section || 'N/A'}, Row: ${listing.row || 'N/A'}`);
              console.log(`   Price per ticket: $${listing.retail_price}`);
              console.log(`   Total for 2 tickets: $${totalFor2.toFixed(2)}`);
              console.log(`   Quantity available: ${listing.quantity}`);
              console.log('');
            });
          } else {
            console.log('❌ No listings found within $500 budget for 2 tickets');
            
            // Show cheapest available options
            const sortedListings = listings.ticket_groups
              .sort((a, b) => parseFloat(a.retail_price) - parseFloat(b.retail_price))
              .slice(0, 5);
            
            console.log('\n💸 CHEAPEST AVAILABLE OPTIONS:');
            sortedListings.forEach((listing, index) => {
              const totalFor2 = parseFloat(listing.retail_price) * 2;
              console.log(`${index + 1}. Section: ${listing.section || 'N/A'}, Row: ${listing.row || 'N/A'}`);
              console.log(`   Price per ticket: $${listing.retail_price}`);
              console.log(`   Total for 2 tickets: $${totalFor2.toFixed(2)}`);
              console.log(`   Quantity available: ${listing.quantity}`);
              console.log('');
            });
          }
        } else {
          console.log('❌ No ticket listings found for this event');
        }
        
      } catch (error) {
        console.error(`❌ Error getting tickets for ${event.name}:`, error.message);
      }
    }
  }
}

searchAndGetTickets();