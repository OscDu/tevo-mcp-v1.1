#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';

async function debugMSGSeptember() {
  console.log('🔍 Debugging MSG Events Around September 5, 2025');
  console.log('='.repeat(60));

  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    // Search MSG with venue ID 2305 around September 5, 2025
    const targetDate = new Date('2025-09-05');
    const searchStart = new Date(targetDate);
    searchStart.setDate(targetDate.getDate() - 7); // ±7 days 
    const searchEnd = new Date(targetDate);
    searchEnd.setDate(targetDate.getDate() + 7);

    console.log(`Search period: ${searchStart.toISOString().split('T')[0]} to ${searchEnd.toISOString().split('T')[0]}`);
    console.log('');

    // Test 1: Search with venue ID 2305
    console.log('TEST 1: Search MSG with venue_id=2305');
    const msgVenueSearch = await apiClient.listEvents({
      venue_id: 2305,
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 100
    });

    console.log(`Found ${msgVenueSearch.events?.length || 0} events at MSG (venue_id=2305)`);
    if (msgVenueSearch.events && msgVenueSearch.events.length > 0) {
      msgVenueSearch.events.forEach(event => {
        console.log(`- ${event.name} (ID: ${event.id}) on ${new Date(event.occurs_at).toLocaleDateString()}`);
        if (event.name.toLowerCase().includes('benson')) {
          console.log('  🎯 BENSON BOONE EVENT FOUND!');
        }
      });
    }
    console.log('');

    // Test 2: Search by coordinates (MSG location)
    console.log('TEST 2: Search MSG area by coordinates (40.7505, -73.9934)');
    const msgCoordSearch = await apiClient.listEvents({
      lat: 40.7505,
      lon: -73.9934,
      within: 2, // Very tight radius
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 100
    });

    console.log(`Found ${msgCoordSearch.events?.length || 0} events near MSG coordinates`);
    if (msgCoordSearch.events && msgCoordSearch.events.length > 0) {
      msgCoordSearch.events.forEach(event => {
        console.log(`- ${event.name} (ID: ${event.id}) on ${new Date(event.occurs_at).toLocaleDateString()}`);
        if (event.name.toLowerCase().includes('benson')) {
          console.log('  🎯 BENSON BOONE EVENT FOUND!');
        }
      });
    }
    console.log('');

    // Test 3: Search broader New York area for Benson Boone
    console.log('TEST 3: Search broad New York area for "Benson" keywords');
    const nyBensonSearch = await apiClient.listEvents({
      lat: 40.7128,
      lon: -74.0060,
      within: 50, // Broader radius 
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 100
    });

    console.log(`Found ${nyBensonSearch.events?.length || 0} events in NY area`);
    if (nyBensonSearch.events) {
      const bensonEvents = nyBensonSearch.events.filter(event => 
        event.name.toLowerCase().includes('benson') || 
        event.name.toLowerCase().includes('boone')
      );
      
      console.log(`Found ${bensonEvents.length} events containing "benson" or "boone"`);
      bensonEvents.forEach(event => {
        console.log(`- ${event.name} (ID: ${event.id}) on ${new Date(event.occurs_at).toLocaleDateString()}`);
        console.log(`  Venue: ${event.venue?.name || 'Unknown'}`);
        if (event.id === 2987307) {
          console.log('  🎯 EXACT TARGET EVENT FOUND!');
        }
      });
    }
    console.log('');

    // Test 4: Check exact date Sep 5, 2025 in NY
    console.log('TEST 4: Check exact date Sep 5, 2025 in NY area');
    const exactDateStart = new Date('2025-09-05');
    exactDateStart.setHours(0, 0, 0, 0);
    const exactDateEnd = new Date('2025-09-05');
    exactDateEnd.setHours(23, 59, 59, 999);

    const exactDateSearch = await apiClient.listEvents({
      lat: 40.7128,
      lon: -74.0060,
      within: 50,
      occurs_at_gte: exactDateStart.toISOString(),
      occurs_at_lt: exactDateEnd.toISOString(),
      per_page: 100
    });

    console.log(`Found ${exactDateSearch.events?.length || 0} events on exactly Sep 5, 2025`);
    if (exactDateSearch.events && exactDateSearch.events.length > 0) {
      exactDateSearch.events.forEach(event => {
        console.log(`- ${event.name} (ID: ${event.id})`);
        console.log(`  Venue: ${event.venue?.name || 'Unknown'}`);
        if (event.id === 2987307) {
          console.log('  🎯 EXACT TARGET EVENT FOUND!');
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugMSGSeptember();