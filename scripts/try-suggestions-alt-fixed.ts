import { config as dotenv } from 'dotenv';
dotenv();

import axios from 'axios';
import { loadConfig } from '../src/utils/config.js';

async function main() {
  const cfg = loadConfig();
  const url = 'https://api.ticketevolution.com/v9/suggestions?entities=events,performers,venues&fuzzy=true&limit=6&q=Jordan-Hare%20Stadium';
  const signature = 'eps/9PtMYDrziNFrGq94smyKfPDUfoPCKjvem8Sqs78=';

  try {
    const res = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'X-Token': cfg.apiToken,
        'X-Signature': signature,
      },
      timeout: cfg.timeoutMs,
    });
    console.log(JSON.stringify({ ok: true, status: res.status, total: res.data?.total_entries, data_keys: Object.keys(res.data || {}) }));
  } catch (e: any) {
    console.error(JSON.stringify({ ok: false, status: e?.response?.status, message: e?.message, data: e?.response?.data }));
  }
}

main();

