#!/usr/bin/env node

import dotenv from 'dotenv';
import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { MemoryCache } from './dist/cache/memory-cache.js';

// Load env silently
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;
process.stdout.write = () => true;
process.stderr.write = () => true;
dotenv.config();
process.stdout.write = originalStdout;
process.stderr.write = originalStderr;

async function debugSearchSuggestions() {
  try {
    const config = loadConfig();
    console.log('🔍 Debugging Search Suggestions API...');
    console.log(`Environment: ${config.env}`);
    console.log(`Base URL: ${config.baseUrl}`);
    console.log(`Token: ${config.apiToken.substring(0, 10)}...`);
    
    const apiClient = new TevoApiClient(config);

    // Test the suggestions endpoint directly
    console.log('\n1. Testing suggestions endpoint with simple query...');
    
    try {
      const response = await apiClient.searchSuggestions({
        q: 'Giants',
        limit: 3
      });
      
      console.log('✅ Suggestions API works!');
      console.log('Results:', JSON.stringify(response, null, 2));
      
    } catch (error) {
      console.log('❌ Suggestions API failed:', error.message);
      
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response headers:', error.response.headers);
        console.log('Response data:', error.response.data);
      }
      
      // Let's check if it's a specific endpoint issue vs general auth issue
      console.log('\n2. Testing other endpoints for comparison...');
      
      try {
        console.log('Testing /events endpoint...');
        const eventsTest = await apiClient.listEvents({ per_page: 1 });
        console.log('✅ Events endpoint works fine');
        console.log('This means auth is good, but suggestions endpoint has issues');
      } catch (eventsError) {
        console.log('❌ Events endpoint also fails:', eventsError.message);
        console.log('This suggests a general auth problem');
      }
    }
    
    // If suggestions fails, let's try getting venue info another way
    console.log('\n3. Finding Gillette Stadium venue ID using events...');
    
    try {
      // Get the Giants-Patriots event we know exists
      const giantsEvent = await apiClient.getEvent({ event_id: 2938897 });
      console.log('✅ Found venue info from Giants event:');
      console.log(`Venue ID: ${giantsEvent.venue.id}`);
      console.log(`Venue Name: ${giantsEvent.venue.name}`);
      console.log(`Venue City: ${giantsEvent.venue.city}`);
      
      // Now test venue-based search
      console.log('\n4. Testing venue-based event search...');
      const venueEvents = await apiClient.listEvents({
        venue_id: giantsEvent.venue.id,
        per_page: 10
      });
      
      console.log(`✅ Found ${venueEvents.events.length} events at ${giantsEvent.venue.name}:`);
      venueEvents.events.forEach(event => {
        console.log(`  - ${event.name} (${new Date(event.occurs_at).toLocaleDateString()})`);
      });
      
    } catch (error) {
      console.log('❌ Venue search failed:', error.message);
    }

  } catch (error) {
    console.error('Debug failed:', error.message);
  }
}

debugSearchSuggestions();