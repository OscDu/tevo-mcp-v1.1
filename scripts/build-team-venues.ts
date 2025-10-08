import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

type RecordRow = {
  key: string;
  league: string;
  city?: string;
  venue?: string;
  lat?: number;
  lon?: number;
  venue_id?: number;
  variations?: string[];
  aliases?: string[];
};

type LeagueSource = {
  league: string;
  url: string;
  parser: (html: string) => RecordRow[];
};

function cleanText(t: string): string {
  return t.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
}

function parseGeoFromRow($row: cheerio.Cheerio, $: cheerio.CheerioAPI): { lat?: number; lon?: number } {
  // Try span.geo first (format: "lat; lon")
  const geo = $row.find('span.geo').first().text().trim();
  if (geo && geo.includes(';')) {
    const [latStr, lonStr] = geo.split(';').map(s => s.trim());
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) return { lat, lon };
  }
  // Try data-latitude / data-longitude on coordinates
  const coord = $row.find('.coordinates').first();
  const latAttr = coord.find('span.latitude').text().trim();
  const lonAttr = coord.find('span.longitude').text().trim();
  if (latAttr && lonAttr) {
    // Latitude/longitude often in DMS; skip complex parsing, fallback to undefined
    // A later enhancement can DMS->DD if needed
  }
  return {};
}

function splitTeams(raw: string): string[] {
  let s = cleanText(raw);
  // Common separators
  s = s.replace(/\band\b/gi, ',');
  s = s.replace(/\//g, ',');
  const parts = s.split(',').map(p => cleanText(p)).filter(Boolean);
  // Remove trailing "(something)" notes
  return parts.map(p => p.replace(/\([^)]*\)$/, '').trim()).filter(Boolean);
}

function makeRecord(team: string, league: string, city?: string, venue?: string, lat?: number, lon?: number): RecordRow {
  const key = team.toLowerCase();
  const variations = Array.from(new Set([team, team.replace(/\s+FC$/i, ''), team.replace(/\s+SC$/i, '')]));
  const aliases: string[] = [];
  if (city) aliases.push(city);
  return { key, league, city, venue, lat, lon, variations, aliases };
}

function parseGenericTable(html: string, opts: {
  league: string;
  tableSelector?: string;
  headersMap?: Record<string, string>; // map header name -> logical key (stadium, team, location)
}): RecordRow[] {
  const $ = cheerio.load(html);
  const tables = $(opts.tableSelector || 'table.wikitable');
  const out: RecordRow[] = [];
  if (!tables.length) return out;

  tables.each((_, tbl) => {
    const table = $(tbl);
    // Build header index for this table
    let headerCells = table.find('thead tr th');
    if (!headerCells.length) {
      headerCells = table.find('tr').first().find('th');
    }
    const headerMap: Record<number, string> = {};
    headerCells.each((i, el) => {
      const h = cleanText($(el).text()).toLowerCase();
      if (h.includes('stadium') || h.includes('arena') || h.includes('venue')) headerMap[i] = 'venue';
      else if (h.includes('team') || h.includes('club') || h.includes('home team')) headerMap[i] = 'team';
      else if (h.includes('location') || h.includes('city')) headerMap[i] = 'city';
    });
    // Require at least team & venue
    const hasTeam = Object.values(headerMap).includes('team');
    const hasVenue = Object.values(headerMap).includes('venue');
    if (!hasTeam || !hasVenue) return;

    const rows = table.find('tbody tr');
    rows.each((__, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      if (!cells.length) return;
      let venue: string | undefined;
      let teamRaw: string | undefined;
      let city: string | undefined;

      cells.each((i, td) => {
        const kind = headerMap[i];
        if (!kind) return;
        const text = cleanText($(td).text());
        if (kind === 'venue') venue = text;
        if (kind === 'team') teamRaw = text;
        if (kind === 'city') city = text;
      });
      if (!teamRaw) return;
      const { lat, lon } = parseGeoFromRow($row, $);
      const teams = splitTeams(teamRaw);
      teams.forEach(t => out.push(makeRecord(t, opts.league, city, venue, lat, lon)));
    });
  });
  return out;
}

