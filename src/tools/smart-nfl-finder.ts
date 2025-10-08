import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TevoApiClient } from '../client/tevo-api.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { validateSmartNflFinderParams } from '../utils/validation.js';

export function createSmartNflFinderTool(_apiClient: TevoApiClient, _cache: MemoryCache): Tool {
  return {
    name: 'tevo_smart_nfl_finder',
    description: 'Smart NFL game finder using team names and venue-based searches. Assumes requested_quantity=1 unless provided. Do not ask clarifying questions; infer and search within the next N weeks.',
    inputSchema: {
      type: 'object',
      properties: {
        away_team: {
          type: 'string',
          description: 'Away team name (e.g., "Giants", "Cowboys", "Patriots")'
        },
        home_team: {
          type: 'string',
          description: 'Home team name (e.g., "Giants", "Cowboys", "Patriots")'
        },
        weeks_ahead: {
          type: 'integer',
          minimum: 1,
          maximum: 52,
          default: 8,
          description: 'Search within next N weeks (default: 8)'
        },
        budget_per_ticket: {
          type: 'number',
          minimum: 1,
          description: 'Maximum budget per ticket in USD'
        },
        requested_quantity: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          default: 1,
          description: 'Number of tickets needed (default: 1)'
        },
        return_top: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          default: 5,
          description: 'Return top N ticket options (default: 5)'
        }
      },
      required: ['away_team', 'home_team']
    }
  };
}

// NFL team to venue mapping for efficient searches
const NFL_VENUES = {
  'patriots': { venue_id: 2236, venue_name: 'Gillette Stadium' },
  'giants': { venue_id: 2237, venue_name: 'MetLife Stadium' },
  'jets': { venue_id: 2237, venue_name: 'MetLife Stadium' },
  'cowboys': { venue_id: 2243, venue_name: 'AT&T Stadium' },
  'packers': { venue_id: 2253, venue_name: 'Lambeau Field' },
  'steelers': { venue_id: 2265, venue_name: 'Heinz Field' },
  'ravens': { venue_id: 2269, venue_name: 'M&T Bank Stadium' },
  'browns': { venue_id: 2272, venue_name: 'Cleveland Browns Stadium' },
  'bengals': { venue_id: 2276, venue_name: 'Paul Brown Stadium' },
  'titans': { venue_id: 2280, venue_name: 'Nissan Stadium' },
  'colts': { venue_id: 2284, venue_name: 'Lucas Oil Stadium' },
  'texans': { venue_id: 2288, venue_name: 'NRG Stadium' },
  'jaguars': { venue_id: 2292, venue_name: 'EverBank Stadium' },
  'dolphins': { venue_id: 2296, venue_name: 'Hard Rock Stadium' },
  'bills': { venue_id: 2300, venue_name: 'Highmark Stadium' },
  'chiefs': { venue_id: 2304, venue_name: 'Arrowhead Stadium' },
  'raiders': { venue_id: 2308, venue_name: 'Allegiant Stadium' },
  'broncos': { venue_id: 2312, venue_name: 'Empower Field at Mile High' },
  'chargers': { venue_id: 2316, venue_name: 'SoFi Stadium' },
  'rams': { venue_id: 2316, venue_name: 'SoFi Stadium' },
  '49ers': { venue_id: 2320, venue_name: "Levi's Stadium" },
  'seahawks': { venue_id: 2324, venue_name: 'Lumen Field' },
  'cardinals': { venue_id: 2328, venue_name: 'State Farm Stadium' },
  'saints': { venue_id: 2332, venue_name: 'Caesars Superdome' },
  'falcons': { venue_id: 2336, venue_name: 'Mercedes-Benz Stadium' },
  'panthers': { venue_id: 2340, venue_name: 'Bank of America Stadium' },
  'buccaneers': { venue_id: 2344, venue_name: 'Raymond James Stadium' },
  'bears': { venue_id: 2348, venue_name: 'Soldier Field' },
  'lions': { venue_id: 2352, venue_name: 'Ford Field' },
  'vikings': { venue_id: 2356, venue_name: 'U.S. Bank Stadium' },
  'eagles': { venue_id: 2360, venue_name: 'Lincoln Financial Field' },
  'commanders': { venue_id: 2364, venue_name: 'FedExField' },
  'redskins': { venue_id: 2364, venue_name: 'FedExField' }, // Legacy name
  'washington': { venue_id: 2364, venue_name: 'FedExField' }
};

