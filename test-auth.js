#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testAuth() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  console.log('🔐 TESTING AUTHENTICATION');
  console.log('=' .repeat(50));
  console.log(`Environment: ${config.env}`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Token: ${config.apiToken.substring(0, 8)}...`);
  console.log(`Secret: ${config.apiSecret.substring(0, 8)}...`);
  
  try {
    console.log('\n1. Testing basic events endpoint...');
    const events = await apiClient.listEvents({ per_page: 5 });
    console.log(`✅ Events API: Success - Found ${events.events?.length || 0} events`);
    
    if (events.events && events.events.length > 0) {
      const eventId = events.events[0].id;
      console.log(`\n2. Testing listings endpoint for event ${eventId}...`);
      
      try {
        // Try different approaches to listings endpoint
        console.log('   Approach 1: With event_id parameter...');
        const listings1 = await apiClient.getListings(eventId, { per_page: 5 });
        console.log(`✅ Listings API (event_id param): Success - Found ${listings1.ticket_groups?.length || 0} ticket groups`);
      } catch (listingsError) {
        console.log(`❌ Listings API (event_id param): Failed - ${listingsError.message}`);
        
        try {
          console.log('   Approach 2: Direct path...');
          // Try minimal parameters
          const listings2 = await apiClient.getListings(eventId);
          console.log(`✅ Listings API (direct path): Success - Found ${listings2?.length || 0} ticket groups`);
        } catch (directError) {
          console.log(`❌ Listings API (direct path): Failed - ${directError.message}`);
          
          if (listingsError.message.includes('401')) {
            console.log('🔍 401 Unauthorized - checking authentication headers...');
          } else if (listingsError.message.includes('timeout')) {
            console.log('⏰ Timeout - endpoint taking too long to respond');
          } else if (listingsError.message.includes('403')) {
            console.log('🚫 403 Forbidden - insufficient permissions for this endpoint');
          } else if (listingsError.message.includes('400')) {
            console.log('🔍 400 Bad Request - checking parameter format...');
            console.log(`   Parameters sent: event_id=${eventId}, per_page=5`);
          }
        }
      }
    }

    console.log('\n3. Testing event details endpoint...');
    if (events.events && events.events.length > 0) {
      const eventId = events.events[0].id;
      console.log(`   Event ID: ${eventId} (type: ${typeof eventId})`);
      try {
        const eventDetails = await apiClient.getEvent({ event_id: eventId });
        console.log(`✅ Event Details API: Success - Got details for "${eventDetails.name}"`);
      } catch (detailsError) {
        console.log(`❌ Event Details API: Failed - ${detailsError.message}`);
      }
    }

    console.log('\n🎯 AUTHENTICATION TEST SUMMARY:');
    console.log('=' .repeat(40));
    console.log('✅ Basic authentication is working');
    console.log('✅ Events endpoint accessible');
    console.log('⚠️ Some endpoints may have timeout or permission issues');

  } catch (error) {
    console.log(`❌ Authentication test failed: ${error.message}`);
    
    if (error.message.includes('401')) {
      console.log('\n🔍 TROUBLESHOOTING 401 UNAUTHORIZED:');
      console.log('1. Check if API token/secret are correct');
      console.log('2. Verify signature generation');
      console.log('3. Check if account has necessary permissions');
    } else if (error.message.includes('403')) {
      console.log('\n🔍 TROUBLESHOOTING 403 FORBIDDEN:');
      console.log('1. Account may not have access to production API');
      console.log('2. Check if all required permissions are granted');
    }
  }
}

testAuth();