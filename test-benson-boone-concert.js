#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import { handleSmartTicketPresenter } from './dist/tools/smart-ticket-presenter.js';

async function testBensonBooneConcert() {
  try {
    console.log('🎵 Testing Smart Ticket Presenter for Benson Boone Concert...\n');
    
    const config = loadConfig();
    const apiClient = new TevoApiClient(config);
    const cache = new MemoryCache();

    // Your exact parameters
    const params = {
      event_id: 2987307,
      requested_quantity: 6,
      budget_per_ticket: 1000,
      seating_preference: "mixed"
    };

    console.log('Parameters:');
    console.log(`- Event ID: ${params.event_id}`);
    console.log(`- Requested Quantity: ${params.requested_quantity}`);
    console.log(`- Budget Per Ticket: $${params.budget_per_ticket}`);
    console.log(`- Seating Preference: ${params.seating_preference}\n`);

    const result = await handleSmartTicketPresenter(apiClient, cache, params);
    
    console.log('=== SMART TICKET PRESENTER RESULTS ===\n');
    
    if (result.success) {
      console.log(`🎤 Event: ${result.event_name}`);
      console.log(`📅 Date: ${result.event_date}`);
      console.log(`🏟️  Venue: ${result.venue_name}, ${result.venue_city}`);
      console.log(`💰 Budget: $${result.budget_per_ticket} per ticket`);
      console.log(`🎫 Quantity: ${result.requested_quantity} tickets`);
      console.log(`🎯 Preference: ${result.seating_preference}\n`);

      console.log('📊 SUMMARY STATISTICS:');
      console.log(`- Total options found: ${result.summary.total_options_found}`);
      console.log(`- Price range: $${result.summary.price_range.min} - $${result.summary.price_range.max}`);
      console.log(`- Sections available: ${result.summary.sections_available}`);
      console.log(`- Budget utilization: ${result.summary.budget_utilization_percent}%\n`);

      console.log('💡 BUDGET ANALYSIS:');
      console.log(`- Average price: $${result.budget_analysis.average_price.toFixed(2)}`);
      console.log(`- Cheapest option: $${result.budget_analysis.cheapest_available}`);
      console.log(`- Most expensive: $${result.budget_analysis.most_expensive_available}`);
      console.log(`- Budget remaining: $${(result.budget_per_ticket - result.budget_analysis.average_price).toFixed(2)} per ticket\n`);

      if (result.recommendations && result.recommendations.length > 0) {
        console.log('🎫 TICKET RECOMMENDATIONS:\n');
        
        result.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.seating_tier.toUpperCase()} OPTION:`);
          console.log(`   Section: ${rec.section}`);
          console.log(`   Row: ${rec.row || 'N/A'}`);
          console.log(`   Price: $${rec.price_per_ticket} per ticket`);
          console.log(`   Total: $${rec.total_cost} for ${params.requested_quantity} tickets`);
          console.log(`   Available: ${rec.available_quantity} tickets`);
          console.log(`   Value Score: ${rec.value_score}/100`);
          console.log(`   Format: ${rec.format}`);
          console.log(`   Instant Delivery: ${rec.instant_delivery ? 'Yes' : 'No'}`);
          console.log(`   In Hand: ${rec.in_hand ? 'Yes' : 'No'}`);
          if (rec.quality_indicators.length > 0) {
            console.log(`   Quality: ${rec.quality_indicators.join(', ')}`);
          }
          if (rec.potential_drawbacks.length > 0) {
            console.log(`   Drawbacks: ${rec.potential_drawbacks.join(', ')}`);
          }
          if (rec.notes) {
            console.log(`   Notes: ${rec.notes}`);
          }
          console.log('');
        });
      }

      if (result.seating_guidance) {
        console.log('🎪 SEATING GUIDANCE:');
        console.log(`- Venue Type: ${result.seating_guidance.venue_type}`);
        
        if (result.seating_guidance.section_explanations && result.seating_guidance.section_explanations.length > 0) {
          console.log('\n📍 SECTION EXPLANATIONS:');
          result.seating_guidance.section_explanations.forEach(section => {
            console.log(`\n${section.section_pattern}:`);
            console.log(`  Description: ${section.description}`);
            if (section.pros.length > 0) {
              console.log(`  Pros: ${section.pros.join(', ')}`);
            }
            if (section.cons.length > 0) {
              console.log(`  Cons: ${section.cons.join(', ')}`);
            }
          });
        }
        
        if (result.seating_guidance.general_tips && result.seating_guidance.general_tips.length > 0) {
          console.log('\n💡 GENERAL TIPS:');
          result.seating_guidance.general_tips.forEach((tip, index) => {
            console.log(`${index + 1}. ${tip}`);
          });
        }
      }

    } else {
      console.log('❌ No tickets found within budget');
      console.log(`Message: ${result.message}`);
      if (result.suggestions) {
        console.log('\n💡 Suggestions:');
        result.suggestions.forEach(suggestion => {
          console.log(`- ${suggestion}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.statusText);
      if (error.response.data) {
        console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

testBensonBooneConcert();