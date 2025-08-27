# Ticket Evolution MCP Server

An MCP (Model Context Protocol) server that provides access to the Ticket Evolution API for event discovery and ticket listings.

## Features

- Search for events, performers, and venues
- List events with geo and date filtering
- Get detailed event information
- Find and filter ticket listings with ranking
- **Entertainment Event Discovery** - Specialized search for concerts, comedy, theater
- **Smart Ticket Presentation** - Budget-aware recommendations across price tiers
- **Universal Event Finding** - Comprehensive search for both sports and entertainment

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment file and configure your credentials:
   ```bash
   cp .env.example .env
   ```

3. Add your Ticket Evolution API credentials to `.env`:
   ```
   TEVO_API_TOKEN=your_token
   TEVO_API_SECRET=your_secret
   ```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run linter

## Environment Variables

- `TEVO_ENV` - Environment (sandbox/production)
- `TEVO_API_TOKEN` - Your API token
- `TEVO_API_SECRET` - Your API secret
- `TEVO_TIMEOUT_MS` - Request timeout (default: 8000)
- `TEVO_MAX_RETRIES` - Max retry attempts (default: 2)

## MCP Tools

### Core Tools
- `tevo_search_suggestions` - Search for events, performers, venues
- `tevo_list_events` - List events with filters
- `tevo_get_event` - Get event details
- `tevo_listings_for_event` - Get ticket listings for an event

### Enhanced Tools
- `tevo_universal_event_finder` - Intelligent search for sports and entertainment events
- `tevo_entertainment_event_finder` - Specialized search for concerts, comedy, theater
- `tevo_smart_ticket_presenter` - Budget-aware ticket recommendations
- `tevo_smart_nfl_finder` - Advanced NFL game discovery
