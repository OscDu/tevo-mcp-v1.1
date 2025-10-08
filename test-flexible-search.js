import { config } from 'dotenv';
config();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { handleEntertainmentEventFinder } from './dist/tools/entertainment-event-finder.js';

// Test cases for unknown/new artists, teams, and events
const flexibleSearchTests = [
  // Unknown artists (not in our database)
  {
    category: 'Unknown Artist',
    description: 'Zach Bryan (might not be in database)',
    tool: 'entertainment',
    query: 'Zach Bryan country concert tour',
    budget_per_ticket: 200
  },
  {
    category: 'Unknown Artist', 
    description: 'Clairo indie artist',
    tool: 'entertainment',
    query: 'Clairo indie pop concert',
    budget_per_ticket: 150
  },
  {
    category: 'Unknown Artist',
    description: 'NewJeans K-pop group',
    tool: 'universal',
    query: 'NewJeans K-pop concert tour',
    budget_per_ticket: 300
  },
  
  // Misspelled or partial artist names
  {
    category: 'Fuzzy Matching',
    description: 'Taylor Swfit (misspelled)',
    tool: 'entertainment',
    query: 'Taylor Swfit concert tour',
    budget_per_ticket: 500
  },
  {
    category: 'Fuzzy Matching',
    description: 'Post Malon (partial)',
    tool: 'entertainment', 
    query: 'Post Malon hip hop concert',
    budget_per_ticket: 250
  },
  {
    category: 'Fuzzy Matching',
    description: 'Kendrik Lamar (misspelled)',
    tool: 'entertainment',
    query: 'Kendrik Lamar rap concert',
    budget_per_ticket: 300
  },
  
  // Unknown festivals or new events
  {
    category: 'Unknown Festival',
    description: 'Music Midtown (example unknown festival)',
    tool: 'universal',
    query: 'Music Midtown festival Atlanta',
    location: 'Atlanta'
  },
  {
    category: 'Unknown Festival',
    description: 'Rolling Loud (might not be in festival DB)',
    tool: 'universal',
    query: 'Rolling Loud hip hop festival Miami',
    location: 'Miami'
  },
  
  // Generic searches without specific names
  {
    category: 'Generic Search',
    description: 'Country music concert',
    tool: 'universal',
    query: 'country music concert Nashville',
    location: 'Nashville',
    budget_per_ticket: 150
  },
  {
    category: 'Generic Search',
    description: 'Rock concert',
    tool: 'universal',
    query: 'rock concert Los Angeles',
    location: 'Los Angeles',
    budget_per_ticket: 200
  },
  {
    category: 'Generic Search',
    description: 'Pop music festival',
    tool: 'universal',
    query: 'pop music festival summer 2025',
    budget_per_ticket: 250
  },
  
  // Sports teams that might use different names
  {
    category: 'Team Name Variations',
    description: 'Los Angeles Lakers (LA Lakers variant)',
    tool: 'universal',
    query: 'LA Lakers basketball game',
    location: 'Los Angeles'
  },
  {
    category: 'Team Name Variations',
    description: 'New York Football Giants',
    tool: 'universal',
    query: 'New York Football Giants game',
    location: 'New York'
  },
  
  // Completely new/unknown events
  {
    category: 'Unknown Events',
    description: 'Gaming convention (non-music event)',
    tool: 'universal',
    query: 'gaming convention esports tournament',
    location: 'Las Vegas'
  },
  {
    category: 'Unknown Events',
    description: 'Food festival',
    tool: 'universal', 
    query: 'food wine festival weekend',
    location: 'Napa'
  }
];

