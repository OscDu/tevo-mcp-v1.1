import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';

import { createSearchSuggestionsTool, handleSearchSuggestions } from './search-suggestions.js';
import { createListEventsTool, handleListEvents } from './list-events.js';
import { createGetEventTool, handleGetEvent } from './get-event.js';
import { createListingsForEventTool, handleListingsForEvent } from './listings-for-event.js';
import { createSmartNflFinderTool, handleSmartNflFinder } from './smart-nfl-finder.js';
import { createUniversalEventFinderTool, handleUniversalEventFinder } from './universal-event-finder.js';
import { createSmartTicketPresenterTool, handleSmartTicketPresenter } from './smart-ticket-presenter.js';
import { createEntertainmentEventFinderTool, handleEntertainmentEventFinder } from './entertainment-event-finder.js';

export function createTools(apiClient: TevoApiClient, cache: MemoryCache): Tool[] {
  return [
    createUniversalEventFinderTool(apiClient, cache),
    createEntertainmentEventFinderTool(apiClient, cache),
    createSmartTicketPresenterTool(apiClient, cache),
    createSearchSuggestionsTool(apiClient, cache),
    createListEventsTool(apiClient, cache),
    createGetEventTool(apiClient, cache),
    createListingsForEventTool(apiClient, cache),
    createSmartNflFinderTool(apiClient, cache)
  ];
}

export async function handleToolCall(
  toolName: string,
  apiClient: TevoApiClient,
  cache: MemoryCache,
  params: unknown
): Promise<any> {
  switch (toolName) {
    case 'tevo_universal_event_finder':
      return handleUniversalEventFinder(apiClient, cache, params);
    
    case 'tevo_entertainment_event_finder':
      return handleEntertainmentEventFinder(apiClient, cache, params);
    
    case 'tevo_smart_ticket_presenter':
      return handleSmartTicketPresenter(apiClient, cache, params);
      
    case 'tevo_search_suggestions':
      return handleSearchSuggestions(apiClient, cache, params);
    
    case 'tevo_list_events':
      return handleListEvents(apiClient, cache, params);
    
    case 'tevo_get_event':
      return handleGetEvent(apiClient, cache, params);
    
    case 'tevo_listings_for_event':
      return handleListingsForEvent(apiClient, cache, params);
    
    case 'tevo_smart_nfl_finder':
      return handleSmartNflFinder(apiClient, cache, params);
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}