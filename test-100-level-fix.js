import { config } from 'dotenv';
config();

import { loadConfig } from './dist/utils/config.js';
import { TevoApiClient } from './dist/client/tevo-api.js';
import { MemoryCache } from './dist/cache/memory-cache.js';
import { handleListingsForEvent } from './dist/tools/listings-for-event.js';

const tevoConfig = loadConfig();
const client = new TevoApiClient(tevoConfig);
const cache = new MemoryCache();

console.log('Testing Session 21 (2758522) with section pattern "1" for 100-level seats under $1000...');

try {
  const result = await handleListingsForEvent(client, cache, {
    event_id: 2758522,
    requested_quantity: 1,
    price_max: 1000,
    section_pattern: '1',
    return_top: 15
  });
  
  console.log('\n=== RESULTS ===');
  console.log(`Found ${result.options.length} options:`);
  
  result.options.forEach((option, index) => {
    console.log(`${index + 1}. Section ${option.section}, Row ${option.row} - $${option.price_per_ticket} per ticket`);
  });
  
  console.log('\n=== CRITERIA APPLIED ===');
  console.log(JSON.stringify(result.criteria_applied, null, 2));
  
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}