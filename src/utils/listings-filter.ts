import { Listing, FilteredListingOption, FilteredListingsResponse } from '../types/tevo.js';
import { ListingsForEventParams } from '../types/mcp.js';

export function filterAndRankListings(
  listings: Listing[],
  params: ListingsForEventParams
): FilteredListingsResponse {
  const { event_id, requested_quantity, return_top = 5 } = params;
  
  const eligibleListings = listings.filter(listing => 
    isListingEligible(listing, params)
  );
  
  const rankedListings = rankListings(eligibleListings, params);
  
  const topListings = rankedListings.slice(0, return_top);
  
  const options: FilteredListingOption[] = topListings.map(listing => ({
    listing_id: listing.id,
    section: listing.section,
    row: listing.row,
    available_quantity: listing.available_quantity,
    splits: listing.splits,
    price_per_ticket: listing.retail_price,
    total_price_for_requested_quantity: listing.retail_price * requested_quantity,
    format: listing.format,
    instant_delivery: listing.instant_delivery,
    in_hand: listing.in_hand,
    in_hand_on: listing.in_hand_on,
    wheelchair: listing.wheelchair,
    public_notes: listing.public_notes
  }));

  const criteriaApplied = buildCriteriaApplied(params, listings.length, eligibleListings.length);

  return {
    event_id,
    criteria_applied: criteriaApplied,
    options
  };
}

function isListingEligible(listing: Listing, params: ListingsForEventParams): boolean {
  if (listing.available_quantity < params.requested_quantity) {
    return false;
  }

  if (!listing.splits.includes(params.requested_quantity)) {
    return false;
  }

  if (params.price_min && listing.retail_price < params.price_min) {
    return false;
  }

  if (params.price_max && listing.retail_price > params.price_max) {
    return false;
  }

  if (params.section && listing.section !== params.section) {
    return false;
  }

  if (params.row && listing.row !== params.row) {
    return false;
  }

  if (params.type && listing.type !== params.type) {
    return false;
  }

  if (params.format && listing.format !== params.format) {
    return false;
  }

  if (params.instant_delivery !== undefined && listing.instant_delivery !== params.instant_delivery) {
    return false;
  }

  if (params.wheelchair !== undefined && listing.wheelchair !== params.wheelchair) {
    return false;
  }

  // Handle section pattern matching
  // Supports:
  //  - Single prefix: "1" matches 100-level (sections starting with "1")
  //  - Comma-separated prefixes: "1,2" matches 100- and 200-level
  //  - Numeric range: "24-34" matches sections whose numeric value is between 24 and 34 inclusive
  if (params.section_pattern_filter) {
    const pattern = params.section_pattern_filter.trim();
    let matched = false;

    // Helper to test a single token against a section
    const testToken = (token: string): boolean => {
      token = token.trim();
      if (!token) return false;

      // Range: e.g., "24-34"
      const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        const secNum = parseInt(listing.section.replace(/[^\d]/g, ''), 10);
        if (!Number.isNaN(secNum) && secNum >= Math.min(start, end) && secNum <= Math.max(start, end)) {
          return true;
        }
        return false;
      }

      // Prefix match
      return listing.section.startsWith(token);
    };

    if (pattern.includes(',')) {
      matched = pattern.split(',').some(tok => testToken(tok));
    } else {
      matched = testToken(pattern);
    }

    if (!matched) return false;
  }

  return true;
}

function rankListings(listings: Listing[], params: ListingsForEventParams): Listing[] {
  const orderBy = params.order_by || 'retail_price ASC';
  
  return [...listings].sort((a, b) => {
    const primaryComparison = applySortOrder(a, b, orderBy);
    if (primaryComparison !== 0) {
      return primaryComparison;
    }

    if (orderBy.startsWith('retail_price')) {
      const sectionComparison = a.section.localeCompare(b.section);
      if (sectionComparison !== 0) return sectionComparison;

      const rowComparison = a.row.localeCompare(b.row);
      if (rowComparison !== 0) return rowComparison;

      if (a.in_hand !== b.in_hand) {
        return a.in_hand ? -1 : 1;
      }

      if (a.instant_delivery !== b.instant_delivery) {
        return a.instant_delivery ? -1 : 1;
      }
    }

    return 0;
  });
}

function applySortOrder(a: Listing, b: Listing, orderBy: string): number {
  const [field, direction] = orderBy.split(' ');
  const ascending = direction === 'ASC';

  let comparison = 0;

  switch (field) {
    case 'retail_price':
      comparison = a.retail_price - b.retail_price;
      break;
    case 'section':
      comparison = a.section.localeCompare(b.section);
      break;
    case 'row':
      comparison = a.row.localeCompare(b.row);
      break;
    case 'format':
      comparison = a.format.localeCompare(b.format);
      break;
    default:
      return 0;
  }

  return ascending ? comparison : -comparison;
}

function buildCriteriaApplied(
  params: ListingsForEventParams,
  totalListings: number,
  eligibleListings: number
): Record<string, any> {
  const criteria: Record<string, any> = {
    requested_quantity: params.requested_quantity,
    total_listings_found: totalListings,
    eligible_after_filtering: eligibleListings
  };

  if (params.price_min) criteria.price_min = params.price_min;
  if (params.price_max) criteria.price_max = params.price_max;
  if (params.section) criteria.section = params.section;
  if (params.row) criteria.row = params.row;
  if (params.type) criteria.type = params.type;
  if (params.format) criteria.format = params.format;
  if (params.instant_delivery !== undefined) criteria.instant_delivery = params.instant_delivery;
  if (params.wheelchair !== undefined) criteria.wheelchair = params.wheelchair;
  if (params.order_by) criteria.order_by = params.order_by;

  const filtersApplied = [];
  if (totalListings !== eligibleListings) {
    if (params.price_min || params.price_max) filtersApplied.push('price_range');
    if (params.section) filtersApplied.push('section');
    if (params.row) filtersApplied.push('row');
    if (params.type) filtersApplied.push('type');
    if (params.format) filtersApplied.push('format');
    if (params.instant_delivery !== undefined) filtersApplied.push('instant_delivery');
    if (params.wheelchair !== undefined) filtersApplied.push('wheelchair');
    filtersApplied.push('quantity_and_splits');
  }

  if (filtersApplied.length > 0) {
    criteria.filters_applied = filtersApplied;
    criteria.filtered_out_count = totalListings - eligibleListings;
  }

  return criteria;
}
