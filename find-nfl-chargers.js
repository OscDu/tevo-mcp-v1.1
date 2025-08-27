#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findNFLChargers() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  console.log('🏈 NFL LOS ANGELES CHARGERS - SEASON OPENER');
  console.log('🎯 Finding best seats for 6 people with $5,000 budget');
  console.log('💎 Looking for PREMIUM seating at SoFi Stadium');
  console.log('=' .repeat(70));

  try {
    // Search directly at SoFi Stadium for NFL games
    const now = new Date();
    const futureDate = new Date();
    futureDate.setMonth(now.getMonth() + 6); // 6 months ahead to cover NFL season

    console.log('\n🏟️ Searching SoFi Stadium for NFL games...');
    
    const sofiEvents = await apiClient.listEvents({
      lat: 33.9535,  // SoFi Stadium coordinates  
      lon: -118.3392,
      within: 1,     // Very tight radius around SoFi Stadium only
      occurs_at_gte: now.toISOString(),
      occurs_at_lt: futureDate.toISOString(),
      per_page: 100
    });

    console.log(`📊 Found ${sofiEvents.events?.length || 0} events at SoFi Stadium`);

    // Filter specifically for Chargers NFL games
    const chargersGames = sofiEvents.events?.filter(event => {
      const name = event.name.toLowerCase();
      
      // Must contain "chargers" and be vs/at another NFL team
      const hasChargers = name.includes('chargers');
      const isVsFormat = name.includes(' vs ') || name.includes(' at ');
      
      // Exclude non-football events
      const isFootball = !name.includes('concert') && 
                        !name.includes('tour') && 
                        !name.includes('show') &&
                        !name.includes('soccer') &&
                        !name.includes('mls');
      
      // Look for NFL team names to confirm it's an NFL game
      const nflTeams = ['broncos', 'raiders', 'chiefs', 'steelers', 'ravens', 'patriots', 
                       'bills', 'dolphins', 'jets', 'browns', 'bengals', 'titans',
                       'colts', 'jaguars', 'texans', 'cowboys', 'giants', 'eagles',
                       'commanders', 'packers', 'bears', 'lions', 'vikings', 'falcons',
                       'panthers', 'saints', 'buccaneers', '49ers', 'seahawks', 'rams',
                       'cardinals', 'denver', 'kansas city', 'las vegas', 'pittsburgh',
                       'baltimore', 'new england', 'buffalo', 'miami', 'new york',
                       'cleveland', 'cincinnati', 'tennessee', 'indianapolis',
                       'jacksonville', 'houston', 'dallas', 'philadelphia',
                       'washington', 'green bay', 'chicago', 'detroit', 'minnesota',
                       'atlanta', 'carolina', 'new orleans', 'tampa bay', 'san francisco',
                       'seattle', 'arizona'];
      
      const hasNFLTeam = nflTeams.some(team => name.includes(team));
      
      return hasChargers && isVsFormat && isFootball && hasNFLTeam;
    }) || [];

    if (chargersGames.length === 0) {
      console.log('❌ No Chargers NFL games found at SoFi Stadium');
      console.log('\n💡 This could mean:');
      console.log('   - NFL season hasn\'t started yet');
      console.log('   - Tickets not released yet');
      console.log('   - Games are during away season');
      
      // Show what IS at SoFi Stadium
      console.log('\n📊 Other events at SoFi Stadium:');
      const otherEvents = sofiEvents.events?.slice(0, 5) || [];
      otherEvents.forEach(event => {
        console.log(`   - ${event.name} (${new Date(event.occurs_at).toLocaleDateString()})`);
      });
      
      return;
    }

    // Sort by date to find season opener
    chargersGames.sort((a, b) => new Date(a.occurs_at) - new Date(b.occurs_at));
    
    console.log(`\n✅ Found ${chargersGames.length} Chargers NFL games!`);
    
    chargersGames.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.name} (${new Date(game.occurs_at).toLocaleDateString()})`);
    });

    const seasonOpener = chargersGames[0];
    
    console.log('\n🏈 SEASON OPENER:');
    console.log('=' .repeat(50));
    console.log(`🎮 ${seasonOpener.name}`);
    console.log(`📅 ${new Date(seasonOpener.occurs_at).toLocaleDateString()} at ${new Date(seasonOpener.occurs_at).toLocaleTimeString()}`);
    console.log(`🏟️ ${seasonOpener.venue?.name || 'SoFi Stadium'}`);
    console.log(`🆔 Event ID: ${seasonOpener.id}`);

    // Try to get tickets - but with error handling for timeouts
    console.log('\n💎 CHECKING TICKET AVAILABILITY...');
    
    try {
      const listingsResponse = await apiClient.getListings(seasonOpener.id, {
        per_page: 20 // Limit to reduce timeout risk
      });
      
      console.log(`📊 Found ${listingsResponse.ticket_groups?.length || 0} ticket groups`);
      
      if (!listingsResponse.ticket_groups || listingsResponse.ticket_groups.length === 0) {
        console.log('💡 No tickets available yet - likely not on sale');
        console.log('🎯 Check back closer to game date');
        return;
      }

      // Filter for 6+ seats within budget
      const goodSeats = listingsResponse.ticket_groups
        .filter(tg => {
          const total = tg.retail_price * 6;
          return total <= 5000 && 
                 tg.available_quantity >= 6 &&
                 !(tg.section || '').toLowerCase().includes('parking');
        })
        .map(tg => ({
          section: tg.section || 'N/A',
          row: tg.row || 'N/A', 
          price: tg.retail_price,
          total: tg.retail_price * 6,
          available: tg.available_quantity,
          level: getSeatLevel(tg.section)
        }))
        .sort((a, b) => b.price - a.price); // Best seats first

      if (goodSeats.length === 0) {
        console.log('❌ No seats for 6 people within $5,000 budget');
        
        // Show cheapest option
        const cheapest = listingsResponse.ticket_groups
          .filter(tg => tg.available_quantity >= 6)
          .sort((a, b) => a.retail_price - b.retail_price)[0];
          
        if (cheapest) {
          const total = cheapest.retail_price * 6;
          console.log(`\n💡 Cheapest for 6: $${total.toLocaleString()} total ($${cheapest.retail_price}/ticket)`);
          console.log(`   Section: ${cheapest.section}`);
          console.log(`   Over budget by: $${(total - 5000).toLocaleString()}`);
        }
        return;
      }

      console.log(`\n✅ Found ${goodSeats.length} seating options within budget!`);
      
      console.log('\n🏆 TOP 5 BEST SEATS:');
      console.log('=' .repeat(40));
      
      goodSeats.slice(0, 5).forEach((seat, index) => {
        console.log(`\n${index + 1}. $${seat.total.toLocaleString()} TOTAL ($${seat.price}/ticket)`);
        console.log(`   🎫 Section ${seat.section}, Row ${seat.row}`);
        console.log(`   🏟️ ${seat.level}`);
        console.log(`   📦 ${seat.available} available`);
        console.log(`   💰 Budget remaining: $${(5000 - seat.total).toLocaleString()}`);
      });

      const best = goodSeats[0];
      console.log('\n🎯 RECOMMENDATION:');
      console.log(`🏆 Section ${best.section}, Row ${best.row}`);
      console.log(`💰 $${best.total.toLocaleString()} for 6 seats`);
      console.log(`🏟️ ${best.level} seating`);

    } catch (error) {
      console.log('⚠️ Could not retrieve ticket details:', error.message);
      console.log('💡 This often happens when:');
      console.log('   - Tickets not yet on sale');
      console.log('   - High demand causing system delays');
      console.log('   - Event details still being updated');
      console.log('\n🎯 RECOMMENDATION: Contact SoFi Stadium directly for premium seating');
      console.log(`📞 Event ID ${seasonOpener.id} for reference`);
    }

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

function getSeatLevel(section) {
  if (!section) return 'General';
  const s = section.toLowerCase();
  
  if (s.includes('suite') || s.includes('box')) return 'Luxury Suite';
  if (s.includes('club')) return 'Club Level';
  if (s.includes('field') || s.includes('lower')) return 'Field Level';
  if (s.includes('plaza')) return 'Plaza Level';
  if (s.includes('upper')) return 'Upper Level';
  return 'General Seating';
}

findNFLChargers();