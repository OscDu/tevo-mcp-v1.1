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
  // New York Metro Area
  'msg': { venue_id: 896, city: 'New York', name: 'Madison Square Garden', lat: 40.7505, lon: -73.9934 },
  'barclays': { city: 'Brooklyn', name: 'Barclays Center', lat: 40.6826, lon: -73.9754 },
  'beacon': { city: 'New York', name: 'Beacon Theatre', lat: 40.7794, lon: -73.9818 },
  'radio city': { city: 'New York', name: 'Radio City Music Hall', lat: 40.7590, lon: -73.9799 },
  'yankee stadium': { city: 'New York', name: 'Yankee Stadium', lat: 40.8296, lon: -73.9262 },
  'citi field': { city: 'New York', name: 'Citi Field', lat: 40.7571, lon: -73.8458 },
  'arthur ashe stadium': { city: 'New York', name: 'Arthur Ashe Stadium', lat: 40.7503, lon: -73.8448 },
  'louis armstrong stadium': { city: 'New York', name: 'Louis Armstrong Stadium', lat: 40.7496, lon: -73.8461 },
  'metlife stadium': { city: 'East Rutherford', name: 'MetLife Stadium', lat: 40.8135, lon: -74.0745 },
  'prudential center': { city: 'Newark', name: 'Prudential Center', lat: 40.7336, lon: -74.1710 },
  
  // Los Angeles Area
  'hollywood bowl': { city: 'Los Angeles', name: 'Hollywood Bowl', lat: 34.1122, lon: -118.3390 },
  'crypto.com arena': { city: 'Los Angeles', name: 'Crypto.com Arena', lat: 34.0430, lon: -118.2673 },
  'staples': { city: 'Los Angeles', name: 'Crypto.com Arena', lat: 34.0430, lon: -118.2673 },
  'the forum': { city: 'Los Angeles', name: 'The Forum', lat: 33.9581, lon: -118.3414 },
  'greek theater': { city: 'Los Angeles', name: 'Greek Theater', lat: 34.1197, lon: -118.3089 },
  'sofi stadium': { city: 'Los Angeles', name: 'SoFi Stadium', lat: 33.9535, lon: -118.3392 },
  'dodger stadium': { city: 'Los Angeles', name: 'Dodger Stadium', lat: 34.0739, lon: -118.2400 },
  'rose bowl': { city: 'Pasadena', name: 'Rose Bowl Stadium', lat: 34.1613, lon: -118.1677 },
  'microsoft theater': { city: 'Los Angeles', name: 'Microsoft Theater', lat: 34.0440, lon: -118.2673 },
  'dolby theater': { city: 'Los Angeles', name: 'Dolby Theatre', lat: 34.1022, lon: -118.3410 },
  'kia forum': { city: 'Los Angeles', name: 'Kia Forum', lat: 33.9581, lon: -118.3414 },
  
  // Chicago Area
  'united center': { city: 'Chicago', name: 'United Center', lat: 41.8807, lon: -87.6742 },
  'chicago theater': { city: 'Chicago', name: 'Chicago Theatre', lat: 41.8858, lon: -87.6276 },
  'aragon': { city: 'Chicago', name: 'Aragon Ballroom', lat: 41.9731, lon: -87.6531 },
  'soldier field': { city: 'Chicago', name: 'Soldier Field', lat: 41.8623, lon: -87.6167 },
  'wrigley field': { city: 'Chicago', name: 'Wrigley Field', lat: 41.9484, lon: -87.6553 },
  'grant park': { city: 'Chicago', name: 'Grant Park', lat: 41.8756, lon: -87.6244 },
  'allstate arena': { city: 'Rosemont', name: 'Allstate Arena', lat: 42.0058, lon: -87.8842 },
  
  // Las Vegas Area
  'sphere': { city: 'Las Vegas', name: 'Sphere', lat: 36.1213, lon: -115.1678 },
  'mgm grand': { city: 'Las Vegas', name: 'MGM Grand Garden Arena', lat: 36.1023, lon: -115.1696 },
  'mandalay bay': { city: 'Las Vegas', name: 'Mandalay Bay Events Center', lat: 36.0951, lon: -115.1729 },
  't-mobile arena': { city: 'Las Vegas', name: 'T-Mobile Arena', lat: 36.1026, lon: -115.1784 },
  'allegiant stadium': { city: 'Las Vegas', name: 'Allegiant Stadium', lat: 36.0909, lon: -115.1833 },
  'caesars palace': { city: 'Las Vegas', name: 'Caesars Palace Colosseum', lat: 36.1155, lon: -115.1739 },
  'park theater': { city: 'Las Vegas', name: 'Park Theater', lat: 36.1023, lon: -115.1696 },
  
  // Nashville Area
  'ryman': { city: 'Nashville', name: 'Ryman Auditorium', lat: 36.1612, lon: -86.7775 },
  'grand ole opry': { city: 'Nashville', name: 'Grand Ole Opry House', lat: 36.2061, lon: -86.6920 },
  'bridgestone arena': { city: 'Nashville', name: 'Bridgestone Arena', lat: 36.1594, lon: -86.7786 },
  'nissan stadium': { city: 'Nashville', name: 'Nissan Stadium', lat: 36.1665, lon: -86.7713 },
  'ascend amphitheater': { city: 'Nashville', name: 'Ascend Amphitheater', lat: 36.1568, lon: -86.7738 },
  
  // Boston Area
  'td garden': { city: 'Boston', name: 'TD Garden', lat: 42.3662, lon: -71.0621 },
  'berklee': { city: 'Boston', name: 'Berklee Performance Center', lat: 42.3467, lon: -71.0891 },
  'fenway park': { city: 'Boston', name: 'Fenway Park', lat: 42.3467, lon: -71.0972 },
  'gillette stadium': { city: 'Foxborough', name: 'Gillette Stadium', lat: 42.0910, lon: -71.2643 },
  'wang theater': { city: 'Boston', name: 'Wang Theater', lat: 42.3518, lon: -71.0636 },
  
  // Florida
  'american airlines arena': { city: 'Miami', name: 'FTX Arena', lat: 25.7814, lon: -80.1870 },
  'hard rock stadium': { city: 'Miami', name: 'Hard Rock Stadium', lat: 25.9580, lon: -80.2389 },
  'amway center': { city: 'Orlando', name: 'Amway Center', lat: 28.5392, lon: -81.3839 },
  'amalie arena': { city: 'Tampa', name: 'Amalie Arena', lat: 27.9428, lon: -82.4518 },
  
  // Texas
  'american airlines center': { city: 'Dallas', name: 'American Airlines Center', lat: 32.7905, lon: -96.8103 },
  'at&t stadium': { city: 'Arlington', name: 'AT&T Stadium', lat: 32.7473, lon: -97.0945 },
  'toyota center': { city: 'Houston', name: 'Toyota Center', lat: 29.6808, lon: -95.3621 },
  'nrg stadium': { city: 'Houston', name: 'NRG Stadium', lat: 29.6847, lon: -95.4107 },
  'frank erwin center': { city: 'Austin', name: 'Frank Erwin Center', lat: 30.2849, lon: -97.7341 },
  'moody center': { city: 'Austin', name: 'Moody Center', lat: 30.2849, lon: -97.7341 },
  
  // Other Major Markets
  'chase center': { city: 'San Francisco', name: 'Chase Center', lat: 37.7680, lon: -122.3892 },
  'oracle park': { city: 'San Francisco', name: 'Oracle Park', lat: 37.7786, lon: -122.3893 },
  'golden gate park': { city: 'San Francisco', name: 'Golden Gate Park', lat: 37.7694, lon: -122.4862 },
  'state farm arena': { city: 'Atlanta', name: 'State Farm Arena', lat: 33.7573, lon: -84.3963 },
  'mercedes-benz stadium': { city: 'Atlanta', name: 'Mercedes-Benz Stadium', lat: 33.7553, lon: -84.4006 },
  'little caesars arena': { city: 'Detroit', name: 'Little Caesars Arena', lat: 42.3411, lon: -83.0553 },
  'ppg paints arena': { city: 'Pittsburgh', name: 'PPG Paints Arena', lat: 40.4393, lon: -79.9892 },
  'nationwide arena': { city: 'Columbus', name: 'Nationwide Arena', lat: 39.9691, lon: -82.9911 },
  'target center': { city: 'Minneapolis', name: 'Target Center', lat: 44.9795, lon: -93.2760 },
  'xcel energy center': { city: 'St. Paul', name: 'Xcel Energy Center', lat: 44.9447, lon: -93.1016 },
  'enterprise center': { city: 'St. Louis', name: 'Enterprise Center', lat: 38.6265, lon: -90.2026 },
  'ball arena': { city: 'Denver', name: 'Ball Arena', lat: 39.7487, lon: -105.0077 },
  'climate pledge arena': { city: 'Seattle', name: 'Climate Pledge Arena', lat: 47.6221, lon: -122.3540 },
  'moda center': { city: 'Portland', name: 'Moda Center', lat: 45.5316, lon: -122.6668 },
  
  // Super Bowl & Championship Venues
  'caesars superdome': { city: 'New Orleans', name: 'Caesars Superdome', lat: 29.9511, lon: -90.0812 },
  'lucas oil stadium': { city: 'Indianapolis', name: 'Lucas Oil Stadium', lat: 39.7601, lon: -86.1639 },
  'u.s. bank stadium': { city: 'Minneapolis', name: 'U.S. Bank Stadium', lat: 44.9738, lon: -93.2583 },
  'state farm stadium': { city: 'Glendale', name: 'State Farm Stadium', lat: 33.5276, lon: -112.2625 },
  
  // Major Amphitheaters & Outdoor Venues
  'red rocks': { city: 'Morrison', name: 'Red Rocks Amphitheatre', lat: 39.6654, lon: -105.2068 },
  'gorge amphitheatre': { city: 'George', name: 'Gorge Amphitheatre', lat: 47.0979, lon: -119.2734 },
  'brandon amphitheater': { city: 'Brandon', name: 'Brandon Amphitheater', lat: 32.2733, lon: -90.0473 },
  'ruoff music center': { city: 'Noblesville', name: 'Ruoff Music Center', lat: 39.9584, lon: -86.1372 },
  'blossom music center': { city: 'Cuyahoga Falls', name: 'Blossom Music Center', lat: 41.242, lon: -81.5265 },
  'pnc music pavilion': { city: 'Charlotte', name: 'PNC Music Pavilion', lat: 35.1584, lon: -80.9326 },
  
  // Festival Locations
  'coachella grounds': { city: 'Indio', name: 'Empire Polo Club', lat: 33.6803, lon: -116.2378 },
  'bonnaroo farm': { city: 'Manchester', name: 'Great Stage Park', lat: 35.4889, lon: -86.0819 },
  'burning man playa': { city: 'Black Rock City', name: 'Black Rock Desert', lat: 40.7864, lon: -119.2065 },
  'zilker park': { city: 'Austin', name: 'Zilker Park', lat: 30.2648, lon: -97.7729 },
  
  // Broadway & Theater Districts
  'broadway district': { city: 'New York', name: 'Broadway Theater District', lat: 40.7590, lon: -73.9845 },
  'lincoln center': { city: 'New York', name: 'Lincoln Center', lat: 40.7737, lon: -73.9826 },
  'kennedy center': { city: 'Washington', name: 'Kennedy Center', lat: 38.8955, lon: -77.0565 }
};

