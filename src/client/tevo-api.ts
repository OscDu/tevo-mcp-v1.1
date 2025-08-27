import { TevoHttpClient } from './http.js';
import { TevoConfig, SearchSuggestionsResponse, EventsResponse, Event, EventStats, ListingsResponse } from '../types/tevo.js';
import { SearchSuggestionsParams, ListEventsParams, GetEventParams } from '../types/mcp.js';

export class TevoApiClient {
  private httpClient: TevoHttpClient;

  constructor(config: TevoConfig) {
    this.httpClient = new TevoHttpClient(config);
  }

  async searchSuggestions(params: SearchSuggestionsParams): Promise<SearchSuggestionsResponse> {
    const queryParams = {
      entities: 'events,performers,venues',
      q: params.q,
      limit: params.limit || 6,
      fuzzy: params.fuzzy !== false
    };

    return this.httpClient.get<SearchSuggestionsResponse>('/searches/suggestions', queryParams);
  }

  async listEvents(params: ListEventsParams): Promise<EventsResponse> {
    const queryParams: Record<string, any> = {
      page: params.page || 1,
      per_page: params.per_page || 25
    };

    if (params.performer_id) queryParams.performer_id = params.performer_id;
    if (params.venue_id) queryParams.venue_id = params.venue_id;
    if (params.lat) queryParams.lat = params.lat;
    if (params.lon) queryParams.lon = params.lon;
    if (params.within) queryParams.within = params.within;
    if (params.occurs_at_gte) queryParams['occurs_at.gte'] = params.occurs_at_gte;
    if (params.occurs_at_lt) queryParams['occurs_at.lt'] = params.occurs_at_lt;

    return this.httpClient.get<EventsResponse>('/events', queryParams);
  }

  async getEvent(params: GetEventParams): Promise<Event> {
    return this.httpClient.get<Event>(`/events/${params.event_id}`);
  }

  async getEventStats(eventId: number): Promise<EventStats> {
    return this.httpClient.get<EventStats>(`/events/${eventId}/stats`);
  }

  async getListings(eventId: number, filters?: Record<string, any>): Promise<ListingsResponse> {
    // Ticket Evolution listings API only accepts event_id parameter
    // Additional parameters like per_page, page cause 400 Bad Request
    const queryParams: Record<string, any> = {
      event_id: eventId
    };

    // Note: The listings endpoint does not support pagination parameters
    // when filtering by event_id. All ticket groups are returned in one response.
    
    const response = await this.httpClient.get<ListingsResponse>('/listings', queryParams);
    
    // Apply client-side filtering if filters were provided
    let ticketGroups = response.ticket_groups || [];
    
    if (filters && ticketGroups.length > 0) {
      // Apply client-side per_page limit if specified
      if (filters.per_page && typeof filters.per_page === 'number') {
        ticketGroups = ticketGroups.slice(0, filters.per_page);
      }
      
      // Apply client-side ordering if specified
      if (filters.order_by) {
        const [field, direction] = filters.order_by.split(' ');
        ticketGroups.sort((a, b) => {
          const aVal = (a as any)[field] || 0;
          const bVal = (b as any)[field] || 0;
          return direction === 'DESC' ? bVal - aVal : aVal - bVal;
        });
      }
    }
    
    return {
      ticket_groups: ticketGroups
    };
  }
}