export async function handleSmartNflFinder(
  apiClient: TevoApiClient,
  _cache: MemoryCache,
  params: unknown
) {
  const validatedParams = validateSmartNflFinderParams(params);
  
  console.error(JSON.stringify({
    type: 'smart_nfl_finder_start',
    away_team: validatedParams.away_team,
    home_team: validatedParams.home_team,
    weeks_ahead: validatedParams.weeks_ahead,
    budget: validatedParams.budget_per_ticket
  }));

  try {
    // Step 1: Get home team venue
    const homeTeamKey = validatedParams.home_team.toLowerCase();
    const venue = NFL_VENUES[homeTeamKey as keyof typeof NFL_VENUES];
    
    if (!venue) {
      throw new Error(`Unknown NFL team: ${validatedParams.home_team}. Please use common team names like "Patriots", "Giants", "Cowboys", etc.`);
    }

    console.error(JSON.stringify({
      type: 'venue_lookup_success',
      home_team: validatedParams.home_team,
      venue_id: venue.venue_id,
      venue_name: venue.venue_name
    }));

    // Step 2: Search for events at the venue
    const now = new Date();
    const searchEndDate = new Date();
    searchEndDate.setDate(now.getDate() + (validatedParams.weeks_ahead! * 7));

    const eventsList = await apiClient.listEventsAggregate({
      venue_id: venue.venue_id,
      occurs_at_gte: now.toISOString(),
      occurs_at_lt: searchEndDate.toISOString()
    }, 200);

    console.error(JSON.stringify({
      type: 'venue_events_found',
      venue_id: venue.venue_id,
      total_events: eventsList.length || 0,
      search_period: `${validatedParams.weeks_ahead} weeks`
    }));

    // Step 3: Find the specific matchup
    const awayTeamPattern = new RegExp(validatedParams.away_team, 'i');
    const homeTeamPattern = new RegExp(validatedParams.home_team, 'i');
    
    const matchingEvents = (eventsList || []).filter(event => {
      const eventName = event.name.toLowerCase();
      return awayTeamPattern.test(eventName) && homeTeamPattern.test(eventName);
    }) || [];

    if (matchingEvents.length === 0) {
      return {
        success: false,
        message: `No ${validatedParams.away_team} at ${validatedParams.home_team} games found in the next ${validatedParams.weeks_ahead} weeks`,
        venue_searched: venue.venue_name,
        events_checked: eventsList.length || 0,
        available_games: eventsList?.map(e => ({
          name: e.name,
          date: new Date(e.occurs_at).toLocaleDateString()
        })).slice(0, 5) || []
      };
    }

    console.error(JSON.stringify({
      type: 'matchup_found',
      games_found: matchingEvents.length,
      game_names: matchingEvents.map(e => e.name)
    }));

    // Step 4: Get tickets for each matching event
    const gameResults = [];
    
    for (const event of matchingEvents) {
      try {
        // Get event details
        const eventDetails = await apiClient.getEvent({ event_id: event.id });
        
        // Get ticket listings if budget specified
        let ticketOptions = null;
        if (validatedParams.budget_per_ticket) {
          const listingsResponse = await apiClient.getListings(event.id);
          
          // Filter and rank tickets (exclude parking)
          const eligibleTickets = listingsResponse.ticket_groups
            ?.filter(tg => 
              tg.retail_price <= validatedParams.budget_per_ticket! && 
              tg.available_quantity >= validatedParams.requested_quantity! &&
              !tg.section?.toLowerCase().includes('parking') &&
              !tg.section?.toLowerCase().includes('lot') &&
              !tg.section?.toLowerCase().includes('garage')
            )
            ?.map(tg => ({
              section: tg.section || 'N/A',
              row: tg.row || 'N/A',
              price_per_ticket: tg.retail_price,
              available_quantity: tg.available_quantity,
              format: tg.format || 'Unknown',
              instant_delivery: tg.instant_delivery || false,
              public_notes: tg.public_notes || null,
              listing_id: tg.id
            }))
            ?.sort((a, b) => a.price_per_ticket - b.price_per_ticket)
            ?.slice(0, validatedParams.return_top!) || [];

          if (eligibleTickets.length > 0) {
            ticketOptions = {
              total_found: listingsResponse.ticket_groups?.length || 0,
              within_budget: eligibleTickets.length,
              best_options: eligibleTickets
            };
          }
        }

        const gameDate = new Date(eventDetails.occurs_at);
        const dayOfWeek = gameDate.getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        gameResults.push({
          event_id: event.id,
          event_name: eventDetails.name,
          venue: eventDetails.venue.name,
          date: gameDate.toLocaleDateString(),
          time: gameDate.toLocaleTimeString(),
          day_of_week: dayNames[dayOfWeek],
          is_prime_time: dayOfWeek === 1 || dayOfWeek === 4 || dayOfWeek === 0, // Monday, Thursday, Sunday
          tickets: ticketOptions
        });

      } catch (error) {
        console.error(JSON.stringify({
          type: 'event_processing_error',
          event_id: event.id,
          error: error instanceof Error ? error.message : String(error)
        }));
      }
    }

    // Return results
    const result = {
      success: true,
      search_strategy: 'venue_based_smart_search',
      matchup: `${validatedParams.away_team} at ${validatedParams.home_team}`,
      venue_searched: venue.venue_name,
      games_found: gameResults,
      search_summary: {
        weeks_searched: validatedParams.weeks_ahead!,
        venue_events_checked: eventsList.length || 0,
        matching_games: gameResults.length,
        budget_per_ticket: validatedParams.budget_per_ticket || null,
        tickets_requested: validatedParams.requested_quantity!
      }
    };

    console.error(JSON.stringify({
      type: 'smart_nfl_finder_complete',
      success: true,
      games_found: gameResults.length,
      total_tickets_found: gameResults.reduce((sum, game) => sum + (game.tickets?.within_budget || 0), 0)
    }));

    return result;

  } catch (error) {
    console.error(JSON.stringify({
      type: 'smart_nfl_finder_error',
      error: error instanceof Error ? error.message : String(error),
      away_team: validatedParams.away_team,
      home_team: validatedParams.home_team
    }));

    throw error;
  }
}