const ENTERTAINMENT_ARTISTS = {
  // Pop Artists - Major 2025 Tours
  'taylor swift': ['taylor swift', 'swift', 'eras tour', 'reputation', 'folklore', 'taylor'],
  'ariana grande': ['ariana grande', 'ariana', 'grande', 'sweetener', 'positions'],
  'billie eilish': ['billie eilish', 'billie', 'eilish', 'happier than ever', 'hit me hard and soft'],
  'benson boone': ['benson boone', 'boone', 'american heart', 'beautiful things', 'american heart tour'],
  'olivia rodrigo': ['olivia rodrigo', 'olivia', 'rodrigo', 'sour tour', 'guts', 'guts world tour'],
  'dua lipa': ['dua lipa', 'dua', 'lipa', 'future nostalgia', 'radical optimism'],
  'sabrina carpenter': ['sabrina carpenter', 'sabrina', 'carpenter', 'short n sweet', 'emails i cant send'],
  'chappell roan': ['chappell roan', 'chappell', 'roan', 'the rise and fall of a midwest princess'],
  'gracie abrams': ['gracie abrams', 'gracie', 'abrams', 'the secret of us', 'good riddance'],
  'tate mcrae': ['tate mcrae', 'tate', 'mcrae', 'think later', 'i used to think i could fly'],
  
  // Hip-Hop/Rap - Major 2025 Tours
  'drake': ['drake', 'aubrey graham', 'drizzy', 'ovo', 'views', 'scorpion', 'for all the dogs'],
  'kendrick lamar': ['kendrick lamar', 'kendrick', 'lamar', 'damn', 'good kid', 'mr morale'],
  'travis scott': ['travis scott', 'travis', 'scott', 'astroworld', 'utopia', 'circus maximus'],
  'bad bunny': ['bad bunny', 'benito martinez', 'conejo malo', 'un verano sin ti', 'nadie sabe lo que va a pasar mañana'],
  'sza': ['sza', 'solána imani rowe', 'ctrl', 'sos', 'sos tour'],
  'post malone': ['post malone', 'post', 'malone', 'austin', 'f-1 trillion', 'circles'],
  'tyler the creator': ['tyler the creator', 'tyler', 'creator', 'call me if you get lost', 'chromakopia'],
  'lil nas x': ['lil nas x', 'lil nas', 'nas x', 'montero', 'old town road'],
  'doja cat': ['doja cat', 'doja', 'cat', 'planet her', 'scarlet'],
  'ice spice': ['ice spice', 'ice', 'spice', 'like what', 'y2k'],
  
  // R&B/Soul - Major 2025 Tours  
  'beyonce': ['beyonce', 'beyoncé', 'renaissance', 'formation', 'queen b', 'cowboy carter'],
  'the weeknd': ['the weeknd', 'weeknd', 'abel tesfaye', 'after hours', 'dawn fm'],
  'usher': ['usher', 'usher raymond', 'confessions', 'past present future'],
  'alicia keys': ['alicia keys', 'alicia', 'keys', 'hell\'s kitchen'],
  'john legend': ['john legend', 'john', 'legend', 'all of me', 'my favorite dream'],
  
  // Rock/Alternative - Major 2025 Tours
  'imagine dragons': ['imagine dragons', 'imagine', 'dragons', 'mercury', 'evolve', 'loom'],
  'coldplay': ['coldplay', 'chris martin', 'music of the spheres', 'fix you', 'moon music'],
  'twenty one pilots': ['twenty one pilots', '21 pilots', 'tyler joseph', 'blurryface', 'clancy'],
  'onerepublic': ['onerepublic', 'one republic', 'ryan tedder', 'counting stars', 'artificial paradise'],
  'maroon 5': ['maroon 5', 'maroon', 'adam levine', 'sugar', 'songs about jane'],
  'fall out boy': ['fall out boy', 'fall out', 'fob', 'sugar we\'re goin down', 'so much for stardust'],
  'panic at the disco': ['panic at the disco', 'panic', 'brendon urie', 'high hopes'],
  'green day': ['green day', 'green', 'billie joe armstrong', 'american idiot', 'saviors'],
  'linkin park': ['linkin park', 'linkin', 'chester bennington', 'emily armstrong', 'hybrid theory'],
  
  // Country - Major 2025 Tours
  'morgan wallen': ['morgan wallen', 'morgan', 'wallen', 'dangerous', 'one thing at a time'],
  'luke combs': ['luke combs', 'luke', 'combs', 'hurricane', 'fathers and sons'],
  'chris stapleton': ['chris stapleton', 'chris', 'stapleton', 'traveller', 'higher'],
  'zac brown band': ['zac brown band', 'zac brown', 'chicken fried', 'the comeback'],
  'keith urban': ['keith urban', 'keith', 'urban', 'blue ain\'t your color', 'high'],
  'carrie underwood': ['carrie underwood', 'carrie', 'underwood', 'before he cheats', 'denim rhinestones'],
  
  // Latin - Major 2025 Tours
  'karol g': ['karol g', 'karol', 'bichota', 'mañana será bonito', 'tomorrow will be beautiful'],
  'peso pluma': ['peso pluma', 'peso', 'pluma', 'genesis', 'exodo'],
  'feid': ['feid', 'ferxxo', 'mor no le temas a la oscuridad'],
  'rauw alejandro': ['rauw alejandro', 'rauw', 'alejandro', 'vice versa', 'cosa nuestra'],
  
  // Electronic/DJ - Major 2025 Tours
  'calvin harris': ['calvin harris', 'calvin', 'harris', 'miracle', 'funk wav bounces'],
  'david guetta': ['david guetta', 'david', 'guetta', 'when love takes over', '7'],
  'skrillex': ['skrillex', 'sonny moore', 'quest for fire'],
  'diplo': ['diplo', 'thomas wesley', 'major lazer'],
  
  // Comedy - Major 2025 Tours
  'dave chappelle': ['dave chappelle', 'chappelle', 'dave', 'chappelle show', 'the dreamer'],
  'kevin hart': ['kevin hart', 'hart', 'kevin', 'irresponsible', 'acting my age'],
  'jerry seinfeld': ['jerry seinfeld', 'seinfeld', 'jerry', 'comedian'],
  'john mulaney': ['john mulaney', 'mulaney', 'john', 'everybody\'s in la'],
  'matt rife': ['matt rife', 'matt', 'rife', 'natural selection', 'problemattic'],
  'sebastian maniscalco': ['sebastian maniscalco', 'sebastian', 'maniscalco', 'stay hungry'],
  'bert kreischer': ['bert kreischer', 'bert', 'kreischer', 'the machine', 'hey big boy'],
  'tom segura': ['tom segura', 'tom', 'segura', 'sledgehammer', 'come together'],
  
  // Broadway/Theater - Major 2025 Productions
  'hamilton': ['hamilton', 'lin manuel miranda', 'musical', 'alexander hamilton'],
  'wicked': ['wicked', 'musical', 'defying gravity', 'popular'],
  'lion king': ['lion king', 'disney', 'musical', 'circle of life'],
  'phantom': ['phantom of the opera', 'phantom', 'andrew lloyd webber', 'music of the night'],
  'chicago': ['chicago', 'musical', 'all that jazz', 'cell block tango'],
  'book of mormon': ['book of mormon', 'mormon', 'trey parker', 'matt stone'],
  'moulin rouge': ['moulin rouge', 'moulin', 'rouge', 'musical', 'spectacular'],
  'aladdin': ['aladdin', 'disney', 'musical', 'a whole new world'],
  'frozen': ['frozen', 'disney', 'musical', 'let it go', 'elsa'],
  
  // Festivals & Special Events
  'coachella': ['coachella', 'coachella valley', 'indio', 'festival'],
  'lollapalooza': ['lollapalooza', 'lolla', 'grant park', 'chicago festival'],
  'bonnaroo': ['bonnaroo', 'bonnaroo music festival', 'manchester', 'tennessee'],
  'outside lands': ['outside lands', 'golden gate park', 'san francisco'],
  'austin city limits': ['austin city limits', 'acl', 'zilker park', 'austin'],
  'electric daisy carnival': ['electric daisy carnival', 'edc', 'las vegas', 'insomniac'],
  'burning man': ['burning man', 'black rock city', 'nevada', 'playa']
};

