import { config as dotenv } from 'dotenv';
dotenv();

import fs from 'fs';
import path from 'path';
import { loadConfig } from '../src/utils/config.js';
import { TevoApiClient } from '../src/client/tevo-api.js';

interface TeamVenueRecord {
  key: string;
  league: string;
  city?: string;
  venue?: string;
  lat?: number;
  lon?: number;
  venue_id?: number;
  variations?: string[];
  aliases?: string[];
}

function similarity(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x === y) return 1;
  // simple token inclusion score
  const tokens = Array.from(new Set(x.split(/\s+/).filter(Boolean)));
  let hits = 0;
  tokens.forEach(t => { if (y.includes(t)) hits++; });
  return hits / Math.max(1, tokens.length);
}

async function main() {
  const config = loadConfig();
  const api = new TevoApiClient(config);

  const file = path.join(process.cwd(), 'data', 'team_venues.json');
  if (!fs.existsSync(file)) {
    console.error('No data/team_venues.json to map. Run generate:teams first.');
    process.exit(1);
  }
  const data: TeamVenueRecord[] = JSON.parse(fs.readFileSync(file, 'utf8'));

  const venues = Array.from(new Set(data.map(r => r.venue).filter(Boolean))) as string[];
  const cache = new Map<string, number>();

  for (const v of venues) {
    try {
      const sugg = await api.searchSuggestions({ q: v!, limit: 8, fuzzy: true });
      const candidates = sugg.venues || [];
      let bestId: number | undefined;
      let bestScore = 0;
      for (const c of candidates) {
        const score = similarity(v!, c.name);
        if (score > bestScore) { bestScore = score; bestId = c.id; }
      }
      if (bestId && bestScore >= 0.5) {
        cache.set(v!, bestId);
        console.error(JSON.stringify({ type: 'venue_match', name: v, id: bestId, score: bestScore }));
      } else {
        console.error(JSON.stringify({ type: 'venue_no_match', name: v, candidates: candidates.map(c => c.name) }));
      }
    } catch (e) {
      console.error(JSON.stringify({ type: 'venue_map_error', venue: v, error: e instanceof Error ? e.message : String(e) }));
    }
  }

  const updated = data.map(r => {
    if (!r.venue_id && r.venue && cache.has(r.venue)) {
      return { ...r, venue_id: cache.get(r.venue) };
    }
    return r;
  });

  fs.writeFileSync(file, JSON.stringify(updated, null, 2));
  console.log(`Updated venue_id for ${Array.from(cache.values()).length} venues`);
}

main().catch(err => { console.error(err); process.exit(1); });

