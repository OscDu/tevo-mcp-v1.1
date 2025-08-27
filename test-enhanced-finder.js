#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testEnhancedFinder() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  const tests = [
    {
      name: 'Incomplete: "Dodgers" (should resolve to Los Angeles Dodgers)',
      query: 'Dodgers',
      expectation: 'Should find Dodgers games using team variation matching'
    },
    {
      name: 'Incomplete: "Yankees Sox" (partial team names)',
      query: 'Yankees Sox',
      expectation: 'Should resolve Yankees and Red Sox'
    },
    {
      name: 'Ambiguous: "Chicago" (should ask for disambiguation)',
      query: 'Chicago',
      expectation: 'Should return disambiguation options (Cubs, White Sox, Bulls, Blackhawks)'
    },
    {
      name: 'Abbreviation: "LAD vs NYY" (team abbreviations)',
      query: 'LAD vs NYY',
      expectation: 'Should resolve to Dodgers vs Yankees'
    },
    {
      name: 'Nickname: "Dubs Warriors" (Warriors nickname)',
      query: 'Dubs Warriors',
      expectation: 'Should resolve to Golden State Warriors'
    },
    {
      name: 'Complete but informal: "Cubs White Sox Chicago"',
      query: 'Cubs White Sox Chicago',
      expectation: 'Should find Cubs vs White Sox games (crosstown rivalry)'
    }
  ];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 TEST ${i+1}: ${test.name}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Expected: ${test.expectation}`);
    console.log('');

    try {
      const result = await handleUniversalEventFinder(apiClient, cache, {
        query: test.query,
        budget_per_ticket: 200,
        requested_quantity: 2
      });

      if (result.success) {
        console.log(`✅ SUCCESS - Strategy: ${result.strategy_used}`);
        console.log(`📊 API calls: ${result.search_summary.api_calls_made}`);
        console.log(`🎯 Events found: ${result.events_found.length}`);
        
        result.events_found.slice(0, 2).forEach((event, index) => {
          console.log(`\n🎭 EVENT ${index + 1}: ${event.name}`);
          console.log(`   📅 ${event.date} at ${event.time}`);
          console.log(`   🏟️ ${event.venue}, ${event.city} ${event.state}`);
          
          if (event.tickets && event.tickets.best_options.length > 0) {
            console.log(`   🎫 ${event.tickets.available_within_budget} tickets under $200`);
            console.log(`   💰 Best: Section ${event.tickets.best_options[0].section} - $${event.tickets.best_options[0].price_per_ticket}/ticket`);
          }
        });
        
      } else if (result.disambiguation) {
        console.log(`🤔 DISAMBIGUATION NEEDED - Strategy: ${result.strategy_used}`);
        console.log(`📍 City: ${result.disambiguation.city}`);
        console.log(`💡 ${result.disambiguation.suggestion}`);
        console.log('\n🏈🏀⚾🏒 Available teams:');
        result.disambiguation.possible_teams.forEach((team, index) => {
          console.log(`   ${index + 1}. ${team.full_name} (${team.sport.toUpperCase()}) - ${team.venue}`);
        });
        
      } else {
        console.log(`❌ FAILED - Strategy: ${result.strategy_used || 'none'}`);
        console.log(`📊 API calls: ${result.search_summary.api_calls_made}`);
        if (result.search_summary.strategies_tried) {
          console.log(`🔍 Strategies tried: ${result.search_summary.strategies_tried.join(', ')}`);
        }
      }

    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
    }

    // Short delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🏁 ENHANCED UNIVERSAL FINDER TESTING COMPLETE`);
  console.log(`🎯 The tool now handles incomplete queries intelligently!`);
  console.log(`${'='.repeat(70)}`);
}

testEnhancedFinder();