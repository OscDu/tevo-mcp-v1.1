import { config as dotenv } from 'dotenv';
dotenv();

import axios from 'axios';
import { loadConfig } from '../src/utils/config.js';
import { buildCanonicalString, generateXSignature } from '../src/auth/signature.js';

async function callAlt(q: string) {
  const cfg = loadConfig();
  const host = 'api.ticketevolution.com';
  const path = '/v9/suggestions';
  const query: Record<string, any> = {
    entities: 'events,performers,venues',
    limit: 6,
    q,
    fuzzy: true,
  };

  const canonical = buildCanonicalString('GET', host, path, query);
  const signature = generateXSignature({ method: 'GET', host, path, query, secret: cfg.apiSecret });

  const url = `https://${host}${path}?entities=events,performers,venues&limit=6&fuzzy=true&q=${encodeURIComponent(q)}`;

  try {
    const res = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'X-Token': cfg.apiToken,
        'X-Signature': signature,
      },
      timeout: cfg.timeoutMs,
    });
    console.log(JSON.stringify({ ok: true, q, status: res.status, total: res.data?.total_entries, keys: Object.keys(res.data || {}) }));
  } catch (e: any) {
    console.error(JSON.stringify({ ok: false, q, status: e?.response?.status, message: e?.message, canonical, signature }));
  }
}

async function main() {
  const queries = ['Auburn', 'Georgia Bulldogs', 'Jordan-Hare Stadium'];
  for (const q of queries) {
    await callAlt(q);
  }
}

main();

