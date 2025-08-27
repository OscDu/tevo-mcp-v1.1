import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { validateSmartTicketPresenterParams } from '../utils/validation.js';
import { optimizeTicketOptions } from '../utils/ticket-optimization.js';

export function createSmartTicketPresenterTool(_apiClient: TevoApiClient, _cache: MemoryCache): Tool {
  return {
    name: 'tevo_smart_ticket_presenter',
    description: 'Intelligently presents ticket options across price ranges with budget optimization and seating recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: {
          type: 'integer',
          minimum: 1,
          description: 'The ID of the event to get ticket options for'
        },
        requested_quantity: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          default: 2,
          description: 'Number of tickets needed (default: 2)'
        },
        budget_per_ticket: {
          type: 'number',
          minimum: 1,
          description: 'Maximum budget per ticket in USD'
        },
        seating_preference: {
          type: 'string',
          enum: ['budget', 'premium', 'mixed', 'best_value'],
          default: 'mixed',
          description: 'Preferred seating strategy: budget (cheapest), premium (best seats), mixed (variety), best_value (quality/price balance)'
        },
        venue_type: {
          type: 'string',
          enum: ['arena', 'stadium', 'theater', 'concert_hall', 'amphitheater', 'unknown'],
          description: 'Type of venue to provide better seating guidance (optional)'
        },
        include_explanations: {
          type: 'boolean',
          default: true,
          description: 'Include seating explanations and venue guidance (default: true)'
        }
      },
      required: ['event_id', 'requested_quantity', 'budget_per_ticket']
    }
  };
}

export async function handleSmartTicketPresenter(
  apiClient: TevoApiClient,
  _cache: MemoryCache,
  params: unknown
) {
  const validatedParams = validateSmartTicketPresenterParams(params);
  
  console.error(JSON.stringify({
    type: 'smart_ticket_presenter_start',
    event_id: validatedParams.event_id,
    budget: validatedParams.budget_per_ticket,
    quantity: validatedParams.requested_quantity,
    preference: validatedParams.seating_preference
  }));

  try {
    // Get event details for context
    const eventDetails = await apiClient.getEvent({ event_id: validatedParams.event_id });
    
    // Get all available listings
    const listingsResponse = await apiClient.getListings(validatedParams.event_id, {
      order_by: 'retail_price ASC'  // Start with price sorting for optimization
    });
    
    // Filter for tickets that meet quantity and budget requirements
    const eligibleTickets = listingsResponse.ticket_groups?.filter(tg => 
      tg.retail_price <= validatedParams.budget_per_ticket &&
      tg.available_quantity >= validatedParams.requested_quantity &&
      tg.splits.includes(validatedParams.requested_quantity) &&
      !tg.section?.toLowerCase().includes('parking') &&
      !tg.section?.toLowerCase().includes('lot') &&
      !tg.section?.toLowerCase().includes('garage')
    ) || [];
    
    if (eligibleTickets.length === 0) {
      return {
        success: false,
        event_id: validatedParams.event_id,
        event_name: eventDetails.name,
        budget_per_ticket: validatedParams.budget_per_ticket,
        requested_quantity: validatedParams.requested_quantity,
        message: `No tickets available within your $${validatedParams.budget_per_ticket} per ticket budget for ${validatedParams.requested_quantity} seats.`,
        suggestions: [
          'Try increasing your budget',
          'Consider fewer tickets if available',
          'Check back closer to event date for potential price drops'
        ]
      };
    }
    
    // Use ticket optimization to intelligently select and present options
    const optimizedOptions = optimizeTicketOptions(
      eligibleTickets,
      validatedParams,
      eventDetails
    );
    
    console.error(JSON.stringify({
      type: 'smart_ticket_presenter_result',
      event_id: validatedParams.event_id,
      total_eligible_tickets: eligibleTickets.length,
      options_presented: optimizedOptions.recommendations.length,
      budget_utilization: `${((optimizedOptions.budget_analysis.average_price / validatedParams.budget_per_ticket) * 100).toFixed(1)}%`
    }));

    return {
      success: true,
      event_id: validatedParams.event_id,
      event_name: eventDetails.name,
      event_date: eventDetails.occurs_at,
      venue_name: eventDetails.venue?.name || 'Unknown venue',
      venue_city: eventDetails.venue?.city || '',
      budget_per_ticket: validatedParams.budget_per_ticket,
      requested_quantity: validatedParams.requested_quantity,
      seating_preference: validatedParams.seating_preference,
      
      // Optimized ticket recommendations
      recommendations: optimizedOptions.recommendations,
      
      // Budget analysis
      budget_analysis: optimizedOptions.budget_analysis,
      
      // Seating guidance (if requested)
      seating_guidance: validatedParams.include_explanations ? optimizedOptions.seating_guidance : undefined,
      
      // Summary statistics
      summary: {
        total_options_found: eligibleTickets.length,
        price_range: {
          min: Math.min(...eligibleTickets.map(t => t.retail_price)),
          max: Math.max(...eligibleTickets.map(t => t.retail_price))
        },
        sections_available: [...new Set(eligibleTickets.map(t => t.section).filter(Boolean))].length,
        budget_utilization_percent: Math.round((optimizedOptions.budget_analysis.average_price / validatedParams.budget_per_ticket) * 100)
      }
    };
    
  } catch (error) {
    console.error(JSON.stringify({
      type: 'smart_ticket_presenter_error',
      event_id: validatedParams.event_id,
      error: error instanceof Error ? error.message : String(error)
    }));
    
    throw error;
  }
}