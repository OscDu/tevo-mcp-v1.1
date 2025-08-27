export interface TevoConfig {
  env: 'sandbox' | 'production';
  apiToken: string;
  apiSecret: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface SearchSuggestion {
  id: number;
  name: string;
  slug: string;
  type: 'event' | 'performer' | 'venue';
}

export interface SearchSuggestionsResponse {
  events: SearchSuggestion[];
  performers: SearchSuggestion[];
  venues: SearchSuggestion[];
}

export interface Event {
  id: number;
  name: string;
  slug: string;
  occurs_at: string;
  venue: {
    id: number;
    name: string;
    slug: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  performers: Array<{
    id: number;
    name: string;
    slug: string;
    primary: boolean;
  }>;
  category: {
    id: number;
    name: string;
  };
  configuration: {
    id: number;
    name: string;
  };
}

export interface EventsResponse {
  current_page: number;
  per_page: number;
  total_entries: number;
  events: Event[];
}

export interface EventStats {
  event_id: number;
  listings_count: number;
  min_ticket_price: number;
  max_ticket_price: number;
  average_ticket_price: number;
}

export interface Listing {
  id: number;
  event_id: number;
  section: string;
  row: string;
  available_quantity: number;
  splits: number[];
  retail_price: number;
  format: string;
  instant_delivery: boolean;
  in_hand: boolean;
  in_hand_on?: string;
  wheelchair: boolean;
  public_notes?: string;
  type: 'event' | 'parking';
}

export interface ListingsResponse {
  ticket_groups: Listing[];
}

export interface FilteredListingOption {
  listing_id: number;
  section: string;
  row: string;
  available_quantity: number;
  splits: number[];
  price_per_ticket: number;
  total_price_for_requested_quantity: number;
  format: string;
  instant_delivery: boolean;
  in_hand: boolean;
  in_hand_on?: string | undefined;
  wheelchair: boolean;
  public_notes?: string | undefined;
}

export interface FilteredListingsResponse {
  event_id: number;
  criteria_applied: Record<string, unknown>;
  options: FilteredListingOption[];
}