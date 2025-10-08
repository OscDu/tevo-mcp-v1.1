import { config } from 'dotenv';
config();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import { handleUniversalEventFinder } from './dist/tools/universal-event-finder.js';
import { handleEntertainmentEventFinder } from './dist/tools/entertainment-event-finder.js';
import { handleSmartNflFinder } from './dist/tools/smart-nfl-finder.js';
import { handleListingsForEvent } from './dist/tools/listings-for-event.js';

// Top 5 Event Types for 2025 QA Testing
const testScenarios = [
  // 1. SUPER BOWL LIX - February 9, 2025, New Orleans
  {
    category: 'Major Championship Events',
    description: 'Super Bowl LIX in New Orleans',
    tool: 'universal',
    query: 'Super Bowl New Orleans February',
    date: '2025-02-09',
    location: 'New Orleans'
  },

  // 2. MAJOR CONCERT TOURS - Top 2025 Artists
  {
    category: 'Major Concert Tours',
    description: 'Taylor Swift Eras Tour',
    tool: 'entertainment',
    query: 'Taylor Swift Eras Tour',
    budget_per_ticket: 500,
    requested_quantity: 2
  },
  {
    category: 'Major Concert Tours', 
    description: 'Benson Boone American Heart Tour',
    tool: 'entertainment',
    query: 'Benson Boone American Heart Tour',
    budget_per_ticket: 200,
    requested_quantity: 2
  },
  {
    category: 'Major Concert Tours',
    description: 'Post Malone Tour',
    tool: 'entertainment',
    query: 'Post Malone concert',
    budget_per_ticket: 300,
    requested_quantity: 2
  },
  {
    category: 'Major Concert Tours',
    description: 'Morgan Wallen Country Tour',
    tool: 'entertainment', 
    query: 'Morgan Wallen country concert',
    budget_per_ticket: 250,
    requested_quantity: 2
  },

  // 3. LOLLAPALOOZA - July 31-Aug 3, Chicago
  {
    category: 'Major Music Festivals',
    description: 'Lollapalooza Chicago',
    tool: 'universal',
    query: 'Lollapalooza Chicago festival',
    date: '2025-08-01',
    location: 'Chicago'
  },
  {
    category: 'Major Music Festivals',
    description: 'Coachella Valley Festival',
    tool: 'universal',
    query: 'Coachella festival Indio',
    date: '2025-04-15',
    location: 'Indio'
  },

  // 4. US OPEN TENNIS - August-September 2025
  {
    category: 'Tennis Championships',
    description: 'US Open Tennis Championship',
    tool: 'universal',
    query: 'US Open tennis championship',
    date: '2025-09-03',
    location: 'New York'
  },
  {
    category: 'Tennis Championships',
    description: 'US Open Session 21',
    tool: 'universal',
    query: 'US Open tennis session 21 quarterfinals',
    date: '2025-09-03'
  },

  // 5. NFL GAMES - Throughout 2025 season
  {
    category: 'NFL Games',
    description: 'Giants vs Patriots',
    tool: 'nfl',
    away_team: 'Giants',
    home_team: 'Patriots',
    budget_per_ticket: 200,
    requested_quantity: 2
  },
  {
    category: 'NFL Games',
    description: 'Cowboys vs Chiefs',
    tool: 'nfl',
    away_team: 'Cowboys', 
    home_team: 'Chiefs',
    budget_per_ticket: 300,
    requested_quantity: 2
  },

  // Additional Test Cases for Coverage
  {
    category: 'Broadway Theater',
    description: 'Hamilton Musical',
    tool: 'entertainment',
    query: 'Hamilton Broadway musical',
    location: 'New York',
    budget_per_ticket: 200
  },
  {
    category: 'Comedy Shows',
    description: 'Dave Chappelle Comedy',
    tool: 'entertainment',
    query: 'Dave Chappelle comedy show',
    budget_per_ticket: 150
  },
  {
    category: 'Electronic Festivals',
    description: 'Electric Daisy Carnival',
    tool: 'universal',
    query: 'Electric Daisy Carnival EDC Las Vegas',
    date: '2025-05-15',
    location: 'Las Vegas'
  }
];

// Test specific listings functionality
const listingsTestCases = [
  {
    description: '100-level US Open tickets with section pattern',
    event_id: 2758522, // US Open Session 21
    requested_quantity: 1,
    section_pattern: '1',
    price_max: 1000,
    return_top: 10
  },
  {
    description: 'Budget concert tickets',
    event_id: 2758522, // Placeholder - would use real event ID
    requested_quantity: 2,
    price_max: 300,
    return_top: 5
  }
];

