#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findBestSeats() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('🎯 Finding BEST seats for Rays vs Cubs under $150...\n');

    const listingsResponse = await apiClient.getListings(2703941);
    
    // Filter for tickets under $150 for 2+ people (no parking)
    const gameTickets = listingsResponse.ticket_groups
      ?.filter(tg => 
        tg.retail_price <= 150 && 
        tg.available_quantity >= 2 &&
        !tg.section?.toLowerCase().includes('parking') &&
        !tg.section?.toLowerCase().includes('lot')
      ) || [];

    if (gameTickets.length === 0) {
      console.log('❌ No game tickets found under $150 for 2+ people');
      return;
    }

    console.log(`📊 Found ${gameTickets.length} ticket options under $150 for 2+ people`);
    
    // BEST SEATS: Lower level (100-level sections at Wrigley)
    const lowerLevel = gameTickets.filter(tg => {
      const section = tg.section || '';
      return section.match(/^1\d\d/) || // 100-level sections
             section.includes('Field') || 
             section.includes('Box') ||
             section.match(/^[1-9]$/) || // Single digit sections (premium)
             section.match(/^[1-2]\d$/) // 10-29 sections
    }).sort((a, b) => a.retail_price - b.retail_price);

    if (lowerLevel.length > 0) {
      console.log('\n🏆 BEST SEATS - LOWER LEVEL/FIELD LEVEL:');
      lowerLevel.slice(0, 5).forEach((ticket, i) => {
        console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row || 'N/A'} - $${ticket.retail_price.toFixed(2)}/ticket ($${(ticket.retail_price * 2).toFixed(2)} total)`);
      });
    }

    // CLUB/PREMIUM: Look for club level seats
    const clubLevel = gameTickets.filter(tg => {
      const section = (tg.section || '').toLowerCase();
      return section.includes('club') || 
             section.includes('premium') ||
             section.includes('box') ||
             section.match(/2\d\d/) // 200-level (club level at Wrigley)
    }).sort((a, b) => a.retail_price - b.retail_price);

    if (clubLevel.length > 0) {
      console.log('\n💎 CLUB/PREMIUM LEVEL SEATS:');
      clubLevel.slice(0, 5).forEach((ticket, i) => {
        console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row || 'N/A'} - $${ticket.retail_price.toFixed(2)}/ticket ($${(ticket.retail_price * 2).toFixed(2)} total)`);
      });
    }

    // INFIELD seats (behind home plate, 1st/3rd base)
    const infieldSections = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 
                            '101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112',
                            '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25'];
    
    const infieldSeats = gameTickets.filter(tg => {
      const section = tg.section || '';
      return infieldSections.some(sec => section === sec || section.startsWith(sec + ' '));
    }).sort((a, b) => a.retail_price - b.retail_price);

    if (infieldSeats.length > 0) {
      console.log('\n⚾ INFIELD SEATS (behind home plate/bases):');
      infieldSeats.slice(0, 5).forEach((ticket, i) => {
        console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row || 'N/A'} - $${ticket.retail_price.toFixed(2)}/ticket ($${(ticket.retail_price * 2).toFixed(2)} total)`);
      });
    }

    // HIGHEST PRICED (within budget) - usually best seats
    const premiumByPrice = [...gameTickets]
      .sort((a, b) => b.retail_price - a.retail_price)
      .slice(0, 5);

    console.log('\n💰 MOST EXPENSIVE (within $150 budget):');
    premiumByPrice.forEach((ticket, i) => {
      console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row || 'N/A'} - $${ticket.retail_price.toFixed(2)}/ticket ($${(ticket.retail_price * 2).toFixed(2)} total)`);
    });

    // CHEAPEST (what I showed you before)
    const cheapest = [...gameTickets]
      .sort((a, b) => a.retail_price - b.retail_price)
      .slice(0, 3);

    console.log('\n💸 CHEAPEST OPTIONS:');
    cheapest.forEach((ticket, i) => {
      console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row || 'N/A'} - $${ticket.retail_price.toFixed(2)}/ticket ($${(ticket.retail_price * 2).toFixed(2)} total)`);
    });

    console.log(`\n📈 Price range: $${cheapest[0].retail_price} - $${premiumByPrice[0].retail_price} per ticket`);
    
    // Give recommendation
    if (lowerLevel.length > 0) {
      const best = lowerLevel[0];
      console.log(`\n🎯 RECOMMENDATION: Section ${best.section} at $${best.retail_price}/ticket`);
      console.log(`   This is lower level seating - much better view than upper deck!`);
      console.log(`   Total cost: $${(best.retail_price * 2).toFixed(2)} for 2 tickets`);
    } else if (clubLevel.length > 0) {
      const best = clubLevel[0];
      console.log(`\n🎯 RECOMMENDATION: Section ${best.section} at $${best.retail_price}/ticket`);
      console.log(`   This is club level - excellent amenities and view!`);
      console.log(`   Total cost: $${(best.retail_price * 2).toFixed(2)} for 2 tickets`);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

findBestSeats();