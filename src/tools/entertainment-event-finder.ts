import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { validateEntertainmentEventFinderParams } from '../utils/validation.js';

export function createEntertainmentEventFinderTool(_apiClient: TevoApiClient, _cache: MemoryCache): Tool {
  return {
    name: 'tevo_entertainment_event_finder',
    description: 'Specialized finder for concerts, comedy shows, theater, and other entertainment events with artist-focused search strategies',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Artist name, tour name, or entertainment event (e.g., "Taylor Swift", "Eras Tour", "Hamilton Broadway", "Dave Chappelle")'
        },
        date: {
          type: 'string',
          description: 'Target date in YYYY-MM-DD format (optional)'
        },
        location: {
          type: 'string',
          description: 'City or venue (optional, e.g., "New York", "Madison Square Garden", "Las Vegas")'
        },
        event_type: {
          type: 'string',
          enum: ['concert', 'comedy', 'theater', 'broadway', 'any'],
          default: 'any',
          description: 'Type of entertainment event (default: any)'
        },
        weeks_ahead: {
          type: 'integer',
          minimum: 1,
          maximum: 52,
          default: 16,
          description: 'Search within next N weeks if no specific date (default: 16)'
        },
        budget_per_ticket: {
          type: 'number',
          minimum: 1,
          description: 'Maximum budget per ticket in USD (optional)'
        },
        requested_quantity: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          default: 2,
          description: 'Number of tickets needed (default: 2)'
        }
      },
      required: ['query']
    }
  };
}

// Entertainment-specific venue database focused on major entertainment venues
const ENTERTAINMENT_VENUES = {
  // New York
  'msg': { venue_id: 896, city: 'New York', name: 'Madison Square Garden', lat: 40.7505, lon: -73.9934 },
  'barclays': { city: 'Brooklyn', name: 'Barclays Center', lat: 40.6826, lon: -73.9754 },
  'beacon': { city: 'New York', name: 'Beacon Theatre', lat: 40.7794, lon: -73.9818 },
  'radio city': { city: 'New York', name: 'Radio City Music Hall', lat: 40.7590, lon: -73.9799 },
  
  // Los Angeles
  'hollywood bowl': { city: 'Los Angeles', name: 'Hollywood Bowl', lat: 34.1122, lon: -118.3390 },
  'staples': { city: 'Los Angeles', name: 'Crypto.com Arena', lat: 34.0430, lon: -118.2673 },
  'the forum': { city: 'Los Angeles', name: 'The Forum', lat: 33.9581, lon: -118.3414 },
  'greek theater': { city: 'Los Angeles', name: 'Greek Theater', lat: 34.1197, lon: -118.3089 },
  
  // Chicago  
  'united center': { city: 'Chicago', name: 'United Center', lat: 41.8807, lon: -87.6742 },
  'chicago theater': { city: 'Chicago', name: 'Chicago Theatre', lat: 41.8858, lon: -87.6276 },
  'aragon': { city: 'Chicago', name: 'Aragon Ballroom', lat: 41.9731, lon: -87.6531 },
  
  // Las Vegas
  'sphere': { city: 'Las Vegas', name: 'Sphere', lat: 36.1213, lon: -115.1678 },
  'mgm grand': { city: 'Las Vegas', name: 'MGM Grand Garden Arena', lat: 36.1023, lon: -115.1696 },
  'mandalay bay': { city: 'Las Vegas', name: 'Mandalay Bay Events Center', lat: 36.0951, lon: -115.1729 },
  
  // Nashville
  'ryman': { city: 'Nashville', name: 'Ryman Auditorium', lat: 36.1612, lon: -86.7775 },
  'grand ole opry': { city: 'Nashville', name: 'Grand Ole Opry House', lat: 36.2061, lon: -86.6920 },
  
  // Boston
  'td garden': { city: 'Boston', name: 'TD Garden', lat: 42.3662, lon: -71.0621 },
  'berklee': { city: 'Boston', name: 'Berklee Performance Center', lat: 42.3467, lon: -71.0891 }
};

