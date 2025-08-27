#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';

async function debugEventVenueDetails() {
  console.log('🔍 Debugging Event 2987307 Venue Details');
  console.log('='.repeat(60));

  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    // Get the specific event details
    const eventResponse = await apiClient.getEvent({ event_id: 2987307 });
    const event = eventResponse;
    
    console.log('📋 EVENT DETAILS:');
    console.log(`Name: ${event.name}`);
    console.log(`Date: ${event.occurs_at}`);
    console.log(`Category: ${event.category?.name || 'Unknown'}`);
    console.log('');
    
    console.log('🏟️ VENUE DETAILS:');
    console.log(`Venue Name: ${event.venue?.name || 'Unknown'}`);
    console.log(`Venue ID: ${event.venue?.id || 'Unknown'}`);
    console.log(`City: ${event.venue?.city || 'Unknown'}`);
    console.log(`State: ${event.venue?.state || 'Unknown'}`);
    console.log(`Address: ${event.venue?.address || 'Unknown'}`);
    console.log(`Coordinates: ${event.venue?.latitude || 'Unknown'}, ${event.venue?.longitude || 'Unknown'}`);
    console.log('');
    
    // Now try to search by the actual venue ID
    if (event.venue?.id) {
      console.log(`🔍 SEARCHING BY ACTUAL VENUE ID: ${event.venue.id}`);
      console.log('');
      
      const targetDate = new Date('2025-09-05');
      const searchStart = new Date(targetDate);
      searchStart.setDate(targetDate.getDate() - 7);
      const searchEnd = new Date(targetDate);
      searchEnd.setDate(targetDate.getDate() + 7);
      
      const venueSearch = await apiClient.listEvents({
        venue_id: event.venue.id,
        occurs_at_gte: searchStart.toISOString(),
        occurs_at_lt: searchEnd.toISOString(),
        per_page: 50
      });
      
      console.log(`Found ${venueSearch.events?.length || 0} events at venue ID ${event.venue.id}:`);
      if (venueSearch.events && venueSearch.events.length > 0) {
        venueSearch.events.forEach(venueEvent => {
          console.log(`- ${venueEvent.name} (ID: ${venueEvent.id}) on ${new Date(venueEvent.occurs_at).toLocaleDateString()}`);
          if (venueEvent.id === 2987307) {
            console.log('  🎯 FOUND OUR TARGET EVENT!');
          }
        });
      }
    }
    
    // Also check if coordinates work
    if (event.venue?.latitude && event.venue?.longitude) {
      console.log('');
      console.log(`🌍 SEARCHING BY ACTUAL COORDINATES: ${event.venue.latitude}, ${event.venue.longitude}`);
      console.log('');
      
      const targetDate = new Date('2025-09-05');
      const searchStart = new Date(targetDate);
      searchStart.setDate(targetDate.getDate() - 7);
      const searchEnd = new Date(targetDate);
      searchEnd.setDate(targetDate.getDate() + 7);
      
      const coordSearch = await apiClient.listEvents({
        lat: event.venue.latitude,
        lon: event.venue.longitude,
        within: 2,
        occurs_at_gte: searchStart.toISOString(),
        occurs_at_lt: searchEnd.toISOString(),
        per_page: 50
      });
      
      console.log(`Found ${coordSearch.events?.length || 0} events near actual coordinates:`);
      if (coordSearch.events && coordSearch.events.length > 0) {
        const relevantEvents = coordSearch.events.filter(e => 
          e.name.toLowerCase().includes('benson') || 
          e.name.toLowerCase().includes('boone') ||
          e.id === 2987307
        );
        
        relevantEvents.forEach(coordEvent => {
          console.log(`- ${coordEvent.name} (ID: ${coordEvent.id}) on ${new Date(coordEvent.occurs_at).toLocaleDateString()}`);
          if (coordEvent.id === 2987307) {
            console.log('  🎯 FOUND OUR TARGET EVENT!');
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugEventVenueDetails();