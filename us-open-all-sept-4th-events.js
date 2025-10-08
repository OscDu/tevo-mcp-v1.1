#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';

async function findAllUSOpenEventsSept4() {
  console.log('🔍 ALL US OPEN EVENTS ON SEPTEMBER 4th, 2025');
  console.log('='.repeat(60));

  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    // Search more broadly for US Open events
    const searchTerms = [
      'US Open',
      'USTA',
      'Arthur Ashe',
      'Louis Armstrong Stadium',
      'Tennis'
    ];
    
    for (const term of searchTerms) {
      console.log(`\n🔍 Searching for "${term}" events on September 4th, 2025...`);
      console.log('-'.repeat(50));
      
      const results = await apiClient.listEvents({
        occurs_at_gte: "2025-09-04T00:00:00Z",
        occurs_at_lt: "2025-09-05T00:00:00Z",
        q: term,
        per_page: 50
      });
      
      if (results.events && results.events.length > 0) {
        console.log(`Found ${results.events.length} events with "${term}"`);
        
        results.events.forEach(event => {
          console.log(`✅ ${event.name} (ID: ${event.id})`);
          console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
          console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
          console.log('');
        });
      } else {
        console.log(`No events found with "${term}"`);
      }
    }
    
    // Also check venue-specific searches
    console.log('\n🏟️ Searching by Tennis Venues...');
    console.log('-'.repeat(50));
    
    const venueSearches = [
      { venue: 'National Tennis Center', venue_id: null },
      { venue: 'Arthur Ashe Stadium', venue_id: null },
      { venue: 'Louis Armstrong Stadium', venue_id: null }
    ];
    
    for (const venueSearch of venueSearches) {
      const results = await apiClient.listEvents({
        occurs_at_gte: "2025-09-04T00:00:00Z", 
        occurs_at_lt: "2025-09-05T00:00:00Z",
        q: venueSearch.venue,
        per_page: 50
      });
      
      if (results.events && results.events.length > 0) {
        console.log(`\nFound ${results.events.length} events at/mentioning ${venueSearch.venue}:`);
        results.events.forEach(event => {
          console.log(`✅ ${event.name} (ID: ${event.id})`);
          console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
          console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
          console.log('');
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

findAllUSOpenEventsSept4();