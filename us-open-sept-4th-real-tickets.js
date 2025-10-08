#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';

async function findRealUSOpenTickets() {
  console.log('🎾 REAL US OPEN TENNIS TICKETS - SEPTEMBER 4th, 2025');
  console.log('='.repeat(60));

  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  // Event ID for Women's Semifinals (the main event)
  const eventId = 2758524;
  const eventName = "2025 US Open Tennis Championship: Session 23 - Womens Semifinals";
  
  try {
    console.log(`\n🎫 Getting tickets for: ${eventName}`);
    console.log(`📍 Event ID: ${eventId}`);
    console.log(`📅 Date: September 4th, 2025 at 12:00 PM`);
    console.log(`🏟️ Venue: Arthur Ashe Stadium`);
    console.log('-'.repeat(60));
    
    const listings = await apiClient.getListings(eventId);
    
    if (listings.ticket_groups && listings.ticket_groups.length > 0) {
      console.log(`\n📊 Total listings found: ${listings.ticket_groups.length}`);
      
      // Filter out parking passes and other non-seating items
      const realTickets = listings.ticket_groups.filter(listing => {
        const sectionLower = (listing.section || '').toLowerCase();
        const rowLower = (listing.row || '').toLowerCase();
        
        // Exclude obvious non-ticket items
        const isParking = sectionLower.includes('parking') || 
                         sectionLower.includes('lot') || 
                         sectionLower.includes('garage') ||
                         rowLower.includes('parking') ||
                         rowLower.includes('ga');
                         
        return !isParking;
      });
      
      console.log(`🎯 Real game tickets (excluding parking): ${realTickets.length}`);
      
      if (realTickets.length > 0) {
        // Filter for budget of $500 total (max $250 per ticket for 2 tickets)
        const affordableTickets = realTickets.filter(listing => {
          const pricePerTicket = parseFloat(listing.retail_price) || 0;
          const totalPrice = pricePerTicket * 2; // 2 tickets
          return totalPrice <= 500;
        });
        
        console.log(`💰 Affordable options (≤$500 for 2 tickets): ${affordableTickets.length}`);
        
        if (affordableTickets.length > 0) {
          // Sort by price
          affordableTickets.sort((a, b) => parseFloat(a.retail_price) - parseFloat(b.retail_price));
          
          console.log('\n🎾 BEST AFFORDABLE OPTIONS:');
          console.log('='.repeat(50));
          
          affordableTickets.slice(0, 15).forEach((listing, index) => {
            const pricePerTicket = parseFloat(listing.retail_price);
            const totalFor2 = pricePerTicket * 2;
            
            console.log(`${index + 1}. 📍 Section: ${listing.section || 'N/A'}, Row: ${listing.row || 'N/A'}`);
            console.log(`   💵 Price per ticket: $${pricePerTicket.toFixed(2)}`);
            console.log(`   💰 Total for 2 tickets: $${totalFor2.toFixed(2)}`);
            console.log(`   🎫 Available: ${listing.quantity} tickets`);
            if (listing.notes) {
              console.log(`   📝 Notes: ${listing.notes}`);
            }
            console.log('');
          });
          
          // Show price summary
          const cheapest = affordableTickets[0];
          const mostExpensive = affordableTickets[affordableTickets.length - 1];
          const cheapestTotal = parseFloat(cheapest.retail_price) * 2;
          const mostExpensiveTotal = parseFloat(mostExpensive.retail_price) * 2;
          
          console.log('📈 PRICE RANGE SUMMARY:');
          console.log('-'.repeat(30));
          console.log(`Cheapest: $${cheapestTotal.toFixed(2)} total ($${parseFloat(cheapest.retail_price).toFixed(2)} each)`);
          console.log(`Most expensive (within budget): $${mostExpensiveTotal.toFixed(2)} total ($${parseFloat(mostExpensive.retail_price).toFixed(2)} each)`);
          
        } else {
          console.log('\n❌ NO TICKETS WITHIN $500 BUDGET FOUND');
          
          // Show cheapest available real tickets
          const sortedRealTickets = realTickets
            .sort((a, b) => parseFloat(a.retail_price) - parseFloat(b.retail_price))
            .slice(0, 10);
          
          console.log('\n💸 CHEAPEST AVAILABLE REAL TICKETS:');
          console.log('='.repeat(50));
          sortedRealTickets.forEach((listing, index) => {
            const pricePerTicket = parseFloat(listing.retail_price);
            const totalFor2 = pricePerTicket * 2;
            
            console.log(`${index + 1}. 📍 Section: ${listing.section || 'N/A'}, Row: ${listing.row || 'N/A'}`);
            console.log(`   💵 Price per ticket: $${pricePerTicket.toFixed(2)}`);
            console.log(`   💰 Total for 2 tickets: $${totalFor2.toFixed(2)}`);
            console.log(`   🎫 Available: ${listing.quantity} tickets`);
            console.log('');
          });
        }
        
      } else {
        console.log('❌ No real game tickets found (only parking/other items)');
      }
      
    } else {
      console.log('❌ No ticket listings found for this event');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Also check the Grounds Admission event
async function checkGroundsAdmission() {
  console.log('\n\n🌿 CHECKING GROUNDS ADMISSION TICKETS');
  console.log('='.repeat(60));
  
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);
  
  const groundsEventId = 2877351;
  const eventName = "2025 US Open Tennis Championship: Grounds Admission Only";
  
  try {
    console.log(`\n🎫 Getting tickets for: ${eventName}`);
    console.log(`📍 Event ID: ${groundsEventId}`);
    console.log('-'.repeat(60));
    
    const listings = await apiClient.getListings(groundsEventId);
    
    if (listings.ticket_groups && listings.ticket_groups.length > 0) {
      console.log(`📊 Total listings found: ${listings.ticket_groups.length}`);
      
      // Filter for budget of $500 total (max $250 per ticket for 2 tickets)
      const affordableTickets = listings.ticket_groups.filter(listing => {
        const pricePerTicket = parseFloat(listing.retail_price) || 0;
        const totalPrice = pricePerTicket * 2; // 2 tickets
        return totalPrice <= 500;
      });
      
      console.log(`💰 Affordable grounds admission (≤$500 for 2): ${affordableTickets.length}`);
      
      if (affordableTickets.length > 0) {
        // Sort by price
        affordableTickets.sort((a, b) => parseFloat(a.retail_price) - parseFloat(b.retail_price));
        
        console.log('\n🌿 GROUNDS ADMISSION OPTIONS:');
        console.log('='.repeat(40));
        
        affordableTickets.slice(0, 10).forEach((listing, index) => {
          const pricePerTicket = parseFloat(listing.retail_price);
          const totalFor2 = pricePerTicket * 2;
          
          console.log(`${index + 1}. 💵 Price per ticket: $${pricePerTicket.toFixed(2)}`);
          console.log(`   💰 Total for 2 tickets: $${totalFor2.toFixed(2)}`);
          console.log(`   🎫 Available: ${listing.quantity} tickets`);
          if (listing.notes) {
            console.log(`   📝 Notes: ${listing.notes}`);
          }
          console.log('');
        });
      } else {
        console.log('❌ No affordable grounds admission tickets found');
      }
      
    } else {
      console.log('❌ No grounds admission listings found');
    }
    
  } catch (error) {
    console.error('❌ Error checking grounds admission:', error.message);
  }
}

async function main() {
  await findRealUSOpenTickets();
  await checkGroundsAdmission();
}

main();