import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { validateSearchSuggestionsParams } from '../utils/validation.js';

export function createSearchSuggestionsTool(_apiClient: TevoApiClient, _cache: MemoryCache): Tool {
  return {
    name: 'tevo_search_suggestions',
    description: 'Search for events, performers, and venues based on user query',
    inputSchema: {
      type: 'object',
      properties: {
        q: { 
          type: 'string', 
          minLength: 1,
          description: 'Search query for events, performers, or venues'
        },
        limit: { 
          type: 'integer', 
          minimum: 1, 
          maximum: 20, 
          default: 6,
          description: 'Maximum number of suggestions to return (default: 6)'
        },
        fuzzy: { 
          type: 'boolean', 
          default: true,
          description: 'Enable fuzzy matching (default: true)'
        }
      },
      required: ['q']
    }
  };
}

export async function handleSearchSuggestions(
  apiClient: TevoApiClient,
  cache: MemoryCache,
  params: unknown
) {
  const validatedParams = validateSearchSuggestionsParams(params);
  
  const cacheKey = cache.generateKey('search_suggestions', validatedParams);
  const cachedResult = cache.getRequestScoped(cacheKey);
  
  if (cachedResult) {
    console.error(JSON.stringify({
      type: 'cache_hit',
      tool: 'search_suggestions',
      cache_key: cacheKey
    }));
    return cachedResult;
  }

  const result = await apiClient.searchSuggestions(validatedParams);
  
  cache.setRequestScoped(cacheKey, result);
  
  console.error(JSON.stringify({
    type: 'search_suggestions_result',
    query: validatedParams.q,
    events_count: result.events?.length || 0,
    performers_count: result.performers?.length || 0,
    venues_count: result.venues?.length || 0
  }));

  return result;
}