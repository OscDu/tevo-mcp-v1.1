#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function debugBensonBoone() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  console.log('🔍 DEBUGGING BENSON BOONE EVENT SEARCH');
  console.log('=' .repeat(60));

  const targetDate = new Date('2025-09-05');
  const searchStart = new Date(targetDate);
  searchStart.setDate(targetDate.getDate() - 7);
  const searchEnd = new Date(targetDate);
  searchEnd.setDate(targetDate.getDate() + 7);

  console.log(`📅 Target date: ${targetDate.toISOString().split('T')[0]}`);
  console.log(`🔍 Search window: ${searchStart.toISOString().split('T')[0]} to ${searchEnd.toISOString().split('T')[0]}`);
  console.log('');

  // Test 1: Direct search at MSG with venue_id
  console.log('🎭 TEST 1: Direct MSG search (venue_id: 2305)');
  try {
    const msgParams = {
      venue_id: 2305, // MSG
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 50
    };
    
    console.log('Parameters:', JSON.stringify(msgParams, null, 2));
    const msgEvents = await apiClient.listEvents(msgParams);
    console.log(`Found ${msgEvents.events?.length || 0} events at MSG`);
    
    if (msgEvents.events) {
      msgEvents.events.forEach((event, i) => {
        console.log(`  ${i+1}. ${event.name} - ${new Date(event.occurs_at).toISOString().split('T')[0]} (ID: ${event.id})`);
      });
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('');

  // Test 2: Broader NYC search 
  console.log('🗽 TEST 2: Broader NYC area search');
  try {
    const nycParams = {
      lat: 40.7505,
      lon: -73.9934,
      within: 20, // 20 mile radius
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 50
    };
    
    console.log('Parameters:', JSON.stringify(nycParams, null, 2));
    const nycEvents = await apiClient.listEvents(nycParams);
    console.log(`Found ${nycEvents.events?.length || 0} events in NYC area`);
    
    // Look for Benson Boone specifically
    const bensonEvents = nycEvents.events?.filter(event => {
      const name = event.name.toLowerCase();
      return name.includes('benson') || name.includes('boone');
    });
    
    console.log(`Benson Boone events found: ${bensonEvents?.length || 0}`);
    bensonEvents?.forEach((event, i) => {
      console.log(`  ${i+1}. ${event.name} - ${new Date(event.occurs_at).toISOString().split('T')[0]} (ID: ${event.id})`);
      console.log(`      Venue: ${event.venue?.name || 'Unknown'}`);
    });

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('');

  // Test 3: Search for specific event ID 2987307
  console.log('🎯 TEST 3: Direct lookup of event ID 2987307');
  try {
    const specificEvent = await apiClient.getEvent(2987307);
    if (specificEvent) {
      console.log('✅ Found the specific event!');
      console.log(`Name: ${specificEvent.name}`);
      console.log(`Date: ${new Date(specificEvent.occurs_at).toISOString().split('T')[0]}`);
      console.log(`Venue: ${specificEvent.venue?.name || 'Unknown'}`);
      console.log(`State: ${specificEvent.venue?.state || 'Unknown'}`);
    }
  } catch (error) {
    console.log('❌ Event not found or error:', error.message);
  }
  console.log('');

  // Test 4: Wider date range search
  console.log('📅 TEST 4: Expanded date range search (±14 days)');
  const expandedStart = new Date(targetDate);
  expandedStart.setDate(targetDate.getDate() - 14);
  const expandedEnd = new Date(targetDate);
  expandedEnd.setDate(targetDate.getDate() + 14);

  try {
    const expandedParams = {
      lat: 40.7505,
      lon: -73.9934,
      within: 50, // Very wide radius
      occurs_at_gte: expandedStart.toISOString(),
      occurs_at_lt: expandedEnd.toISOString(),
      per_page: 100
    };
    
    console.log(`Search window: ${expandedStart.toISOString().split('T')[0]} to ${expandedEnd.toISOString().split('T')[0]}`);
    const expandedEvents = await apiClient.listEvents(expandedParams);
    console.log(`Found ${expandedEvents.events?.length || 0} events in expanded search`);
    
    // Look for Benson Boone specifically
    const bensonEvents = expandedEvents.events?.filter(event => {
      const name = event.name.toLowerCase();
      return name.includes('benson') || name.includes('boone');
    });
    
    console.log(`Benson Boone events found: ${bensonEvents?.length || 0}`);
    bensonEvents?.forEach((event, i) => {
      console.log(`  ${i+1}. ${event.name} - ${new Date(event.occurs_at).toISOString().split('T')[0]} (ID: ${event.id})`);
      console.log(`      Venue: ${event.venue?.name || 'Unknown'}, ${event.venue?.city || 'Unknown'}`);
    });

  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('');
  console.log('=' .repeat(60));
  console.log('🔍 DEBUGGING COMPLETE');
  console.log('=' .repeat(60));
}

debugBensonBoone();