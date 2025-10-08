import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';

import { createSearchSuggestionsTool, handleSearchSuggestions } from './search-suggestions.js';
import { createListEventsTool, handleListEvents } from './list-events.js';
import { createGetEventTool, handleGetEvent } from './get-event.js';
import { createListingsForEventTool, handleListingsForEvent } from './listings-for-event.js';
import { createComprehensiveEventSearchTool, handleComprehensiveEventSearch } from './comprehensive-event-search.js';
import { createUniversalEventFinderTool, handleUniversalEventFinder } from './universal-event-finder.js';

export function createTools(apiClient: TevoApiClient, cache: MemoryCache): Tool[] {
  return [
    // PRIMARY: Universal finder for any query (teams, performers, events)
    createUniversalEventFinderTool(apiClient, cache),
    // Fallback/alternate comprehensive search path
    createComprehensiveEventSearchTool(apiClient, cache),
    
    // UTILITY TOOLS - For specific operations  
    createSearchSuggestionsTool(apiClient, cache),
    createListEventsTool(apiClient, cache),
    createGetEventTool(apiClient, cache),
    createListingsForEventTool(apiClient, cache)
  ];
}

export async function handleToolCall(
  toolName: string,
  apiClient: TevoApiClient,
  cache: MemoryCache,
  params: unknown
): Promise<any> {
  switch (toolName) {
    case 'tevo_comprehensive_event_search':
      return handleComprehensiveEventSearch(apiClient, cache, params);
    case 'tevo_universal_event_finder':
      return handleUniversalEventFinder(apiClient, cache, params);
      
    case 'tevo_search_suggestions':
      return handleSearchSuggestions(apiClient, cache, params);
    
    case 'tevo_list_events':
      return handleListEvents(apiClient, cache, params);
    
    case 'tevo_get_event':
      return handleGetEvent(apiClient, cache, params);
    
    case 'tevo_listings_for_event':
      return handleListingsForEvent(apiClient, cache, params);
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