const ENTERTAINMENT_ARTISTS = {
  // Pop Artists
  'taylor swift': ['taylor swift', 'swift', 'eras tour', 'reputation', 'folklore'],
  'ariana grande': ['ariana grande', 'ariana', 'grande', 'sweetener', 'positions'],
  'billie eilish': ['billie eilish', 'billie', 'eilish', 'happier than ever'],
  'benson boone': ['benson boone', 'boone', 'american heart', 'beautiful things'],
  'olivia rodrigo': ['olivia rodrigo', 'olivia', 'rodrigo', 'sour tour', 'guts'],
  'dua lipa': ['dua lipa', 'dua', 'lipa', 'future nostalgia'],
  
  // Hip-Hop/Rap
  'drake': ['drake', 'aubrey graham', 'drizzy', 'ovo', 'views', 'scorpion'],
  'kendrick lamar': ['kendrick lamar', 'kendrick', 'lamar', 'damn', 'good kid'],
  'travis scott': ['travis scott', 'travis', 'scott', 'astroworld', 'utopia'],
  'bad bunny': ['bad bunny', 'benito martinez', 'conejo malo', 'un verano sin ti'],
  
  // R&B/Soul
  'beyonce': ['beyonce', 'beyoncé', 'renaissance', 'formation', 'queen b'],
  'the weeknd': ['the weeknd', 'weeknd', 'abel tesfaye', 'after hours', 'dawn fm'],
  'sza': ['sza', 'solána imani rowe', 'ctrl', 'sos'],
  
  // Rock/Alternative
  'imagine dragons': ['imagine dragons', 'imagine', 'dragons', 'mercury', 'evolve'],
  'coldplay': ['coldplay', 'chris martin', 'music of the spheres', 'fix you'],
  'twenty one pilots': ['twenty one pilots', '21 pilots', 'tyler joseph', 'blurryface'],
  
  // Comedy
  'dave chappelle': ['dave chappelle', 'chappelle', 'dave', 'chappelle show'],
  'kevin hart': ['kevin hart', 'hart', 'kevin', 'irresponsible'],
  'jerry seinfeld': ['jerry seinfeld', 'seinfeld', 'jerry'],
  'john mulaney': ['john mulaney', 'mulaney', 'john'],
  
  // Broadway/Theater
  'hamilton': ['hamilton', 'lin manuel miranda', 'musical'],
  'wicked': ['wicked', 'musical', 'defying gravity'],
  'lion king': ['lion king', 'disney', 'musical'],
  'phantom': ['phantom of the opera', 'phantom', 'andrew lloyd webber']
};

