import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';

export function createComprehensiveEventSearchTool(_apiClient: TevoApiClient, _cache: MemoryCache): Tool {
  return {
    name: 'tevo_comprehensive_event_search',
    description: 'Alternate comprehensive search. Defaults: requested_quantity=2, include_tickets=true, no budget filter unless provided. For team queries, do not ask who is hosting—infer context and search both home/away if unclear. Location is optional.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What you are looking for (e.g. "US Open tickets", "Benson Boone concert", "Yankees vs Red Sox", "Hamilton Broadway")'
        },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format, or date range like "2024-09-01 to 2024-09-07" (optional)'
        },
        location: {
          type: 'string', 
          description: 'City, venue, or general area (e.g. "New York", "Madison Square Garden", "Los Angeles") (optional)'
        },
        weeks_ahead: {
          type: 'integer',
          minimum: 1,
          maximum: 52,
          default: 8,
          description: 'Search window in weeks when no explicit date given (default: 8)'
        },
        budget_per_ticket: {
          type: 'number',
          minimum: 1,
          description: 'Maximum you want to spend per ticket (optional)'
        },
        requested_quantity: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          default: 2,
          description: 'How many tickets you need (default: 2)'
        },
        include_tickets: {
          type: 'boolean',
          default: true,
          description: 'Whether to include available ticket options in results (default: true)'
        }
      },
      required: ['query']
    }
  };
}

interface SearchParams {
  query: string;
  date?: string;
  location?: string;
  budget_per_ticket?: number | undefined;
  requested_quantity: number;
  include_tickets: boolean;
  weeks_ahead: number;
}

export async function handleComprehensiveEventSearch(
  apiClient: TevoApiClient,
  cache: MemoryCache,
  params: unknown
) {
  const validatedParams = validateParams(params);
  
  console.error(JSON.stringify({
    type: 'comprehensive_search_start',
    query: validatedParams.query,
    date: validatedParams.date,
    location: validatedParams.location
  }));

  try {
    // SPECIAL CASE: Parse natural-language multi-game ticket requests (e.g.,
    // "give me 2 ticket options ... 10/26 vs Green Bay Packers ... with 20% mark up")
    const parsedMulti = parseMultiGameTicketRequest(validatedParams.query);
    if (parsedMulti.items.length > 0) {
      const bulkResult = await handleMultiGameTicketRequest(apiClient, cache, parsedMulti, validatedParams.requested_quantity);
      return bulkResult;
    }

    // STEP 1: Get ALL candidate events using layered strategies
    const allCandidates = await gatherAllCandidates(apiClient, cache, validatedParams);
    
    // STEP 2: Score and rank events by relevance to query
    const rankedEvents = rankEventsByRelevance(allCandidates, validatedParams);
    
    // STEP 2.5: Apply strict filters to reduce false positives for sports queries
    const filteredRanked = strictEventFilter(rankedEvents, validatedParams);
    
    // STEP 3: Get ticket information for top matches if requested
    const finalResults = [];
    for (const event of filteredRanked.slice(0, 5)) {
      const eventResult: any = {
        event_id: event.id,
        name: event.name,
        date: new Date(event.occurs_at).toLocaleDateString(),
        time: new Date(event.occurs_at).toLocaleTimeString(),
        venue: event.venue?.name || 'Unknown venue',
        city: event.venue?.city || '',
        state: event.venue?.state || '',
        relevance_score: event.relevance_score
      };

      if (validatedParams.include_tickets && validatedParams.budget_per_ticket) {
        const ticketInfo = await getTicketInfo(apiClient, event, validatedParams);
        if (ticketInfo) {
          eventResult.tickets = ticketInfo;
        }
      }

      finalResults.push(eventResult);
    }

    return {
      success: finalResults.length > 0,
      query: validatedParams.query,
      events_found: finalResults,
      search_summary: {
        total_events_searched: allCandidates.length,
        events_returned: finalResults.length,
        strategies_used: ['date_search', 'keyword_search', 'venue_search', 'comprehensive_ranking']
      }
    };

  } catch (error) {
    console.error(JSON.stringify({
      type: 'comprehensive_search_error',
      error: error instanceof Error ? error.message : String(error),
      query: validatedParams.query
    }));
    
    throw error;
  }
}

