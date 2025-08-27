import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { validateListEventsParams } from '../utils/validation.js';

export function createListEventsTool(_apiClient: TevoApiClient, _cache: MemoryCache): Tool {
  return {
    name: 'tevo_list_events',
    description: 'List events with optional filtering by performer, venue, location, and date',
    inputSchema: {
      type: 'object',
      properties: {
        performer_id: { 
          type: 'integer',
          description: 'Filter by performer ID (from search suggestions)'
        },
        venue_id: { 
          type: 'integer',
          description: 'Filter by venue ID (from search suggestions)'
        },
        lat: { 
          type: 'number',
          description: 'Latitude for geographic filtering'
        },
        lon: { 
          type: 'number',
          description: 'Longitude for geographic filtering'
        },
        within: { 
          type: 'integer',
          description: 'Distance radius in miles for geographic filtering'
        },
        occurs_at_gte: { 
          type: 'string', 
          format: 'date-time',
          description: 'Events occurring at or after this date (ISO 8601 format)'
        },
        occurs_at_lt: { 
          type: 'string', 
          format: 'date-time',
          description: 'Events occurring before this date (ISO 8601 format)'
        },
        page: { 
          type: 'integer', 
          minimum: 1, 
          default: 1,
          description: 'Page number for pagination (default: 1)'
        },
        per_page: { 
          type: 'integer', 
          minimum: 1, 
          maximum: 100, 
          default: 25,
          description: 'Number of events per page (default: 25, max: 100)'
        }
      }
    }
  };
}

export async function handleListEvents(
  apiClient: TevoApiClient,
  cache: MemoryCache,
  params: unknown
) {
  const validatedParams = validateListEventsParams(params);
  
  const cacheKey = cache.generateKey('list_events', validatedParams);
  const cachedResult = cache.get(cacheKey);
  
  if (cachedResult) {
    console.error(JSON.stringify({
      type: 'cache_hit',
      tool: 'list_events',
      cache_key: cacheKey
    }));
    return cachedResult;
  }

  const result = await apiClient.listEvents(validatedParams);
  
  cache.set(cacheKey, result, 60000); // 1 minute TTL
  
  console.error(JSON.stringify({
    type: 'list_events_result',
    filters: validatedParams,
    total_entries: result.total_entries,
    current_page: result.current_page,
    events_returned: result.events?.length || 0
  }));

  return result;
}