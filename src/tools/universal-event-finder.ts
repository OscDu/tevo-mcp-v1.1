import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { validateUniversalEventFinderParams } from '../utils/validation.js';

export function createUniversalEventFinderTool(_apiClient: TevoApiClient, _cache: MemoryCache): Tool {
  return {
    name: 'tevo_universal_event_finder',
    description: 'PRIMARY: Universal event finder for team games, performers, festivals, and general events. Zero required clarifications. For team queries, infer home/away and search both if not specified. Defaults: requested_quantity=2; include tickets if budget given; no budget unless provided. Location optional—searches major markets when missing. Avoid asking for hosting team, seat type, or qty unless user specified.',
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

interface TeamInfo {
  venue_id?: number;
  city?: string;
  venue?: string;
  lat?: number;
  lon?: number;
  sport: string;
  variations: string[];
}

// Comprehensive team name and venue mappings
const TEAM_DATABASE: Record<string, TeamInfo> = {
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

// (Augmentation performed later after CITY maps are defined)

// Festival events database for multi-day events
const FESTIVAL_DATABASE = {
  'lollapalooza': {
    variations: ['lollapalooza', 'lolla', 'lollapalooza chicago', 'lollapalooza festival'],
    venue: { name: 'Grant Park', city: 'Chicago', lat: 41.8756, lon: -87.6244 },
    months: [7, 8], // July-August
    multi_day: true,
    typical_dates: '4-day festival in early August',
    keywords: ['festival', 'music festival', 'grant park', 'chicago music', 'four day pass', 'day pass']
  },
  'coachella': {
    variations: ['coachella', 'coachella valley', 'coachella festival', 'coachella music festival'],
    venue: { name: 'Empire Polo Club', city: 'Indio', lat: 33.6803, lon: -116.2378 },
    months: [4, 5], // April-May
    multi_day: true,
    typical_dates: '2 weekends in April',
    keywords: ['festival', 'desert', 'weekend 1', 'weekend 2', 'empire polo', 'indio']
  },
  'bonnaroo': {
    variations: ['bonnaroo', 'bonnaroo music festival', 'roo', 'bonnaroo farm'],
    venue: { name: 'Great Stage Park', city: 'Manchester', lat: 35.4889, lon: -86.0819 },
    months: [6], // June
    multi_day: true,
    typical_dates: '4-day festival in June',
    keywords: ['festival', 'farm', 'manchester', 'tennessee', 'camping', '4 day']
  },
  'outside lands': {
    variations: ['outside lands', 'outside lands festival', 'osl'],
    venue: { name: 'Golden Gate Park', city: 'San Francisco', lat: 37.7694, lon: -122.4862 },
    months: [8], // August
    multi_day: true,
    typical_dates: '3-day festival in August',
    keywords: ['festival', 'golden gate', 'san francisco', '3 day', 'lands end']
  },
  'austin city limits': {
    variations: ['austin city limits', 'acl', 'acl festival', 'austin city limits festival'],
    venue: { name: 'Zilker Park', city: 'Austin', lat: 30.2648, lon: -97.7729 },
    months: [10], // October
    multi_day: true,
    typical_dates: '2 weekends in October',
    keywords: ['festival', 'zilker', 'austin', 'weekend 1', 'weekend 2', '3 day']
  },
  'electric daisy carnival': {
    variations: ['electric daisy carnival', 'edc', 'edc las vegas', 'electric daisy'],
    venue: { name: 'Las Vegas Motor Speedway', city: 'Las Vegas', lat: 36.2717, lon: -115.0120 },
    months: [5, 10], // May and October
    multi_day: true,
    typical_dates: '3-day electronic festival',
    keywords: ['festival', 'electronic', 'edm', 'speedway', 'insomniac', '3 day']
  },
  'burning man': {
    variations: ['burning man', 'burning man festival', 'burn'],
    venue: { name: 'Black Rock Desert', city: 'Black Rock City', lat: 40.7864, lon: -119.2065 },
    months: [8, 9], // August-September
    multi_day: true,
    typical_dates: '8-day event ending on Labor Day',
    keywords: ['festival', 'burn', 'playa', 'desert', 'black rock', 'nevada']
  }
};

// Tennis tournaments database
const TENNIS_TOURNAMENTS = {
  'us open': {
    variations: ['us open', 'us open tennis', 'usopen', 'united states open', 'tennis championship'],
    venues: [
      { name: 'Arthur Ashe Stadium', lat: 40.7503, lon: -73.8448 },
      { name: 'Louis Armstrong Stadium', lat: 40.7496, lon: -73.8461 },
      { name: 'USTA Billie Jean King National Tennis Center', lat: 40.7500, lon: -73.8450 }
    ],
    months: [8, 9], // August-September
    keywords: ['tennis', 'championship', 'session', 'men\'s', 'women\'s', 'singles', 'doubles', 'quarterfinals', 'semifinals', 'finals']
  },
  'wimbledon': {
    variations: ['wimbledon', 'the championships'],
    venues: [{ name: 'All England Lawn Tennis Club', lat: 51.4344, lon: -0.2141 }],
    months: [6, 7], // June-July
    keywords: ['tennis', 'championship', 'grass', 'centre court']
  },
  'french open': {
    variations: ['french open', 'roland garros'],
    venues: [{ name: 'Stade Roland Garros', lat: 48.8469, lon: 2.2521 }],
    months: [5, 6], // May-June
    keywords: ['tennis', 'championship', 'clay', 'court philippe chatrier']
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
const CITY_TEAMS_MAP: Record<string, string[]> = {
  'chicago': ['cubs', 'white sox', 'bulls', 'blackhawks'],
  'new york': ['yankees', 'mets', 'giants', 'jets', 'rangers'],
  'los angeles': ['dodgers', 'angels', 'lakers', 'kings'],
  'boston': ['red sox', 'patriots', 'celtics']
};

const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  // Major Metropolitan Areas
  'new york': { lat: 40.7128, lon: -74.0060 },
  'brooklyn': { lat: 40.6782, lon: -73.9442 },
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'chicago': { lat: 41.8781, lon: -87.6298 },
  'houston': { lat: 29.7604, lon: -95.3698 },
  'phoenix': { lat: 33.4484, lon: -112.0740 },
  'philadelphia': { lat: 39.9526, lon: -75.1652 },
  'san antonio': { lat: 29.4241, lon: -98.4936 },
  'san diego': { lat: 32.7157, lon: -117.1611 },
  'dallas': { lat: 32.7767, lon: -96.7970 },
  'san jose': { lat: 37.3382, lon: -121.8863 },
  'austin': { lat: 30.2672, lon: -97.7431 },
  'jacksonville': { lat: 30.3322, lon: -81.6557 },
  'san francisco': { lat: 37.7749, lon: -122.4194 },
  'columbus': { lat: 39.9612, lon: -82.9988 },
  'charlotte': { lat: 35.2271, lon: -80.8431 },
  'indianapolis': { lat: 39.7684, lon: -86.1581 },
  'fort worth': { lat: 32.7555, lon: -97.3308 },
  'seattle': { lat: 47.6062, lon: -122.3321 },
  'denver': { lat: 39.7392, lon: -104.9903 },
  'washington': { lat: 38.9072, lon: -77.0369 },
  'boston': { lat: 42.3601, lon: -71.0589 },
  'el paso': { lat: 31.7619, lon: -106.4850 },
  'detroit': { lat: 42.3314, lon: -83.0458 },
  'nashville': { lat: 36.1627, lon: -86.7816 },
  'portland': { lat: 45.5152, lon: -122.6784 },
  'memphis': { lat: 35.1495, lon: -90.0490 },
  'oklahoma city': { lat: 35.4676, lon: -97.5164 },
  'las vegas': { lat: 36.1699, lon: -115.1398 },
  'louisville': { lat: 38.2527, lon: -85.7585 },
  'baltimore': { lat: 39.2904, lon: -76.6122 },
  'milwaukee': { lat: 43.0389, lon: -87.9065 },
  'albuquerque': { lat: 35.0844, lon: -106.6504 },
  'tucson': { lat: 32.2226, lon: -110.9747 },
  'fresno': { lat: 36.7378, lon: -119.7871 },
  'mesa': { lat: 33.4152, lon: -111.8315 },
  'sacramento': { lat: 38.5816, lon: -121.4944 },
  'atlanta': { lat: 33.7490, lon: -84.3880 },
  'kansas city': { lat: 39.0997, lon: -94.5786 },
  'colorado springs': { lat: 38.8339, lon: -104.8214 },
  'omaha': { lat: 41.2565, lon: -95.9345 },
  'raleigh': { lat: 35.7796, lon: -78.6382 },
  'miami': { lat: 25.7617, lon: -80.1918 },
  'long beach': { lat: 33.7701, lon: -118.1937 },
  'virginia beach': { lat: 36.8529, lon: -75.9780 },
  'oakland': { lat: 37.8044, lon: -122.2711 },
  'minneapolis': { lat: 44.9778, lon: -93.2650 },
  'tulsa': { lat: 36.1540, lon: -95.9928 },
  'tampa': { lat: 27.9506, lon: -82.4572 },
  'arlington': { lat: 32.7357, lon: -97.1081 },
  'new orleans': { lat: 29.9511, lon: -90.0715 },
  'wichita': { lat: 37.6872, lon: -97.3301 },
  'cleveland': { lat: 41.4993, lon: -81.6944 },
  'bakersfield': { lat: 35.3733, lon: -119.0187 },
  'cincinnati': { lat: 39.1031, lon: -84.5120 },
  'pittsburgh': { lat: 40.4406, lon: -79.9959 },
  'buffalo': { lat: 42.8864, lon: -78.8784 },
  'st. louis': { lat: 38.6270, lon: -90.1994 },
  'st louis': { lat: 38.6270, lon: -90.1994 },
  'salt lake city': { lat: 40.7608, lon: -111.8910 },
  'richmond': { lat: 37.5407, lon: -77.4360 },
  'orlando': { lat: 28.5383, lon: -81.3792 },
  'birmingham': { lat: 33.5186, lon: -86.8104 },
  // NCAA towns and venues
  'auburn': { lat: 32.6099, lon: -85.4808 },
  'athens': { lat: 33.9519, lon: -83.3576 },
  
  // Additional Entertainment Markets
  'indio': { lat: 33.7206, lon: -116.2156 }, // Coachella
  'manchester': { lat: 35.4889, lon: -86.0819 }, // Bonnaroo (Tennessee)
  'black rock city': { lat: 40.7864, lon: -119.2065 }, // Burning Man
  'morrison': { lat: 39.6655, lon: -105.1975 }, // Red Rocks
  'george': { lat: 47.0979, lon: -119.2734 }, // Gorge Amphitheatre
  'woodstock': { lat: 42.3481, lon: -74.1182 }, // Historic music location
  'bethel': { lat: 41.3712, lon: -73.4140 }, // Original Woodstock location
  'east rutherford': { lat: 40.8135, lon: -74.0745 }, // MetLife Stadium
  'glendale': { lat: 33.5387, lon: -112.1860 }, // Arizona (State Farm Stadium)
  'foxborough': { lat: 42.0654, lon: -71.2676 }, // Gillette Stadium
  'pasadena': { lat: 34.1478, lon: -118.1445 }, // Rose Bowl
  'inglewood': { lat: 33.9616, lon: -118.3531 }, // SoFi Stadium area
  'paradise': { lat: 36.1072, lon: -115.1563 }, // Las Vegas Strip area
  'rosemont': { lat: 42.0368, lon: -87.8673 } // Allstate Arena
};

interface TeamDefinition {
  key: string;
  city: string;
  venue: string;
  lat: number;
  lon: number;
  variations: string[];
  aliases?: string[];
  sport?: string;
}

const NCAA_FOOTBALL_TEAMS: TeamDefinition[] = [
  { key: 'alabama crimson tide', city: 'Tuscaloosa', venue: 'Bryant-Denny Stadium', lat: 33.2090, lon: -87.5692, variations: ['Alabama Crimson Tide', 'Alabama', 'Roll Tide', 'Bama', 'UA'] },
  { key: 'auburn tigers', city: 'Auburn', venue: 'Jordan-Hare Stadium', lat: 32.6099, lon: -85.4808, variations: ['Auburn Tigers', 'Auburn', 'War Eagle', 'AU'] },
  { key: 'georgia bulldogs', city: 'Athens', venue: 'Sanford Stadium', lat: 33.9519, lon: -83.3732, variations: ['Georgia Bulldogs', 'University of Georgia', 'Georgia', 'UGA', 'Go Dawgs'] },
  { key: 'florida gators', city: 'Gainesville', venue: 'Ben Hill Griffin Stadium', lat: 29.6516, lon: -82.3248, variations: ['Florida Gators', 'University of Florida', 'Florida', 'UF', 'Gators'] },
  { key: 'lsu tigers', city: 'Baton Rouge', venue: 'Tiger Stadium', lat: 30.4118, lon: -91.1850, variations: ['LSU Tigers', 'LSU', 'Louisiana State', 'Geaux Tigers'] },
  { key: 'tennessee volunteers', city: 'Knoxville', venue: 'Neyland Stadium', lat: 35.9550, lon: -83.9250, variations: ['Tennessee Volunteers', 'Tennessee', 'Vols', 'UT Vols', 'Rocky Top'] },
  { key: 'texas a&m aggies', city: 'College Station', venue: 'Kyle Field', lat: 30.6100, lon: -96.3391, variations: ['Texas A&M Aggies', 'Texas A&M', 'Aggies', 'A&M', 'TAMU'] },
  { key: 'ole miss rebels', city: 'Oxford', venue: 'Vaught-Hemingway Stadium', lat: 34.3630, lon: -89.5380, variations: ['Ole Miss Rebels', 'Ole Miss', 'Mississippi Rebels', 'Hotty Toddy'] },
  { key: 'mississippi state bulldogs', city: 'Starkville', venue: 'Davis Wade Stadium', lat: 33.4553, lon: -88.7931, variations: ['Mississippi State Bulldogs', 'Mississippi State', 'MSU', 'Hail State'] },
  { key: 'arkansas razorbacks', city: 'Fayetteville', venue: 'Razorback Stadium', lat: 36.0680, lon: -94.1780, variations: ['Arkansas Razorbacks', 'Arkansas', 'Woo Pig'] },
  { key: 'kentucky wildcats', city: 'Lexington', venue: 'Kroger Field', lat: 38.0220, lon: -84.5040, variations: ['Kentucky Wildcats', 'Kentucky', 'UK Wildcats'] },
  { key: 'south carolina gamecocks', city: 'Columbia', venue: 'Williams-Brice Stadium', lat: 33.9734, lon: -81.0190, variations: ['South Carolina Gamecocks', 'South Carolina', 'Gamecocks', 'USC Gamecocks'], aliases: ['Columbia SC', 'Columbia South Carolina'] },
  { key: 'missouri tigers', city: 'Columbia', venue: 'Faurot Field', lat: 38.9350, lon: -92.3337, variations: ['Missouri Tigers', 'Mizzou', 'Missouri'], aliases: ['Columbia MO', 'Columbia Missouri'] },
  { key: 'vanderbilt commodores', city: 'Nashville', venue: 'FirstBank Stadium', lat: 36.1408, lon: -86.8039, variations: ['Vanderbilt Commodores', 'Vanderbilt', 'Vandy'] },
  { key: 'ohio state buckeyes', city: 'Columbus', venue: 'Ohio Stadium', lat: 40.0017, lon: -83.0197, variations: ['Ohio State Buckeyes', 'Ohio State', 'OSU', 'Buckeyes'] },
  { key: 'michigan wolverines', city: 'Ann Arbor', venue: 'Michigan Stadium', lat: 42.2658, lon: -83.7487, variations: ['Michigan Wolverines', 'Michigan', 'U of M', 'Go Blue'] },
  { key: 'penn state nittany lions', city: 'State College', venue: 'Beaver Stadium', lat: 40.8120, lon: -77.8560, variations: ['Penn State Nittany Lions', 'Penn State', 'PSU', 'Nittany Lions'], aliases: ['Happy Valley'] },
  { key: 'wisconsin badgers', city: 'Madison', venue: 'Camp Randall Stadium', lat: 43.0699, lon: -89.4126, variations: ['Wisconsin Badgers', 'Wisconsin', 'UW', 'Badgers'] },
  { key: 'iowa hawkeyes', city: 'Iowa City', venue: 'Kinnick Stadium', lat: 41.6587, lon: -91.5513, variations: ['Iowa Hawkeyes', 'Iowa', 'Hawkeyes'] },
  { key: 'minnesota golden gophers', city: 'Minneapolis', venue: 'Huntington Bank Stadium', lat: 44.9760, lon: -93.2247, variations: ['Minnesota Golden Gophers', 'Minnesota', 'UMN', 'Gophers'] },
  { key: 'nebraska cornhuskers', city: 'Lincoln', venue: 'Memorial Stadium', lat: 40.8206, lon: -96.7056, variations: ['Nebraska Cornhuskers', 'Nebraska', 'Huskers', 'Big Red'] },
  { key: 'michigan state spartans', city: 'East Lansing', venue: 'Spartan Stadium', lat: 42.7280, lon: -84.4848, variations: ['Michigan State Spartans', 'Michigan State', 'MSU Spartans', 'Spartans'] },
  { key: 'illinois fighting illini', city: 'Champaign', venue: 'Memorial Stadium', lat: 40.0990, lon: -88.2350, variations: ['Illinois Fighting Illini', 'Illinois', 'Illini', 'UIUC'] },
  { key: 'indiana hoosiers', city: 'Bloomington', venue: 'Memorial Stadium', lat: 39.1800, lon: -86.5250, variations: ['Indiana Hoosiers', 'Indiana', 'IU Hoosiers', 'Hoosiers'] },
  { key: 'northwestern wildcats', city: 'Evanston', venue: 'Ryan Field', lat: 42.0630, lon: -87.6877, variations: ['Northwestern Wildcats', 'Northwestern', 'NU Wildcats'] },
  { key: 'purdue boilermakers', city: 'West Lafayette', venue: 'Ross-Ade Stadium', lat: 40.4296, lon: -86.9120, variations: ['Purdue Boilermakers', 'Purdue', 'Boilermakers', 'Boilers'] },
  { key: 'rutgers scarlet knights', city: 'Piscataway', venue: 'SHI Stadium', lat: 40.5147, lon: -74.4642, variations: ['Rutgers Scarlet Knights', 'Rutgers', 'RU', 'Scarlet Knights'] },
  { key: 'maryland terrapins', city: 'College Park', venue: 'SECU Stadium', lat: 38.9897, lon: -76.9456, variations: ['Maryland Terrapins', 'Maryland', 'Terps', 'UMD', 'Terrapins'] },
  { key: 'clemson tigers', city: 'Clemson', venue: 'Memorial Stadium', lat: 34.6786, lon: -82.8436, variations: ['Clemson Tigers', 'Clemson', 'Go Tigers'] },
  { key: 'florida state seminoles', city: 'Tallahassee', venue: 'Doak Campbell Stadium', lat: 30.4380, lon: -84.3049, variations: ['Florida State Seminoles', 'Florida State', 'FSU', 'Noles'] },
  { key: 'miami hurricanes', city: 'Miami', venue: 'Hard Rock Stadium', lat: 25.9580, lon: -80.2389, variations: ['Miami Hurricanes', 'Miami', 'The U', 'UM'] },
  { key: 'north carolina tar heels', city: 'Chapel Hill', venue: 'Kenan Memorial Stadium', lat: 35.9068, lon: -79.0479, variations: ['North Carolina Tar Heels', 'North Carolina', 'UNC', 'Tar Heels'] },
  { key: 'nc state wolfpack', city: 'Raleigh', venue: 'Carter-Finley Stadium', lat: 35.8004, lon: -78.7190, variations: ['NC State Wolfpack', 'NC State', 'NCSU', 'Wolfpack'] },
  { key: 'virginia tech hokies', city: 'Blacksburg', venue: 'Lane Stadium', lat: 37.2194, lon: -80.4188, variations: ['Virginia Tech Hokies', 'Virginia Tech', 'VT', 'Hokies'] },
  { key: 'virginia cavaliers', city: 'Charlottesville', venue: 'Scott Stadium', lat: 38.0312, lon: -78.5138, variations: ['Virginia Cavaliers', 'Virginia', 'UVA', 'Cavaliers'] },
  { key: 'louisville cardinals', city: 'Louisville', venue: 'L&N Federal Credit Union Stadium', lat: 38.2122, lon: -85.7585, variations: ['Louisville Cardinals', 'Louisville', 'UofL', 'Cards'] },
  { key: 'pittsburgh panthers', city: 'Pittsburgh', venue: 'Acrisure Stadium', lat: 40.4468, lon: -80.0158, variations: ['Pittsburgh Panthers', 'Pitt', 'Panthers', 'H2P'] },
  { key: 'syracuse orange', city: 'Syracuse', venue: 'JMA Wireless Dome', lat: 43.0379, lon: -76.1351, variations: ['Syracuse Orange', 'Syracuse', 'Cuse', 'Orange'] },
  { key: 'duke blue devils', city: 'Durham', venue: 'Wallace Wade Stadium', lat: 36.0005, lon: -78.9383, variations: ['Duke Blue Devils', 'Duke', 'Blue Devils'] },
  { key: 'wake forest demon deacons', city: 'Winston-Salem', venue: 'Truist Field', lat: 36.1302, lon: -80.2540, variations: ['Wake Forest Demon Deacons', 'Wake Forest', 'Deacs', 'Demon Deacons'] },
  { key: 'georgia tech yellow jackets', city: 'Atlanta', venue: 'Bobby Dodd Stadium', lat: 33.7725, lon: -84.3928, variations: ['Georgia Tech Yellow Jackets', 'Georgia Tech', 'GT', 'Yellow Jackets'] },
  { key: 'boston college eagles', city: 'Chestnut Hill', venue: 'Alumni Stadium', lat: 42.3358, lon: -71.1670, variations: ['Boston College Eagles', 'Boston College', 'BC', 'Eagles'], aliases: ['Chestnut Hill', 'Boston College', 'Chestnut Hill MA'] },
  { key: 'texas longhorns', city: 'Austin', venue: 'Darrell K Royal-Texas Memorial Stadium', lat: 30.2839, lon: -97.7329, variations: ['Texas Longhorns', 'Texas', 'UT', 'Hook Em', 'Longhorns'] },
  { key: 'oklahoma sooners', city: 'Norman', venue: 'Gaylord Family Oklahoma Memorial Stadium', lat: 35.2059, lon: -97.4420, variations: ['Oklahoma Sooners', 'Oklahoma', 'OU', 'Sooners', 'Boomer Sooner'] },
  { key: 'baylor bears', city: 'Waco', venue: 'McLane Stadium', lat: 31.5663, lon: -97.1197, variations: ['Baylor Bears', 'Baylor', 'Sic Em Bears'] },
  { key: 'tcu horned frogs', city: 'Fort Worth', venue: 'Amon G. Carter Stadium', lat: 32.7096, lon: -97.3605, variations: ['TCU Horned Frogs', 'TCU', 'Horned Frogs'] },
  { key: 'oklahoma state cowboys', city: 'Stillwater', venue: 'Boone Pickens Stadium', lat: 36.1270, lon: -97.0669, variations: ['Oklahoma State Cowboys', 'Oklahoma State', 'OSU Cowboys', 'Cowboys', 'Pokes'] },
  { key: 'kansas jayhawks', city: 'Lawrence', venue: 'David Booth Kansas Memorial Stadium', lat: 38.8699, lon: -95.2960, variations: ['Kansas Jayhawks', 'Kansas', 'KU', 'Jayhawks'] },
  { key: 'kansas state wildcats', city: 'Manhattan', venue: 'Bill Snyder Family Stadium', lat: 39.1992, lon: -96.5939, variations: ['Kansas State Wildcats', 'Kansas State', 'K-State', 'KSU', 'Wildcats'], aliases: ['Manhattan KS', 'Manhattan Kansas'] },
  { key: 'iowa state cyclones', city: 'Ames', venue: 'Jack Trice Stadium', lat: 42.0132, lon: -93.6350, variations: ['Iowa State Cyclones', 'Iowa State', 'ISU', 'Cyclones'] },
  { key: 'west virginia mountaineers', city: 'Morgantown', venue: 'Milan Puskar Stadium', lat: 39.6480, lon: -79.9555, variations: ['West Virginia Mountaineers', 'West Virginia', 'WV', 'WVU', 'Mountaineers'] },
  { key: 'texas tech red raiders', city: 'Lubbock', venue: 'Jones AT&T Stadium', lat: 33.5900, lon: -101.8710, variations: ['Texas Tech Red Raiders', 'Texas Tech', 'TTU', 'Red Raiders'] },
  { key: 'houston cougars', city: 'Houston', venue: 'TDECU Stadium', lat: 29.7220, lon: -95.3490, variations: ['Houston Cougars', 'Houston', 'UH', 'Coogs'] },
  { key: 'byu cougars', city: 'Provo', venue: 'LaVell Edwards Stadium', lat: 40.2581, lon: -111.6548, variations: ['BYU Cougars', 'BYU', 'Brigham Young', 'Cougars'] },
  { key: 'utah utes', city: 'Salt Lake City', venue: 'Rice-Eccles Stadium', lat: 40.7607, lon: -111.8486, variations: ['Utah Utes', 'Utah', 'Utes'] },
  { key: 'colorado buffaloes', city: 'Boulder', venue: 'Folsom Field', lat: 40.0094, lon: -105.2669, variations: ['Colorado Buffaloes', 'Colorado', 'CU', 'Buffs', 'Coach Prime'] },
  { key: 'usc trojans', city: 'Los Angeles', venue: 'Los Angeles Memorial Coliseum', lat: 34.0142, lon: -118.2879, variations: ['USC Trojans', 'USC', 'Southern Cal', 'Trojans'], aliases: ['Los Angeles', 'LA'] },
  { key: 'ucla bruins', city: 'Los Angeles', venue: 'Rose Bowl', lat: 34.1613, lon: -118.1675, variations: ['UCLA Bruins', 'UCLA', 'Bruins'], aliases: ['Pasadena'] },
  { key: 'oregon ducks', city: 'Eugene', venue: 'Autzen Stadium', lat: 44.0582, lon: -123.0695, variations: ['Oregon Ducks', 'Oregon', 'UO', 'Ducks'] },
  { key: 'oregon state beavers', city: 'Corvallis', venue: 'Reser Stadium', lat: 44.5580, lon: -123.2760, variations: ['Oregon State Beavers', 'Oregon State', 'OSU Beavers', 'Beavers'] },
  { key: 'washington huskies', city: 'Seattle', venue: 'Husky Stadium', lat: 47.6500, lon: -122.3010, variations: ['Washington Huskies', 'Washington', 'UW', 'Huskies'] },
  { key: 'washington state cougars', city: 'Pullman', venue: 'Martin Stadium', lat: 46.7310, lon: -117.1630, variations: ['Washington State Cougars', 'Washington State', 'WSU', 'Cougs', 'Go Cougs'], aliases: ['Pullman WA', 'Pullman Washington'] },
  { key: 'stanford cardinal', city: 'Stanford', venue: 'Stanford Stadium', lat: 37.4349, lon: -122.1619, variations: ['Stanford Cardinal', 'Stanford', 'Cardinal'] },
  { key: 'california golden bears', city: 'Berkeley', venue: 'California Memorial Stadium', lat: 37.8719, lon: -122.2508, variations: ['California Golden Bears', 'California', 'Cal', 'Golden Bears'] },
  { key: 'arizona wildcats', city: 'Tucson', venue: 'Arizona Stadium', lat: 32.2288, lon: -110.9480, variations: ['Arizona Wildcats', 'Arizona', 'UA', 'Bear Down'] },
  { key: 'arizona state sun devils', city: 'Tempe', venue: 'Sun Devil Stadium', lat: 33.4263, lon: -111.9337, variations: ['Arizona State Sun Devils', 'Arizona State', 'ASU', 'Sun Devils', 'Forks Up'] },
  { key: 'notre dame fighting irish', city: 'South Bend', venue: 'Notre Dame Stadium', lat: 41.6981, lon: -86.2353, variations: ['Notre Dame Fighting Irish', 'Notre Dame', 'ND', 'Fighting Irish', 'Irish'] },
  { key: 'boise state broncos', city: 'Boise', venue: 'Albertsons Stadium', lat: 43.6027, lon: -116.2007, variations: ['Boise State Broncos', 'Boise State', 'BSU', 'Broncos'] },
  { key: 'army black knights', city: 'West Point', venue: 'Michie Stadium', lat: 41.3684, lon: -73.9662, variations: ['Army Black Knights', 'Army', 'West Point', 'Black Knights'] },
  { key: 'navy midshipmen', city: 'Annapolis', venue: 'Navy-Marine Corps Memorial Stadium', lat: 38.9855, lon: -76.5079, variations: ['Navy Midshipmen', 'Navy', 'Midshipmen', 'Go Navy'] },
  { key: 'air force falcons', city: 'Colorado Springs', venue: 'Falcon Stadium', lat: 38.9950, lon: -104.8430, variations: ['Air Force Falcons', 'Air Force', 'USAFA', 'Falcons'] }
];

function registerTeamDefinition(def: TeamDefinition): void {
  const teamKey = def.key.toLowerCase();
  const sport = def.sport ?? 'ncaa';
  const existing = TEAM_DATABASE[teamKey];
  const combinedVariations = Array.from(new Set([
    ...(existing?.variations ?? []),
    ...def.variations,
    def.key,
    def.city
  ]));

  const merged: TeamInfo = {
    city: def.city,
    venue: def.venue,
    lat: def.lat,
    lon: def.lon,
    sport,
    variations: combinedVariations
  };

  if (existing?.venue_id !== undefined) {
    merged.venue_id = existing.venue_id;
  }

  TEAM_DATABASE[teamKey] = merged;

  const cityKeys = [def.city, ...(def.aliases ?? [])];
  cityKeys.forEach(cityName => {
    const key = cityName.toLowerCase();
    if (!CITY_COORDINATES[key]) {
      CITY_COORDINATES[key] = { lat: def.lat, lon: def.lon };
    }
    if (!CITY_TEAMS_MAP[key]) {
      CITY_TEAMS_MAP[key] = [];
    }
    if (!CITY_TEAMS_MAP[key].includes(teamKey)) {
      CITY_TEAMS_MAP[key].push(teamKey);
    }
  });
}

NCAA_FOOTBALL_TEAMS.forEach(registerTeamDefinition);

function eventHasTeamName(eventName: string, teamKey: string): boolean {
  const normalizedKey = teamKey.toLowerCase();
  const team = TEAM_DATABASE[normalizedKey];
  if (!team) return false;
  const name = eventName.toLowerCase();
  const variationTokens = team.variations.map(v => v.toLowerCase());

  if (team.sport === 'ncaa') {
    const tokenSet = new Set<string>();
    variationTokens.forEach(tok => tokenSet.add(tok));
    tokenSet.add(normalizedKey);

    const schoolToken = normalizedKey.split(' ')[0] || '';
    const mascotToken = normalizedKey.replace(`${schoolToken} `, '').trim();
    if (mascotToken) tokenSet.add(mascotToken);
    if (team.city) tokenSet.add((team.city as string).toLowerCase());

    // Remove overly generic tokens (school name/city) to avoid false positives
    tokenSet.delete(schoolToken);
    if (team.city) {
      tokenSet.delete((team.city as string).toLowerCase());
    }

    for (const tok of tokenSet) {
      const trimmed = tok.trim();
      if (!trimmed || trimmed.length < 3) continue;
      if (name.includes(trimmed)) {
        return true;
      }
    }
    return false;
  }

  return variationTokens.some(tok => tok && name.includes(tok));
}

function parseQuery(query: string) {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  
  // Extract potential team names, opponents, event types, artists, venues, tournaments, and festivals
  const teams: string[] = [];
  const artists: string[] = [];
  const eventTypes: string[] = [];
  const venues: string[] = [];
  const tournaments: string[] = [];
  const festivals: string[] = [];
  const resolvedTeams: string[] = [];
  const resolvedArtists: string[] = [];
  const resolvedVenues: string[] = [];
  const resolvedTournaments: string[] = [];
  const resolvedFestivals: string[] = [];
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
  
  // Tennis tournament keywords
  if (lowerQuery.includes('tennis') || lowerQuery.includes('championship') ||
      lowerQuery.includes('session') || lowerQuery.includes('finals') ||
      lowerQuery.includes('semifinals') || lowerQuery.includes('quarterfinals')) {
    eventTypes.push('tennis');
  }
  
  // Festival keywords
  if (lowerQuery.includes('festival') || lowerQuery.includes('fest') ||
      lowerQuery.includes('day pass') || lowerQuery.includes('weekend pass') ||
      lowerQuery.includes('multi-day') || lowerQuery.includes('camping')) {
    eventTypes.push('festival');
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
  
  // Resolve tennis tournaments using variation matching
  queryPhrases.forEach(phrase => {
    const cleanPhrase = phrase.replace(/[^\w\s]/g, '').trim();
    Object.keys(TENNIS_TOURNAMENTS).forEach(tournamentKey => {
      const tournament = TENNIS_TOURNAMENTS[tournamentKey as keyof typeof TENNIS_TOURNAMENTS];
      if (tournament.variations.some(variation => 
          cleanPhrase.includes(variation) || variation.includes(cleanPhrase))) {
        if (!resolvedTournaments.includes(tournamentKey)) {
          resolvedTournaments.push(tournamentKey);
          tournaments.push(tournamentKey);
        }
      }
    });
  });
  
  // Resolve festivals using variation matching
  queryPhrases.forEach(phrase => {
    const cleanPhrase = phrase.replace(/[^\w\s]/g, '').trim();
    Object.keys(FESTIVAL_DATABASE).forEach(festivalKey => {
      const festival = FESTIVAL_DATABASE[festivalKey as keyof typeof FESTIVAL_DATABASE];
      if (festival.variations.some(variation => 
          cleanPhrase.includes(variation) || variation.includes(cleanPhrase))) {
        if (!resolvedFestivals.includes(festivalKey)) {
          resolvedFestivals.push(festivalKey);
          festivals.push(festivalKey);
        }
      }
    });
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
    tournaments,
    festivals,
    resolvedTeams,
    resolvedArtists,
    resolvedVenues,
    resolvedTournaments,
    resolvedFestivals,
    eventTypes,
    words,
    ambiguousTerms,
    isVsMatch: lowerQuery.includes('vs') || lowerQuery.includes(' at ') || lowerQuery.includes(' v '),
    hasSingleTeam: resolvedTeams.length === 1,
    hasMultipleTeams: resolvedTeams.length > 1,
    hasSingleArtist: resolvedArtists.length === 1,
    hasMultipleArtists: resolvedArtists.length > 1,
    hasVenue: resolvedVenues.length > 0,
    hasTournament: resolvedTournaments.length > 0,
    hasFestival: resolvedFestivals.length > 0,
    isEntertainment: resolvedArtists.length > 0 || eventTypes.includes('concert') || eventTypes.includes('entertainment'),
    isSports: resolvedTeams.length > 0 || eventTypes.includes('sports') || eventTypes.includes('boxing'),
    isTennis: resolvedTournaments.length > 0 || eventTypes.includes('tennis'),
    isFestival: resolvedFestivals.length > 0 || eventTypes.includes('festival'),
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
  cache: MemoryCache,
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
    let teamsToSearch = queryInfo.resolvedTeams.slice();
    let foundEvents: any[] = [];

    // STRATEGY - Sports Venue Text Inference
    // If the query includes a known team venue name (from TEAM_DATABASE), search around that venue
    {
      const lowerQ = validatedParams.query.toLowerCase();
      const venueHits: Array<{ lat: number; lon: number; name: string }> = [];
      Object.values(TEAM_DATABASE).forEach((team) => {
        const v = (team.venue || '').toLowerCase();
        if (v && lowerQ.includes(v) && typeof team.lat === 'number' && typeof team.lon === 'number') {
          venueHits.push({ lat: team.lat!, lon: team.lon!, name: team.venue! });
        }
      });
      if (venueHits.length > 0) {
        console.error(JSON.stringify({ type: 'strategy', name: 'sports_venue_inference', hits: venueHits.map(v => v.name) }));
        for (const hit of venueHits.slice(0, 2)) { // limit to first two matches
          const params: any = { lat: hit.lat, lon: hit.lon, within: 5 };
          if (validatedParams.date) {
            const d = new Date(validatedParams.date);
            const start = new Date(d); start.setHours(0,0,0,0);
            const end = new Date(d); end.setHours(23,59,59,999);
            params.occurs_at_gte = start.toISOString();
            params.occurs_at_lt = end.toISOString();
          } else {
            const now = new Date();
            const end = new Date(now); end.setDate(now.getDate() + (validatedParams.weeks_ahead! * 7));
            params.occurs_at_gte = now.toISOString();
            params.occurs_at_lt = end.toISOString();
          }
          try {
            const events = await apiClient.listEventsAggregate(params, 200);
            foundEvents.push(...events);
            searchResults.search_summary.api_calls_made++;
            searchResults.search_summary.total_events_searched += events.length || 0;
          } catch {}
        }
      }
    }
    
    // Handle ambiguous queries (city-only with multiple teams) by auto-expanding to all city teams
    if (queryInfo.isAmbiguous) {
      console.error(JSON.stringify({ 
        type: 'ambiguous_query_detected', 
        ambiguous_terms: queryInfo.ambiguousTerms 
      }));
      
      const ambiguousCity = queryInfo.ambiguousTerms[0];
      const possibleTeams = CITY_TEAMS_MAP[ambiguousCity as keyof typeof CITY_TEAMS_MAP] || [];
      teamsToSearch = possibleTeams;
      searchResults.search_summary.strategies_tried.push('auto_disambiguated_city');
    }
    
    // STRATEGY 0: Suggestions-based discovery (performers/venues/events)
    {
      console.error(JSON.stringify({ type: 'strategy', name: 'suggestions_based_search' }));
      searchResults.search_summary.strategies_tried.push('suggestions_based_search');

      try {
        const cacheKey = cache.generateKey('sugg', { q: validatedParams.query });
        let suggestions = cache.getRequestScoped<any>(cacheKey);
        if (!suggestions) {
          suggestions = await apiClient.searchSuggestions({ q: validatedParams.query, limit: 8, fuzzy: true });
          cache.setRequestScoped(cacheKey, suggestions);
        }

        const { startISO, endISO } = computeSearchWindow(validatedParams);

        // 0a) Hydrate direct event suggestions
        for (const ev of (suggestions.events || []).slice(0, 5)) {
          try {
            const detailed = await apiClient.getEvent({ event_id: ev.id });
            foundEvents.push(detailed);
            searchResults.search_summary.api_calls_made++;
          } catch {}
        }

        // 0b) Performer suggestions → list upcoming events (paginate up to 200)
        for (const perf of (suggestions.performers || []).slice(0, 4)) {
          const perfEvents = await apiClient.listEventsAggregate({
            performer_id: perf.id,
            ...(startISO ? { occurs_at_gte: startISO } : {}),
            ...(endISO ? { occurs_at_lt: endISO } : {})
          }, 200);
          searchResults.search_summary.api_calls_made++;
          foundEvents.push(...(perfEvents || []));
        }

        // 0c) Venue suggestions → list upcoming events (paginate up to 200)
        for (const ven of (suggestions.venues || []).slice(0, 3)) {
          const venueEvents = await apiClient.listEventsAggregate({
            venue_id: ven.id,
            ...(startISO ? { occurs_at_gte: startISO } : {}),
            ...(endISO ? { occurs_at_lt: endISO } : {})
          }, 200);
          searchResults.search_summary.api_calls_made++;
          foundEvents.push(...(venueEvents || []));
        }

        if (foundEvents.length > 0 && !searchResults.strategy_used) {
          searchResults.strategy_used = 'suggestions_based_search';
        }
      } catch (e) {
        console.error(JSON.stringify({ type: 'suggestions_search_error', message: e instanceof Error ? e.message : String(e) }));
      }
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
        searchStart.setDate(targetDate.getDate() - 14); // ±14 days for entertainment events
        const searchEnd = new Date(targetDate);
        searchEnd.setDate(targetDate.getDate() + 14);
        
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
    
    // STRATEGY 1C: Tennis tournament search for known tournaments
    if (foundEvents.length === 0 && queryInfo.hasTournament) {
      console.error(JSON.stringify({ type: 'strategy', name: 'tennis_tournament_search' }));
      searchResults.search_summary.strategies_tried.push('tennis_tournament_search');
      
      const tournament = queryInfo.resolvedTournaments[0];
      const tournamentInfo = TENNIS_TOURNAMENTS[tournament as keyof typeof TENNIS_TOURNAMENTS];
      
      for (const venue of tournamentInfo.venues) {
        const searchParams: any = {
          lat: venue.lat,
          lon: venue.lon,
          within: 2, // Very tight radius for tennis venues
          per_page: 100
        };
        
        // Add date range - tennis tournaments have specific months
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
          const currentYear = now.getFullYear();
          
          // Search tournament months for current and next year
          for (const month of tournamentInfo.months) {
            const tournamentStart = new Date(currentYear, month - 1, 1);
            const tournamentEnd = new Date(currentYear, month, 0); // Last day of month
            
            if (tournamentStart > now) {
              searchParams.occurs_at_gte = tournamentStart.toISOString();
              searchParams.occurs_at_lt = tournamentEnd.toISOString();
              break;
            }
          }
          
          // If no matches this year, try next year
          if (!searchParams.occurs_at_gte) {
            const tournamentStart = new Date(currentYear + 1, tournamentInfo.months[0] - 1, 1);
            const tournamentEnd = new Date(currentYear + 1, tournamentInfo.months[tournamentInfo.months.length - 1], 0);
            searchParams.occurs_at_gte = tournamentStart.toISOString();
            searchParams.occurs_at_lt = tournamentEnd.toISOString();
          }
        }
        
        const tournamentEventsList = await apiClient.listEventsAggregate(searchParams, 300);
        searchResults.search_summary.api_calls_made++;
        searchResults.search_summary.total_events_searched += tournamentEventsList.length || 0;
        
        const tournamentEvents = tournamentEventsList?.filter(event => {
          const eventName = event.name.toLowerCase();
          return tournamentInfo.variations.some(variation =>
            eventName.includes(variation)
          ) || tournamentInfo.keywords.some(keyword =>
            eventName.includes(keyword)
          );
        }) || [];
        
        if (tournamentEvents.length > 0) {
          foundEvents.push(...tournamentEvents);
          searchResults.strategy_used = 'tennis_tournament_search';
          break;
        }
      }
    }
    
    // STRATEGY 1D: Festival search for known festivals
    if (foundEvents.length === 0 && queryInfo.hasFestival) {
      console.error(JSON.stringify({ type: 'strategy', name: 'festival_search' }));
      searchResults.search_summary.strategies_tried.push('festival_search');
      
      const festival = queryInfo.resolvedFestivals[0];
      const festivalInfo = FESTIVAL_DATABASE[festival as keyof typeof FESTIVAL_DATABASE];
      
      const searchParams: any = {
        lat: festivalInfo.venue.lat,
        lon: festivalInfo.venue.lon,
        within: 5, // Tight radius for festival venue
        per_page: 100
      };
      
      // Add date range - festivals have specific months and multi-day duration
      if (validatedParams.date) {
        const targetDate = new Date(validatedParams.date);
        const searchStart = new Date(targetDate);
        searchStart.setDate(targetDate.getDate() - 14); // Wider window for festivals
        const searchEnd = new Date(targetDate);
        searchEnd.setDate(targetDate.getDate() + 14);
        searchParams.occurs_at_gte = searchStart.toISOString();
        searchParams.occurs_at_lt = searchEnd.toISOString();
      } else {
        const now = new Date();
        const currentYear = now.getFullYear();
        
        // Search festival months for current and next year
        for (const month of festivalInfo.months) {
          const festivalStart = new Date(currentYear, month - 1, 1);
          const festivalEnd = new Date(currentYear, month, 0); // Last day of month
          
          if (festivalStart > now) {
            searchParams.occurs_at_gte = festivalStart.toISOString();
            searchParams.occurs_at_lt = festivalEnd.toISOString();
            break;
          }
        }
        
        // If no matches this year, try next year
        if (!searchParams.occurs_at_gte) {
          const festivalStart = new Date(currentYear + 1, festivalInfo.months[0] - 1, 1);
          const festivalEnd = new Date(currentYear + 1, festivalInfo.months[festivalInfo.months.length - 1], 0);
          searchParams.occurs_at_gte = festivalStart.toISOString();
          searchParams.occurs_at_lt = festivalEnd.toISOString();
        }
      }
      
      const festivalEventsList = await apiClient.listEventsAggregate(searchParams, 300);
      searchResults.search_summary.api_calls_made++;
      searchResults.search_summary.total_events_searched += festivalEventsList.length || 0;
      
      const festivalEvents = festivalEventsList?.filter(event => {
        const eventName = event.name.toLowerCase();
        return festivalInfo.variations.some(variation =>
          eventName.includes(variation)
        ) || festivalInfo.keywords.some(keyword =>
          eventName.includes(keyword)
        );
      }) || [];
      
      if (festivalEvents.length > 0) {
        foundEvents.push(...festivalEvents);
        searchResults.strategy_used = 'festival_search';
      }
    }
    
    // STRATEGY 2: Comprehensive team search (home + away games)
    if (foundEvents.length === 0 && teamsToSearch.length > 0) {
      console.error(JSON.stringify({ type: 'strategy', name: 'comprehensive_team_search' }));
      searchResults.search_summary.strategies_tried.push('comprehensive_team_search');
      
      // For single team queries, search both home and away games
      if (teamsToSearch.length === 1) {
        const teamKey = teamsToSearch[0];
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
            venue_id: team.venue_id
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
          
          const homeEventsList = await apiClient.listEventsAggregate(homeSearchParams, 300);
          searchResults.search_summary.api_calls_made++;
          searchResults.search_summary.total_events_searched += homeEventsList.length || 0;
          
          homeEvents = (homeEventsList || []).filter(event => {
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
            // For NCAA teams, ensure it's a football event
            if (hasTeamName && team.sport === 'ncaa') {
              return eventName.includes('football') || eventName.includes('ncaa');
            }
            return hasTeamName;
          }) || [];
          
          console.error(JSON.stringify({ 
            type: 'home_games_found', 
            count: homeEvents.length 
          }));
        } else if (typeof team.lat === 'number' && typeof team.lon === 'number') {
          const homeSearchParams: any = {
            lat: team.lat,
            lon: team.lon,
            within: 5
          };
          if (validatedParams.date) {
            const d = new Date(validatedParams.date);
            const start = new Date(d); start.setHours(0,0,0,0);
            const end = new Date(d); end.setHours(23,59,59,999);
            homeSearchParams.occurs_at_gte = start.toISOString();
            homeSearchParams.occurs_at_lt = end.toISOString();
          } else {
            const now = new Date();
            const future = new Date(now); future.setDate(now.getDate() + (validatedParams.weeks_ahead! * 7));
            homeSearchParams.occurs_at_gte = now.toISOString();
            homeSearchParams.occurs_at_lt = future.toISOString();
          }
          const homeEventsList = await apiClient.listEventsAggregate(homeSearchParams, 300);
          searchResults.search_summary.api_calls_made++;
          searchResults.search_summary.total_events_searched += homeEventsList.length || 0;
          homeEvents = (homeEventsList || []).filter(event => {
            const en = event.name.toLowerCase();
            const hasTeamName = eventHasTeamName(en, teamKey);
            if (hasTeamName && team.sport === 'nfl') {
              return en.includes('nfl') || en.includes('preseason') || en.includes('playoff') || en.includes('super bowl') ||
                     ((en.includes(' vs ') || en.includes(' at ')) && !en.includes('minor league') && !en.includes('college'));
            }
            if (hasTeamName && team.sport === 'ncaa') {
              return en.includes('football') || en.includes('ncaa');
            }
            return hasTeamName;
          }) || [];
          console.error(JSON.stringify({ type: 'home_games_found', count: homeEvents.length }));
        }
        
        // STEP 2: Search away games nationwide
        let awayEvents: any[] = [];
        const awaySearchParams: any = {};
        
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
          
          const marketEvents = await apiClient.listEventsAggregate(marketSearchParams, 200);
          searchResults.search_summary.api_calls_made++;
          searchResults.search_summary.total_events_searched += marketEvents.length || 0;
          
          const marketAwayEvents = (marketEvents || []).filter(event => {
            const eventName = event.name.toLowerCase();
            const hasTeamMatch = eventHasTeamName(eventName, teamKey) &&
                   (eventName.includes(' at ') || eventName.includes(' @ ') || eventName.includes(' vs '));
            
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
            if (hasTeamMatch && team.sport === 'ncaa') {
              return eventName.includes('football') || eventName.includes('ncaa');
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
      else if (queryInfo.isVsMatch || teamsToSearch.length >= 2) {
        // Find home team and search their venue
        for (const team of teamsToSearch) {
          const venueInfo = TEAM_DATABASE[team as keyof typeof TEAM_DATABASE];
          if (venueInfo) {
          const searchParams: any = {};
          
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
          
          // Aggregate events nearby the venue or within the time window
          const eventsList = await apiClient.listEventsAggregate(searchParams, 300);
          searchResults.search_summary.api_calls_made++;
          searchResults.search_summary.total_events_searched += eventsList.length || 0;
          
          // Filter for matchup with sport priority
          const matchingEvents = (eventsList || []).filter(event => {
            const eventName = event.name.toLowerCase();
            return teamsToSearch.every(teamKey => {
              const team = TEAM_DATABASE[teamKey as keyof typeof TEAM_DATABASE];
              const hasTeamName = eventHasTeamName(eventName, teamKey);
              
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
                // For NCAA teams, ensure it's a football event
                if (team.sport === 'ncaa') {
                  return eventName.includes('football') || eventName.includes('ncaa');
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
    
    // STRATEGY 2B: Dynamic keyword search for unknown events (NEW)
    if (foundEvents.length === 0) {
      console.error(JSON.stringify({ type: 'strategy', name: 'dynamic_keyword_search' }));
      searchResults.search_summary.strategies_tried.push('dynamic_keyword_search');
      
      // Extract meaningful keywords from the query
      const keywords = extractSearchKeywords(queryInfo.originalQuery);
      
      // Search in major markets for any events matching keywords
      const majorCities = [
        { name: 'New York', lat: 40.7128, lon: -74.0060, radius: 50 },
        { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, radius: 50 },
        { name: 'Chicago', lat: 41.8781, lon: -87.6298, radius: 50 },
        { name: 'Las Vegas', lat: 36.1699, lon: -115.1398, radius: 30 },
        { name: 'Miami', lat: 25.7617, lon: -80.1918, radius: 30 },
        { name: 'Nashville', lat: 36.1627, lon: -86.7816, radius: 30 },
        { name: 'Atlanta', lat: 33.7490, lon: -84.3880, radius: 30 },
        { name: 'Dallas', lat: 32.7767, lon: -96.7970, radius: 40 },
        { name: 'Boston', lat: 42.3601, lon: -71.0589, radius: 30 },
        { name: 'Seattle', lat: 47.6062, lon: -122.3321, radius: 30 }
      ];
      
      const requireFootball = validatedParams.query.toLowerCase().includes('football');
      for (const city of majorCities) {
        const searchParams: any = {
          lat: city.lat,
          lon: city.lon,
          within: city.radius
        };
        
        // Add flexible date range
        if (validatedParams.date) {
          const targetDate = new Date(validatedParams.date);
          const searchStart = new Date(targetDate);
          searchStart.setDate(targetDate.getDate() - 21); // Wider window
          const searchEnd = new Date(targetDate);
          searchEnd.setDate(targetDate.getDate() + 21);
          searchParams.occurs_at_gte = searchStart.toISOString();
          searchParams.occurs_at_lt = searchEnd.toISOString();
        } else {
          // Search next 16 weeks if no date specified
          const now = new Date();
          const futureDate = new Date();
          futureDate.setDate(now.getDate() + (16 * 7));
          searchParams.occurs_at_gte = now.toISOString();
          searchParams.occurs_at_lt = futureDate.toISOString();
        }
        
        const cityEvents = await apiClient.listEventsAggregate(searchParams, 200);
        searchResults.search_summary.api_calls_made++;
        searchResults.search_summary.total_events_searched += cityEvents.length || 0;
        
        // Use fuzzy keyword matching on all events
        const matchingEvents = (cityEvents || []).filter(event => {
          const ok = fuzzyKeywordMatch(event.name, keywords, queryInfo.originalQuery);
          if (!ok) return false;
          const name = event.name.toLowerCase();
          if (requireFootball && !name.includes('football')) return false;
          // If two teams resolved, require both team mentions
          if (teamsToSearch.length >= 2) {
            return teamsToSearch.every(tk => eventHasTeamName(name, tk));
          }
          return true;
        }) || [];
        
        if (matchingEvents.length > 0) {
          foundEvents.push(...matchingEvents);
          searchResults.strategy_used = 'dynamic_keyword_search';
          console.error(JSON.stringify({
            type: 'dynamic_search_success',
            city: city.name,
            events_found: matchingEvents.length,
            keywords_used: keywords
          }));
          break; // Found matches, stop searching other cities
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
          within: 50
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
        
        const locEvents = await apiClient.listEventsAggregate(searchParams, 200);
        searchResults.search_summary.api_calls_made++;
        searchResults.search_summary.total_events_searched += locEvents.length || 0;
        
        // Keyword matching with fuzzy logic
        const matchingEvents = (locEvents || []).filter(event => {
          const eventName = event.name.toLowerCase();
          const matchCount = queryInfo.words.filter(word => 
            word.length > 2 && eventName.includes(word)
          ).length;
          const basic = matchCount >= Math.min(2, queryInfo.words.length);
          if (!basic) return false;
          if (teamsToSearch.length >= 2) {
            return teamsToSearch.every(tk => eventHasTeamName(eventName, tk));
          }
          return true;
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

function computeSearchWindow(params: { date?: string, weeks_ahead?: number }): { startISO?: string, endISO?: string } {
  if (params.date) {
    const target = new Date(params.date);
    const start = new Date(target); start.setHours(0,0,0,0);
    const end = new Date(target); end.setHours(23,59,59,999);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }
  const now = new Date();
  const end = new Date(now);
  const weeks = typeof params.weeks_ahead === 'number' ? params.weeks_ahead : 12;
  end.setDate(end.getDate() + weeks * 7);
  return { startISO: now.toISOString(), endISO: end.toISOString() };
}

/**
 * Extract meaningful keywords from a search query for fuzzy matching
 */
function extractSearchKeywords(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  
  // Remove common stop words and punctuation
  const stopWords = new Set([
    'the', 'at', 'in', 'on', 'for', 'and', 'or', 'but', 'with', 'by', 'from', 
    'to', 'of', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'concert', 'show', 'event', 'game', 'match', 'tour', 'vs', 'versus', 'v',
    'tickets', 'ticket', 'live', '2025', '2024', '2026'
  ]);
  
  // Extract words, clean them up
  const words = lowerQuery
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter(word => !/^\d+$/.test(word)); // Remove pure numbers
  
  // Also extract phrases (2-3 word combinations)
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
 * Fuzzy keyword matching for event names
 */
function fuzzyKeywordMatch(eventName: string, keywords: string[], originalQuery: string): boolean {
  const lowerEventName = eventName.toLowerCase();
  const lowerOriginalQuery = originalQuery.toLowerCase();
  
  // Direct substring match with original query
  if (lowerEventName.includes(lowerOriginalQuery.replace(/[^\w\s]/g, ' ').trim())) {
    return true;
  }
  
  // Keyword-based scoring system
  let matchScore = 0;
  let totalKeywords = keywords.length;
  
  if (totalKeywords === 0) return false;
  
  for (const keyword of keywords) {
    if (lowerEventName.includes(keyword)) {
      // Longer keywords get higher weight
      matchScore += keyword.length > 4 ? 2 : 1;
    }
    
    // Fuzzy matching for common misspellings and variations
    if (keyword.length > 3) {
      // Check for partial matches (at least 75% of characters)
      const threshold = Math.ceil(keyword.length * 0.75);
      if (findPartialMatch(lowerEventName, keyword, threshold)) {
        matchScore += 0.5;
      }
    }
  }
  
  // Need at least 30% keyword match score, or 2+ keyword matches for longer queries
  const requiredScore = totalKeywords > 5 ? 2 : Math.max(1, totalKeywords * 0.3);
  
  return matchScore >= requiredScore;
}

/**
 * Find partial string matches for fuzzy matching
 */
function findPartialMatch(text: string, pattern: string, minMatch: number): boolean {
  for (let i = 0; i <= text.length - minMatch; i++) {
    let matches = 0;
    for (let j = 0; j < pattern.length && i + j < text.length; j++) {
      if (text[i + j] === pattern[j]) {
        matches++;
      }
    }
    if (matches >= minMatch) {
      return true;
    }
  }
  return false;
}
