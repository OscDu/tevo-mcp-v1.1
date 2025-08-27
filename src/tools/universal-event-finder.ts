import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { validateUniversalEventFinderParams } from '../utils/validation.js';

export function createUniversalEventFinderTool(_apiClient: TevoApiClient, _cache: MemoryCache): Tool {
  return {
    name: 'tevo_universal_event_finder',
    description: 'Smart universal event finder that automatically discovers events using intelligent search strategies',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Event search query (e.g., "Giants Patriots", "Canelo Crawford", "Wild Blues", "Taylor Swift Chicago")'
        },
        date: {
          type: 'string',
          description: 'Target date in YYYY-MM-DD format (optional)'
        },
        location: {
          type: 'string',
          description: 'City or venue (optional, e.g., "Chicago", "Las Vegas", "Wrigley Field")'
        },
        weeks_ahead: {
          type: 'integer',
          minimum: 1,
          maximum: 52,
          default: 12,
          description: 'Search within next N weeks if no specific date (default: 12)'
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

// Comprehensive team name and venue mappings
const TEAM_DATABASE = {
  // NFL Teams with all variations
  'patriots': { 
    venue_id: 2236, city: 'Boston', venue: 'Gillette Stadium', sport: 'nfl',
    variations: ['patriots', 'new england patriots', 'ne patriots', 'pats', 'new england']
  },
  'giants': { 
    venue_id: 2237, city: 'New York', venue: 'MetLife Stadium', sport: 'nfl',
    variations: ['giants', 'new york giants', 'ny giants', 'nyg']
  },
  'jets': { 
    venue_id: 2237, city: 'New York', venue: 'MetLife Stadium', sport: 'nfl',
    variations: ['jets', 'new york jets', 'ny jets', 'nyj']
  },
  'cowboys': { 
    venue_id: 2243, city: 'Dallas', venue: 'AT&T Stadium', sport: 'nfl',
    variations: ['cowboys', 'dallas cowboys', 'america\'s team', 'dal']
  },
  'packers': { 
    venue_id: 2253, city: 'Green Bay', venue: 'Lambeau Field', sport: 'nfl',
    variations: ['packers', 'green bay packers', 'gb packers', 'pack', 'cheese heads']
  },
  'chiefs': { 
    venue_id: 2304, city: 'Kansas City', venue: 'Arrowhead Stadium', sport: 'nfl',
    variations: ['chiefs', 'kansas city chiefs', 'kc chiefs', 'kc']
  },
  'raiders': { 
    venue_id: 2308, city: 'Las Vegas', venue: 'Allegiant Stadium', sport: 'nfl',
    variations: ['raiders', 'las vegas raiders', 'lv raiders', 'oakland raiders']
  },
  'chargers': { 
    city: 'Los Angeles', venue: 'SoFi Stadium', lat: 33.9535, lon: -118.3392, sport: 'nfl',
    variations: ['chargers', 'los angeles chargers', 'la chargers', 'lac', 'bolts', 'bolt up']
  },
  'rams': { 
    city: 'Los Angeles', venue: 'SoFi Stadium', lat: 33.9535, lon: -118.3392, sport: 'nfl',
    variations: ['rams', 'los angeles rams', 'la rams', 'lar']
  },
  
  // MLB Teams with all variations
  'cubs': { 
    city: 'Chicago', venue: 'Wrigley Field', lat: 41.9484, lon: -87.6553, sport: 'mlb',
    variations: ['cubs', 'chicago cubs', 'cubbies', 'chi cubs', 'chc']
  },
  'white sox': { 
    city: 'Chicago', venue: 'Guaranteed Rate Field', lat: 41.8300, lon: -87.6338, sport: 'mlb',
    variations: ['white sox', 'chicago white sox', 'chi white sox', 'sox', 'chw', 'wsox']
  },
  'yankees': { 
    city: 'New York', venue: 'Yankee Stadium', lat: 40.8296, lon: -73.9262, sport: 'mlb',
    variations: ['yankees', 'new york yankees', 'ny yankees', 'yanks', 'nyy', 'bronx bombers']
  },
  'dodgers': { 
    city: 'Los Angeles', venue: 'Dodger Stadium', lat: 34.0739, lon: -118.2400, sport: 'mlb',
    variations: ['dodgers', 'los angeles dodgers', 'la dodgers', 'lad', 'bums']
  },
  'red sox': { 
    city: 'Boston', venue: 'Fenway Park', lat: 42.3467, lon: -71.0972, sport: 'mlb',
    variations: ['red sox', 'boston red sox', 'sox', 'bos', 'bosox']
  },
  'rays': { 
    city: 'Tampa Bay', venue: 'Tropicana Field', lat: 27.7683, lon: -82.6534, sport: 'mlb',
    variations: ['rays', 'tampa bay rays', 'tb rays', 'devil rays', 'tb']
  },
  'angels': { 
    city: 'Los Angeles', venue: 'Angel Stadium', lat: 33.8003, lon: -117.8827, sport: 'mlb',
    variations: ['angels', 'los angeles angels', 'la angels', 'anaheim angels', 'laa']
  },
  'mets': { 
    city: 'New York', venue: 'Citi Field', lat: 40.7571, lon: -73.8458, sport: 'mlb',
    variations: ['mets', 'new york mets', 'ny mets', 'nym', 'amazins']
  },
  'padres': { 
    city: 'San Diego', venue: 'Petco Park', lat: 32.7073, lon: -117.1566, sport: 'mlb',
    variations: ['padres', 'san diego padres', 'sd padres', 'sdp', 'friars']
  },
  
  // NHL Teams with all variations
  'wild': { 
    city: 'Minneapolis', venue: 'Xcel Energy Center', lat: 44.9447, lon: -93.1016, sport: 'nhl',
    variations: ['wild', 'minnesota wild', 'min wild', 'mn wild']
  },
  'blues': { 
    city: 'St. Louis', venue: 'Enterprise Center', lat: 38.6265, lon: -90.2026, sport: 'nhl',
    variations: ['blues', 'st. louis blues', 'saint louis blues', 'stl blues', 'stl']
  },
  'rangers': { 
    city: 'New York', venue: 'Madison Square Garden', lat: 40.7505, lon: -73.9934, sport: 'nhl',
    variations: ['rangers', 'new york rangers', 'ny rangers', 'nyr', 'broadway blueshirts']
  },
  'blackhawks': { 
    city: 'Chicago', venue: 'United Center', lat: 41.8807, lon: -87.6742, sport: 'nhl',
    variations: ['blackhawks', 'chicago blackhawks', 'hawks', 'chi blackhawks', 'chi']
  },
  'kings': { 
    city: 'Los Angeles', venue: 'Crypto.com Arena', lat: 34.0430, lon: -118.2673, sport: 'nhl',
    variations: ['kings', 'los angeles kings', 'la kings', 'lak']
  },
  
  // NBA Teams with all variations
  'lakers': { 
    city: 'Los Angeles', venue: 'Crypto.com Arena', lat: 34.0430, lon: -118.2673, sport: 'nba',
    variations: ['lakers', 'los angeles lakers', 'la lakers', 'lal', 'purple and gold']
  },
  'warriors': { 
    city: 'San Francisco', venue: 'Chase Center', lat: 37.7680, lon: -122.3892, sport: 'nba',
    variations: ['warriors', 'golden state warriors', 'gs warriors', 'gsw', 'dubs']
  },
  'bulls': { 
    city: 'Chicago', venue: 'United Center', lat: 41.8807, lon: -87.6742, sport: 'nba',
    variations: ['bulls', 'chicago bulls', 'chi bulls']
  },
  'celtics': { 
    city: 'Boston', venue: 'TD Garden', lat: 42.3662, lon: -71.0621, sport: 'nba',
    variations: ['celtics', 'boston celtics', 'bos celtics', 'cs']
  }
};

// Entertainment database with major artists and concert venues
const ENTERTAINMENT_DATABASE = {
  // Popular Music Artists
  'taylor swift': {
    category: 'pop', genre: 'pop/country',
    variations: ['taylor swift', 'swift', 'taylor', 'eras tour'],
    major_venues: ['msg', 'sofi', 'metlife', 'soldier field']
  },
  'benson boone': {
    category: 'pop', genre: 'pop/rock',
    variations: ['benson boone', 'boone', 'american heart tour', 'american heart world tour'],
    major_venues: ['msg', 'beacon', 'barclays', 'prudential']
  },
  'beyonce': {
    category: 'pop', genre: 'r&b/pop',
    variations: ['beyonce', 'beyoncé', 'renaissance tour', 'queen b'],
    major_venues: ['msg', 'sofi', 'metlife', 'soldier field']
  },
  'drake': {
    category: 'hip-hop', genre: 'rap/hip-hop',
    variations: ['drake', 'aubrey graham', 'drizzy', 'ovo'],
    major_venues: ['msg', 'barclays', 'united center', 'chase center']
  },
  'adele': {
    category: 'pop', genre: 'pop/soul',
    variations: ['adele', 'adkins'],
    major_venues: ['msg', 'sphere', 'caesars palace']
  },
  'bad bunny': {
    category: 'reggaeton', genre: 'latin/reggaeton',
    variations: ['bad bunny', 'benito martinez', 'conejo malo'],
    major_venues: ['msg', 'yankee stadium', 'soldier field']
  },
  'harry styles': {
    category: 'pop', genre: 'pop/rock',
    variations: ['harry styles', 'harry', 'styles', 'love on tour'],
    major_venues: ['msg', 'the forum', 'united center']
  },
  'billie eilish': {
    category: 'pop', genre: 'alternative pop',
    variations: ['billie eilish', 'billie', 'eilish'],
    major_venues: ['msg', 'chase center', 'united center']
  }
};

// Major Concert Venues Database
const CONCERT_VENUES_DATABASE = {
  'msg': {
    name: 'Madison Square Garden',
    city: 'New York', state: 'NY',
    venue_id: 896, // Correct venue ID for MSG concerts (was 2305)
    lat: 40.7505, lon: -73.9934,
    capacity: 20000,
    variations: ['madison square garden', 'msg', 'the garden', 'knicks arena']
  },
  'barclays': {
    name: 'Barclays Center',
    city: 'Brooklyn', state: 'NY', 
    lat: 40.6826, lon: -73.9754,
    capacity: 19000,
    variations: ['barclays center', 'barclays', 'brooklyn arena']
  },
  'sofi': {
    name: 'SoFi Stadium',
    city: 'Los Angeles', state: 'CA',
    lat: 33.9535, lon: -118.3392,
    capacity: 70000,
    variations: ['sofi stadium', 'sofi', 'la stadium']
  },
  'sphere': {
    name: 'Sphere',
    city: 'Las Vegas', state: 'NV',
    lat: 36.1213, lon: -115.1678,
    capacity: 18600,
    variations: ['sphere', 'msg sphere', 'las vegas sphere']
  },
  'united center': {
    name: 'United Center',
    city: 'Chicago', state: 'IL',
    lat: 41.8807, lon: -87.6742,
    capacity: 23500,
    variations: ['united center', 'uc', 'chicago arena']
  },
  'chase center': {
    name: 'Chase Center',
    city: 'San Francisco', state: 'CA',
    lat: 37.7680, lon: -122.3892,
    capacity: 18500,
    variations: ['chase center', 'sf arena', 'warriors arena']
  }
};

// Reverse lookup: variation -> team key
const TEAM_VARIATION_MAP: { [key: string]: string } = {};
Object.keys(TEAM_DATABASE).forEach(teamKey => {
  const team = TEAM_DATABASE[teamKey as keyof typeof TEAM_DATABASE];
  team.variations.forEach((variation: string) => {
    TEAM_VARIATION_MAP[variation.toLowerCase()] = teamKey;
  });
});

// Reverse lookup: variation -> artist key  
const ARTIST_VARIATION_MAP: { [key: string]: string } = {};
Object.keys(ENTERTAINMENT_DATABASE).forEach(artistKey => {
  const artist = ENTERTAINMENT_DATABASE[artistKey as keyof typeof ENTERTAINMENT_DATABASE];
  artist.variations.forEach((variation: string) => {
    ARTIST_VARIATION_MAP[variation.toLowerCase()] = artistKey;
  });
});

// Reverse lookup: variation -> venue key
const VENUE_VARIATION_MAP: { [key: string]: string } = {};
Object.keys(CONCERT_VENUES_DATABASE).forEach(venueKey => {
  const venue = CONCERT_VENUES_DATABASE[venueKey as keyof typeof CONCERT_VENUES_DATABASE];
  venue.variations.forEach((variation: string) => {
    VENUE_VARIATION_MAP[variation.toLowerCase()] = venueKey;
  });
});

// City to teams mapping for disambiguation
const CITY_TEAMS_MAP = {
  'chicago': ['cubs', 'white sox', 'bulls', 'blackhawks'],
  'new york': ['yankees', 'mets', 'giants', 'jets', 'rangers'],
  'los angeles': ['dodgers', 'angels', 'lakers', 'kings'],
  'boston': ['red sox', 'patriots', 'celtics']
};

const CITY_COORDINATES = {
  'new york': { lat: 40.7128, lon: -74.0060 },
  'chicago': { lat: 41.8781, lon: -87.6298 },
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'las vegas': { lat: 36.1699, lon: -115.1398 },
  'boston': { lat: 42.3601, lon: -71.0589 },
  'miami': { lat: 25.7617, lon: -80.1918 },
  'philadelphia': { lat: 39.9526, lon: -75.1652 },
  'dallas': { lat: 32.7767, lon: -96.7970 },
  'atlanta': { lat: 33.7490, lon: -84.3880 },
  'denver': { lat: 39.7392, lon: -104.9903 },
  'minneapolis': { lat: 44.9778, lon: -93.2650 },
  'st. louis': { lat: 38.6270, lon: -90.1994 }
};

function parseQuery(query: string) {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  
  // Extract potential team names, opponents, event types, artists, and venues
  const teams: string[] = [];
  const artists: string[] = [];
  const eventTypes: string[] = [];
  const venues: string[] = [];
  const resolvedTeams: string[] = [];
  const resolvedArtists: string[] = [];
  const resolvedVenues: string[] = [];
  const ambiguousTerms: string[] = [];
  
  // Sports keywords
  if (lowerQuery.includes('vs') || lowerQuery.includes('at') || lowerQuery.includes('v.')) {
    eventTypes.push('sports');
  }
  
  // Boxing keywords
  if (lowerQuery.includes('fight') || lowerQuery.includes('boxing') || 
      lowerQuery.includes('canelo') || lowerQuery.includes('crawford')) {
    eventTypes.push('boxing');
  }
  
  // Concert keywords
  if (lowerQuery.includes('concert') || lowerQuery.includes('tour') || 
      lowerQuery.includes('show') || lowerQuery.includes('live') ||
      lowerQuery.includes('music') || lowerQuery.includes('festival')) {
    eventTypes.push('concert');
  }
  
  // Theater/Comedy keywords
  if (lowerQuery.includes('theater') || lowerQuery.includes('theatre') ||
      lowerQuery.includes('comedy') || lowerQuery.includes('broadway') ||
      lowerQuery.includes('musical') || lowerQuery.includes('standup')) {
    eventTypes.push('entertainment');
  }
  
  // Enhanced entity resolution - try different phrase lengths
  const queryPhrases = [];
  
  // Try full query as phrase first
  queryPhrases.push(lowerQuery);
  
  // Try consecutive word combinations (2-word, 3-word, etc.)
  for (let len = 2; len <= Math.min(4, words.length); len++) {
    for (let i = 0; i <= words.length - len; i++) {
      queryPhrases.push(words.slice(i, i + len).join(' '));
    }
  }
  
  // Add individual words
  queryPhrases.push(...words);
  
  // Resolve team names using variation map
  queryPhrases.forEach(phrase => {
    const cleanPhrase = phrase.replace(/[^\w\s]/g, '').trim();
    if (cleanPhrase && TEAM_VARIATION_MAP[cleanPhrase]) {
      const teamKey = TEAM_VARIATION_MAP[cleanPhrase];
      if (!resolvedTeams.includes(teamKey)) {
        resolvedTeams.push(teamKey);
        teams.push(teamKey);
      }
    }
  });
  
  // Resolve artist names using variation map
  queryPhrases.forEach(phrase => {
    const cleanPhrase = phrase.replace(/[^\w\s]/g, '').trim();
    if (cleanPhrase && ARTIST_VARIATION_MAP[cleanPhrase]) {
      const artistKey = ARTIST_VARIATION_MAP[cleanPhrase];
      if (!resolvedArtists.includes(artistKey)) {
        resolvedArtists.push(artistKey);
        artists.push(artistKey);
      }
    }
  });
  
  // Resolve venue names using variation map
  queryPhrases.forEach(phrase => {
    const cleanPhrase = phrase.replace(/[^\w\s]/g, '').trim();
    if (cleanPhrase && VENUE_VARIATION_MAP[cleanPhrase]) {
      const venueKey = VENUE_VARIATION_MAP[cleanPhrase];
      if (!resolvedVenues.includes(venueKey)) {
        resolvedVenues.push(venueKey);
        venues.push(venueKey);
      }
    }
  });
  
  // Check for city-only queries that need disambiguation
  Object.keys(CITY_TEAMS_MAP).forEach(city => {
    if (lowerQuery.includes(city) && resolvedTeams.length === 0 && resolvedArtists.length === 0) {
      ambiguousTerms.push(city);
    }
  });
  
  // Fuzzy matching for partial team names (if no exact matches found)
  if (resolvedTeams.length === 0) {
    words.forEach(word => {
      if (word.length >= 4) { // Only match words 4+ chars
        Object.keys(TEAM_DATABASE).forEach(teamKey => {
          const team = TEAM_DATABASE[teamKey as keyof typeof TEAM_DATABASE];
          team.variations.forEach((variation: string) => {
            if (variation.includes(word) || word.includes(variation.split(' ')[0])) {
              if (!resolvedTeams.includes(teamKey)) {
                resolvedTeams.push(teamKey);
                teams.push(teamKey);
              }
            }
          });
        });
      }
    });
  }
  
  // Fuzzy matching for partial artist names (if no exact matches found)  
  if (resolvedArtists.length === 0) {
    words.forEach(word => {
      if (word.length >= 4) { // Only match words 4+ chars
        Object.keys(ENTERTAINMENT_DATABASE).forEach(artistKey => {
          const artist = ENTERTAINMENT_DATABASE[artistKey as keyof typeof ENTERTAINMENT_DATABASE];
          artist.variations.forEach((variation: string) => {
            if (variation.includes(word) || word.includes(variation.split(' ')[0])) {
              if (!resolvedArtists.includes(artistKey)) {
                resolvedArtists.push(artistKey);
                artists.push(artistKey);
              }
            }
          });
        });
      }
    });
  }
  
  return {
    originalQuery: query,
    teams,
    artists,
    venues,
    resolvedTeams,
    resolvedArtists,
    resolvedVenues,
    eventTypes,
    words,
    ambiguousTerms,
    isVsMatch: lowerQuery.includes('vs') || lowerQuery.includes(' at ') || lowerQuery.includes(' v '),
    hasSingleTeam: resolvedTeams.length === 1,
    hasMultipleTeams: resolvedTeams.length > 1,
    hasSingleArtist: resolvedArtists.length === 1,
    hasMultipleArtists: resolvedArtists.length > 1,
    hasVenue: resolvedVenues.length > 0,
    isEntertainment: resolvedArtists.length > 0 || eventTypes.includes('concert') || eventTypes.includes('entertainment'),
    isSports: resolvedTeams.length > 0 || eventTypes.includes('sports') || eventTypes.includes('boxing'),
    isAmbiguous: ambiguousTerms.length > 0 && resolvedTeams.length === 0 && resolvedArtists.length === 0
  };
}

/**
 * Filter events to show live events including sports, concerts, and entertainment
 * This includes both sports events and legitimate entertainment events
 */
function filterForLiveEventsOnly(events: any[]): any[] {
  return events.filter(event => {
    const name = event.name.toLowerCase();
    
    // EXCLUDE low-quality or non-event listings (keeping the essential filters)
    const excludeKeywords = [
      // Non-events
      'parking', 'lot', 'garage', 'shuttle', 'transportation',
      // Private/corporate events that aren't public
      'private party', 'corporate event', 'wedding', 'funeral',
      // Auction-style or unclear events
      'auction', 'bid', 'raffle'
    ];
    
    // Check if event contains excluded keywords
    const hasExcludedKeyword = excludeKeywords.some(keyword => 
      name.includes(keyword)
    );
    
    if (hasExcludedKeyword) {
      return false;
    }
    
    // INCLUDE sports events
    const sportsKeywords = [
      // Sports formats
      'vs', 'at', 'v.', 'versus',
      // Common team suffixes
      'fc', 'united', 'city', 'rangers', 'bulls', 'hawks', 'kings',
      // Sports terminology
      'game', 'match', 'championship', 'playoff', 'bowl', 'cup', 'series',
      'season opener', 'home opener', 'final', 'semifinal', 'quarterfinal',
      // Boxing/MMA
      'fight', 'boxing', 'championship fight', 'title fight', 'mma', 'ufc',
      // Common league patterns
      'nfl', 'nba', 'mlb', 'nhl', 'mls', 'ncaa', 'college'
    ];
    
    const hasSportsKeyword = sportsKeywords.some(keyword => 
      name.includes(keyword)
    );
    
    // Check for team names from our database
    const hasKnownTeam = Object.keys(TEAM_DATABASE).some(teamKey => {
      const team = TEAM_DATABASE[teamKey as keyof typeof TEAM_DATABASE];
      return team.variations.some(variation => 
        name.includes(variation.toLowerCase())
      );
    });
    
    // Check for known artists from entertainment database
    const hasKnownArtist = Object.keys(ENTERTAINMENT_DATABASE).some(artistKey => {
      const artist = ENTERTAINMENT_DATABASE[artistKey as keyof typeof ENTERTAINMENT_DATABASE];
      return artist.variations.some(variation => 
        name.includes(variation.toLowerCase())
      );
    });
    
    // INCLUDE entertainment events
    const entertainmentKeywords = [
      'concert', 'tour', 'show', 'festival', 'comedy', 'theater', 'musical',
      'broadway', 'stand-up', 'standup', 'comedian', 'band', 'singer',
      'artist', 'album', 'world tour', 'farewell tour', 'acoustic',
      'live music', 'dance', 'ballet', 'opera', 'symphony', 'orchestra',
      'tribute', 'covers', 'live', 'performance', 'recital', 'gala'
    ];
    
    const hasEntertainmentKeyword = entertainmentKeywords.some(keyword => 
      name.includes(keyword)
    );
    
    // Include if it has sports, entertainment keywords, known teams, OR known artists
    return hasSportsKeyword || hasKnownTeam || hasEntertainmentKeyword || hasKnownArtist;
  });
}

export async function handleUniversalEventFinder(
  apiClient: TevoApiClient,
  _cache: MemoryCache,
  params: unknown
) {
  const validatedParams = validateUniversalEventFinderParams(params);
  
  console.error(JSON.stringify({
    type: 'universal_event_finder_start',
    query: validatedParams.query,
    date: validatedParams.date,
    location: validatedParams.location
  }));

  const searchResults = {
    strategy_used: '',
    events_found: [] as any[],
    search_summary: {
      query: validatedParams.query,
      strategies_tried: [] as string[],
      api_calls_made: 0,
      total_events_searched: 0
    }
  };

  try {
    const queryInfo = parseQuery(validatedParams.query);
    let foundEvents: any[] = [];
    
    // Handle ambiguous queries (city-only with multiple teams)
    if (queryInfo.isAmbiguous) {
      console.error(JSON.stringify({ 
        type: 'ambiguous_query_detected', 
        ambiguous_terms: queryInfo.ambiguousTerms 
      }));
      
      const ambiguousCity = queryInfo.ambiguousTerms[0];
      const possibleTeams = CITY_TEAMS_MAP[ambiguousCity as keyof typeof CITY_TEAMS_MAP] || [];
      
      return {
        success: false,
        query: validatedParams.query,
        strategy_used: 'disambiguation_needed',
        disambiguation: {
          city: ambiguousCity,
          possible_teams: possibleTeams.map(teamKey => {
            const team = TEAM_DATABASE[teamKey as keyof typeof TEAM_DATABASE];
            return {
              team_key: teamKey,
              full_name: team.variations[1] || team.variations[0], // Use full name if available
              sport: team.sport,
              venue: team.venue
            };
          }),
          suggestion: `Please be more specific. Did you mean one of these teams: ${possibleTeams.map(t => TEAM_DATABASE[t as keyof typeof TEAM_DATABASE].variations[1] || t).join(', ')}?`
        },
        search_summary: {
          ...searchResults.search_summary,
          disambiguation_required: true
        }
      };
    }
    
    // STRATEGY 1: Direct date + location search (most efficient)
    if (validatedParams.date && validatedParams.location) {
      console.error(JSON.stringify({ type: 'strategy', name: 'date_location_search' }));
      searchResults.search_summary.strategies_tried.push('date_location_search');
      
      const coords = CITY_COORDINATES[validatedParams.location.toLowerCase() as keyof typeof CITY_COORDINATES];
      if (coords) {
        const targetDate = new Date(validatedParams.date);
        const searchStart = new Date(targetDate);
        searchStart.setHours(0, 0, 0, 0);
        const searchEnd = new Date(targetDate);
        searchEnd.setHours(23, 59, 59, 999);
        
        const eventsResponse = await apiClient.listEvents({
          lat: coords.lat,
          lon: coords.lon,
          within: 25,
          occurs_at_gte: searchStart.toISOString(),
          occurs_at_lt: searchEnd.toISOString(),
          per_page: 50
        });
        
        searchResults.search_summary.api_calls_made++;
        searchResults.search_summary.total_events_searched += eventsResponse.events?.length || 0;
        
        foundEvents = eventsResponse.events?.filter(event => 
          queryInfo.words.some(word => 
            event.name.toLowerCase().includes(word)
          )
        ) || [];
        
        if (foundEvents.length > 0) {
          searchResults.strategy_used = 'date_location_search';
        }
      }
    }
    
    // STRATEGY 1B: Entertainment-focused search for known artists
    if (foundEvents.length === 0 && queryInfo.isEntertainment && queryInfo.resolvedArtists.length > 0 && validatedParams.date) {
      console.error(JSON.stringify({ type: 'strategy', name: 'entertainment_focused_search' }));
      searchResults.search_summary.strategies_tried.push('entertainment_focused_search');
      
      // Search major entertainment venues for the artist
      const majorVenues = [
        CONCERT_VENUES_DATABASE['msg'], // Madison Square Garden first
        CONCERT_VENUES_DATABASE['barclays'],
        CONCERT_VENUES_DATABASE['united center'],
        CONCERT_VENUES_DATABASE['chase center']
      ].filter(Boolean); // Remove any undefined venues
      
      for (const venue of majorVenues) {
        const targetDate = new Date(validatedParams.date);
        const searchStart = new Date(targetDate);
        searchStart.setDate(targetDate.getDate() - 7); // ±7 days for entertainment
        const searchEnd = new Date(targetDate);
        searchEnd.setDate(targetDate.getDate() + 7);
        
        const searchParams: any = {
          per_page: 50,
          occurs_at_gte: searchStart.toISOString(),
          occurs_at_lt: searchEnd.toISOString()
        };
        
        if ('venue_id' in venue && venue.venue_id) {
          searchParams.venue_id = venue.venue_id;
        } else {
          searchParams.lat = venue.lat;
          searchParams.lon = venue.lon;
          searchParams.within = 5;
        }
        
        const eventsResponse = await apiClient.listEvents(searchParams);
        searchResults.search_summary.api_calls_made++;
        searchResults.search_summary.total_events_searched += eventsResponse.events?.length || 0;
        
        const artistEvents = eventsResponse.events?.filter(event => {
          const eventName = event.name.toLowerCase();
          return queryInfo.resolvedArtists.some(artistKey => {
            const artist = ENTERTAINMENT_DATABASE[artistKey as keyof typeof ENTERTAINMENT_DATABASE];
            return artist.variations.some((variation: string) =>
              eventName.includes(variation.toLowerCase())
            );
          });
        }) || [];
        
        if (artistEvents.length > 0) {
          foundEvents.push(...artistEvents);
          searchResults.strategy_used = 'entertainment_focused_search';
          break;
        }
      }
    }
    
    // STRATEGY 2: Comprehensive team search (home + away games)
    if (foundEvents.length === 0 && queryInfo.resolvedTeams.length > 0) {
      console.error(JSON.stringify({ type: 'strategy', name: 'comprehensive_team_search' }));
      searchResults.search_summary.strategies_tried.push('comprehensive_team_search');
      
      // For single team queries, search both home and away games
      if (queryInfo.resolvedTeams.length === 1) {
        const teamKey = queryInfo.resolvedTeams[0];
        const team = TEAM_DATABASE[teamKey as keyof typeof TEAM_DATABASE];
        
        console.error(JSON.stringify({ 
          type: 'single_team_search', 
          team: teamKey, 
          variations: team.variations 
        }));
        
        // STEP 1: Search home games at team's venue
        let homeEvents: any[] = [];
        if ('venue_id' in team && team.venue_id) {
          const homeSearchParams: any = {
            venue_id: team.venue_id,
            per_page: 50
          };
          
          // Add date range
          if (validatedParams.date) {
            const targetDate = new Date(validatedParams.date);
            const searchStart = new Date(targetDate);
            searchStart.setDate(targetDate.getDate() - 2);
            const searchEnd = new Date(targetDate);
            searchEnd.setDate(targetDate.getDate() + 2);
            homeSearchParams.occurs_at_gte = searchStart.toISOString();
            homeSearchParams.occurs_at_lt = searchEnd.toISOString();
          } else {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + (validatedParams.weeks_ahead! * 7));
            homeSearchParams.occurs_at_gte = now.toISOString();
            homeSearchParams.occurs_at_lt = futureDate.toISOString();
          }
          
          const homeEventsResponse = await apiClient.listEvents(homeSearchParams);
          searchResults.search_summary.api_calls_made++;
          searchResults.search_summary.total_events_searched += homeEventsResponse.events?.length || 0;
          
          homeEvents = homeEventsResponse.events?.filter(event => {
            const eventName = event.name.toLowerCase();
            const hasTeamName = team.variations.some(variation => 
              eventName.includes(variation.toLowerCase())
            );
            
            if (hasTeamName && team.sport === 'nfl') {
              return eventName.includes('nfl') || 
                     eventName.includes('preseason') ||
                     eventName.includes('playoff') ||
                     eventName.includes('super bowl') ||
                     // NFL vs pattern - exclude minor league matches
                     ((eventName.includes(' vs ') || eventName.includes(' at ')) &&
                      !eventName.includes('minor league') &&
                      !eventName.includes('college') &&
                      !eventName.includes('thunderbolts'));
            }
            return hasTeamName;
          }) || [];
          
          console.error(JSON.stringify({ 
            type: 'home_games_found', 
            count: homeEvents.length 
          }));
        }
        
        // STEP 2: Search away games nationwide
        let awayEvents: any[] = [];
        const awaySearchParams: any = {
          per_page: 100
        };
        
        // Add date range for away games
        if (validatedParams.date) {
          const targetDate = new Date(validatedParams.date);
          const searchStart = new Date(targetDate);
          searchStart.setDate(targetDate.getDate() - 2);
          const searchEnd = new Date(targetDate);
          searchEnd.setDate(targetDate.getDate() + 2);
          awaySearchParams.occurs_at_gte = searchStart.toISOString();
          awaySearchParams.occurs_at_lt = searchEnd.toISOString();
        } else {
          const now = new Date();
          const futureDate = new Date();
          futureDate.setDate(now.getDate() + (validatedParams.weeks_ahead! * 7));
          awaySearchParams.occurs_at_gte = now.toISOString();
          awaySearchParams.occurs_at_lt = futureDate.toISOString();
        }
        
        // Search major markets for away games
        const majorMarkets = [
          { city: 'New York', lat: 40.7128, lon: -74.0060 },
          { city: 'Chicago', lat: 41.8781, lon: -87.6298 },
          { city: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
          { city: 'San Francisco', lat: 37.7749, lon: -122.4194 },
          { city: 'Boston', lat: 42.3601, lon: -71.0589 },
          { city: 'Philadelphia', lat: 39.9526, lon: -75.1652 },
          { city: 'Atlanta', lat: 33.7490, lon: -84.3880 },
          { city: 'Miami', lat: 25.7617, lon: -80.1918 },
          { city: 'San Diego', lat: 32.7157, lon: -117.1611 },
          { city: 'Seattle', lat: 47.6062, lon: -122.3321 }
        ];
        
        for (const market of majorMarkets) {
          const marketSearchParams = {
            ...awaySearchParams,
            lat: market.lat,
            lon: market.lon,
            within: 50
          };
          
          const marketEventsResponse = await apiClient.listEvents(marketSearchParams);
          searchResults.search_summary.api_calls_made++;
          searchResults.search_summary.total_events_searched += marketEventsResponse.events?.length || 0;
          
          const marketAwayEvents = marketEventsResponse.events?.filter(event => {
            const eventName = event.name.toLowerCase();
            const hasTeamMatch = team.variations.some(variation => {
              // Look for team name in away game context
              return eventName.includes(variation.toLowerCase()) && 
                     (eventName.includes(' at ') || eventName.includes(' @ ') || eventName.includes(' vs '));
            });
            
            if (hasTeamMatch && team.sport === 'nfl') {
              return eventName.includes('nfl') || 
                     eventName.includes('preseason') ||
                     eventName.includes('playoff') ||
                     eventName.includes('super bowl') ||
                     // Exclude minor league games that might match team variations
                     (!eventName.includes('minor league') &&
                      !eventName.includes('college') &&
                      !eventName.includes('thunderbolts'));
            }
            return hasTeamMatch;
          }) || [];
          
          if (marketAwayEvents.length > 0) {
            console.error(JSON.stringify({ 
              type: 'away_games_found', 
              market: market.city,
              count: marketAwayEvents.length 
            }));
            
            // Add unique away events
            marketAwayEvents.forEach(event => {
              if (!awayEvents.some(existing => existing.id === event.id) &&
                  !homeEvents.some(existing => existing.id === event.id)) {
                awayEvents.push(event);
              }
            });
          }
        }
        
        // Combine home and away events
        foundEvents = [...homeEvents, ...awayEvents];
        
        if (foundEvents.length > 0) {
          searchResults.strategy_used = 'comprehensive_team_search';
          console.error(JSON.stringify({ 
            type: 'comprehensive_search_complete',
            home_games: homeEvents.length,
            away_games: awayEvents.length,
            total_games: foundEvents.length
          }));
        }
      }
      
      // For VS matches, use the original venue-based logic
      else if (queryInfo.isVsMatch) {
        // Find home team and search their venue
        for (const team of queryInfo.resolvedTeams) {
          const venueInfo = TEAM_DATABASE[team as keyof typeof TEAM_DATABASE];
          if (venueInfo) {
          const searchParams: any = {
            per_page: 50
          };
          
          // Add venue ID if available
          if ('venue_id' in venueInfo && venueInfo.venue_id) {
            searchParams.venue_id = venueInfo.venue_id;
          } else if ('lat' in venueInfo && 'lon' in venueInfo && venueInfo.lat && venueInfo.lon) {
            searchParams.lat = venueInfo.lat;
            searchParams.lon = venueInfo.lon;
            searchParams.within = 5; // Very tight radius for venue
          }
          
          // Add date range
          if (validatedParams.date) {
            const targetDate = new Date(validatedParams.date);
            const searchStart = new Date(targetDate);
            searchStart.setDate(targetDate.getDate() - 2);
            const searchEnd = new Date(targetDate);
            searchEnd.setDate(targetDate.getDate() + 2);
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
          
          // Filter for matchup with sport priority
          const matchingEvents = eventsResponse.events?.filter(event => {
            const eventName = event.name.toLowerCase();
            return queryInfo.resolvedTeams.every(teamKey => {
              const team = TEAM_DATABASE[teamKey as keyof typeof TEAM_DATABASE];
              const hasTeamName = team.variations.some(variation => 
                eventName.includes(variation.toLowerCase())
              );
              
              // If we have a team match, apply sport-specific filtering
              if (hasTeamName) {
                // For NFL teams, prefer events that look like NFL games
                if (team.sport === 'nfl') {
                  return eventName.includes('nfl') || 
                         eventName.includes('preseason') ||
                         eventName.includes('playoff') ||
                         eventName.includes('super bowl') ||
                         // NFL team vs team pattern
                         (eventName.includes(' vs ') || eventName.includes(' at ')) &&
                         !eventName.includes('minor league') &&
                         !eventName.includes('college') &&
                         !eventName.includes('thunderbolts');
                }
                return true;
              }
              return false;
            });
          }) || [];
          
          if (matchingEvents.length > 0) {
            foundEvents = matchingEvents;
            searchResults.strategy_used = 'venue_based_sports';
            break;
          }
        }
      }
      }
    }
    
    // STRATEGY 3: City-based search with keyword matching
    if (foundEvents.length === 0) {
      console.error(JSON.stringify({ type: 'strategy', name: 'city_keyword_search' }));
      searchResults.search_summary.strategies_tried.push('city_keyword_search');
      
      // Determine search locations
      const searchLocations = [];
      
      if (validatedParams.location) {
        const coords = CITY_COORDINATES[validatedParams.location.toLowerCase() as keyof typeof CITY_COORDINATES];
        if (coords) {
          searchLocations.push({ name: validatedParams.location, ...coords });
        }
      }
      
      // Add inferred locations from teams
      queryInfo.resolvedTeams.forEach(team => {
        const venueInfo = TEAM_DATABASE[team as keyof typeof TEAM_DATABASE];
        if (venueInfo && 'lat' in venueInfo && 'lon' in venueInfo && venueInfo.lat && venueInfo.lon) {
          searchLocations.push({ 
            name: venueInfo.city, 
            lat: venueInfo.lat, 
            lon: venueInfo.lon 
          });
        }
      });
      
      // If no specific locations, try major markets
      if (searchLocations.length === 0) {
        ['new york', 'chicago', 'los angeles', 'las vegas'].forEach(city => {
          const coords = CITY_COORDINATES[city as keyof typeof CITY_COORDINATES];
          if (coords) {
            searchLocations.push({ name: city, ...coords });
          }
        });
      }
      
      // Search each location
      for (const location of searchLocations.slice(0, 3)) { // Limit to 3 locations
        const searchParams: any = {
          lat: location.lat,
          lon: location.lon,
          within: 50,
          per_page: 100
        };
        
        // Add date range
        if (validatedParams.date) {
          const targetDate = new Date(validatedParams.date);
          const searchStart = new Date(targetDate);
          searchStart.setDate(targetDate.getDate() - 7);
          const searchEnd = new Date(targetDate);
          searchEnd.setDate(targetDate.getDate() + 7);
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
        
        // Keyword matching with fuzzy logic
        const matchingEvents = eventsResponse.events?.filter(event => {
          const eventName = event.name.toLowerCase();
          const matchCount = queryInfo.words.filter(word => 
            word.length > 2 && eventName.includes(word)
          ).length;
          return matchCount >= Math.min(2, queryInfo.words.length);
        }) || [];
        
        if (matchingEvents.length > 0) {
          foundEvents = matchingEvents;
          searchResults.strategy_used = 'city_keyword_search';
          break;
        }
      }
    }
    
    // Process found events
    if (foundEvents.length > 0) {
      console.error(JSON.stringify({
        type: 'events_found',
        count: foundEvents.length,
        strategy: searchResults.strategy_used
      }));
      
      // Filter to LIVE EVENTS ONLY - includes sports, concerts, and entertainment
      const liveEventsOnly = filterForLiveEventsOnly(foundEvents);
      
      console.error(JSON.stringify({
        type: 'live_events_filter_applied',
        original_count: foundEvents.length,
        live_events_count: liveEventsOnly.length,
        filtered_out: foundEvents.length - liveEventsOnly.length
      }));
      
      // Get ticket info if budget specified
      for (const event of liveEventsOnly.slice(0, 3)) { // Limit processing to 3 events
        try {
          const eventInfo: any = {
            event_id: event.id,
            name: event.name,
            date: new Date(event.occurs_at).toLocaleDateString(),
            time: new Date(event.occurs_at).toLocaleTimeString(),
            venue: event.venue?.name || 'Unknown venue',
            city: event.venue?.city || '',
            state: event.venue?.state || ''
          };
          
          if (validatedParams.budget_per_ticket) {
            const listingsResponse = await apiClient.getListings(event.id);
            searchResults.search_summary.api_calls_made++;
            
            const eligibleTickets = listingsResponse.ticket_groups
              ?.filter(tg => 
                tg.retail_price <= validatedParams.budget_per_ticket! && 
                tg.available_quantity >= validatedParams.requested_quantity! &&
                !tg.section?.toLowerCase().includes('parking')
              )
              ?.sort((a, b) => a.retail_price - b.retail_price)
              ?.slice(0, 5) || [];
              
            if (eligibleTickets.length > 0) {
              eventInfo.tickets = {
                available_within_budget: eligibleTickets.length,
                best_options: eligibleTickets.map(tg => ({
                  section: tg.section || 'N/A',
                  row: tg.row || 'N/A',
                  price_per_ticket: tg.retail_price,
                  total_cost: tg.retail_price * validatedParams.requested_quantity!,
                  available_quantity: tg.available_quantity
                }))
              };
            }
          }
          
          searchResults.events_found.push(eventInfo);
          
        } catch (error) {
          console.error(JSON.stringify({
            type: 'event_processing_error',
            event_id: event.id,
            error: error instanceof Error ? error.message : String(error)
          }));
        }
      }
    }
    
    // Use live-event-filtered events for final success determination
    const liveEventsFound = foundEvents.length > 0 ? 
      filterForLiveEventsOnly(foundEvents) : [];
    
    const result = {
      success: liveEventsFound.length > 0,
      query: validatedParams.query,
      strategy_used: searchResults.strategy_used,
      events_found: searchResults.events_found,
      search_summary: {
        ...searchResults.search_summary,
        events_discovered: foundEvents.length,
        events_processed: searchResults.events_found.length,
        live_events_only: liveEventsFound.length,
        non_live_events_filtered_out: foundEvents.length - liveEventsFound.length
      }
    };
    
    console.error(JSON.stringify({
      type: 'universal_event_finder_complete',
      success: result.success,
      events_found: result.events_found.length,
      api_calls: result.search_summary.api_calls_made,
      strategy: result.strategy_used
    }));
    
    return result;
    
  } catch (error) {
    console.error(JSON.stringify({
      type: 'universal_event_finder_error',
      error: error instanceof Error ? error.message : String(error),
      query: validatedParams.query
    }));
    
    throw error;
  }
}