async function testFlexibleSearch() {
  console.log('🎯 TESTING FLEXIBLE SEARCH - Unknown/New Events & Artists');
  console.log('========================================================\n');

  const tevoConfig = loadConfig();
  const client = new TevoApiClient(tevoConfig);
  const cache = new MemoryCache();

  let totalTests = 0;
  let passedTests = 0;
  let flexibilityResults = [];

  for (const test of flexibleSearchTests) {
    totalTests++;
    
    try {
      console.log(`\n📋 Testing: ${test.description} (${test.category})`);
      console.log(`   Query: "${test.query}"`);
      console.log(`   Tool: ${test.tool}`);
      
      let result;
      const startTime = Date.now();
      
      if (test.tool === 'entertainment') {
        result = await handleEntertainmentEventFinder(client, cache, {
          query: test.query,
          location: test.location,
          budget_per_ticket: test.budget_per_ticket,
          requested_quantity: 2
        });
      } else {
        result = await handleUniversalEventFinder(client, cache, {
          query: test.query,
          location: test.location,
          budget_per_ticket: test.budget_per_ticket,
          requested_quantity: 2
        });
      }
      
      const searchTime = Date.now() - startTime;
      const success = result && (result.success || result.events_found?.length > 0);
      
      const testResult = {
        category: test.category,
        description: test.description,
        query: test.query,
        success,
        strategy_used: result.strategy_used,
        events_found: result.events_found?.length || 0,
        api_calls: result.search_summary?.api_calls_made || 0,
        search_time_ms: searchTime,
        strategies_tried: result.search_summary?.strategies_tried || []
      };
      
      flexibilityResults.push(testResult);
      
      if (success) {
        console.log(`   ✅ SUCCESS: Found ${testResult.events_found} events`);
        console.log(`   🎯 Strategy: ${testResult.strategy_used}`);
        console.log(`   ⚡ Time: ${searchTime}ms, API calls: ${testResult.api_calls}`);
        console.log(`   📊 Strategies tried: ${testResult.strategies_tried.join(', ')}`);
        passedTests++;
      } else {
        console.log(`   ❌ FAILED: No events found`);
        console.log(`   🔍 Strategies tried: ${testResult.strategies_tried.join(', ')}`);
        console.log(`   ⏱️ Search time: ${searchTime}ms`);
      }
      
    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`);
      flexibilityResults.push({
        category: test.category,
        description: test.description,
        query: test.query,
        success: false,
        error: error.message
      });
    }
    
    // Brief pause to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  // Analysis Report
  console.log('\n\n📊 FLEXIBLE SEARCH ANALYSIS');
  console.log('============================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Successful: ${passedTests} (${Math.round((passedTests / totalTests) * 100)}%)`);

  // Group results by category
  const categoryResults = flexibilityResults.reduce((acc, result) => {
    if (!acc[result.category]) acc[result.category] = [];
    acc[result.category].push(result);
    return acc;
  }, {});

  console.log('\n📈 RESULTS BY CATEGORY:');
  Object.keys(categoryResults).forEach(category => {
    const results = categoryResults[category];
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    const successRate = Math.round((successful / total) * 100);
    
    console.log(`\n📂 ${category}: ${successful}/${total} (${successRate}%)`);
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.description}`);
      if (result.success) {
        console.log(`      Strategy: ${result.strategy_used}, Events: ${result.events_found}`);
      }
    });
  });

  // Strategy Effectiveness
  const strategyUsage = {};
  flexibilityResults.filter(r => r.success).forEach(result => {
    const strategy = result.strategy_used;
    if (!strategyUsage[strategy]) strategyUsage[strategy] = 0;
    strategyUsage[strategy]++;
  });

  console.log('\n🎯 MOST EFFECTIVE STRATEGIES:');
  Object.entries(strategyUsage)
    .sort(([,a], [,b]) => b - a)
    .forEach(([strategy, count]) => {
      console.log(`   ${strategy}: ${count} successes`);
    });

  // Performance Analysis
  const avgSearchTime = flexibilityResults
    .filter(r => r.search_time_ms)
    .reduce((sum, r) => sum + r.search_time_ms, 0) / 
    flexibilityResults.filter(r => r.search_time_ms).length;

  const avgApiCalls = flexibilityResults
    .filter(r => r.api_calls)
    .reduce((sum, r) => sum + r.api_calls, 0) / 
    flexibilityResults.filter(r => r.api_calls).length;

  console.log('\n⚡ PERFORMANCE METRICS:');
  console.log(`   Average search time: ${Math.round(avgSearchTime)}ms`);
  console.log(`   Average API calls: ${Math.round(avgApiCalls)}`);

  // Recommendations
  console.log('\n💡 FLEXIBILITY ASSESSMENT:');
  const unknownArtistTests = categoryResults['Unknown Artist'] || [];
  const unknownArtistSuccess = unknownArtistTests.filter(r => r.success).length;
  
  if (unknownArtistSuccess / unknownArtistTests.length >= 0.7) {
    console.log('   ✅ EXCELLENT: System handles unknown artists well');
  } else if (unknownArtistSuccess / unknownArtistTests.length >= 0.4) {
    console.log('   ⚠️  MODERATE: Some unknown artists found, room for improvement');
  } else {
    console.log('   ❌ POOR: System struggles with unknown artists');
  }

  const fuzzyTests = categoryResults['Fuzzy Matching'] || [];
  const fuzzySuccess = fuzzyTests.filter(r => r.success).length;
  
  if (fuzzySuccess / fuzzyTests.length >= 0.8) {
    console.log('   ✅ EXCELLENT: Fuzzy matching works well for misspellings');
  } else {
    console.log('   ⚠️  NEEDS WORK: Fuzzy matching could be improved');
  }

  if (passedTests / totalTests >= 0.75) {
    console.log('\n🎉 OVERALL: Search system shows GOOD flexibility for unknown events!');
  } else if (passedTests / totalTests >= 0.5) {
    console.log('\n⚠️  OVERALL: Search system shows MODERATE flexibility, needs improvement');
  } else {
    console.log('\n❌ OVERALL: Search system lacks flexibility, major improvements needed');
  }

  console.log(`\n✨ Flexible search test completed at ${new Date().toLocaleString()}`);
}

testFlexibleSearch().catch(console.error);