export async function handleEntertainmentEventFinder(
  apiClient: TevoApiClient,
  cache: MemoryCache,
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

    // STRATEGY 0: Suggestions-based discovery for entertainment
    console.error(JSON.stringify({ type: 'strategy', name: 'suggestions_based_search' }));
    searchResults.search_summary.strategies_tried.push('suggestions_based_search');
    try {
      const cacheKey = cache.generateKey('ent_sugg', { q: validatedParams.query });
      let suggestions = cache.getRequestScoped<any>(cacheKey);
      if (!suggestions) {
        suggestions = await apiClient.searchSuggestions({ q: validatedParams.query, limit: 10, fuzzy: true });
        cache.setRequestScoped(cacheKey, suggestions);
      }

      const { startISO, endISO } = computeSearchWindow(validatedParams);

      // Hydrate direct event suggestions
      for (const ev of (suggestions.events || []).slice(0, 5)) {
        try {
          const detailed = await apiClient.getEvent({ event_id: ev.id });
          foundEvents.push(detailed);
          searchResults.search_summary.api_calls_made++;
        } catch {}
      }

      // Performer suggestions → list events
      for (const perf of (suggestions.performers || []).slice(0, 5)) {
        const resp = await apiClient.listEvents({
          performer_id: perf.id,
          ...(startISO ? { occurs_at_gte: startISO } : {}),
          ...(endISO ? { occurs_at_lt: endISO } : {}),
          per_page: 100
        });
        searchResults.search_summary.api_calls_made++;
        foundEvents.push(...(resp.events || []));
      }

      // Venue suggestions → list events
      for (const ven of (suggestions.venues || []).slice(0, 3)) {
        const resp = await apiClient.listEvents({
          venue_id: ven.id,
          ...(startISO ? { occurs_at_gte: startISO } : {}),
          ...(endISO ? { occurs_at_lt: endISO } : {}),
          per_page: 100
        });
        searchResults.search_summary.api_calls_made++;
        foundEvents.push(...(resp.events || []));
      }

      if (foundEvents.length > 0 && !searchResults.strategy_used) {
        searchResults.strategy_used = 'suggestions_based_search';
      }
    } catch (e) {
      console.error(JSON.stringify({ type: 'suggestions_search_error', message: e instanceof Error ? e.message : String(e) }));
    }
    
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
        Object.values(ENTERTAINMENT_VENUES).slice(0, 8); // Expanded from 5 to 8 venues
      
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
    
    // STRATEGY 5: Dynamic fuzzy search for unknown artists (NEW)
    if (foundEvents.length === 0) {
      console.error(JSON.stringify({ type: 'strategy', name: 'fuzzy_entertainment_search' }));
      searchResults.search_summary.strategies_tried.push('fuzzy_entertainment_search');
      
      // Use same keyword extraction as universal finder
      const extractedKeywords = extractEntertainmentKeywords(validatedParams.query);
      
      // Search major entertainment markets
      const majorEntertainmentCities = [
        { name: 'New York', lat: 40.7128, lon: -74.0060, radius: 50 },
        { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, radius: 50 },
        { name: 'Las Vegas', lat: 36.1699, lon: -115.1398, radius: 30 },
        { name: 'Nashville', lat: 36.1627, lon: -86.7816, radius: 30 },
        { name: 'Chicago', lat: 41.8781, lon: -87.6298, radius: 40 },
        { name: 'Atlanta', lat: 33.7490, lon: -84.3880, radius: 30 }
      ];
      
      for (const city of majorEntertainmentCities) {
        const searchParams: any = {
          lat: city.lat,
          lon: city.lon,
          within: city.radius,
          per_page: 100
        };
        
        // Flexible date range for entertainment
        if (validatedParams.date) {
          const targetDate = new Date(validatedParams.date);
          const searchStart = new Date(targetDate);
          searchStart.setDate(targetDate.getDate() - 14);
          const searchEnd = new Date(targetDate);
          searchEnd.setDate(targetDate.getDate() + 14);
          searchParams.occurs_at_gte = searchStart.toISOString();
          searchParams.occurs_at_lt = searchEnd.toISOString();
        } else {
          const now = new Date();
          const futureDate = new Date();
          futureDate.setDate(now.getDate() + (validatedParams.weeks_ahead! * 7));
          searchParams.occurs_at_gte = now.toISOString();
          searchParams.occurs_at_lt = futureDate.toISOString();
        }
        
        const eventsResponse = await apiClient.listEvents(searchParams);
        searchResults.search_summary.api_calls_made++;
        searchResults.search_summary.total_events_searched += eventsResponse.events?.length || 0;
        
        // Use fuzzy matching for entertainment events
        const matchingEvents = eventsResponse.events?.filter(event => {
          return fuzzyEntertainmentMatch(event.name, extractedKeywords, validatedParams.query);
        }) || [];
        
        if (matchingEvents.length > 0) {
          foundEvents.push(...matchingEvents);
          searchResults.strategy_used = 'fuzzy_entertainment_search';
          console.error(JSON.stringify({
            type: 'fuzzy_entertainment_success',
            city: city.name,
            events_found: matchingEvents.length,
            keywords_used: extractedKeywords
          }));
          break;
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

function computeSearchWindow(params: { date?: string, weeks_ahead?: number }): { startISO?: string, endISO?: string } {
  if (params.date) {
    const target = new Date(params.date);
    const start = new Date(target); start.setHours(0,0,0,0);
    const end = new Date(target); end.setHours(23,59,59,999);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }
  const now = new Date();
  const end = new Date(now);
  const weeks = typeof params.weeks_ahead === 'number' ? params.weeks_ahead : 16;
  end.setDate(end.getDate() + weeks * 7);
  return { startISO: now.toISOString(), endISO: end.toISOString() };
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
    searchStart.setDate(targetDate.getDate() - 14); // Expand to ±14 days for better coverage
    const searchEnd = new Date(targetDate);
    searchEnd.setDate(targetDate.getDate() + 14);
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
    searchStart.setDate(targetDate.getDate() - 14); // Expand to ±14 days for better coverage
    const searchEnd = new Date(targetDate);
    searchEnd.setDate(targetDate.getDate() + 14);
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

/**
 * Extract entertainment-focused keywords from search query
 */
function extractEntertainmentKeywords(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  
  // Entertainment-specific stop words
  const stopWords = new Set([
    'the', 'at', 'in', 'on', 'for', 'and', 'or', 'but', 'with', 'by', 'from', 
    'to', 'of', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'concert', 'show', 'event', 'tour', 'live', 'tickets', 'ticket',
    '2025', '2024', '2026', 'music', 'singer', 'artist', 'performer'
  ]);
  
  // Extract meaningful words and phrases
  const words = lowerQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter(word => !/^\d+$/.test(word));
  
  // Create 2-word and 3-word phrases for artist names
  const phrases = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(words[i] + ' ' + words[i + 1]);
    if (i < words.length - 2) {
      phrases.push(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
    }
  }
  
  return [...words, ...phrases];
}

/**
 * Fuzzy matching specifically tuned for entertainment events
 */
function fuzzyEntertainmentMatch(eventName: string, keywords: string[], originalQuery: string): boolean {
  const lowerEventName = eventName.toLowerCase();
  const lowerOriginalQuery = originalQuery.toLowerCase();
  
  // Direct match with cleaned query
  const cleanedQuery = lowerOriginalQuery.replace(/[^\w\s]/g, ' ').trim();
  if (lowerEventName.includes(cleanedQuery)) {
    return true;
  }
  
  // Entertainment event patterns
  const entertainmentIndicators = [
    'concert', 'tour', 'live', 'show', 'musical', 'comedy', 'standup', 'stand-up',
    'broadway', 'theater', 'theatre', 'festival', 'acoustic', 'unplugged'
  ];
  
  const hasEntertainmentKeyword = entertainmentIndicators.some(indicator => 
    lowerEventName.includes(indicator)
  );
  
  // If it's clearly an entertainment event, be more lenient with matching
  const scoringThreshold = hasEntertainmentKeyword ? 0.25 : 0.35;
  
  let matchScore = 0;
  const totalKeywords = keywords.length;
  
  if (totalKeywords === 0) return false;
  
  for (const keyword of keywords) {
    if (lowerEventName.includes(keyword)) {
      // Artist names (longer phrases) get higher weight
      const weight = keyword.includes(' ') ? 3 : (keyword.length > 4 ? 2 : 1);
      matchScore += weight;
    }
    
    // Partial matching for artist names
    if (keyword.length > 4) {
      const threshold = Math.ceil(keyword.length * 0.7);
      if (findPartialEntertainmentMatch(lowerEventName, keyword, threshold)) {
        matchScore += 1;
      }
    }
  }
  
  const requiredScore = Math.max(1, totalKeywords * scoringThreshold);
  return matchScore >= requiredScore;
}

/**
 * Entertainment-specific partial matching
 */
function findPartialEntertainmentMatch(text: string, pattern: string, minMatch: number): boolean {
  // Check for word boundaries and common variations
  const words = text.split(/\s+/);
  
  for (const word of words) {
    if (word.length >= minMatch) {
      let matches = 0;
      const minLen = Math.min(word.length, pattern.length);
      
      for (let i = 0; i < minLen; i++) {
        if (word[i] === pattern[i]) {
          matches++;
        }
      }
      
      if (matches >= minMatch) {
        return true;
      }
    }
  }
  
  return false;
}