async function gatherAllCandidates(apiClient: TevoApiClient, cache: MemoryCache, params: SearchParams): Promise<any[]> {
  const allEvents: any[] = [];
  const addedEventIds = new Set();

  // STRATEGY 1: Suggestions-driven search (performers/venues/events)
  let suggestionEvents: any[] = [];
  try {
    suggestionEvents = await searchBySuggestions(apiClient, cache, params);
  } catch (e) {
    console.error(JSON.stringify({ type: 'suggestions_unavailable', message: e instanceof Error ? e.message : String(e) }));
    suggestionEvents = [];
  }
  suggestionEvents.forEach(event => {
    if (!addedEventIds.has(event.id)) {
      allEvents.push(event);
      addedEventIds.add(event.id);
    }
  });

  // STRATEGY 2: Direct date search (reliable when date given)
  if (params.date) {
    const dateEvents = await searchByDate(apiClient, params.date);
    dateEvents.forEach(event => {
      if (!addedEventIds.has(event.id)) {
        allEvents.push(event);
        addedEventIds.add(event.id);
      }
    });
  }

  // STRATEGY 3: Keyword + location search
  if (params.location) {
    const locationEvents = await searchByLocation(apiClient, params.location, params.date);
    locationEvents.forEach(event => {
      if (!addedEventIds.has(event.id)) {
        allEvents.push(event);
        addedEventIds.add(event.id);
      }
    });
  }

  // STRATEGY 4: Broader time window if we don't have enough results
  if (allEvents.length < 25) {
    const broadEvents = await broadSearch(apiClient, params);
    broadEvents.forEach(event => {
      if (!addedEventIds.has(event.id)) {
        allEvents.push(event);
        addedEventIds.add(event.id);
      }
    });
  }

  return allEvents;
}

async function searchBySuggestions(apiClient: TevoApiClient, cache: MemoryCache, params: SearchParams): Promise<any[]> {
  const results: any[] = [];
  const added = new Set<number>();

  const cacheKey = cache.generateKey('suggestions', { q: params.query });
  let suggestions = cache.getRequestScoped<any>(cacheKey);
  if (!suggestions) {
    suggestions = await apiClient.searchSuggestions({ q: params.query, limit: 8, fuzzy: true });
    cache.setRequestScoped(cacheKey, suggestions);
  }

  console.error(JSON.stringify({
    type: 'suggestions_summary',
    query: params.query,
    events: suggestions.events?.length || 0,
    performers: suggestions.performers?.length || 0,
    venues: suggestions.venues?.length || 0
  }));

  // Helper to compute a date window for listEvents
  const { startISO, endISO } = computeSearchWindow(params);

  // 1) Direct event suggestions → hydrate
  for (const ev of (suggestions.events || []).slice(0, 5)) {
    try {
      const detailed = await apiClient.getEvent({ event_id: ev.id });
      if (!added.has(detailed.id)) {
        results.push(detailed);
        added.add(detailed.id);
      }
    } catch (e) {
      console.error(JSON.stringify({ type: 'suggested_event_fetch_failed', event_id: ev.id }));
    }
  }

  // 2) Performer suggestions → upcoming events
  for (const perf of (suggestions.performers || []).slice(0, 4)) {
    try {
      const resp = await apiClient.listEvents({
        performer_id: perf.id,
        ...(startISO ? { occurs_at_gte: startISO } : {}),
        ...(endISO ? { occurs_at_lt: endISO } : {}),
        per_page: 100
      });
      (resp.events || []).forEach(ev => {
        if (!added.has(ev.id)) {
          results.push(ev);
          added.add(ev.id);
        }
      });
    } catch (e) {
      console.error(JSON.stringify({ type: 'performer_events_fetch_failed', performer_id: perf.id }));
    }
  }

  // 3) Venue suggestions → upcoming events
  for (const ven of (suggestions.venues || []).slice(0, 3)) {
    try {
      const resp = await apiClient.listEvents({
        venue_id: ven.id,
        ...(startISO ? { occurs_at_gte: startISO } : {}),
        ...(endISO ? { occurs_at_lt: endISO } : {}),
        per_page: 100
      });
      (resp.events || []).forEach(ev => {
        if (!added.has(ev.id)) {
          results.push(ev);
          added.add(ev.id);
        }
      });
    } catch (e) {
      console.error(JSON.stringify({ type: 'venue_events_fetch_failed', venue_id: ven.id }));
    }
  }

  return results;
}

