export interface SearchSuggestionsParams {
  q: string;
  limit?: number;
  fuzzy?: boolean;
}

export interface ListEventsParams {
  performer_id?: number;
  venue_id?: number;
  lat?: number;
  lon?: number;
  within?: number;
  occurs_at_gte?: string;
  occurs_at_lt?: string;
  page?: number;
  per_page?: number;
}

export interface GetEventParams {
  event_id: number;
}

export interface ListingsForEventParams {
  event_id: number;
  requested_quantity: number;
  price_min?: number;
  price_max?: number;
  section?: string;
  row?: string;
  type?: 'event' | 'parking';
  format?: 'Physical' | 'Eticket' | 'Flash_seats' | 'TM_mobile' | 'Paperless';
  instant_delivery?: boolean;
  wheelchair?: boolean;
  order_by?: 'retail_price ASC' | 'retail_price DESC' | 'section ASC' | 'section DESC' | 'row ASC' | 'row DESC' | 'format ASC' | 'format DESC';
  return_top?: number;
}

export interface SmartNflFinderParams {
  away_team: string;
  home_team: string;
  weeks_ahead?: number;
  budget_per_ticket?: number;
  requested_quantity?: number;
  return_top?: number;
}

export interface UniversalEventFinderParams {
  query: string;
  date?: string;
  location?: string;
  weeks_ahead?: number;
  budget_per_ticket?: number;
  requested_quantity?: number;
}

export interface TevoError extends Error {
  code: string;
  statusCode?: number | undefined;
  tevoErrorCode?: string | undefined;
}