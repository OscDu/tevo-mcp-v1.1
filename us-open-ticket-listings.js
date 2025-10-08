#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';
import { filterAndRankListings } from './dist/utils/listings-filter.js';

async function getUSOpenTicketListings() {
  console.log('🎾 US OPEN TENNIS TICKET LISTINGS - ARTHUR ASHE STADIUM');
  console.log('='.repeat(70));
  console.log('Looking for 100-level seats under $1000 per ticket\n');

  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  // Event IDs to check
  const eventIds = [
    { id: 2439741, name: 'Session 17 - Men\'s/Women\'s Quarterfinals 2024' },
    { id: 2439742, name: 'Session 18 - Men\'s/Women\'s Quarterfinals 2024' },
    { id: 2758522, name: 'Session 21 - Men\'s/Women\'s Quarterfinals 2025' },
    { id: 2758523, name: 'Session 22 - Men\'s/Women\'s Quarterfinals 2025' }
  ];

  for (const event of eventIds) {
    try {
      console.log(`\n🎯 ${event.name} (Event ID: ${event.id})`);
      console.log('-'.repeat(60));

      // Get listings for the event
      const listingsResponse = await apiClient.getListings(event.id, {
        type: 'event',
        order_by: 'retail_price ASC'
      });

      if (!listingsResponse.ticket_groups || listingsResponse.ticket_groups.length === 0) {
        console.log('❌ No tickets found for this event');
        continue;
      }

      // Filter for 100-level sections and under $1000
      const filteredListings = listingsResponse.ticket_groups.filter(listing => {
        const price = parseFloat(listing.retail_price);
        const section = listing.section;
        
        // Check if price is under $1000
        if (price >= 1000) return false;
        
        // Check if section starts with "1" (100-level)
        if (!section || !section.toString().startsWith('1')) return false;
        
        return true;
      });

      console.log(`📊 Total listings found: ${listingsResponse.ticket_groups.length}`);
      console.log(`🎯 100-level listings under $1000: ${filteredListings.length}`);

      if (filteredListings.length === 0) {
        console.log('❌ No 100-level tickets under $1000 found');
        continue;
      }

      // Sort by price and show best options
      const bestOptions = filteredListings
        .sort((a, b) => parseFloat(a.retail_price) - parseFloat(b.retail_price))
        .slice(0, 5);

      console.log('\n✅ BEST AVAILABLE OPTIONS:');
      console.log(''.repeat(30));

      bestOptions.forEach((listing, index) => {
        console.log(`${index + 1}. Section ${listing.section}, Row ${listing.row || 'N/A'}`);
        console.log(`   💰 Price: $${listing.retail_price} per ticket`);
        console.log(`   🎫 Quantity: ${listing.quantity} tickets available`);
        console.log(`   📍 Format: ${listing.format || 'N/A'}`);
        
        if (listing.instant_delivery) {
          console.log(`   ⚡ Instant delivery available`);
        }
        
        if (listing.wheelchair) {
          console.log(`   ♿ Wheelchair accessible`);
        }
        
        console.log('');
      });

      // Show price range summary
      const prices = bestOptions.map(l => parseFloat(l.retail_price));
      if (prices.length > 0) {
        console.log(`💵 Price range: $${Math.min(...prices)} - $${Math.max(...prices)}`);
        console.log(`📊 Average price: $${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)}`);
      }

    } catch (error) {
      console.error(`❌ Error getting listings for Event ID ${event.id}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

getUSOpenTicketListings();