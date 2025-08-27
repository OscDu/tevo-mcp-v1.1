import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { validateGetEventParams } from '../utils/validation.js';

export function createGetEventTool(_apiClient: TevoApiClient, _cache: MemoryCache): Tool {
  return {
    name: 'tevo_get_event',
    description: 'Get detailed information about a specific event',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { 
          type: 'integer',
          minimum: 1,
          description: 'The ID of the event to retrieve'
        }
      },
      required: ['event_id']
    }
  };
}

export async function handleGetEvent(
  apiClient: TevoApiClient,
  cache: MemoryCache,
  params: unknown
) {
  const validatedParams = validateGetEventParams(params);
  
  const cacheKey = cache.generateKey('get_event', validatedParams);
  const cachedResult = cache.getRequestScoped(cacheKey);
  
  if (cachedResult) {
    console.error(JSON.stringify({
      type: 'cache_hit',
      tool: 'get_event',
      cache_key: cacheKey
    }));
    return cachedResult;
  }

  const result = await apiClient.getEvent(validatedParams);
  
  cache.setRequestScoped(cacheKey, result);
  
  console.error(JSON.stringify({
    type: 'get_event_result',
    event_id: validatedParams.event_id,
    event_name: result.name,
    venue: result.venue?.name,
    occurs_at: result.occurs_at
  }));

  return result;
}