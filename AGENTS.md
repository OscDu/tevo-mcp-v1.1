## Purpose
Guidance for agents working in this repository. This project is an MCP server that discovers events and returns ticket listings from the Ticket Evolution (TEVO) API. It must be robust to partial data, endpoint auth constraints, and ambiguous user prompts.

## Quick Start
- Build: `npm run build`
- Dev: `npm run dev`
- Start: `npm start`
- Tests: `npm test`
- Generate team/venue dataset (optional): `npm run generate:teams`
- Map TEVO venue IDs (optional, requires suggestions auth): `npm run map:tevo-venues`
- Check TEVO Suggestions capability: `npm run check:suggestions`
- Show X‑Signature examples for Suggestions: `npm run show:signature`

## Tools & Key Files
- MCP server entry: `src/index.ts`
- Universal finder tool (primary): `src/tools/universal-event-finder.ts`
- Comprehensive search (alternate): `src/tools/comprehensive-event-search.ts`
- Listings tool: `src/tools/listings-for-event.ts`
- HTTP client + auth/signature: `src/client/http.ts`, `src/auth/signature.ts`
- Validation: `src/utils/validation.ts`
- Listings filtering: `src/utils/listings-filter.ts`
- Optional dataset: `data/team_venues.json` (schema example in `data/team_venues.json.example`)
- Dataset loader helpers: `src/data/team-venues.ts`
- Dataset builders (scripts): `scripts/build-team-venues.ts`, `scripts/map-tevo-venue-ids.ts`
- Suggestions capability checks: `scripts/check-tevo-suggestions.ts`, `scripts/check-suggestions-alt.ts`
- Signature preview for Suggestions: `scripts/show-suggestion-signature.ts`

## Discovery Strategy (Follow This Order)
1) Use TEVO endpoints whenever authorized:
   - Suggestions: `searches/suggestions` (resolves performers/venues/IDs) — use when 401 is not present.
   - List events: `GET /events` (date, location, performer/venue IDs).
2) If suggestions are unauthorized (common):
   - Use date + location radius searches around known venues (teams/venues from dataset or inferred from query text).
   - Use major-market sweeps (NYC, LA, Chicago, etc.) with fuzzy keyword matching.
3) Team queries:
   - If venue_id is unknown, search by tight radius around known stadium coordinates on the date.
   - For two-team (vs) queries, require both teams appear in event name. For NCAA, require football/NCAA keywords.
4) Performers/festivals:
   - Rely on TEVO search + market sweeps. Only use curated “mega venue” hints as a nudge, never as a hard requirement.

### Event Discovery Checklist (Sports)
- Parse query for two teams (vs/at patterns). If two resolved teams → require both tokens in event name.
- If single team, try home-venue search:
  - With `venue_id` if available; else use `lat/lon` + `within: 5` and the date window.
- If the stadium name is in the query (e.g., “Jordan‑Hare Stadium”), run a radius/date search around that venue.
- If still no match, broaden geographically (major markets) with strict filters (require relevant tokens; for NCAA require `football`/`ncaa`).

### Event Discovery Checklist (Entertainment)
- Use Suggestions if available; otherwise market sweeps + fuzzy keywords.
- Hydrate direct event suggestions when present; otherwise use performer → list events over a date window.
- Avoid non-live matches (e.g., “parking”, “shuttle”, “auction”) via filtering.

## Auth & Errors
- If `tevo_search_suggestions` returns 401, treat it as disabled and continue with venue/date and market sweeps.
- HMAC signature must URL-encode query keys/values (already implemented in `src/auth/signature.ts`).
- Limit `per_page` to 100; use pagination via `listEventsAggregate` to collect more.
- On verified events with no TEVO matches, return an explicit “verified but no TEVO inventory” response instead of unrelated events.

### Capability Checks
- Run `npm run check:suggestions` to verify Suggestions auth quickly (prints 401 if disabled).
- Alternate path `/v9/suggestions` is not valid (404). The documented path is `/v9/searches/suggestions`.

### Curl Examples (Suggestions)
- Replace `$TEVO_API_TOKEN` with your token.
- `X-Signature` must be computed for the exact canonical string; see `npm run show:signature`.

```
curl -i 'https://api.ticketevolution.com/v9/searches/suggestions?entities=events,performers,venues&fuzzy=true&limit=6&q=Auburn' \
  -H 'Accept: application/json' \
  -H "X-Token: $TEVO_API_TOKEN" \
  -H 'X-Signature: <computed>'
```

## NCAA/Teams & Dataset
- The universal finder can auto-load `data/team_venues.json` to augment team/city/venue coverage, including NCAA programs.
- Use `npm run generate:teams` to (re)build from Wikipedia sources; use `npm run map:tevo-venues` to attempt TEVO `venue_id` mapping (requires suggestions permission).
- Prefer coordinates fallback (lat/lon + small radius) when venue_id is unavailable.
- Consider pruning proposed/new stadiums to keep inference current-only.

## Listings & Sections
- Use `tevo_listings_for_event` for inventory. Supported pattern filters:
  - Single prefixes (e.g., `"1"`) and multiple prefixes (`"1,2"`).
  - Numeric ranges (`"24-34"`).
- `return_top` supports up to 50. Be mindful of splits — large quantities may need grouping.
- If a large `requested_quantity` yields few results, probe common splits (e.g., 12, 8) to identify grouping options.

## UX & Prompts
- Default to minimal clarifying questions. Assume:
  - `requested_quantity=2` (unless provided).
  - Include tickets when budget/quantity is provided.
  - Location is optional; search major markets when missing.
- For team queries, infer home/away; search both when unclear.
- If Suggestions capability is disabled, avoid asking for IDs; document degraded mode in logs.

## Coding Conventions
- Keep changes surgical and scoped; match existing TypeScript style.
- Do not add unrelated features when addressing a specific issue.
- Prefer small, composable helpers over large ad‑hoc blocks.
- Log structured errors/events to stderr using JSON for easy tracing.

## Observability
- HTTP requests log `http_response` / `http_error` with correlation IDs.
- Tools should log strategy names and counts (`strategy`, `*_found`, `*_error`).
- Use these logs to decide whether to escalate to alternate strategies.
- Scripts print structured JSON for quick capability checks and signature previews.

## Common Pitfalls
- Suggestions 401: do not stop — degrade to venue/date and market sweeps.
- Over‑matching generic tokens (e.g., “Bulldogs”): require both team tokens for vs-match; for NCAA add football/NCAA terms.
- Excessive `per_page`: clamp to 100 and paginate.
- Missing event in TEVO: return a clear “no TEVO inventory” message if the event is verified via web or dataset.
- Using `/v9/suggestions` instead of `/v9/searches/suggestions`: the former returns 404; use the documented path.

## Maintenance Tasks
- Keep the dataset up-to-date (Option A: curated JSON; Option B: regenerate via scripts and refine selectors).
- Consider pruning “proposed/new” stadiums when present to ensure present‑only venue inference.
- Address endpoint auth scopes with TEVO (especially `searches/suggestions`).
- Ensure all calls are signed (X‑Signature + X‑Token). The code signs all requests; see `src/client/http.ts` and `src/auth/signature.ts`.

## Fallback Response (When TEVO Lacks the Event)
- If venue/date are verified (via trusted sources) but TEVO returns no matching event:
  - Return a clear message: verified event, no TEVO inventory available at this time.
  - Include venue section guidance (e.g., for lower bowl/club ranges).
  - Provide high‑level pricing context if available from public sources (no purchase links), and suggest official/secondary marketplaces.
  - Avoid returning irrelevant events.