async function searchByDate(apiClient: TevoApiClient, dateString: string): Promise<any[]> {
  const dates = parseDateRange(dateString);
  const allEvents: any[] = [];

  for (const date of dates) {
    const searchStart = new Date(date);
    searchStart.setHours(0, 0, 0, 0);
    const searchEnd = new Date(date);
    searchEnd.setHours(23, 59, 59, 999);

    const response = await apiClient.listEvents({
      occurs_at_gte: searchStart.toISOString(),
      occurs_at_lt: searchEnd.toISOString(),
      per_page: 100
    });

    if (response.events) {
      allEvents.push(...response.events);
    }
  }

  return allEvents;
}

async function searchByLocation(apiClient: TevoApiClient, location: string, date?: string): Promise<any[]> {
  // Major city coordinates
  const cityCoords: { [key: string]: { lat: number, lon: number } } = {
    'new york': { lat: 40.7128, lon: -74.0060 },
    'los angeles': { lat: 34.0522, lon: -118.2437 },
    'chicago': { lat: 41.8781, lon: -87.6298 },
    'boston': { lat: 42.3601, lon: -71.0589 },
    'miami': { lat: 25.7617, lon: -80.1918 },
    'las vegas': { lat: 36.1699, lon: -115.1398 }
  };

  const coords = cityCoords[location.toLowerCase()] || cityCoords['new york']; // default to NYC
  
  const searchParams: any = {
    lat: coords.lat,
    lon: coords.lon,
    within: 50, // 50 mile radius
    per_page: 100
  };

  if (date) {
    const dates = parseDateRange(date);
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    searchParams.occurs_at_gte = startDate.toISOString();
    searchParams.occurs_at_lt = endDate.toISOString();
  }

  const response = await apiClient.listEvents(searchParams);
  return response.events || [];
}

async function broadSearch(apiClient: TevoApiClient, params: SearchParams): Promise<any[]> {
  // Use computed window (weeks_ahead) when no explicit date range
  const { startISO, endISO } = computeSearchWindow(params);

  // Aggregate up to 200 events via pagination (100 per page)
  const events = await apiClient.listEventsAggregate({
    ...(startISO ? { occurs_at_gte: startISO } : {}),
    ...(endISO ? { occurs_at_lt: endISO } : {})
  }, 200);

  return events || [];
}

function rankEventsByRelevance(events: any[], params: SearchParams): any[] {
  const loweredQuery = params.query.toLowerCase();
  const queryWords = loweredQuery.split(/\s+/).filter(word => word.length > 2);
  const queryTeams = extractTeamsFromQuery(loweredQuery);
  
  return events.map(event => {
    let score = 0;
    const eventName = event.name.toLowerCase();
    const venueName = (event.venue?.name || '').toLowerCase();
    const city = (event.venue?.city || '').toLowerCase();
    
    // Exact phrase match gets highest score
    if (eventName.includes(loweredQuery)) {
      score += 100;
    }
    
    // Score based on keyword matches
    queryWords.forEach(word => {
      if (eventName.includes(word)) {
        score += 10;
      }
    });
    // Venue name matches
    queryWords.forEach(word => {
      if (venueName.includes(word)) {
        score += 5;
      }
    });
    // Location bonus
    if (params.location) {
      const loc = params.location.toLowerCase();
      if (city.includes(loc) || venueName.includes(loc)) {
        score += 15;
      }
    }

    // Team/versus matching bonus (e.g., "yankees vs red sox")
    if (queryTeams.length === 2) {
      const [a, b] = queryTeams;
      if (eventName.includes(a) && eventName.includes(b)) {
        score += 40;
      }
    }

    // Deprioritize parking-only events
    if (eventName.includes('parking')) {
      score -= 25;
    }

    // Date proximity bonus if date specified
    if (params.date) {
      const targetDate = new Date(params.date.split(' ')[0]); // Take first date if range
      const eventDate = new Date(event.occurs_at);
      const daysDiff = Math.abs((eventDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) score += 20;
      else if (daysDiff <= 7) score += 10;
      else if (daysDiff <= 30) score += 5;
    }
    
    return {
      ...event,
      relevance_score: score
    };
  }).sort((a, b) => b.relevance_score - a.relevance_score);
}

function strictEventFilter(events: any[], params: SearchParams): any[] {
  const loweredQuery = params.query.toLowerCase();
  const tokens = loweredQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4);
  const requiresFootball = loweredQuery.includes('football') || loweredQuery.includes('ncaa');
  const exclude = ['lpga', 'concert', 'experience', 'comedy', 'tour'];

  return events.filter(ev => {
    const name = (ev.name || '').toLowerCase();
    if (tokens.length > 0) {
      const hits = tokens.filter(t => name.includes(t)).length;
      if (hits < Math.min(2, tokens.length)) return false;
    }
    if (requiresFootball && !(name.includes('football') || name.includes('ncaa') || name.includes('nfl'))) {
      return false;
    }
    if (exclude.some(k => name.includes(k))) return false;
    return true;
  });
}

