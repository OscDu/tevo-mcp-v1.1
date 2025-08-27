#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function getWildBluesBestSeats() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  try {
    console.log('🏒 GETTING BEST SEATS FOR WILD VS BLUES');
    console.log('🆔 Event ID: 3050859');
    console.log('🎫 Need: 6 tickets, Budget: $3,000 total ($500/ticket)\n');

    // First get event details
    console.log('📋 Getting event details...');
    const eventDetails = await apiClient.getEvent({ event_id: 3050859 });
    
    console.log(`🏒 GAME: ${eventDetails.name}`);
    console.log(`📅 ${new Date(eventDetails.occurs_at).toLocaleDateString()} at ${new Date(eventDetails.occurs_at).toLocaleTimeString()}`);
    console.log(`🏟️ ${eventDetails.venue?.name || 'Unknown venue'}`);
    console.log(`📍 ${eventDetails.venue?.city || ''}, ${eventDetails.venue?.state || ''}\n`);

    // Get all ticket listings
    console.log('🎫 Getting all ticket listings...');
    const listingsResponse = await apiClient.getListings(3050859);
    console.log(`📊 Found ${listingsResponse.ticket_groups?.length || 0} total listings`);
    
    // Filter for 6+ tickets under $500 (exclude parking)
    const eligibleTickets = listingsResponse.ticket_groups
      ?.filter(tg => 
        tg.retail_price <= 500 && 
        tg.available_quantity >= 6 &&
        !tg.section?.toLowerCase().includes('parking') &&
        !tg.section?.toLowerCase().includes('lot') &&
        !tg.section?.toLowerCase().includes('garage')
      )
      ?.map(tg => ({
        section: tg.section || 'N/A',
        row: tg.row || 'N/A',
        price_per_ticket: tg.retail_price,
        available_quantity: tg.available_quantity,
        total_cost: tg.retail_price * 6,
        format: tg.format || 'Unknown',
        instant_delivery: tg.instant_delivery || false
      })) || [];

    if (eligibleTickets.length === 0) {
      console.log('❌ No seats for 6+ people under $500/ticket');
      
      // Show what's available at any price
      const allTickets = listingsResponse.ticket_groups
        ?.filter(tg => tg.available_quantity >= 6)
        ?.sort((a, b) => a.retail_price - b.retail_price)
        ?.slice(0, 5) || [];
        
      if (allTickets.length > 0) {
        console.log('\n💰 Available for 6+ people (any price):');
        allTickets.forEach((ticket, i) => {
          console.log(`   ${i+1}. Section ${ticket.section} - $${ticket.retail_price}/ticket ($${(ticket.retail_price * 6).toFixed(2)} total)`);
        });
      }
      return;
    }

    console.log(`\n✅ Found ${eligibleTickets.length} options for 6+ people under $500/ticket`);

    // BEST SEATS: Sort by highest price (premium seats)
    const premiumSeats = [...eligibleTickets]
      .sort((a, b) => b.price_per_ticket - a.price_per_ticket);

    console.log('\n🏆 BEST SEATS (highest priced = premium):');
    console.log('='.repeat(80));
    
    premiumSeats.slice(0, 5).forEach((ticket, i) => {
      console.log(`\n${i+1}. Section ${ticket.section}, Row ${ticket.row}`);
      console.log(`   💰 $${ticket.price_per_ticket.toFixed(2)} per ticket`);
      console.log(`   💵 $${ticket.total_cost.toFixed(2)} total for 6 tickets`);
      console.log(`   🎫 ${ticket.available_quantity} available`);
      console.log(`   📱 Format: ${ticket.format}`);
      console.log(`   ⚡ Instant delivery: ${ticket.instant_delivery ? 'Yes' : 'No'}`);
    });

    // LOWER LEVEL seats (100-level sections at most NHL arenas)
    const lowerLevel = eligibleTickets.filter(tg => {
      const section = tg.section || '';
      return section.match(/^1\d\d/) || // 100-level sections
             section.includes('Club') ||
             section.includes('Premium') ||
             section.includes('Box') ||
             section.match(/^[1-9]$/) || // Single digit sections
             section.match(/^[1-5]\d$/) // 10-59 sections (lower bowl)
    }).sort((a, b) => b.price_per_ticket - a.price_per_ticket);

    if (lowerLevel.length > 0) {
      console.log('\n🏒 LOWER LEVEL/CLUB SEATS:');
      console.log('='.repeat(50));
      lowerLevel.slice(0, 5).forEach((ticket, i) => {
        console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row} - $${ticket.price_per_ticket}/ticket ($${ticket.total_cost.toFixed(2)} total)`);
      });
    }

    // CENTER ICE area (premium viewing)
    const centerIceSections = ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110',
                             '111', '112', '113', '114', '115', '116', '117', '118', '119', '120',
                             'Club', 'Premium', 'Center'];
    
    const centerIceSeats = eligibleTickets.filter(tg => {
      const section = (tg.section || '').toLowerCase();
      return centerIceSections.some(sec => 
        section.includes(sec.toLowerCase()) || 
        section === sec.toLowerCase()
      );
    }).sort((a, b) => b.price_per_ticket - a.price_per_ticket);

    if (centerIceSeats.length > 0) {
      console.log('\n🎯 CENTER ICE AREA SEATS:');
      console.log('='.repeat(50));
      centerIceSeats.slice(0, 3).forEach((ticket, i) => {
        console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row} - $${ticket.price_per_ticket}/ticket ($${ticket.total_cost.toFixed(2)} total)`);
      });
    }

    // TOP RECOMMENDATION
    const bestOption = premiumSeats[0];
    const budgetRemaining = 3000 - bestOption.total_cost;
    
    console.log(`\n🎯 TOP RECOMMENDATION (BEST SEATS):`);
    console.log(`🏆 Section ${bestOption.section}, Row ${bestOption.row}`);
    console.log(`💰 $${bestOption.price_per_ticket}/ticket × 6 = $${bestOption.total_cost.toFixed(2)} total`);
    console.log(`💸 Under budget by: $${budgetRemaining.toFixed(2)}`);
    console.log(`🏒 Premium seating - best view and experience for Wild vs Blues!`);
    console.log(`📱 Format: ${bestOption.format}`);
    console.log(`⚡ Instant delivery: ${bestOption.instant_delivery ? 'Yes' : 'No'}`);

    // Show some value options
    const valueSeats = eligibleTickets
      .filter(t => t.price_per_ticket >= 200 && t.price_per_ticket <= 350)
      .sort((a, b) => b.price_per_ticket - a.price_per_ticket);
      
    if (valueSeats.length > 0) {
      console.log(`\n💰 GOOD VALUE OPTIONS ($200-350/ticket):`);
      valueSeats.slice(0, 3).forEach((ticket, i) => {
        console.log(`   ${i+1}. Section ${ticket.section}, Row ${ticket.row} - $${ticket.price_per_ticket}/ticket ($${ticket.total_cost.toFixed(2)} total)`);
      });
    }

    // Show price distribution
    const priceRanges = {
      '$400-500': eligibleTickets.filter(t => t.price_per_ticket >= 400).length,
      '$300-399': eligibleTickets.filter(t => t.price_per_ticket >= 300 && t.price_per_ticket < 400).length,
      '$200-299': eligibleTickets.filter(t => t.price_per_ticket >= 200 && t.price_per_ticket < 300).length,
      '$100-199': eligibleTickets.filter(t => t.price_per_ticket >= 100 && t.price_per_ticket < 200).length,
      'Under $100': eligibleTickets.filter(t => t.price_per_ticket < 100).length
    };

    console.log(`\n📊 PRICE DISTRIBUTION FOR 6+ TICKETS:`);
    Object.entries(priceRanges).forEach(([range, count]) => {
      if (count > 0) {
        console.log(`   ${range}: ${count} options`);
      }
    });

  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.log('💡 The event ID might be incorrect or the event might not be available');
    }
  }
}

getWildBluesBestSeats();