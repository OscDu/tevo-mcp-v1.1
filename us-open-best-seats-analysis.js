#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';

async function getUSOpenBestSeats() {
  console.log('🎾 US OPEN TENNIS - BEST 100-LEVEL SEATING OPTIONS');
  console.log('='.repeat(70));
  console.log('Filtered for actual seating (excluding parking)\n');

  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  // Focus on events with available tickets
  const availableEvents = [
    { id: 2758522, name: 'Session 21 - Men\'s/Women\'s Quarterfinals 2025' },
    { id: 2758523, name: 'Session 22 - Men\'s/Women\'s Quarterfinals 2025' }
  ];

  for (const event of availableEvents) {
    try {
      console.log(`\n🏆 ${event.name}`);
      console.log('-'.repeat(60));

      const listingsResponse = await apiClient.getListings(event.id, {
        type: 'event',
        order_by: 'retail_price ASC'
      });

      // Filter for actual seating (exclude parking)
      const seatings = listingsResponse.ticket_groups.filter(listing => {
        const price = parseFloat(listing.retail_price);
        const section = listing.section;
        
        // Price filter
        if (price >= 1000) return false;
        
        // Section filter - 100 level sections (numeric sections starting with 1)
        if (!section) return false;
        
        // Exclude parking sections
        const sectionStr = section.toString().toLowerCase();
        if (sectionStr.includes('parking') || sectionStr.includes('roosevelt')) {
          return false;
        }
        
        // Include 100-level sections (101-140 typically for Arthur Ashe)
        const sectionNum = parseInt(section);
        return sectionNum >= 100 && sectionNum <= 140;
      });

      console.log(`🎫 100-level seating options under $1000: ${seatings.length}`);

      if (seatings.length === 0) {
        console.log('❌ No 100-level seating under $1000 found');
        continue;
      }

      // Sort by price and show best options
      const bestSeats = seatings
        .sort((a, b) => parseFloat(a.retail_price) - parseFloat(b.retail_price))
        .slice(0, 10);

      console.log('\n🥇 TOP SEATING OPTIONS:');
      console.log(''.repeat(25));

      bestSeats.forEach((listing, index) => {
        const value = listing.quantity > 1 ? 'Multiple tickets' : 'Single ticket';
        console.log(`${index + 1}. Section ${listing.section}, Row ${listing.row || 'N/A'}`);
        console.log(`   💰 $${listing.retail_price} per ticket`);
        console.log(`   🎫 ${listing.quantity} available (${value})`);
        console.log(`   📱 ${listing.format || 'Standard'} delivery`);
        
        if (listing.wheelchair) {
          console.log(`   ♿ Wheelchair accessible`);
        }
        
        if (listing.instant_delivery) {
          console.log(`   ⚡ Instant delivery`);
        }
        
        console.log('');
      });

      // Price statistics
      const prices = bestSeats.map(l => parseFloat(l.retail_price));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      console.log('📈 PRICE ANALYSIS:');
      console.log(`   Lowest price: $${minPrice}`);
      console.log(`   Highest price: $${maxPrice}`);
      console.log(`   Average price: $${avgPrice.toFixed(2)}`);

      // Section distribution
      const sectionCounts = {};
      bestSeats.forEach(listing => {
        sectionCounts[listing.section] = (sectionCounts[listing.section] || 0) + 1;
      });

      console.log('\n🏟️ SECTION DISTRIBUTION:');
      Object.entries(sectionCounts)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([section, count]) => {
          console.log(`   Section ${section}: ${count} listing${count > 1 ? 's' : ''}`);
        });

    } catch (error) {
      console.error(`❌ Error for Event ID ${event.id}:`, error.message);
    }
  }

  console.log('\n💡 RECOMMENDATIONS:');
  console.log('- Sections 104-108: Lower bowl, close to court');
  console.log('- Sections 109-115: Behind baseline, good view'); 
  console.log('- Sections 116-123: Upper side sections');
  console.log('- Sections 130-140: Upper sections, more affordable');
  console.log('- Row N indicates wheelchair accessible seating');
}

getUSOpenBestSeats();