async function getTicketInfo(apiClient: TevoApiClient, event: any, params: SearchParams) {
  try {
    const listingsResponse = await apiClient.getListings(event.id);
    
    if (!listingsResponse.ticket_groups?.length) {
      return null;
    }

    const eligibleTickets = listingsResponse.ticket_groups
      .filter(tg => 
        tg.retail_price <= params.budget_per_ticket! &&
        tg.available_quantity >= params.requested_quantity &&
        tg.splits.includes(params.requested_quantity) &&
        !tg.section?.toLowerCase().includes('parking')
      )
      .sort((a, b) => a.retail_price - b.retail_price)
      .slice(0, 5);

    if (eligibleTickets.length === 0) {
      return null;
    }

    return {
      available_within_budget: eligibleTickets.length,
      price_range: {
        min: Math.min(...eligibleTickets.map(t => t.retail_price)),
        max: Math.max(...eligibleTickets.map(t => t.retail_price))
      },
      best_options: eligibleTickets.map(tg => ({
        section: tg.section || 'N/A',
        row: tg.row || 'N/A', 
        price_per_ticket: tg.retail_price,
        total_cost: tg.retail_price * params.requested_quantity,
        available_quantity: tg.available_quantity
      }))
    };

  } catch (error) {
    console.error(`Error getting tickets for event ${event.id}:`, error);
    return null;
  }
}

function parseDateRange(dateString: string): string[] {
  // Handle ranges like "2024-09-01 to 2024-09-07" 
  if (dateString.includes(' to ')) {
    const [start, end] = dateString.split(' to ');
    const dates = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
    return dates;
  }
  
  // Single date
  return [dateString];
}

function validateParams(params: unknown): SearchParams {
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid parameters');
  }
  
  const p = params as any;
  
  if (!p.query || typeof p.query !== 'string' || p.query.trim().length === 0) {
    throw new Error('Query is required');
  }

  return {
    query: p.query.trim(),
    date: p.date?.trim(),
    location: p.location?.trim(),
    budget_per_ticket: p.budget_per_ticket ? Number(p.budget_per_ticket) : undefined,
    requested_quantity: p.requested_quantity ? Number(p.requested_quantity) : 2,
    include_tickets: p.include_tickets !== false,
    weeks_ahead: typeof p.weeks_ahead === 'number' && p.weeks_ahead >= 1 && p.weeks_ahead <= 52 ? p.weeks_ahead : 8
  };
}

function computeSearchWindow(params: SearchParams): { startISO?: string, endISO?: string } {
  if (params.date) {
    // Derive window from provided date or range
    const dates = parseDateRange(params.date);
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startISO: startDate.toISOString(), endISO: endDate.toISOString() };
  }
  // Otherwise, use weeks_ahead window from now
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + params.weeks_ahead * 7);
  return { startISO: now.toISOString(), endISO: end.toISOString() };
}

function extractTeamsFromQuery(q: string): string[] {
  // crude split on vs/at/against
  const separators = [' vs ', ' vs. ', ' at ', ' @ ', ' against '];
  for (const sep of separators) {
    if (q.includes(sep)) {
      return q.split(sep).map(s => s.trim()).filter(Boolean).slice(0, 2);
    }
  }
  return [];
}

