#!/usr/bin/env node

import { TevoApiClient } from './dist/client/tevo-api.js';
import { loadConfig } from './dist/utils/config.js';
import dotenv from 'dotenv';

dotenv.config({ debug: false });

async function findRealDodgers() {
  const config = loadConfig();
  const apiClient = new TevoApiClient(config);

  console.log('⚾ SEARCHING FOR ACTUAL DODGERS GAMES');
  console.log('🏟️ Looking at Dodger Stadium specifically');
  console.log('📅 Tonight and tomorrow only');
  console.log('=' .repeat(50));

  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 2);

    // Search specifically at Dodger Stadium
    console.log('🔍 Searching Dodger Stadium for games...');
    const dodgerStadiumEvents = await apiClient.listEvents({
      lat: 34.0739,  // Dodger Stadium coordinates
      lon: -118.2400,
      within: 1, // Very close to stadium
      occurs_at_gte: now.toISOString(),
      occurs_at_lt: tomorrow.toISOString(),
      per_page: 20
    });

    console.log(`Found ${dodgerStadiumEvents.events?.length || 0} events at Dodger Stadium`);

    if (!dodgerStadiumEvents.events || dodgerStadiumEvents.events.length === 0) {
      console.log('\n❌ No games at Dodger Stadium tonight or tomorrow');
      
      // Try broader LA area search
      console.log('\n🔍 Searching broader LA area for Dodgers games...');
      const laEvents = await apiClient.listEvents({
        lat: 34.0522,
        lon: -118.2437,
        within: 50,
        occurs_at_gte: now.toISOString(),
        occurs_at_lt: tomorrow.toISOString(),
        per_page: 50
      });

      const dodgersGames = laEvents.events?.filter(event => 
        event.name.toLowerCase().includes('dodgers') ||
        event.name.toLowerCase().includes('los angeles dodgers')
      ) || [];

      if (dodgersGames.length === 0) {
        console.log('❌ No Dodgers games in LA area tonight or tomorrow');
        console.log('\n💡 POSSIBLE REASONS:');
        console.log('   - Dodgers are on a road trip');
        console.log('   - No home games scheduled');
        console.log('   - It\'s the off-season');
        
        // Show what IS happening at Dodger Stadium
        if (dodgerStadiumEvents.events && dodgerStadiumEvents.events.length > 0) {
          console.log('\n🏟️ Events at Dodger Stadium:');
          dodgerStadiumEvents.events.forEach(event => {
            console.log(`   - ${event.name} (${new Date(event.occurs_at).toLocaleDateString()})`);
          });
        }
        return;
      }
      
      console.log(`✅ Found ${dodgersGames.length} Dodgers games!`);
      dodgersGames.forEach(game => {
        console.log(`⚾ ${game.name} - ${new Date(game.occurs_at).toLocaleDateString()}`);
      });
    } else {
      // Check which events are Dodgers games
      const dodgersHomeGames = dodgerStadiumEvents.events.filter(event =>
        event.name.toLowerCase().includes('dodgers') && 
        !event.name.toLowerCase().includes('concert')
      );

      if (dodgersHomeGames.length > 0) {
        console.log(`\n✅ Found ${dodgersHomeGames.length} Dodgers HOME games!`);
        
        for (const game of dodgersHomeGames) {
          console.log(`\n⚾ ${game.name}`);
          console.log(`📅 ${new Date(game.occurs_at).toLocaleDateString()} at ${new Date(game.occurs_at).toLocaleTimeString()}`);
          console.log(`🏟️ ${game.venue?.name || 'Dodger Stadium'}`);
          console.log(`🆔 Event ID: ${game.id}`);
          
          // Get tickets for this game
          try {
            const tickets = await apiClient.getListings(game.id);
            const goodTickets = tickets.ticket_groups
              ?.filter(tg => 
                (tg.retail_price * 4) <= 1000 && 
                tg.available_quantity >= 4 &&
                !tg.section?.toLowerCase().includes('parking')
              )
              ?.sort((a, b) => b.retail_price - a.retail_price) // Best seats first
              ?.slice(0, 5) || [];
            
            if (goodTickets.length > 0) {
              console.log(`\n🏆 TOP 5 BEST SEATS (within $1,000 budget):`);
              goodTickets.forEach((ticket, i) => {
                const total = ticket.retail_price * 4;
                console.log(`${i+1}. Section ${ticket.section}, Row ${ticket.row}`);
                console.log(`   💰 $${ticket.retail_price}/ticket ($${total} total)`);
                console.log(`   📦 ${ticket.available_quantity} available`);
                console.log(`   💵 Budget remaining: $${1000 - total}`);
              });
              
              console.log(`\n🎯 RECOMMENDATION:`);
              const best = goodTickets[0];
              console.log(`🏆 Best choice: Section ${best.section}, Row ${best.row}`);
              console.log(`💰 $${best.retail_price * 4} for 4 tickets ($${best.retail_price} each)`);
            } else {
              console.log('\n❌ No tickets available within $1,000 budget');
            }
          } catch (error) {
            console.log(`⚠️ Could not get tickets: ${error.message}`);
          }
        }
      } else {
        console.log('\n📝 Events at Dodger Stadium (not Dodgers games):');
        dodgerStadiumEvents.events.forEach(event => {
          console.log(`   - ${event.name}`);
        });
      }
    }

  } catch (error) {
    console.log(`❌ Search failed: ${error.message}`);
  }
}

findRealDodgers();