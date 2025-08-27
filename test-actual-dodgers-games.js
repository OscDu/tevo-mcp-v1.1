#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testActualDodgersGames() {
  const config = loadConfig();
  const cache = new MemoryCache();
  const apiClient = new TevoApiClient(config);

  console.log('⚾ ACTUAL LOS ANGELES DODGERS BASEBALL GAMES');
  console.log('🎯 5 best ticket pairs per game under $500 total (2 tickets)');
  console.log('=' .repeat(80));

  try {
    // Search directly at Dodger Stadium for actual Dodgers home games
    console.log('\n🏟️ Searching Dodger Stadium for home games...');
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + (16 * 7)); // 16 weeks ahead

    const dodgerStadiumSearch = await apiClient.listEvents({
      lat: 34.0739,  // Dodger Stadium exact coordinates
      lon: -118.2400,
      within: 1,     // Very tight radius - only Dodger Stadium
      occurs_at_gte: now.toISOString(),
      occurs_at_lt: futureDate.toISOString(),
      per_page: 100
    });

    console.log(`📊 Found ${dodgerStadiumSearch.events?.length || 0} events at Dodger Stadium`);

    // Filter for actual Dodgers baseball games
    const dodgerGames = dodgerStadiumSearch.events?.filter(event => {
      const name = event.name.toLowerCase();
      
      // Must be AT Dodgers (away team at home team format)
      const isAtDodgers = name.includes(' at ') && 
                         (name.includes('los angeles dodgers') || name.includes('dodgers'));
      
      // OR could be VS format
      const isVsDodgers = name.includes(' vs ') && 
                         (name.includes('los angeles dodgers') || name.includes('dodgers'));
      
      // Exclude non-baseball events
      const isBaseball = !name.includes('concert') && 
                        !name.includes('tour') && 
                        !name.includes('show') &&
                        !name.includes('festival');
      
      return (isAtDodgers || isVsDodgers) && isBaseball;
    }) || [];

    if (dodgerGames.length === 0) {
      console.log('❌ No Dodgers home games found at Dodger Stadium');
      
      // Try searching for away games too
      console.log('\n🔍 Searching for Dodgers away games...');
      
      const awayGameVenues = [
        { name: 'San Diego (Petco Park)', lat: 32.7073, lon: -117.1566 },
        { name: 'San Francisco (Oracle Park)', lat: 37.7786, lon: -122.3893 },
        { name: 'Colorado (Coors Field)', lat: 39.7559, lon: -104.9942 },
        { name: 'Arizona (Chase Field)', lat: 33.4452, lon: -112.0667 }
      ];

      let allAwayGames = [];
      
      for (const venue of awayGameVenues) {
        console.log(`   📍 Checking ${venue.name}...`);
        
        try {
          const awaySearch = await apiClient.listEvents({
            lat: venue.lat,
            lon: venue.lon,
            within: 3,
            occurs_at_gte: now.toISOString(),
            occurs_at_lt: futureDate.toISOString(),
            per_page: 50
          });
          
          const awayDodgerGames = awaySearch.events?.filter(event => {
            const name = event.name.toLowerCase();
            return (name.includes('los angeles dodgers at') || 
                   name.includes('dodgers at') ||
                   (name.includes('los angeles') && name.includes('at'))) &&
                   !name.includes('concert') && !name.includes('tour');
          }) || [];
          
          console.log(`      Found ${awayDodgerGames.length} Dodgers away games`);
          
          if (awayDodgerGames.length > 0) {
            awayDodgerGames.forEach(game => {
              console.log(`         ⚾ ${game.name} (${new Date(game.occurs_at).toLocaleDateString()})`);
              if (!allAwayGames.some(existing => existing.id === game.id)) {
                allAwayGames.push(game);
              }
            });
          }
          
        } catch (error) {
          console.log(`      ❌ Error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (allAwayGames.length === 0) {
        console.log('\n❌ No Dodgers games found (home or away)');
        console.log('💡 This might be the MLB off-season or games not yet scheduled');
        return;
      }
      
      // Use away games if no home games found
      dodgerGames.push(...allAwayGames);
    }

    console.log(`\n✅ Found ${dodgerGames.length} actual Dodgers baseball games!`);

    // Sort by date
    dodgerGames.sort((a, b) => new Date(a.occurs_at) - new Date(b.occurs_at));

    // Process each game
    for (let i = 0; i < dodgerGames.length; i++) {
      const game = dodgerGames[i];
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`⚾ GAME ${i + 1}/${dodgerGames.length}: ${game.name}`);
      console.log(`📅 ${new Date(game.occurs_at).toLocaleDateString()} at ${new Date(game.occurs_at).toLocaleTimeString()}`);
      console.log(`🏟️ ${game.venue?.name || 'Unknown venue'}`);
      console.log(`📍 ${game.venue?.city || ''}, ${game.venue?.state || ''}`);
      console.log(`🆔 Event ID: ${game.id}`);
      console.log(`${'='.repeat(80)}`);

      try {
        console.log('🔍 Getting ticket information...');
        
        const listingsResponse = await apiClient.getListings(game.id);
        const totalListings = listingsResponse.ticket_groups?.length || 0;
        console.log(`📊 Total ticket groups: ${totalListings}`);
        
        // Filter for actual game tickets (not parking) under $500 total
        const gameTickets = listingsResponse.ticket_groups
          ?.filter(tg => {
            const totalCost = tg.retail_price * 2;
            const section = (tg.section || '').toLowerCase();
            
            return totalCost <= 500 && 
                   tg.available_quantity >= 2 &&
                   !section.includes('parking') &&
                   !section.includes('lot') &&
                   !section.includes('garage') &&
                   !section.includes('transportation');
          })
          ?.map(tg => ({
            section: tg.section || 'N/A',
            row: tg.row || 'N/A',
            price_per_ticket: tg.retail_price,
            total_cost: tg.retail_price * 2,
            available: tg.available_quantity,
            format: tg.format || 'Unknown',
            instant: tg.instant_delivery || false,
            wheelchair: tg.wheelchair_accessible || false,
            section_level: getSectionLevel(tg.section)
          }))
          ?.sort((a, b) => a.price_per_ticket - b.price_per_ticket)
          || [];

        if (gameTickets.length === 0) {
          console.log('❌ No game tickets under $500 total found');
          
          // Show cheapest available regardless of price
          const cheapestAny = listingsResponse.ticket_groups
            ?.filter(tg => tg.available_quantity >= 2 && 
                          !(tg.section || '').toLowerCase().includes('parking'))
            ?.sort((a, b) => a.retail_price - b.retail_price)
            ?.slice(0, 3) || [];
            
          if (cheapestAny.length > 0) {
            console.log('\n💡 Cheapest available options:');
            cheapestAny.forEach((ticket, index) => {
              console.log(`   ${index + 1}. Section ${ticket.section} - $${ticket.retail_price}/ticket ($${ticket.retail_price * 2} total)`);
            });
          }
          continue;
        }

        console.log(`✅ Found ${gameTickets.length} ticket options under $500 total`);
        
        // Show exactly 5 best options
        const top5 = gameTickets.slice(0, 5);
        
        console.log(`\n🏆 TOP 5 BEST TICKET PAIRS (Under $500 Total):`);
        console.log('-'.repeat(70));
        
        top5.forEach((ticket, index) => {
          console.log(`\n${index + 1}. 💰 $${ticket.total_cost} TOTAL ($${ticket.price_per_ticket} per ticket)`);
          console.log(`   🎫 Section ${ticket.section}, Row ${ticket.row}`);
          console.log(`   🏟️ ${ticket.section_level} level seating`);
          console.log(`   📦 ${ticket.available} tickets available`);
          console.log(`   📱 ${ticket.format}${ticket.instant ? ' (Instant)' : ''}`);
          console.log(`   ♿ Wheelchair accessible: ${ticket.wheelchair ? 'Yes' : 'No'}`);
          
          // Value assessment
          if (ticket.price_per_ticket < 50) {
            console.log(`   ⭐ EXCELLENT VALUE - Great deal!`);
          } else if (ticket.price_per_ticket < 100) {
            console.log(`   ⭐ GOOD VALUE - Fair price`);
          } else if (ticket.price_per_ticket < 200) {
            console.log(`   ⭐ STANDARD PRICING`);
          } else {
            console.log(`   ⭐ PREMIUM PRICING`);
          }
        });
        
        // Game summary
        console.log(`\n📊 GAME SUMMARY:`);
        console.log(`   🎫 Affordable options: ${gameTickets.length}`);
        console.log(`   💵 Cheapest: $${gameTickets[0].total_cost} total`);
        console.log(`   💰 Most expensive in top 5: $${top5[top5.length - 1].total_cost} total`);
        
        const levels = [...new Set(top5.map(t => t.section_level))];
        console.log(`   🏟️ Seating levels: ${levels.join(', ')}`);
        
      } catch (error) {
        console.log(`❌ Error getting tickets: ${error.message}`);
      }
      
      if (i < dodgerGames.length - 1) {
        console.log('\n⏳ Processing next game...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 DODGERS TICKET ANALYSIS COMPLETE!');
    console.log('='.repeat(80));
    console.log(`✅ Analyzed ${dodgerGames.length} actual Dodgers baseball games`);
    console.log(`🎫 Found top 5 ticket pairs for each game under $500 total`);
    console.log(`⚾ Ready for your ticket sales team!`);

  } catch (error) {
    console.log('❌ Search failed:', error.message);
    console.error('Error details:', error);
  }
}

// Helper function to determine seating level
function getSectionLevel(section) {
  if (!section) return 'General';
  const s = section.toLowerCase();
  
  if (s.includes('field') || s.includes('dugout') || s.includes('baseline')) return 'Field Level';
  if (s.includes('club') || s.includes('premium')) return 'Club Level';
  if (s.includes('pavilion')) return 'Pavilion';
  if (s.includes('reserve')) return 'Reserve Level';
  if (s.includes('top') || s.includes('upper')) return 'Upper Deck';
  if (s.includes('loge')) return 'Loge Level';
  return 'General';
}

testActualDodgersGames();