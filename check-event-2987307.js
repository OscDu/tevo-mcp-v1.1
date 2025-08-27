#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function checkSpecificEvent() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  console.log('🎯 CHECKING SPECIFIC EVENT ID 2987307');
  console.log('=' .repeat(50));

  try {
    // Direct event lookup with proper integer conversion
    const eventId = 2987307;
    console.log(`Looking up event ID: ${eventId}`);
    
    const specificEvent = await apiClient.getEvent({ event_id: eventId });
    
    if (specificEvent) {
      console.log('✅ EVENT FOUND!');
      console.log(`Name: ${specificEvent.name}`);
      console.log(`Date: ${new Date(specificEvent.occurs_at).toISOString()}`);
      console.log(`Formatted date: ${new Date(specificEvent.occurs_at).toISOString().split('T')[0]}`);
      console.log(`Venue: ${specificEvent.venue?.name || 'Unknown'}`);
      console.log(`City: ${specificEvent.venue?.city || 'Unknown'}`);
      console.log(`State: ${specificEvent.venue?.state || 'Unknown'}`);
      console.log(`Category: ${specificEvent.category?.name || 'Unknown'}`);
      
      // Check if this event would match our search criteria
      const eventName = specificEvent.name.toLowerCase();
      const hasBenson = eventName.includes('benson');
      const hasBoone = eventName.includes('boone');
      
      console.log('');
      console.log('🔍 MATCH ANALYSIS:');
      console.log(`   Contains "benson": ${hasBenson}`);
      console.log(`   Contains "boone": ${hasBoone}`);
      console.log(`   Full name match check: ${hasBenson || hasBoone}`);
      
      // Check venue location vs MSG
      if (specificEvent.venue) {
        const isMsgVenue = specificEvent.venue.name?.toLowerCase().includes('madison square garden') || 
                          specificEvent.venue_id === 2305;
        console.log(`   Is MSG venue: ${isMsgVenue}`);
        console.log(`   Venue ID: ${specificEvent.venue_id}`);
      }
      
    } else {
      console.log('❌ Event not found');
    }
    
  } catch (error) {
    console.log(`❌ Error looking up event: ${error.message}`);
    
    // Try alternative: search by ID in general event list
    console.log('');
    console.log('🔄 Trying alternative: searching all recent events...');
    
    try {
      const now = new Date();
      const future = new Date();
      future.setDate(now.getDate() + 365); // Next year
      
      const allEvents = await apiClient.listEvents({
        occurs_at_gte: now.toISOString(),
        occurs_at_lt: future.toISOString(),
        per_page: 100
      });
      
      const targetEvent = allEvents.events?.find(event => event.id === 2987307);
      
      if (targetEvent) {
        console.log('✅ Found event in general search!');
        console.log(`Name: ${targetEvent.name}`);
        console.log(`Date: ${new Date(targetEvent.occurs_at).toISOString().split('T')[0]}`);
      } else {
        console.log('❌ Event not found in general search either');
        console.log(`   Searched ${allEvents.events?.length || 0} events`);
      }
      
    } catch (altError) {
      console.log(`❌ Alternative search failed: ${altError.message}`);
    }
  }

  console.log('');
  console.log('=' .repeat(50));
  console.log('🔍 SPECIFIC EVENT CHECK COMPLETE');
}

checkSpecificEvent();