// ------------- Natural-language multi-game request parsing and handling -------------
interface MultiGameItem {
  dateText: string;
  date: string; // ISO yyyy-mm-dd
  opponent: string;
  homeAway?: 'home' | 'away';
}

interface ParsedMultiGameRequest {
  items: MultiGameItem[];
  optionsPerGame: number; // how many ticket options to return per game
  markupPercent: number; // 0.2 for 20%
  requestedQuantityOverride?: number; // if user explicitly asked for N tickets
}

function parseMultiGameTicketRequest(query: string): ParsedMultiGameRequest {
  const lower = query.toLowerCase();
  // Detect requested number of options (e.g., "give me 2 ticket options")
  const optionsMatch = lower.match(/(\d+)\s+(?:ticket\s+)?options?/);
  const optionsPerGame = optionsMatch ? Math.max(1, parseInt(optionsMatch[1], 10)) : 2;
  
  // Detect markup percent (e.g., "20% mark up" or "20% markup")
  const markupMatch = lower.match(/(\d{1,2})\s*%\s*mark\s*up|markup/);
  let markupPercent = 0;
  if (markupMatch) {
    const num = parseInt(markupMatch[1] || '0', 10);
    if (!Number.isNaN(num)) markupPercent = Math.min(100, Math.max(0, num)) / 100;
  }

  // Detect requested ticket quantity (avoid confusing with "ticket options")
  let requestedQuantityOverride: number | undefined;
  const qtyPatterns = [
    /(?:for|need|want|looking for|request(?:ing)?)\s*(\d{1,2})\s*(?:tickets|tix|seats)(?!\s*options?)/i,
    /(\d{1,2})\s*(?:tickets|tix|seats)(?!\s*options?)/i
  ];
  for (const re of qtyPatterns) {
    const qm = lower.match(re);
    if (qm && qm[1]) {
      const qty = parseInt(qm[1], 10);
      if (!Number.isNaN(qty) && qty > 0 && qty <= 20) {
        requestedQuantityOverride = qty;
        break;
      }
    }
  }

  // Extract lines with date and opponent, allowing formats like:
  //  "10/26 vs Green Bay Packers"
  //  "11/2 vs Indianapolis Colts"
  //  "11/30 vs Bills"
  //  "11/16 vs Bengals"
  const lines = query.split(/\n|\*/).map(s => s.trim()).filter(Boolean);
  const items: MultiGameItem[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const dateRegex = /(\b\d{1,2})\/(\d{1,2})\b/; // MM/DD
  
  for (const line of lines) {
    const m = line.match(dateRegex);
    if (!m) continue;
    const mm = parseInt(m[1], 10);
    const dd = parseInt(m[2], 10);
    // Determine year: prefer current year if date is in future; else next year
    let year = currentYear;
    const candidate = new Date(year, mm - 1, dd);
    if (candidate < now) {
      year = currentYear + 1;
    }
    const iso = new Date(year, mm - 1, dd).toISOString().split('T')[0];

    // Determine opponent and home/away
    // Accept patterns: "vs <opponent>", "v <opponent>", "@ <opponent>", "at <opponent>"
    let opponent = line.replace(dateRegex, '').trim();
    opponent = opponent.replace(/^[-–—,\s]+/, '');
    let homeAway: 'home' | 'away' | undefined;
    const vsMatch = opponent.match(/^(?:vs\.?|v\.?|versus)\s+(.+)/i);
    const atMatch = opponent.match(/^(?:@|at)\s+(.+)/i);
    if (vsMatch) {
      opponent = vsMatch[1].trim();
      homeAway = 'home';
    } else if (atMatch) {
      opponent = atMatch[1].trim();
      homeAway = 'away';
    }

    if (opponent) {
      const base = { dateText: `${mm}/${dd}`, date: iso, opponent } as MultiGameItem;
      const full = homeAway ? { ...base, homeAway } : base;
      items.push(full);
    }
  }

  const result: ParsedMultiGameRequest = { items, optionsPerGame, markupPercent };
  if (requestedQuantityOverride !== undefined) {
    result.requestedQuantityOverride = requestedQuantityOverride;
  }
  return result;
}

async function handleMultiGameTicketRequest(
  apiClient: TevoApiClient,
  cache: MemoryCache,
  parsed: ParsedMultiGameRequest,
  requestedQuantityDefault: number
) {
  const results: any[] = [];
  let apiCalls = 0;
  const quantity = parsed.requestedQuantityOverride ?? requestedQuantityDefault;

  for (const item of parsed.items) {
    const event = await findEventByOpponentAndDate(apiClient, cache, item);
    apiCalls += 1; // count primary lookup (approx)

    if (!event) {
      results.push({
        success: false,
        date: item.date,
        opponent: item.opponent,
        message: 'No matching event found'
      });
      continue;
    }

    // Fetch listings and select options
    let options: any[] = [];
    try {
      const listings = await apiClient.getListings(event.id);
      apiCalls += 1;
      const eligible = (listings.ticket_groups || [])
        .filter(tg => tg.available_quantity >= quantity && tg.splits?.includes(quantity))
        .filter(tg => !tg.section?.toLowerCase().includes('parking'))
        .sort((a, b) => a.retail_price - b.retail_price)
        .slice(0, Math.max(2, parsed.optionsPerGame));

      options = eligible.map(tg => {
        const per = tg.retail_price;
        const perWithMarkup = applyMarkup(per, parsed.markupPercent);
        return {
          section: tg.section || 'N/A',
          row: tg.row || 'N/A',
          price_per_ticket: per,
          price_per_ticket_with_markup: perWithMarkup,
          total_cost: per * quantity,
          total_cost_with_markup: perWithMarkup * quantity,
          available_quantity: tg.available_quantity,
          format: tg.format,
          instant_delivery: tg.instant_delivery,
          in_hand: tg.in_hand,
          splits: tg.splits
        };
      }).slice(0, parsed.optionsPerGame);
    } catch (e) {
      options = [];
    }

    results.push({
      success: options.length > 0,
      date: item.date,
      opponent: item.opponent,
      event_id: event.id,
      name: event.name,
      occurs_at: event.occurs_at,
      venue: event.venue?.name || 'Unknown venue',
      city: event.venue?.city || '',
      state: event.venue?.state || '',
      options
    });
  }

  return {
    success: results.some(r => r.success),
    request_summary: {
      games_requested: parsed.items.length,
      options_per_game: parsed.optionsPerGame,
      markup_percent: parsed.markupPercent * 100,
      requested_quantity: quantity,
      api_calls_made: apiCalls
    },
    results
  };
}

function applyMarkup(value: number, percent: number): number {
  const marked = value * (1 + (percent || 0));
  // Round to 2 decimals typical for currency
  return Math.round(marked * 100) / 100;
}

async function findEventByOpponentAndDate(
  apiClient: TevoApiClient,
  cache: MemoryCache,
  item: MultiGameItem
): Promise<any | null> {
  // First try suggestions for the opponent to get performer IDs
  const cacheKey = cache.generateKey('opp_sugg', { q: item.opponent });
  let suggestions = cache.getRequestScoped<any>(cacheKey);
  if (!suggestions) {
    suggestions = await apiClient.searchSuggestions({ q: item.opponent, limit: 6, fuzzy: true });
    cache.setRequestScoped(cacheKey, suggestions);
  }

  const dateStart = new Date(item.date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(item.date);
  dateEnd.setHours(23, 59, 59, 999);

  // Search by performer matches on that date
  for (const perf of (suggestions.performers || [])) {
    try {
      const resp = await apiClient.listEvents({
        performer_id: perf.id,
        'occurs_at_gte': dateStart.toISOString(),
        'occurs_at_lt': dateEnd.toISOString(),
        per_page: 100
      } as any);
      const events = resp.events || [];
      const match = events.find(ev => ev.name.toLowerCase().includes(item.opponent.toLowerCase()));
      if (match) return match;
    } catch {}
  }

  // Fallback: broad events on that date, filter by opponent keyword (aggregate up to 200)
  const broadEvents = await apiClient.listEventsAggregate({
    occurs_at_gte: dateStart.toISOString(),
    occurs_at_lt: dateEnd.toISOString()
  }, 200);
  const alt = (broadEvents || []).find(ev => ev.name.toLowerCase().includes(item.opponent.toLowerCase()));
  return alt || null;
}
