#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findChargersQuick() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  console.log('🏈 CHARGERS SEASON OPENER: Denver Broncos at Los Angeles Chargers');
  console.log('📅 September 21, 2025 | 🏟️ SoFi Stadium');
  console.log('🎯 Finding best seats for 6 people with $5,000 budget');
  console.log('=' .repeat(70));

  try {
    // We know the event ID from the previous search
    const eventId = 2910703;
    
    console.log('\n💎 GETTING PREMIUM TICKETS...');
    console.log(`🆔 Event ID: ${eventId}`);
    console.log(`💰 Budget: $5,000 for 6 seats (max $833 per ticket)`);
    
    // Get listings with filters to reduce response size
    const listingsResponse = await apiClient.getListings(eventId, {
      order_by: 'retail_price DESC', // Get highest priced (premium) first
      per_page: 50 // Limit response size
    });
    
    console.log(`📊 Found ${listingsResponse.ticket_groups?.length || 0} ticket groups`);
    
    if (!listingsResponse.ticket_groups || listingsResponse.ticket_groups.length === 0) {
      console.log('❌ No tickets available for this event yet');
      console.log('💡 Tickets may not be released yet for this game');
      return;
    }
    
    // Filter for 6+ seats within budget
    const premiumOptions = listingsResponse.ticket_groups
      .filter(tg => {
        const totalCost = tg.retail_price * 6;
        const section = (tg.section || '').toLowerCase();
        
        return totalCost <= 5000 && 
               tg.available_quantity >= 6 &&
               !section.includes('parking') &&
               !section.includes('lot') &&
               !section.includes('garage');
      })
      .map(tg => ({
        section: tg.section || 'N/A',
        row: tg.row || 'N/A',
        price_per_ticket: tg.retail_price,
        total_cost: tg.retail_price * 6,
        available: tg.available_quantity,
        format: tg.format || 'Unknown',
        instant: tg.instant_delivery || false,
        wheelchair: tg.wheelchair_accessible || false,
        level: getSeatLevel(tg.section)
      }))
      .sort((a, b) => b.price_per_ticket - a.price_per_ticket); // Highest price = best seats

    if (premiumOptions.length === 0) {
      console.log('❌ No seats available for 6 people within $5,000 budget');
      
      // Check what the minimum cost would be
      const minFor6 = listingsResponse.ticket_groups
        .filter(tg => tg.available_quantity >= 6 && 
                     !(tg.section || '').toLowerCase().includes('parking'))
        .sort((a, b) => a.retail_price - b.retail_price)[0];
      
      if (minFor6) {
        const minTotal = minFor6.retail_price * 6;
        console.log(`\n💡 Cheapest option for 6 seats: $${minTotal.toLocaleString()} total`);
        console.log(`   Section: ${minFor6.section} - $${minFor6.retail_price}/ticket`);
        
        if (minTotal > 5000) {
          console.log(`💰 You would need $${(minTotal - 5000).toLocaleString()} more budget`);
        }
      }
      return;
    }

    console.log(`\n✅ Found ${premiumOptions.length} seating options within budget!`);

    // Show the 5 BEST options
    console.log('\n🏆 TOP 5 BEST SEATS (6 tickets, under $5,000):');
    console.log('=' .repeat(60));

    const top5 = premiumOptions.slice(0, 5);
    
    top5.forEach((seat, index) => {
      console.log(`\n${index + 1}. 💎 $${seat.total_cost.toLocaleString()} TOTAL ($${seat.price_per_ticket}/ticket)`);
      console.log(`   🎫 Section ${seat.section}, Row ${seat.row}`);
      console.log(`   🏟️ ${seat.level} seating`);
      console.log(`   📦 ${seat.available} tickets available`);
      console.log(`   📱 ${seat.format}${seat.instant ? ' (Instant)' : ''}`);
      console.log(`   ♿ Wheelchair: ${seat.wheelchair ? 'Yes' : 'No'}`);
      
      // Value assessment
      const budgetUsed = (seat.total_cost / 5000 * 100).toFixed(1);
      console.log(`   💰 Uses ${budgetUsed}% of budget ($${(5000 - seat.total_cost).toLocaleString()} remaining)`);
      
      if (seat.price_per_ticket > 500) {
        console.log(`   ⭐ PREMIUM LUXURY - Top-tier seating experience`);
      } else if (seat.price_per_ticket > 300) {
        console.log(`   ⭐ PREMIUM - Excellent seats with great views`);
      } else if (seat.price_per_ticket > 150) {
        console.log(`   ⭐ QUALITY - Good seating value`);
      } else {
        console.log(`   ⭐ VALUE - Budget-friendly option`);
      }
    });

    // Final recommendation
    const best = top5[0];
    console.log('\n🎯 RECOMMENDATION:');
    console.log('=' .repeat(40));
    console.log(`🏆 BEST CHOICE: Section ${best.section}, Row ${best.row}`);
    console.log(`💰 Total: $${best.total_cost.toLocaleString()} for 6 seats`);
    console.log(`🏟️ Seating: ${best.level}`);
    console.log(`💵 Budget remaining: $${(5000 - best.total_cost).toLocaleString()}`);
    
    console.log('\n✅ Ready to purchase premium Chargers season opener seats!');

  } catch (error) {
    console.log('❌ Error:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('\n💡 The event has a large number of tickets causing timeouts.');
      console.log('🔄 This usually means high demand and many options available.');
      console.log('📞 Consider calling the venue directly for premium seating options.');
    }
  }
}

function getSeatLevel(section) {
  if (!section) return 'General';
  const s = section.toLowerCase();
  
  if (s.includes('suite') || s.includes('box')) return 'Luxury Suite';
  if (s.includes('club') || s.includes('premium')) return 'Club Level';
  if (s.includes('field') || s.includes('lower')) return 'Field Level';  
  if (s.includes('plaza')) return 'Plaza Level';
  if (s.includes('upper') || s.includes('terrace')) return 'Upper Level';
  return 'General Seating';
}

findChargersQuick();