import fs from 'fs';
import path from 'path';

export interface TeamVenueRecord {
  key: string;              // canonical team key, e.g., "green bay packers", "georgia bulldogs"
  league: string;           // e.g., nfl, nba, mlb, nhl, mls, ncaa_fbs, ncaa_fcs
  city?: string;            // city or town
  venue?: string;           // primary venue/stadium name
  lat?: number;             // latitude (decimal degrees)
  lon?: number;             // longitude (decimal degrees)
  venue_id?: number;        // optional TEVO venue id if known
  variations?: string[];    // name variations and nicknames
  aliases?: string[];       // city aliases (e.g., "East Rutherford", "Pasadena")
}

/**
 * Merge team venue records into the in-memory maps used by the universal finder.
 * Mutates teamDb, cityTeamsMap, and cityCoords in place.
 */
export function augmentTeamsFromDataset(
  records: TeamVenueRecord[],
  teamDb: Record<string, any>,
  cityTeamsMap: Record<string, string[]>,
  cityCoords: Record<string, { lat: number; lon: number }>
): void {
  for (const rec of records) {
    const key = rec.key.trim().toLowerCase();
    if (!key) continue;

    const existing = teamDb[key] || {};
    const variations = Array.from(new Set([
      ...(existing.variations || []),
      ...(rec.variations || []),
      rec.key,
      rec.city || ''
    ].filter(Boolean)));

    teamDb[key] = {
      ...existing,
      city: rec.city ?? existing.city,
      venue: rec.venue ?? existing.venue,
      lat: rec.lat ?? existing.lat,
      lon: rec.lon ?? existing.lon,
      sport: existing.sport || inferSportFromLeague(rec.league),
      venue_id: existing.venue_id ?? rec.venue_id,
      variations
    };

    // City mappings (support aliases too)
    const cityNames = new Set<string>();
    if (rec.city) cityNames.add(rec.city);
    (rec.aliases || []).forEach(a => cityNames.add(a));
    for (const name of cityNames) {
      const cityKey = name.toLowerCase();
      if (rec.lat !== undefined && rec.lon !== undefined && !cityCoords[cityKey]) {
        cityCoords[cityKey] = { lat: rec.lat, lon: rec.lon };
      }
      if (!cityTeamsMap[cityKey]) {
        cityTeamsMap[cityKey] = [];
      }
      if (!cityTeamsMap[cityKey].includes(key)) {
        cityTeamsMap[cityKey].push(key);
      }
    }
  }
}

function inferSportFromLeague(league: string | undefined): string {
  if (!league) return 'unknown';
  const l = league.toLowerCase();
  if (l.startsWith('ncaa')) return 'ncaa';
  if (["nfl","nba","mlb","nhl","mls"].includes(l)) return l;
  return 'unknown';
}

export function tryAugmentFromFile(
  teamDb: Record<string, any>,
  cityTeamsMap: Record<string, string[]>,
  cityCoords: Record<string, { lat: number; lon: number }>,
  customPath?: string
): void {
  const dataPath = customPath || path.join(process.cwd(), 'data', 'team_venues.json');
  try {
    if (!fs.existsSync(dataPath)) return;
    const raw = fs.readFileSync(dataPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    augmentTeamsFromDataset(parsed, teamDb, cityTeamsMap, cityCoords);
    console.error(JSON.stringify({
      type: 'team_dataset_loaded',
      file: dataPath,
      records: parsed.length
    }));
  } catch (err) {
    console.error(JSON.stringify({
      type: 'team_dataset_error',
      file: dataPath,
      error: err instanceof Error ? err.message : String(err)
    }));
  }
}

