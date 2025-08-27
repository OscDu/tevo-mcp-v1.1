#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';

async function debugVenueIds() {
  console.log('🔍 Debugging Different MSG Venue IDs');
  console.log('='.repeat(60));

  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    const targetDate = new Date('2025-09-05');
    const searchStart = new Date(targetDate);
    searchStart.setDate(targetDate.getDate() - 2);
    const searchEnd = new Date(targetDate);
    searchEnd.setDate(targetDate.getDate() + 2);
    
    console.log('Testing different venue IDs for MSG around Sep 5, 2025:');
    console.log('');

    // Test venue ID 2305 (what I was using)
    console.log('🏟️ VENUE ID 2305:');
    const venue2305 = await apiClient.listEvents({
      venue_id: 2305,
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 10
    });
    console.log(`Found ${venue2305.events?.length || 0} events`);
    if (venue2305.events && venue2305.events.length > 0) {
      venue2305.events.forEach(event => {
        console.log(`- ${event.name} (ID: ${event.id})`);
      });
    }
    console.log('');

    // Test venue ID 896 (the actual Benson Boone venue)
    console.log('🏟️ VENUE ID 896:');
    const venue896 = await apiClient.listEvents({
      venue_id: 896,
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 10
    });
    console.log(`Found ${venue896.events?.length || 0} events`);
    if (venue896.events && venue896.events.length > 0) {
      venue896.events.forEach(event => {
        console.log(`- ${event.name} (ID: ${event.id})`);
        if (event.id === 2987307) {
          console.log('  🎯 FOUND BENSON BOONE!');
        }
      });
    }
    console.log('');

    // Test a few other potential MSG IDs
    const potentialMSGIds = [1, 2, 896, 1000, 2305];
    
    for (const venueId of potentialMSGIds) {
      if (venueId === 896 || venueId === 2305) continue; // Already tested
      
      try {
        const venueTest = await apiClient.listEvents({
          venue_id: venueId,
          occurs_at_gte: searchStart.toISOString(),
          occurs_at_lt: searchEnd.toISOString(),
          per_page: 5
        });
        
        if (venueTest.events && venueTest.events.length > 0) {
          console.log(`🏟️ VENUE ID ${venueId}:`);
          console.log(`Found ${venueTest.events.length} events`);
          venueTest.events.forEach(event => {
            console.log(`- ${event.name} (${event.venue?.name || 'Unknown Venue'})`);
          });
          console.log('');
        }
      } catch (error) {
        // Skip if venue doesn't exist
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugVenueIds();