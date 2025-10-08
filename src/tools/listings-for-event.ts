import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { validateListingsForEventParams } from '../utils/validation.js';
import { filterAndRankListings } from '../utils/listings-filter.js';

export function createListingsForEventTool(_apiClient: TevoApiClient, _cache: MemoryCache): Tool {
  return {
    name: 'tevo_listings_for_event',
    description: 'Get filtered and ranked ticket listings for an event, returning up to 5 best options',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { 
          type: 'integer',
          minimum: 1,
          description: 'The ID of the event to get listings for'
        },
        requested_quantity: { 
          type: 'integer',
          minimum: 1,
          description: 'Number of tickets requested'
        },
        price_min: { 
          type: 'number',
          minimum: 0,
          description: 'Minimum price per ticket filter'
        },
        price_max: { 
          type: 'number',
          minimum: 0,
          description: 'Maximum price per ticket filter'
        },
        section: { 
          type: 'string',
          description: 'Filter by specific section'
        },
        row: { 
          type: 'string',
          description: 'Filter by specific row'
        },
        type: { 
          type: 'string',
          enum: ['event', 'parking'],
          description: 'Filter by listing type (event tickets or parking)'
        },
        format: { 
          type: 'string',
          enum: ['Physical', 'Eticket', 'Flash_seats', 'TM_mobile', 'Paperless'],
          description: 'Filter by ticket format/delivery method'
        },
        instant_delivery: { 
          type: 'boolean',
          description: 'Filter by instant delivery availability'
        },
        wheelchair: { 
          type: 'boolean',
          description: 'Filter by wheelchair accessibility'
        },
        order_by: { 
          type: 'string',
          enum: [
            'retail_price ASC', 'retail_price DESC',
            'section ASC', 'section DESC',
            'row ASC', 'row DESC',
            'format ASC', 'format DESC'
          ],
          description: 'Sort order for listings (default: retail_price ASC)'
        },
        return_top: { 
          type: 'integer',
          minimum: 1,
          maximum: 50,
          default: 5,
          description: 'Number of top listings to return (max: 50, default: 5)'
        },
        section_pattern: { 
          type: 'string',
          description: 'Filter by section pattern (e.g., "1" for all 100-level sections, "10" for sections starting with 10)'
        }
      },
      required: ['event_id', 'requested_quantity']
    }
  };
}

export async function handleListingsForEvent(
  apiClient: TevoApiClient,
  _cache: MemoryCache,
  params: unknown
) {
  const validatedParams = validateListingsForEventParams(params);
  
  const filters: Record<string, any> = {};
  
  if (validatedParams.section) filters.section = validatedParams.section;
  if (validatedParams.row) filters.row = validatedParams.row;
  if (validatedParams.type) filters.type = validatedParams.type;
  if (validatedParams.format) filters.format = validatedParams.format;
  if (validatedParams.instant_delivery !== undefined) filters.instant_delivery = validatedParams.instant_delivery;
  if (validatedParams.wheelchair !== undefined) filters.wheelchair = validatedParams.wheelchair;
  if (validatedParams.order_by) filters.order_by = validatedParams.order_by;
  
  // Add section_pattern to validatedParams for use in filtering
  if (validatedParams.section_pattern) {
    validatedParams.section_pattern_filter = validatedParams.section_pattern;
  }

  const listingsResponse = await apiClient.getListings(validatedParams.event_id, filters);
  
  const filteredResult = filterAndRankListings(listingsResponse.ticket_groups, validatedParams);
  
  console.error(JSON.stringify({
    type: 'listings_for_event_result',
    event_id: validatedParams.event_id,
    requested_quantity: validatedParams.requested_quantity,
    total_listings: listingsResponse.ticket_groups.length,
    eligible_listings: filteredResult.criteria_applied.eligible_after_filtering,
    options_returned: filteredResult.options.length,
    filters_applied: filteredResult.criteria_applied.filters_applied || []
  }));

  return filteredResult;
}
