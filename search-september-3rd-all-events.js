#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';

async function searchSeptember3rdAllEvents() {
  console.log('🔍 Searching ALL Events on September 3rd, 2024 and 2025');
  console.log('='.repeat(60));

  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  const targetKeywords = ['us open', 'open', 'tennis', 'golf', 'usopen'];

  try {
    // Search September 3, 2024
    console.log('\n📅 SEPTEMBER 3, 2024:');
    console.log('-'.repeat(40));
    
    const results2024 = await apiClient.listEvents({
      occurs_at_gte: "2024-09-03T00:00:00Z",
      occurs_at_lt: "2024-09-04T00:00:00Z",
      per_page: 100
    });

    console.log(`Total events found on Sep 3, 2024: ${results2024.events?.length || 0}`);
    console.log(`Total entries available: ${results2024.total_entries || 0}`);
    
    if (results2024.events && results2024.events.length > 0) {
      console.log('\nALL EVENTS on September 3, 2024:');
      results2024.events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.name} (ID: ${event.id})`);
        console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
        console.log(`   Location: ${event.venue?.city || 'Unknown'}, ${event.venue?.state || 'Unknown'}`);
        console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
        
        // Check for target keywords
        const eventNameLower = event.name.toLowerCase();
        const matchingKeywords = targetKeywords.filter(keyword => 
          eventNameLower.includes(keyword)
        );
        
        if (matchingKeywords.length > 0) {
          console.log(`   🎯 MATCH FOUND! Keywords: ${matchingKeywords.join(', ')}`);
        }
        console.log('');
      });
      
      // Check if there are more pages
      if (results2024.total_entries > 100) {
        console.log(`⚠️  NOTE: There are ${results2024.total_entries} total entries but we only fetched ${results2024.events.length}. Fetching remaining pages...`);
        
        // Calculate total pages needed
        const totalPages = Math.ceil(results2024.total_entries / 100);
        
        for (let page = 2; page <= totalPages; page++) {
          console.log(`Fetching page ${page}...`);
          const additionalResults = await apiClient.listEvents({
            occurs_at_gte: "2024-09-03T00:00:00Z",
            occurs_at_lt: "2024-09-04T00:00:00Z",
            per_page: 100,
            page: page
          });
          
          if (additionalResults.events && additionalResults.events.length > 0) {
            additionalResults.events.forEach((event, index) => {
              const overallIndex = (page - 1) * 100 + index + 1;
              console.log(`${overallIndex}. ${event.name} (ID: ${event.id})`);
              console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
              console.log(`   Location: ${event.venue?.city || 'Unknown'}, ${event.venue?.state || 'Unknown'}`);
              console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
              
              // Check for target keywords
              const eventNameLower = event.name.toLowerCase();
              const matchingKeywords = targetKeywords.filter(keyword => 
                eventNameLower.includes(keyword)
              );
              
              if (matchingKeywords.length > 0) {
                console.log(`   🎯 MATCH FOUND! Keywords: ${matchingKeywords.join(', ')}`);
              }
              console.log('');
            });
          }
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

    console.log(`Total events found on Sep 3, 2025: ${results2025.events?.length || 0}`);
    console.log(`Total entries available: ${results2025.total_entries || 0}`);
    
    if (results2025.events && results2025.events.length > 0) {
      console.log('\nALL EVENTS on September 3, 2025:');
      results2025.events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.name} (ID: ${event.id})`);
        console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
        console.log(`   Location: ${event.venue?.city || 'Unknown'}, ${event.venue?.state || 'Unknown'}`);
        console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
        
        // Check for target keywords
        const eventNameLower = event.name.toLowerCase();
        const matchingKeywords = targetKeywords.filter(keyword => 
          eventNameLower.includes(keyword)
        );
        
        if (matchingKeywords.length > 0) {
          console.log(`   🎯 MATCH FOUND! Keywords: ${matchingKeywords.join(', ')}`);
        }
        console.log('');
      });
      
      // Check if there are more pages for 2025
      if (results2025.total_entries > 100) {
        console.log(`⚠️  NOTE: There are ${results2025.total_entries} total entries but we only fetched ${results2025.events.length}. Fetching remaining pages...`);
        
        // Calculate total pages needed
        const totalPages = Math.ceil(results2025.total_entries / 100);
        
        for (let page = 2; page <= totalPages; page++) {
          console.log(`Fetching page ${page}...`);
          const additionalResults = await apiClient.listEvents({
            occurs_at_gte: "2025-09-03T00:00:00Z",
            occurs_at_lt: "2025-09-04T00:00:00Z",
            per_page: 100,
            page: page
          });
          
          if (additionalResults.events && additionalResults.events.length > 0) {
            additionalResults.events.forEach((event, index) => {
              const overallIndex = (page - 1) * 100 + index + 1;
              console.log(`${overallIndex}. ${event.name} (ID: ${event.id})`);
              console.log(`   Venue: ${event.venue?.name || 'Unknown'}`);
              console.log(`   Location: ${event.venue?.city || 'Unknown'}, ${event.venue?.state || 'Unknown'}`);
              console.log(`   Time: ${new Date(event.occurs_at).toLocaleString()}`);
              
              // Check for target keywords
              const eventNameLower = event.name.toLowerCase();
              const matchingKeywords = targetKeywords.filter(keyword => 
                eventNameLower.includes(keyword)
              );
              
              if (matchingKeywords.length > 0) {
                console.log(`   🎯 MATCH FOUND! Keywords: ${matchingKeywords.join(', ')}`);
              }
              console.log('');
            });
          }
        }
      }
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(40));
    console.log(`September 3, 2024: ${results2024.events?.length || 0} events (${results2024.total_entries || 0} total available)`);
    console.log(`September 3, 2025: ${results2025.events?.length || 0} events (${results2025.total_entries || 0} total available)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

searchSeptember3rdAllEvents();