async function runComprehensiveQATest() {
  console.log('🎯 COMPREHENSIVE QA TEST - Top 5 US Events 2025');
  console.log('==================================================\n');

  const tevoConfig = loadConfig();
  const client = new TevoApiClient(tevoConfig);
  const cache = new MemoryCache();

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = [];

  // Test Event Discovery
  for (const scenario of testScenarios) {
    totalTests++;
    
    try {
      console.log(`\n📋 Testing: ${scenario.description} (${scenario.category})`);
      console.log(`   Tool: ${scenario.tool}`);
      
      let result;
      
      switch (scenario.tool) {
        case 'universal':
          result = await handleUniversalEventFinder(client, cache, {
            query: scenario.query,
            date: scenario.date,
            location: scenario.location,
            budget_per_ticket: scenario.budget_per_ticket,
            requested_quantity: scenario.requested_quantity || 2
          });
          break;
          
        case 'entertainment':
          result = await handleEntertainmentEventFinder(client, cache, {
            query: scenario.query,
            date: scenario.date,
            location: scenario.location,
            budget_per_ticket: scenario.budget_per_ticket,
            requested_quantity: scenario.requested_quantity || 2
          });
          break;
          
        case 'nfl':
          result = await handleSmartNflFinder(client, cache, {
            away_team: scenario.away_team,
            home_team: scenario.home_team,
            budget_per_ticket: scenario.budget_per_ticket,
            requested_quantity: scenario.requested_quantity || 2
          });
          break;
      }

      // Evaluate success
      const success = result && (result.success || result.events_found?.length > 0 || result.games_found?.length > 0);
      
      if (success) {
        console.log(`   ✅ SUCCESS: Found events`);
        console.log(`   📊 Strategy: ${result.strategy_used || result.search_strategy || 'N/A'}`);
        console.log(`   📈 Events/Games: ${result.events_found?.length || result.games_found?.length || 0}`);
        console.log(`   🔧 API Calls: ${result.search_summary?.api_calls_made || 'N/A'}`);
        passedTests++;
      } else {
        console.log(`   ❌ FAILED: No events found`);
        console.log(`   🔍 Reason: ${result.message || 'Unknown'}`);
        failedTests.push({
          scenario: scenario.description,
          category: scenario.category,
          issue: result.message || 'No events found',
          tool: scenario.tool
        });
      }
      
    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`);
      failedTests.push({
        scenario: scenario.description,
        category: scenario.category,
        issue: error.message,
        tool: scenario.tool
      });
    }
    
    // Brief pause to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test Enhanced Listings Functionality
  console.log('\n\n🎫 TESTING ENHANCED LISTINGS FUNCTIONALITY');
  console.log('==========================================');
  
  for (const listingTest of listingsTestCases) {
    totalTests++;
    
    try {
      console.log(`\n📋 Testing: ${listingTest.description}`);
      
      const result = await handleListingsForEvent(client, cache, listingTest);
      
      const success = result && result.options && result.options.length > 0;
      
      if (success) {
        console.log(`   ✅ SUCCESS: Found ${result.options.length} ticket options`);
        console.log(`   💰 Price Range: $${Math.min(...result.options.map(o => o.price_per_ticket))} - $${Math.max(...result.options.map(o => o.price_per_ticket))}`);
        console.log(`   🎯 Sections: ${[...new Set(result.options.map(o => o.section))].join(', ')}`);
        passedTests++;
      } else {
        console.log(`   ❌ FAILED: No ticket options found`);
        failedTests.push({
          scenario: listingTest.description,
          category: 'Listings',
          issue: 'No ticket options found',
          tool: 'listings'
        });
      }
      
    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`);
      failedTests.push({
        scenario: listingTest.description,
        category: 'Listings',
        issue: error.message,
        tool: 'listings'
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Final Report
  console.log('\n\n📊 COMPREHENSIVE QA TEST RESULTS');
  console.log('=================================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${totalTests - passedTests} ❌`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (failedTests.length > 0) {
    console.log('\n🔍 FAILED TEST DETAILS:');
    console.log('========================');
    
    const groupedFailed = failedTests.reduce((acc, test) => {
      if (!acc[test.category]) acc[test.category] = [];
      acc[test.category].push(test);
      return acc;
    }, {});
    
    Object.keys(groupedFailed).forEach(category => {
      console.log(`\n📂 ${category}:`);
      groupedFailed[category].forEach(test => {
        console.log(`   • ${test.scenario} (${test.tool}): ${test.issue}`);
      });
    });

    console.log('\n🛠️ RECOMMENDED FIXES:');
    console.log('======================');
    
    if (failedTests.some(t => t.issue.includes('No events found'))) {
      console.log('• Expand search databases or improve search strategies');
    }
    if (failedTests.some(t => t.issue.includes('Unknown'))) {
      console.log('• Add better error handling and validation');
    }
    if (failedTests.some(t => t.category === 'NFL Games'))) {
      console.log('• Check NFL team name mappings and venue IDs');
    }
    if (failedTests.some(t => t.category === 'Tennis Championships'))) {
      console.log('• Verify tennis tournament venue coordinates and keywords');
    }
  } else {
    console.log('\n🎉 ALL TESTS PASSED! The MCP server successfully handles all top 5 event types for 2025!');
  }

  console.log(`\n✨ QA Test completed at ${new Date().toLocaleString()}`);
}

runComprehensiveQATest().catch(console.error);