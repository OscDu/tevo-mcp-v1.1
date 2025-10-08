import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import { handleComprehensiveEventSearch } from './dist/tools/comprehensive-event-search.js';

async function testComprehensiveSearch() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  const cache = new MemoryCache();

  const testScenarios = [
    {
      name: "US Open Test (Previously worked manually)",
      params: {
        query: "US Open tickets",
        date: "2025-09-03",
        budget_per_ticket: 1000,
        requested_quantity: 1
      }
    },
    {
      name: "Benson Boone Test (Previously failed)",
      params: {
        query: "Benson Boone",
        date: "2025-09-05",
        location: "New York",
        budget_per_ticket: 1000,
        requested_quantity: 6
      }
    },
    {
      name: "Generic Sports Test (Yankees)",
      params: {
        query: "Yankees",
        location: "New York", 
        budget_per_ticket: 500,
        requested_quantity: 2
      }
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TESTING: ${scenario.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log('Parameters:', JSON.stringify(scenario.params, null, 2));
    
    try {
      const startTime = Date.now();
      const result = await handleComprehensiveEventSearch(apiClient, cache, scenario.params);
      const endTime = Date.now();
      
      console.log(`\nSUCCESS! (${endTime - startTime}ms)`);
      console.log('Result Summary:');
      console.log(`- Success: ${result.success}`);
      console.log(`- Events found: ${result.events_found.length}`);
      console.log(`- Total events searched: ${result.search_summary.total_events_searched}`);
      console.log(`- Strategies used: ${result.search_summary.strategies_used.join(', ')}`);
      
      if (result.events_found.length > 0) {
        console.log('\nTop Events Found:');
        result.events_found.slice(0, 3).forEach((event, index) => {
          console.log(`\n${index + 1}. ${event.name}`);
          console.log(`   Date: ${event.date} at ${event.time}`);
          console.log(`   Venue: ${event.venue} (${event.city}, ${event.state})`);
          console.log(`   Relevance Score: ${event.relevance_score}`);
          
          if (event.tickets) {
            console.log(`   Tickets Available: ${event.tickets.available_within_budget} within budget`);
            console.log(`   Price Range: $${event.tickets.price_range.min} - $${event.tickets.price_range.max}`);
            if (event.tickets.best_options.length > 0) {
              console.log(`   Best Option: ${event.tickets.best_options[0].section} Row ${event.tickets.best_options[0].row} - $${event.tickets.best_options[0].price_per_ticket} each (Total: $${event.tickets.best_options[0].total_cost})`);
            }
          }
        });
      }
      
    } catch (error) {
      console.log(`\nFAILED!`);
      console.log('Error:', error.message);
      if (error.stack) {
        console.log('Stack:', error.stack);
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testComprehensiveSearch().catch(console.error);