export async function handleEntertainmentEventFinder(
  apiClient: TevoApiClient,
  _cache: MemoryCache,
  params: unknown
) {
  const validatedParams = validateEntertainmentEventFinderParams(params);
  
  console.error(JSON.stringify({
    type: 'entertainment_event_finder_start',
    query: validatedParams.query,
    event_type: validatedParams.event_type,
    location: validatedParams.location
  }));

  const searchResults = {
    strategy_used: '',
    events_found: [] as any[],
    search_summary: {
      query: validatedParams.query,
      strategies_tried: [] as string[],
      api_calls_made: 0,
      total_events_searched: 0,
      entertainment_focused: true
    }
  };

  try {
    const queryInfo = parseEntertainmentQuery(validatedParams.query);
    let foundEvents: any[] = [];
    
    // STRATEGY 1: Direct date + MSG search (highest priority for known events)
    if (queryInfo.recognizedArtist && validatedParams.date) {
      console.error(JSON.stringify({ type: 'strategy', name: 'direct_date_msg_search' }));
      searchResults.search_summary.strategies_tried.push('direct_date_msg_search');
      
      // Always check MSG first for major artists with specific dates
      const msgVenue = ENTERTAINMENT_VENUES['msg'];
      foundEvents = await searchArtistAtVenue(apiClient, queryInfo, msgVenue, validatedParams);
      searchResults.search_summary.api_calls_made++;
      
      if (foundEvents.length > 0) {
        searchResults.strategy_used = 'direct_date_msg_search';
      }
    }
    
    // STRATEGY 2: Artist + Venue specific search  
    if (foundEvents.length === 0 && queryInfo.recognizedArtist && validatedParams.location) {
      console.error(JSON.stringify({ type: 'strategy', name: 'artist_venue_search' }));
      searchResults.search_summary.strategies_tried.push('artist_venue_search');
      
      const venue = findEntertainmentVenue(validatedParams.location);
      if (venue) {
        foundEvents = await searchArtistAtVenue(apiClient, queryInfo, venue, validatedParams);
        searchResults.search_summary.api_calls_made++;
        
        if (foundEvents.length > 0) {
          searchResults.strategy_used = 'artist_venue_search';
        }
      }
    }
    
    // STRATEGY 3: Artist + City search (major entertainment venues)
    if (foundEvents.length === 0 && queryInfo.recognizedArtist) {
      console.error(JSON.stringify({ type: 'strategy', name: 'artist_city_search' }));
      searchResults.search_summary.strategies_tried.push('artist_city_search');
      
      const searchCities = validatedParams.location ? 
        [validatedParams.location] : 
        ['New York', 'Los Angeles', 'Chicago', 'Las Vegas', 'Nashville'];
      
      for (const city of searchCities.slice(0, 3)) {
        const cityVenues = Object.values(ENTERTAINMENT_VENUES)
          .filter(v => v.city.toLowerCase().includes(city.toLowerCase()))
          .slice(0, 2); // Top 2 venues per city
        
        for (const venue of cityVenues) {
          const events = await searchArtistAtVenue(apiClient, queryInfo, venue, validatedParams);
          searchResults.search_summary.api_calls_made++;
          
          if (events.length > 0) {
            foundEvents.push(...events);
            searchResults.strategy_used = 'artist_city_search';
          }
        }
        
        if (foundEvents.length > 0) break;
      }
    }
    
    // STRATEGY 4: Broader keyword search in entertainment venues
    if (foundEvents.length === 0) {
      console.error(JSON.stringify({ type: 'strategy', name: 'entertainment_keyword_search' }));
      searchResults.search_summary.strategies_tried.push('entertainment_keyword_search');
      
      const searchVenues = validatedParams.location ?
        Object.values(ENTERTAINMENT_VENUES).filter(v => 
          v.city.toLowerCase().includes(validatedParams.location!.toLowerCase()) ||
          v.name.toLowerCase().includes(validatedParams.location!.toLowerCase())
        ) :
        Object.values(ENTERTAINMENT_VENUES).slice(0, 5); // Top venues
      
      for (const venue of searchVenues) {
        const events = await searchByKeywordsAtVenue(apiClient, queryInfo.keywords, venue, validatedParams);
        searchResults.search_summary.api_calls_made++;
        searchResults.search_summary.total_events_searched += events.length;
        
        const matchingEvents = events.filter(event => 
          matchesEntertainmentEvent(event, queryInfo)
        );
        
        if (matchingEvents.length > 0) {
          foundEvents.push(...matchingEvents);
          searchResults.strategy_used = 'entertainment_keyword_search';
        }
      }
    }
    
    // Process found events with ticket information
    if (foundEvents.length > 0) {
      // Remove duplicates
      const uniqueEvents = foundEvents.filter((event, index, arr) => 
        arr.findIndex(e => e.id === event.id) === index
      );
      
      console.error(JSON.stringify({
        type: 'entertainment_events_found',
        count: uniqueEvents.length,
        strategy: searchResults.strategy_used
      }));
      
      // Get ticket info for top events
      for (const event of uniqueEvents.slice(0, 3)) {
        try {
          const eventInfo: any = {
            event_id: event.id,
            name: event.name,
            date: new Date(event.occurs_at).toLocaleDateString(),
            time: new Date(event.occurs_at).toLocaleTimeString(),
            venue: event.venue?.name || 'Unknown venue',
            city: event.venue?.city || '',
            state: event.venue?.state || '',
            event_type: determineEventType(event.name)
          };
          
          // Add ticket information if budget specified
          if (validatedParams.budget_per_ticket) {
            const listingsResponse = await apiClient.getListings(event.id);
            searchResults.search_summary.api_calls_made++;
            
            const eligibleTickets = listingsResponse.ticket_groups
              ?.filter(tg => 
                tg.retail_price <= validatedParams.budget_per_ticket! && 
                tg.available_quantity >= validatedParams.requested_quantity! &&
                tg.splits.includes(validatedParams.requested_quantity!) &&
                !tg.section?.toLowerCase().includes('parking')
              )
              ?.sort((a, b) => a.retail_price - b.retail_price)
              ?.slice(0, 5) || [];
              
            if (eligibleTickets.length > 0) {
              eventInfo.tickets = {
                available_within_budget: eligibleTickets.length,
                price_range: {
                  min: Math.min(...eligibleTickets.map(t => t.retail_price)),
                  max: Math.max(...eligibleTickets.map(t => t.retail_price))
                },
                best_options: eligibleTickets.map(tg => ({
                  section: tg.section || 'N/A',
                  row: tg.row || 'N/A',
                  price_per_ticket: tg.retail_price,
                  total_cost: tg.retail_price * validatedParams.requested_quantity!,
                  available_quantity: tg.available_quantity,
                  format: tg.format
                }))
              };
            }
          }
          
          searchResults.events_found.push(eventInfo);
          
        } catch (error) {
          console.error(JSON.stringify({
            type: 'entertainment_event_processing_error',
            event_id: event.id,
            error: error instanceof Error ? error.message : String(error)
          }));
        }
      }
    }
    
    const result = {
      success: foundEvents.length > 0,
      query: validatedParams.query,
      event_type: validatedParams.event_type,
      strategy_used: searchResults.strategy_used,
      events_found: searchResults.events_found,
      search_summary: {
        ...searchResults.search_summary,
        events_discovered: foundEvents.length,
        events_processed: searchResults.events_found.length,
        artist_recognized: queryInfo.recognizedArtist,
        keywords_matched: queryInfo.keywords
      }
    };
    
    console.error(JSON.stringify({
      type: 'entertainment_event_finder_complete',
      success: result.success,
      events_found: result.events_found.length,
      api_calls: result.search_summary.api_calls_made,
      strategy: result.strategy_used
    }));
    
    return result;
    
  } catch (error) {
    console.error(JSON.stringify({
      type: 'entertainment_event_finder_error',
      error: error instanceof Error ? error.message : String(error),
      query: validatedParams.query
    }));
    
    throw error;
  }
}

