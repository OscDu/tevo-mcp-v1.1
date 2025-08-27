#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testPadresDodgers() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  try {
    console.log('⚾ TESTING ENHANCED DODGERS SEARCH');
    console.log('🎯 Should now find BOTH home AND away games');
    console.log('📅 Looking for tomorrow\'s Padres vs Dodgers game\n');

    // Test 1: Search for "Dodgers" (should find all Dodgers games)
    console.log('🧪 TEST 1: "Dodgers" (comprehensive search)');
    console.log('=' .repeat(50));
    
    const result1 = await handleUniversalEventFinder(apiClient, cache, {
      query: 'Dodgers',
      weeks_ahead: 2,
      requested_quantity: 2
    });

    if (result1.success) {
      console.log(`✅ SUCCESS - Strategy: ${result1.strategy_used}`);
      console.log(`📊 API calls: ${result1.search_summary.api_calls_made}`);
      console.log(`🎯 Total games found: ${result1.events_found.length}`);
      
      // Look for tomorrow's game specifically
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toLocaleDateString();
      
      const tomorrowGames = result1.events_found.filter(event => 
        event.date === tomorrowStr
      );
      
      if (tomorrowGames.length > 0) {
        console.log(`\n🎯 FOUND TOMORROW'S GAME(S) (${tomorrowStr}):`);
        tomorrowGames.forEach(game => {
          console.log(`   🏟️ ${game.name}`);
          console.log(`   📍 ${game.venue}, ${game.city}`);
          console.log(`   🆔 Event ID: ${game.event_id}`);
          
          if (game.name.toLowerCase().includes('padres')) {
            console.log('   🎉 THIS IS THE PADRES GAME WE WERE MISSING! ✅');
          }
        });
      } else {
        console.log(`\n❌ No games found for tomorrow (${tomorrowStr})`);
      }
      
      // Show all games found
      console.log(`\n📋 ALL DODGERS GAMES FOUND:`);
      result1.events_found.forEach((game, index) => {
        console.log(`   ${index + 1}. ${game.name} (${game.date}) - ${game.venue}`);
      });
      
    } else {
      console.log(`❌ FAILED - Strategy: ${result1.strategy_used || 'none'}`);
      console.log(`📊 API calls: ${result1.search_summary.api_calls_made}`);
    }

    // Test 2: Search specifically for "Padres Dodgers"
    console.log(`\n\n🧪 TEST 2: "Padres Dodgers" (specific matchup)`);
    console.log('=' .repeat(50));
    
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    
    const result2 = await handleUniversalEventFinder(apiClient, cache, {
      query: 'Padres Dodgers',
      date: tomorrowDate.toISOString().split('T')[0], // Tomorrow's date in YYYY-MM-DD format
      requested_quantity: 2
    });

    if (result2.success) {
      console.log(`✅ SUCCESS - Strategy: ${result2.strategy_used}`);
      console.log(`📊 API calls: ${result2.search_summary.api_calls_made}`);
      console.log(`🎯 Games found: ${result2.events_found.length}`);
      
      result2.events_found.forEach(game => {
        console.log(`\n🏟️ ${game.name}`);
        console.log(`   📅 ${game.date} at ${game.time}`);
        console.log(`   📍 ${game.venue}, ${game.city}`);
        console.log(`   🆔 Event ID: ${game.event_id}`);
      });
      
    } else {
      console.log(`❌ FAILED - Strategy: ${result2.strategy_used || 'none'}`);
      console.log(`📊 API calls: ${result2.search_summary.api_calls_made}`);
    }

    // Test 3: Show the difference from before
    console.log(`\n\n📊 ENHANCEMENT SUMMARY:`);
    console.log('=' .repeat(50));
    console.log('🔧 BEFORE: Only searched Dodger Stadium (home games)');
    console.log('✅ AFTER: Searches home venue + nationwide away games');
    console.log('🚀 RESULT: Should now find Padres vs Dodgers in San Diego!');

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testPadresDodgers();