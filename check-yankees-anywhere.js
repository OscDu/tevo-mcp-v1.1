#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function checkYankeesAnywhere() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  console.log('⚾ CHECKING ALL YANKEES GAMES AVAILABLE');
  console.log('🔍 To find the closest options to Florida');
  console.log('💰 Budget: $4,000 for 4 tickets');
  console.log('=' .repeat(50));

  try {
    const yankeesResult = await handleUniversalEventFinder(apiClient, cache, {
      query: 'New York Yankees',
      weeks_ahead: 30,
      budget_per_ticket: 1000,
      requested_quantity: 4
    });

    if (yankeesResult.success && yankeesResult.events_found.length > 0) {
      console.log(`\n✅ Found ${yankeesResult.events_found.length} Yankees games total`);
      console.log(`📊 Strategy: ${yankeesResult.strategy_used}`);
      
      console.log('\n📍 ALL YANKEES GAMES FOUND:');
      console.log('-'.repeat(60));
      
      yankeesResult.events_found.forEach((game, index) => {
        console.log(`${index + 1}. ${game.name}`);
        console.log(`   📅 ${game.date} at ${game.time}`);
        console.log(`   🏟️ ${game.venue}, ${game.city}`);
        console.log(`   🆔 Event ID: ${game.event_id}`);
        
        // Check if this could be a Florida-adjacent option
        const city = (game.city || '').toLowerCase();
        const venue = (game.venue || '').toLowerCase();
        
        if (city.includes('atlanta') || city.includes('tampa') || 
            city.includes('miami') || city.includes('orlando') ||
            city.includes('florida') || venue.includes('florida')) {
          console.log(`   🌴 FLORIDA/SOUTHEAST OPTION!`);
        }
        
        if (game.tickets && game.tickets.best_options.length > 0) {
          const cheapest = game.tickets.best_options[0];
          const total = cheapest.price_per_ticket * 4;
          console.log(`   💰 From $${total.toLocaleString()} for 4 tickets (Section ${cheapest.section})`);
          
          if (total <= 4000) {
            console.log(`   ✅ WITHIN BUDGET!`);
          }
        }
        console.log('');
      });
      
      // Look for Florida or Southeast options
      const southeastGames = yankeesResult.events_found.filter(game => {
        const city = (game.city || '').toLowerCase();
        const venue = (game.venue || '').toLowerCase();
        const name = game.name.toLowerCase();
        
        return city.includes('atlanta') || city.includes('tampa') || 
               city.includes('miami') || city.includes('florida') ||
               city.includes('jacksonville') || city.includes('orlando') ||
               venue.includes('florida') || name.includes('marlins') ||
               name.includes('rays') || name.includes('braves');
      });
      
      if (southeastGames.length > 0) {
        console.log('🌴 SOUTHEAST/FLORIDA REGION GAMES:');
        console.log('=' .repeat(50));
        
        southeastGames.forEach(game => {
          console.log(`⚾ ${game.name}`);
          console.log(`📅 ${game.date} | 🏟️ ${game.venue}, ${game.city}`);
          
          if (game.tickets) {
            console.log(`🎫 ${game.tickets.available_within_budget} options within budget`);
          }
        });
        
      } else {
        console.log('\n❌ No Yankees games found in Florida or Southeast region');
        console.log('\n💡 ALTERNATIVES:');
        console.log('1. 🏟️ Yankees home games in NYC (short flight from Florida)');
        console.log('2. ⚾ Wait for spring training schedule release');
        console.log('3. 🌴 Check other MLB teams playing in Florida');
        
        // Show the closest games geographically
        console.log('\n📍 CLOSEST GAMES TO FLORIDA:');
        yankeesResult.events_found.slice(0, 3).forEach((game, index) => {
          console.log(`${index + 1}. ${game.name} - ${game.city}`);
          if (game.tickets && game.tickets.best_options.length > 0) {
            const total = game.tickets.best_options[0].price_per_ticket * 4;
            console.log(`   💰 From $${total.toLocaleString()} for 4 tickets`);
          }
        });
      }
      
    } else {
      console.log('❌ No Yankees games found at all');
      console.log('💡 This could mean it\'s the off-season or schedule not released');
    }

    // Additional suggestion
    console.log('\n🎯 RECOMMENDATION:');
    console.log('=' .repeat(30));
    console.log('Since no Yankees games are currently available in Florida:');
    console.log('');
    console.log('1. 🌴 Check Tampa Bay Rays home games (AL team, quality baseball)');
    console.log('2. ⚾ Check Miami Marlins home games (warm weather, good prices)');
    console.log('3. 🗓️ Wait for 2026 spring training schedule (Yankees train in Tampa)');
    console.log('4. ✈️ Consider Yankees home games in NYC with your $4,000 budget');

  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }
}

checkYankeesAnywhere();