function parseEntertainmentQuery(query: string) {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  
  let recognizedArtist: string | null = null;
  const keywords: string[] = [];
  
  // Check for recognized artists
  for (const [artist, variations] of Object.entries(ENTERTAINMENT_ARTISTS)) {
    if (variations.some(variation => lowerQuery.includes(variation))) {
      recognizedArtist = artist;
      keywords.push(artist);
      break;
    }
  }
  
  // Add query words as keywords
  keywords.push(...words.filter(word => word.length > 2));
  
  return {
    originalQuery: query,
    recognizedArtist,
    keywords: [...new Set(keywords)], // Remove duplicates
    words
  };
}

function findEntertainmentVenue(location: string) {
  const lowerLocation = location.toLowerCase();
  
  for (const venue of Object.values(ENTERTAINMENT_VENUES)) {
    if (venue.city.toLowerCase().includes(lowerLocation) ||
        venue.name.toLowerCase().includes(lowerLocation)) {
      return venue;
    }
  }
  
  return null;
}

async function searchArtistAtVenue(
  apiClient: TevoApiClient,
  queryInfo: any,
  venue: any,
  params: any
): Promise<any[]> {
  const searchParams: any = {
    per_page: 50
  };
  
  // Add venue search criteria
  if (venue.venue_id) {
    searchParams.venue_id = venue.venue_id;
  } else {
    searchParams.lat = venue.lat;
    searchParams.lon = venue.lon;
    searchParams.within = 5; // Very tight radius
  }
  
  // Add date range - wider window for entertainment events
  if (params.date) {
    const targetDate = new Date(params.date);
    const searchStart = new Date(targetDate);
    searchStart.setDate(targetDate.getDate() - 7); // Expand to ±7 days
    const searchEnd = new Date(targetDate);
    searchEnd.setDate(targetDate.getDate() + 7);
    searchParams.occurs_at_gte = searchStart.toISOString();
    searchParams.occurs_at_lt = searchEnd.toISOString();
  } else {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + (params.weeks_ahead * 7));
    searchParams.occurs_at_gte = now.toISOString();
    searchParams.occurs_at_lt = futureDate.toISOString();
  }
  
  const eventsResponse = await apiClient.listEvents(searchParams);
  
  return eventsResponse.events?.filter(event => 
    matchesEntertainmentEvent(event, queryInfo)
  ) || [];
}