const SOURCES: LeagueSource[] = [
  {
    league: 'nfl',
    url: 'https://en.wikipedia.org/wiki/List_of_current_National_Football_League_stadiums',
    parser: (html) => parseGenericTable(html, { league: 'nfl' })
  },
  {
    league: 'nfl',
    url: 'https://en.wikipedia.org/wiki/List_of_National_Football_League_teams',
    parser: (html) => parseGenericTable(html, { league: 'nfl' })
  },
  {
    league: 'nba',
    url: 'https://en.wikipedia.org/wiki/List_of_National_Basketball_Association_arenas',
    parser: (html) => parseGenericTable(html, { league: 'nba' })
  },
  {
    league: 'nba',
    url: 'https://en.wikipedia.org/wiki/List_of_National_Basketball_Association_teams',
    parser: (html) => parseGenericTable(html, { league: 'nba' })
  },
  {
    league: 'mlb',
    url: 'https://en.wikipedia.org/wiki/List_of_current_Major_League_Baseball_stadiums',
    parser: (html) => parseGenericTable(html, { league: 'mlb' })
  },
  {
    league: 'mlb',
    url: 'https://en.wikipedia.org/wiki/List_of_Major_League_Baseball_teams',
    parser: (html) => parseGenericTable(html, { league: 'mlb' })
  },
  {
    league: 'nhl',
    url: 'https://en.wikipedia.org/wiki/List_of_National_Hockey_League_arenas',
    parser: (html) => parseGenericTable(html, { league: 'nhl' })
  },
  {
    league: 'nhl',
    url: 'https://en.wikipedia.org/wiki/List_of_National_Hockey_League_teams',
    parser: (html) => parseGenericTable(html, { league: 'nhl' })
  },
  {
    league: 'mls',
    url: 'https://en.wikipedia.org/wiki/List_of_Major_League_Soccer_stadiums',
    parser: (html) => parseGenericTable(html, { league: 'mls' })
  },
  {
    league: 'mls',
    url: 'https://en.wikipedia.org/wiki/List_of_Major_League_Soccer_teams',
    parser: (html) => parseGenericTable(html, { league: 'mls' })
  },
  {
    league: 'ncaa_fbs',
    url: 'https://en.wikipedia.org/wiki/List_of_NCAA_Division_I_FBS_football_stadiums',
    parser: (html) => parseGenericTable(html, { league: 'ncaa_fbs' })
  },
  {
    league: 'ncaa_fcs',
    url: 'https://en.wikipedia.org/wiki/List_of_NCAA_Division_I_FCS_football_stadiums',
    parser: (html) => parseGenericTable(html, { league: 'ncaa_fcs' })
  }
];

async function fetchLeague(source: LeagueSource): Promise<RecordRow[]> {
  const res = await axios.get(source.url, { timeout: 20000 });
  const html = res.data as string;
  console.error(JSON.stringify({ type: 'dataset_fetch_raw', league: source.league, length: html?.length || 0 }));
  const rows = source.parser(html);
  console.error(JSON.stringify({ type: 'dataset_fetch', league: source.league, count: rows.length }));
  return rows;
}

function dedupe(records: RecordRow[]): RecordRow[] {
  const map = new Map<string, RecordRow>();
  for (const r of records) {
    const key = `${r.league}::${r.key}`;
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values());
}

async function main() {
  const all: RecordRow[] = [];
  for (const src of SOURCES) {
    try {
      const rows = await fetchLeague(src);
      all.push(...rows);
    } catch (err) {
      console.error(JSON.stringify({ type: 'dataset_error', league: src.league, error: err instanceof Error ? err.message : String(err) }));
    }
  }
  const deduped = dedupe(all);
  // Emit league counts
  const leagueCounts: Record<string, number> = {};
  deduped.forEach(r => { leagueCounts[r.league] = (leagueCounts[r.league] || 0) + 1; });
  console.error(JSON.stringify({ type: 'dataset_league_counts', counts: leagueCounts }));
  const outPath = path.join(process.cwd(), 'data', 'team_venues.json');
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deduped, null, 2));
  console.log(`Wrote ${deduped.length} records to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
