import { config as dotenv } from 'dotenv';
dotenv();

import { loadConfig } from '../src/utils/config.js';
import { buildCanonicalString, generateXSignature } from '../src/auth/signature.js';

function computeForQuery(q: string) {
  const cfg = loadConfig();
  const base = new URL(cfg.baseUrl); // e.g., https://api.ticketevolution.com/v9
  const host = base.host; // api.ticketevolution.com
  const path = `${base.pathname}/searches/suggestions`;
  const query: Record<string, any> = {
    entities: 'events,performers,venues',
    limit: 6,
    q,
    fuzzy: true
  };

  const canonical = buildCanonicalString('GET', host, path, query);
  const signature = generateXSignature({
    method: 'GET',
    host,
    path,
    query,
    secret: cfg.apiSecret
  });

  return { q, host, path, canonical, signature, token_preview: cfg.apiToken.slice(0, 8) + '…' };
}

const queries = ['Auburn', 'Georgia Bulldogs', 'Jordan-Hare Stadium'];
for (const q of queries) {
  const out = computeForQuery(q);
  console.log(JSON.stringify(out));
}