async function searchByKeywordsAtVenue(
  apiClient: TevoApiClient,
  _keywords: string[],
  venue: any,
  params: any
): Promise<any[]> {
  const searchParams: any = {
    lat: venue.lat,
    lon: venue.lon,
    within: 10,
    per_page: 50
  };
  
  // Add date range - wider window for entertainment events
  if (params.date) {
    const targetDate = new Date(params.date);
    const searchStart = new Date(targetDate);
    searchStart.setDate(targetDate.getDate() - 7); // Expand to ±7 days
    const searchEnd = new Date(targetDate);
    searchEnd.setDate(targetDate.getDate() + 7);
    searchParams.occurs_at_gte = searchStart.toISOString();
    searchParams.occurs_at_lt = searchEnd.toISOString();
  } else {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + (params.weeks_ahead * 7));
    searchParams.occurs_at_gte = now.toISOString();
    searchParams.occurs_at_lt = futureDate.toISOString();
  }
  
  const eventsResponse = await apiClient.listEvents(searchParams);
  return eventsResponse.events || [];
}

function matchesEntertainmentEvent(event: any, queryInfo: any): boolean {
  const eventName = event.name.toLowerCase();
  
  // If we have a recognized artist, look for them specifically
  if (queryInfo.recognizedArtist) {
    const artistVariations = ENTERTAINMENT_ARTISTS[queryInfo.recognizedArtist as keyof typeof ENTERTAINMENT_ARTISTS];
    if (artistVariations?.some(variation => eventName.includes(variation))) {
      return true;
    }
  }
  
  // Otherwise, match on keywords
  const matchingKeywords = queryInfo.keywords.filter((keyword: string) => 
    eventName.includes(keyword.toLowerCase())
  );
  
  return matchingKeywords.length >= Math.min(2, queryInfo.keywords.length);
}

function determineEventType(eventName: string): string {
  const name = eventName.toLowerCase();
  
  if (name.includes('comedy') || name.includes('standup') || name.includes('stand-up')) {
    return 'comedy';
  }
  if (name.includes('broadway') || name.includes('musical') || name.includes('theater')) {
    return 'theater';
  }
  if (name.includes('concert') || name.includes('tour') || name.includes('live')) {
    return 'concert';
  }
  
  return 'entertainment';
}