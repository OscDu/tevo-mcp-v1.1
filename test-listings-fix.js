#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function testListingsFix() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  console.log('🎫 TESTING LISTINGS API FIXES');
  console.log('=' .repeat(50));
  
  try {
    // Find a sports event that likely has tickets
    console.log('1. Finding a sports event with tickets...');
    const events = await apiClient.listEvents({ 
      per_page: 20,
      q: 'Yankees'  // Try to find a Yankees game which should have tickets
    });
    
    console.log(`Found ${events.events?.length || 0} events`);
    
    if (events.events && events.events.length > 0) {
      for (let i = 0; i < Math.min(events.events.length, 3); i++) {
        const event = events.events[i];
        console.log(`\n2. Testing event: "${event.name}" (ID: ${event.id})`);
        
        try {
          console.log('   Test A: No filters...');
          const listings1 = await apiClient.getListings(event.id);
          console.log(`   ✅ No filters: ${listings1.ticket_groups?.length || 0} ticket groups`);
          
          if (listings1.ticket_groups && listings1.ticket_groups.length > 0) {
            console.log(`   🎫 Found tickets! Sample: $${listings1.ticket_groups[0].retail_price}, Section ${listings1.ticket_groups[0].section}`);
            
            // Test different parameter formats
            console.log('   Test B: With page parameter...');
            try {
              const listings2 = await apiClient.getListings(event.id, { page: 1 });
              console.log(`   ✅ With page: ${listings2.ticket_groups?.length || 0} ticket groups`);
            } catch (e) {
              console.log(`   ❌ With page: ${e.message}`);
            }
            
            console.log('   Test C: With per_page parameter only...');
            try {
              const listings3 = await apiClient.getListings(event.id, { per_page: 10 });
              console.log(`   ❌ This should fail based on our testing...`);
            } catch (e) {
              console.log(`   ✅ Expected failure with per_page: ${e.message}`);
            }
            
            break; // Found a working event, no need to test more
          } else {
            console.log('   📝 No tickets available for this event');
          }
          
        } catch (error) {
          console.log(`   ❌ Error testing listings: ${error.message}`);
        }
      }
    }

    console.log('\n🎯 LISTINGS API FINDINGS:');
    console.log('=' .repeat(40));
    console.log('✅ Basic listings endpoint works without filters');
    console.log('❌ per_page parameter causes 400 Bad Request');
    console.log('💡 Solution: Remove per_page from listings calls');

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

testListingsFix();