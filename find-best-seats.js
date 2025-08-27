#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import dotenv from 'dotenv';

// Load env silently
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;
process.stdout.write = () => true;
process.stderr.write = () => true;
dotenv.config();
process.stdout.write = originalStdout;
process.stderr.write = originalStderr;

async function findBestSeats() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('🎯 Finding BEST seats for Giants at Patriots under $500...\n');

    const listingsResponse = await apiClient.getListings(2938897);
    
    // Filter for actual game tickets (not parking) under $500
    const gameTickets = listingsResponse.ticket_groups
      ?.filter(tg => 
        tg.retail_price <= 500 && 
        tg.available_quantity >= 1 &&
        !tg.section?.toLowerCase().includes('parking') &&
        !tg.section?.toLowerCase().includes('lot') &&
        !tg.section?.toLowerCase().includes('garage')
      ) || [];

    if (gameTickets.length === 0) {
      console.log('❌ No game tickets found under $500');
      return;
    }

    console.log(`📊 Found ${gameTickets.length} game ticket options under $500`);
    
    // Sort by section number (lower sections are typically better)
    const sortedBySection = [...gameTickets].sort((a, b) => {
      const sectionA = parseInt(a.section?.match(/\d+/)?.[0] || '999');
      const sectionB = parseInt(b.section?.match(/\d+/)?.[0] || '999');
      return sectionA - sectionB;
    });

    console.log('\n🏆 BEST SEATS (lowest section numbers):');
    sortedBySection.slice(0, 5).forEach((ticket, i) => {
      console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row || 'N/A'} - $${ticket.retail_price.toFixed(2)}`);
    });

    // Sort by price (highest first for premium seats)
    const sortedByPriceDesc = [...gameTickets].sort((a, b) => b.retail_price - a.retail_price);

    console.log('\n💎 PREMIUM SEATS (highest priced within budget):');
    sortedByPriceDesc.slice(0, 5).forEach((ticket, i) => {
      console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row || 'N/A'} - $${ticket.retail_price.toFixed(2)}`);
    });

    // Sort by price (lowest first for budget seats)
    const sortedByPriceAsc = [...gameTickets].sort((a, b) => a.retail_price - b.retail_price);

    console.log('\n💰 CHEAPEST SEATS:');
    sortedByPriceAsc.slice(0, 5).forEach((ticket, i) => {
      console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row || 'N/A'} - $${ticket.retail_price.toFixed(2)}`);
    });

    // Find midfield/lower bowl sections (typically 100-level, sections around 100-140)
    const lowerBowl = gameTickets.filter(tg => {
      const sectionNum = parseInt(tg.section?.match(/\d+/)?.[0] || '999');
      return sectionNum >= 100 && sectionNum <= 140;
    }).sort((a, b) => a.retail_price - b.retail_price);

    if (lowerBowl.length > 0) {
      console.log('\n🎯 LOWER BOWL SEATS (best view):');
      lowerBowl.slice(0, 5).forEach((ticket, i) => {
        console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row || 'N/A'} - $${ticket.retail_price.toFixed(2)}`);
      });
    }

    console.log(`\n📈 Price range: $${sortedByPriceAsc[0].retail_price} - $${sortedByPriceDesc[0].retail_price}`);

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

findBestSeats();