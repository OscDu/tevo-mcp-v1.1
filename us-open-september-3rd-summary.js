#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';

async function findUSOpenEvents() {
  console.log('🎾 US OPEN TENNIS EVENTS ON SEPTEMBER 3rd');
  console.log('='.repeat(60));

  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  const usOpenEvents = [];

  try {
    // Search September 3, 2024
    console.log('\n📅 SEPTEMBER 3, 2024:');
    console.log('-'.repeat(40));
    
    const results2024 = await apiClient.listEvents({
      occurs_at_gte: "2024-09-03T00:00:00Z",
      occurs_at_lt: "2024-09-04T00:00:00Z",
      per_page: 100
    });

    // Check first 100 results
    if (results2024.events) {
      const usOpenMatches2024 = results2024.events.filter(event => {
        const eventNameLower = event.name.toLowerCase();
        return eventNameLower.includes('us open') && eventNameLower.includes('tennis');
      });
      
      usOpenMatches2024.forEach(event => {
        console.log(`✅ ${event.name} (ID: ${event.id})`);
        console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
        console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
        console.log('');
        usOpenEvents.push({year: 2024, ...event});
      });
    }

    // Check if there are more pages and search them too
    if (results2024.total_entries > 100) {
      const totalPages = Math.ceil(results2024.total_entries / 100);
      
      for (let page = 2; page <= totalPages; page++) {
        const additionalResults = await apiClient.listEvents({
          occurs_at_gte: "2024-09-03T00:00:00Z",
          occurs_at_lt: "2024-09-04T00:00:00Z",
          per_page: 100,
          page: page
        });
        
        if (additionalResults.events) {
          const usOpenMatches = additionalResults.events.filter(event => {
            const eventNameLower = event.name.toLowerCase();
            return eventNameLower.includes('us open') && eventNameLower.includes('tennis');
          });
          
          usOpenMatches.forEach(event => {
            console.log(`✅ ${event.name} (ID: ${event.id})`);
            console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
            console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
            console.log('');
            usOpenEvents.push({year: 2024, ...event});
          });
        }
      }
    }

    // Search September 3, 2025
    console.log('\n📅 SEPTEMBER 3, 2025:');
    console.log('-'.repeat(40));
    
    const results2025 = await apiClient.listEvents({
      occurs_at_gte: "2025-09-03T00:00:00Z",
      occurs_at_lt: "2025-09-04T00:00:00Z",
      per_page: 100
    });

    // Check first 100 results
    if (results2025.events) {
      const usOpenMatches2025 = results2025.events.filter(event => {
        const eventNameLower = event.name.toLowerCase();
        return eventNameLower.includes('us open') && eventNameLower.includes('tennis');
      });
      
      usOpenMatches2025.forEach(event => {
        console.log(`✅ ${event.name} (ID: ${event.id})`);
        console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
        console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
        console.log('');
        usOpenEvents.push({year: 2025, ...event});
      });
    }

    // Check if there are more pages for 2025
    if (results2025.total_entries > 100) {
      const totalPages = Math.ceil(results2025.total_entries / 100);
      
      for (let page = 2; page <= totalPages; page++) {
        const additionalResults = await apiClient.listEvents({
          occurs_at_gte: "2025-09-03T00:00:00Z",
          occurs_at_lt: "2025-09-04T00:00:00Z",
          per_page: 100,
          page: page
        });
        
        if (additionalResults.events) {
          const usOpenMatches = additionalResults.events.filter(event => {
            const eventNameLower = event.name.toLowerCase();
            return eventNameLower.includes('us open') && eventNameLower.includes('tennis');
          });
          
          usOpenMatches.forEach(event => {
            console.log(`✅ ${event.name} (ID: ${event.id})`);
            console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
            console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
            console.log('');
            usOpenEvents.push({year: 2025, ...event});
          });
        }
      }
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(40));
    console.log(`Total US Open Tennis events found on September 3rd: ${usOpenEvents.length}`);
    
    const events2024 = usOpenEvents.filter(e => e.year === 2024);
    const events2025 = usOpenEvents.filter(e => e.year === 2025);
    
    console.log(`- 2024: ${events2024.length} events`);
    console.log(`- 2025: ${events2025.length} events`);
    
    if (usOpenEvents.length > 0) {
      console.log('\n🎾 ALL US OPEN TENNIS EVENTS:');
      usOpenEvents.forEach((event, index) => {
        console.log(`${index + 1}. [${event.year}] ${event.name} (ID: ${event.id})`);
        console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
        console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

findUSOpenEvents();