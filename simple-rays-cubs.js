#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findGame() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    // Search Chicago area Sep 12, 2025
    const eventsResponse = await apiClient.listEvents({
      lat: 41.8781,
      lon: -87.6298, 
      within: 15,
      occurs_at_gte: '2025-09-12T00:00:00Z',
      occurs_at_lt: '2025-09-12T23:59:59Z',
      per_page: 50
    });

    console.log('Sep 12, 2025 - Chicago area games:');
    
    if (eventsResponse.events) {
      for (const event of eventsResponse.events) {
        const name = event.name.toLowerCase();
        if (name.includes('rays') && name.includes('cubs')) {
          console.log('\n🎯 FOUND: ' + event.name);
          console.log('ID: ' + event.id);
          console.log('Time: ' + new Date(event.occurs_at).toLocaleString());
          
          // Get tickets
          try {
            const listings = await apiClient.getListings(event.id);
            const goodTickets = listings.ticket_groups
              ?.filter(t => t.retail_price <= 150 && t.available_quantity >= 2)
              ?.sort((a,b) => a.retail_price - b.retail_price)
              ?.slice(0, 5);
              
            if (goodTickets && goodTickets.length > 0) {
              console.log('\n✅ Tickets under $150 for 2+:');
              goodTickets.forEach((t, i) => {
                console.log((i+1) + '. Section ' + t.section + ' - $' + t.retail_price + '/ticket');
              });
            } else {
              console.log('\n❌ No tickets under $150 for 2 people');
            }
          } catch (e) {
            console.log('Error getting tickets:', e.message);
          }
          
          return;
        }
      }
    }
    
    console.log('❌ No Rays vs Cubs found on 9/12/2025');
    
  } catch (error) {
    console.log('Error:', error.message);
  }
}

findGame();