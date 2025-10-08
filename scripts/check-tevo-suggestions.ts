import { config as dotenv } from 'dotenv';
dotenv();

import { loadConfig } from '../src/utils/config.js';
import { TevoApiClient } from '../src/client/tevo-api.js';

async function main() {
  try {
    const cfg = loadConfig();
    const api = new TevoApiClient(cfg);

    const queries = ['Auburn', 'Georgia Bulldogs', 'Jordan-Hare Stadium'];
    for (const q of queries) {
      try {
        const res = await api.searchSuggestions({ q, limit: 6, fuzzy: true });
        console.log(JSON.stringify({ ok: true, q, events: res.events?.length || 0, performers: res.performers?.length || 0, venues: res.venues?.length || 0 }));
      } catch (e: any) {
        console.error(JSON.stringify({ ok: false, q, code: e?.code, status: e?.statusCode, message: e?.message }));
      }
    }
  } catch (e: any) {
    console.error(JSON.stringify({ ok: false, error: e?.message }));
    process.exit(1);
  }
}

main();

