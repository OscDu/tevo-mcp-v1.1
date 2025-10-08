# Claude Development Guide

# 🚨 CRITICAL: Tool Usage Policy - ALWAYS FOLLOW
**For ANY event, ticket, or entertainment request:**
1. **START WITH MCP TOOLS FIRST** - Never make assumptions about database coverage
2. **Use `tevo_search_suggestions`** to find events in the Tevo database 
3. **Then use specific tools**: `tevo_listings_for_event`, `tevo_universal_event_finder`, etc.
4. **Get actual ticket availability** with proper event IDs from the database
5. **Only use web search** if MCP tools completely fail to find anything
6. **No excuses** about "database limitations" - verify with tools first
7. **Be systematic** - don't skip steps or make assumptions

## Project Overview
This is a Ticket Evolution MCP server that provides comprehensive event discovery and ticket listing functionality through the Model Context Protocol. Enhanced with extensive 2025 event coverage including major tours, festivals, championships, and sports events.

## Development Commands
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production  
npm run start           # Start production server

# Testing & Quality
npm run test            # Run tests
npm run test:watch      # Run tests in watch mode
npm run lint            # Run ESLint
npm run lint:fix        # Fix linting issues
npm run typecheck       # Run TypeScript type checking

# QA Testing
node comprehensive-qa-test.js    # Run comprehensive QA test for top 2025 events
node test-100-level-fix.js       # Test 100-level section filtering
node test-flexible-search.js     # Test flexible search for unknown artists/events
```

## Architecture
- **MCP Server**: Built with @modelcontextprotocol/sdk
- **API Client**: Axios-based HTTP client for Ticket Evolution API
- **Authentication**: HMAC-SHA256 signature-based auth
- **Caching**: In-memory caching for API responses (NEVER caches ticket prices/listings)
- **Validation**: AJV schema validation
- **Geographic Coverage**: 65+ major US cities and entertainment markets
- **Venue Database**: 80+ major venues including Super Bowl, tennis, and festival locations

## Key Directories
- `src/` - Source code
  - `tools/` - MCP tool implementations
  - `client/` - API client and HTTP handling
  - `auth/` - Authentication and signature generation
  - `utils/` - Utilities and filters
  - `types/` - TypeScript type definitions
- `dist/` - Compiled output
- Root level `.js` files - Test scripts and examples

## Environment Variables
```bash
TEVO_API_TOKEN=your_token
TEVO_API_SECRET=your_secret
TEVO_ENV=sandbox|production
TEVO_TIMEOUT_MS=8000
TEVO_MAX_RETRIES=2
```

## Testing Strategy
- Unit tests for utilities and filters
- Integration tests for API clients
- Test files use descriptive naming (e.g., `find-dodgers-tonight.js`)

## Code Conventions
- TypeScript with strict type checking
- ESLint for code quality
- Async/await over promises
- Descriptive error handling
- Comprehensive logging in production mode

## Available Tools
1. `tevo_search_suggestions` - Search events/performers/venues
2. `tevo_list_events` - List events with filtering  
3. `tevo_get_event` - Get detailed event info
4. `tevo_listings_for_event` - Get ticket listings with section pattern filtering (e.g., 100-level seats)
5. `tevo_universal_event_finder` - Smart event discovery with tennis tournament and festival support
6. `tevo_entertainment_event_finder` - Entertainment-focused search (50+ major artists, festivals)
7. `tevo_smart_ticket_presenter` - Budget-aware recommendations
8. `tevo_smart_nfl_finder` - NFL game discovery

## Enhanced Features (2025 QA Update)

### Major Event Coverage
- **Super Bowl LIX**: New Orleans, February 9, 2025 (Caesars Superdome)
- **Major Concert Tours**: Taylor Swift, Billie Eilish, Post Malone, Morgan Wallen, Benson Boone, SZA, etc.
- **Music Festivals**: Lollapalooza, Coachella, Bonnaroo, Outside Lands, Electric Daisy Carnival
- **Tennis Championships**: US Open with Arthur Ashe/Louis Armstrong Stadium support
- **NFL Season**: All teams with smart venue-based discovery

### Artist Database (50+ Artists)
- **Pop**: Taylor Swift, Billie Eilish, Sabrina Carpenter, Chappell Roan, Olivia Rodrigo
- **Hip-Hop/Rap**: Drake, Kendrick Lamar, Post Malone, SZA, Travis Scott, Tyler The Creator
- **Country**: Morgan Wallen, Luke Combs, Chris Stapleton, Carrie Underwood
- **Latin**: Karol G, Peso Pluma, Bad Bunny, Rauw Alejandro
- **Comedy**: Dave Chappelle, Matt Rife, Kevin Hart, Sebastian Maniscalco
- **Broadway**: Hamilton, Wicked, Chicago, Book of Mormon, Moulin Rouge

### Venue Database (80+ Venues)
- **Championship Venues**: Mercedes-Benz Superdome, AT&T Stadium, SoFi Stadium
- **Tennis Venues**: Arthur Ashe Stadium, Louis Armstrong Stadium
- **Festival Locations**: Grant Park (Lollapalooza), Empire Polo Club (Coachella)
- **Major Amphitheaters**: Red Rocks, Hollywood Bowl, Gorge Amphitheatre
- **Sports Stadiums**: All NFL venues, major baseball/basketball arenas

### Geographic Coverage (65+ Cities)
Complete coverage of all major US markets plus entertainment-specific locations like Indio (Coachella), Manchester TN (Bonnaroo), Morrison (Red Rocks).

### Advanced Features
- **Section Pattern Filtering**: Find 100-level, 200-level, or any section pattern
- **Tennis Tournament Logic**: Specialized search for US Open sessions and championships  
- **Festival Event Detection**: Multi-day festival support with weekend/day pass recognition
- **Enhanced Date Flexibility**: ±14 day search window for entertainment events
- **Budget-Aware Filtering**: Smart ticket recommendations within price ranges

### Flexible Search System (NEW)
- **Dynamic Keyword Matching**: No longer dependent on exact database matches
- **Fuzzy Search**: Handles misspellings and partial names (e.g., "Taylor Swfit" → Taylor Swift)
- **Unknown Artist Discovery**: Finds new artists not in predefined database
- **Broad Geographic Sweep**: Searches major markets for any matching events
- **Multi-Strategy Fallback**: 5+ search strategies per query for maximum coverage
- **Generic Event Support**: Finds events by type ("country concert", "rock show")
- **Real-time Learning**: Adapts to new events, festivals, and artists automatically

## Caching Policy
- **CACHED**: Event metadata, search suggestions, venue information (static data)
- **NEVER CACHED**: Ticket prices, listings, availability (dynamic pricing data)

## Tool Usage Guidelines - ALWAYS FOLLOW
### Event/Ticket Request Workflow:
1. **tevo_search_suggestions** - Find events by name/team/artist
2. **tevo_listings_for_event** - Get actual tickets with event IDs  
3. **tevo_universal_event_finder** - Broad event discovery
4. **tevo_entertainment_event_finder** - Artist-specific searches
5. **tevo_smart_nfl_finder** - NFL game searches

### Never Do This:
❌ Make assumptions about database coverage  
❌ Use web search before trying MCP tools  
❌ Make excuses about "database limitations"  
❌ Skip systematic tool usage

### Always Do This:
✅ Start with `tevo_search_suggestions` for any request  
✅ Use proper event IDs from the database  
✅ Get real ticket availability and pricing  
✅ Be systematic and thorough with tool usage

## Development Notes
- Use existing test scripts as examples for new functionality
- Follow the pattern of comprehensive error handling
- Maintain backwards compatibility with existing tools
- Add tests for new features in appropriate `__tests__/` directories
- Run `comprehensive-qa-test.js` to validate coverage of top 2025 events
- Use `section_pattern` parameter in listings tool for specific seating level searches
- **ALWAYS follow the Tool Usage Guidelines above for any event/ticket requests**