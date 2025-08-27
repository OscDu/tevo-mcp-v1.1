#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findChargersOpener() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  console.log('🏈 CHARGERS SEASON OPENER - PREMIUM SEATS');
  console.log('🎯 Finding best seats for 6 people with $5,000 budget');
  console.log('💎 Looking for PREMIUM seating options');
  console.log('=' .repeat(80));

  try {
    // Step 1: Find Chargers season opener using universal finder
    console.log('\n🔍 STEP 1: Finding Chargers Season Opener');
    console.log('-'.repeat(50));
    
    const chargersResult = await handleUniversalEventFinder(apiClient, cache, {
      query: 'Chargers',
      weeks_ahead: 20, // Search well into the season
      requested_quantity: 6
    });

    let chargersGames = [];
    
    if (!chargersResult.success || chargersResult.events_found.length === 0) {
      console.log('❌ Universal finder didn\'t find Chargers games, trying direct venue search...');
      
      // Fallback: Search directly at SoFi Stadium
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + (25 * 7)); // 25 weeks ahead to cover full season
      
      console.log('🏟️ Searching SoFi Stadium for Chargers games...');
      
      const sofiSearch = await apiClient.listEvents({
        lat: 33.9535,  // SoFi Stadium coordinates
        lon: -118.3392,
        within: 2,     // Very tight radius around SoFi Stadium
        occurs_at_gte: now.toISOString(),
        occurs_at_lt: futureDate.toISOString(),
        per_page: 100
      });
      
      console.log(`📊 Found ${sofiSearch.events?.length || 0} events at SoFi Stadium`);
      
      // Filter for Chargers games
      chargersGames = sofiSearch.events?.filter(event => {
        const name = event.name.toLowerCase();
        return (name.includes('chargers') || name.includes('los angeles chargers')) &&
               !name.includes('concert') && 
               !name.includes('tour') &&
               !name.includes('show');
      }) || [];
      
      if (chargersGames.length > 0) {
        console.log(`✅ Found ${chargersGames.length} Chargers games at SoFi Stadium`);
        chargersGames.forEach(game => {
          console.log(`   🏈 ${game.name} (${new Date(game.occurs_at).toLocaleDateString()})`);
        });
      }
      
    } else {
      console.log(`✅ Universal finder found ${chargersResult.events_found.length} Chargers events`);
      
      // Convert universal finder results to game format
      chargersGames = chargersResult.events_found.map(event => ({
        id: event.event_id,
        name: event.name,
        occurs_at: new Date(`${event.date} ${event.time}`).toISOString(),
        venue: { name: event.venue, city: event.city }
      }));
    }

    if (chargersGames.length === 0) {
      console.log('❌ No Chargers games found');
      console.log('💡 This might be the NFL off-season or games not yet scheduled');
      return;
    }

    // Sort games by date to find season opener
    chargersGames.sort((a, b) => new Date(a.occurs_at) - new Date(b.occurs_at));
    
    const seasonOpener = chargersGames[0];
    
    console.log('\n🏈 SEASON OPENER FOUND:');
    console.log('=' .repeat(60));
    console.log(`🎮 ${seasonOpener.name}`);
    console.log(`📅 ${new Date(seasonOpener.occurs_at).toLocaleDateString()} at ${new Date(seasonOpener.occurs_at).toLocaleTimeString()}`);
    console.log(`🏟️ ${seasonOpener.venue?.name || 'SoFi Stadium'}`);
    console.log(`🆔 Event ID: ${seasonOpener.id}`);

    // Step 2: Find the BEST seats within budget
    console.log('\n💎 STEP 2: Finding BEST PREMIUM SEATS');
    console.log('-'.repeat(50));
    console.log(`💰 Budget: $5,000 for 6 seats (≤$833 per ticket)`);
    
    const listingsResponse = await apiClient.getListings(seasonOpener.id);
    console.log(`📊 Found ${listingsResponse.ticket_groups?.length || 0} total ticket groups`);
    
    // Filter for premium seats that can accommodate 6 people within budget
    const premiumSeats = listingsResponse.ticket_groups
      ?.filter(tg => {
        const totalCost = tg.retail_price * 6;
        return totalCost <= 5000 && 
               tg.available_quantity >= 6 &&
               !tg.section?.toLowerCase().includes('parking') &&
               !tg.section?.toLowerCase().includes('lot');
      })
      ?.map(tg => ({
        section: tg.section || 'N/A',
        row: tg.row || 'N/A',
        price_per_ticket: tg.retail_price,
        total_cost_6_tickets: tg.retail_price * 6,
        available_quantity: tg.available_quantity,
        format: tg.format || 'Unknown',
        instant_delivery: tg.instant_delivery || false,
        wheelchair_accessible: tg.wheelchair_accessible || false,
        section_type: getSectionType(tg.section),
        premium_level: getPremiumLevel(tg.section, tg.retail_price)
      }))
      ?.sort((a, b) => b.premium_level - a.premium_level || b.price_per_ticket - a.price_per_ticket) // Sort by premium level, then price
      || [];

    if (premiumSeats.length === 0) {
      console.log('❌ No seats available for 6 people within $5,000 budget');
      
      // Show what IS available
      const anySeats = listingsResponse.ticket_groups
        ?.filter(tg => tg.available_quantity >= 6 && !tg.section?.toLowerCase().includes('parking'))
        ?.sort((a, b) => a.retail_price - b.retail_price)
        ?.slice(0, 5) || [];
        
      if (anySeats.length > 0) {
        console.log('\n💡 Available options for 6 people (any price):');
        anySeats.forEach((seat, index) => {
          const total = seat.retail_price * 6;
          console.log(`   ${index + 1}. Section ${seat.section} - $${seat.retail_price}/ticket ($${total.toLocaleString()} total) - ${seat.available_quantity} available`);
        });
      }
      return;
    }

    console.log(`✅ Found ${premiumSeats.length} premium seating options within budget!`);

    // Show the TOP 5 BEST SEATS
    console.log('\n🏆 TOP 5 BEST PREMIUM SEATS (6 tickets, under $5,000):');
    console.log('=' .repeat(80));

    const top5Premium = premiumSeats.slice(0, 5);
    
    top5Premium.forEach((seat, index) => {
      console.log(`\n${index + 1}. 💎 PREMIUM LEVEL ${seat.premium_level} - $${seat.total_cost_6_tickets.toLocaleString()} TOTAL`);
      console.log(`   💰 $${seat.price_per_ticket} per ticket × 6 seats`);
      console.log(`   🎫 Section: ${seat.section} | Row: ${seat.row}`);
      console.log(`   🏟️ Seating Type: ${seat.section_type}`);
      console.log(`   📦 Available: ${seat.available_quantity} tickets`);
      console.log(`   📱 Format: ${seat.format}${seat.instant_delivery ? ' (Instant Delivery)' : ''}`);
      console.log(`   ♿ Wheelchair Accessible: ${seat.wheelchair_accessible ? 'Yes' : 'No'}`);
      
      // Premium assessment
      if (seat.premium_level >= 5) {
        console.log(`   ⭐ ELITE PREMIUM - Luxury suites/club level with amenities`);
      } else if (seat.premium_level >= 4) {
        console.log(`   ⭐ HIGH PREMIUM - Club seating with premium access`);
      } else if (seat.premium_level >= 3) {
        console.log(`   ⭐ PREMIUM - Lower level prime seating`);
      } else if (seat.premium_level >= 2) {
        console.log(`   ⭐ GOOD VALUE - Quality seating location`);
      } else {
        console.log(`   ⭐ STANDARD - Basic seating`);
      }
    });

    // Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('=' .repeat(50));
    
    const bestOption = top5Premium[0];
    console.log(`🏆 BEST CHOICE: Section ${bestOption.section}, Row ${bestOption.row}`);
    console.log(`💰 Total Cost: $${bestOption.total_cost_6_tickets.toLocaleString()} (within budget)`);
    console.log(`💎 Premium Level: ${bestOption.premium_level}/5`);
    console.log(`📍 Seating: ${bestOption.section_type}`);
    
    const savings = 5000 - bestOption.total_cost_6_tickets;
    if (savings > 0) {
      console.log(`💵 Budget Remaining: $${savings.toLocaleString()}`);
    }

    // Additional stats
    console.log('\n📊 SEATING ANALYSIS:');
    console.log('-'.repeat(30));
    
    const sectionTypes = [...new Set(top5Premium.map(s => s.section_type))];
    console.log(`🏟️ Premium section types available: ${sectionTypes.join(', ')}`);
    
    const priceRange = `$${top5Premium[top5Premium.length - 1].total_cost_6_tickets.toLocaleString()} - $${top5Premium[0].total_cost_6_tickets.toLocaleString()}`;
    console.log(`💰 Price range for 6 tickets: ${priceRange}`);
    
    const avgPrice = Math.round(top5Premium.reduce((sum, seat) => sum + seat.total_cost_6_tickets, 0) / top5Premium.length);
    console.log(`📈 Average cost: $${avgPrice.toLocaleString()}`);

    console.log('\n🎉 CHARGERS SEASON OPENER PREMIUM SEATING SEARCH COMPLETE!');
    console.log('=' .repeat(80));

  } catch (error) {
    console.log('❌ Search failed:', error.message);
    console.error('Error details:', error);
  }
}

// Helper function to determine section type
function getSectionType(section) {
  if (!section) return 'General';
  const s = section.toLowerCase();
  
  if (s.includes('suite') || s.includes('box')) return 'Luxury Suite';
  if (s.includes('club') || s.includes('premium')) return 'Club Level';
  if (s.includes('field') || s.includes('sideline')) return 'Field Level';
  if (s.includes('plaza') || s.includes('lower')) return 'Lower Level';
  if (s.includes('upper') || s.includes('terrace')) return 'Upper Level';
  if (s.includes('end zone')) return 'End Zone';
  return 'General Seating';
}

// Helper function to determine premium level (1-5 scale)
function getPremiumLevel(section, price) {
  if (!section) return 1;
  const s = section.toLowerCase();
  
  // Elite premium (5)
  if (s.includes('suite') || s.includes('box') || price > 800) return 5;
  
  // High premium (4)
  if (s.includes('club') || s.includes('premium') || (s.includes('field') && price > 400)) return 4;
  
  // Premium (3)
  if (s.includes('field') || s.includes('sideline') || s.includes('lower') || price > 200) return 3;
  
  // Good value (2)
  if (s.includes('plaza') || price > 100) return 2;
  
  // Standard (1)
  return 1;
}

findChargersOpener();