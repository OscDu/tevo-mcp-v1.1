import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { 
  SearchSuggestionsParams, 
  ListEventsParams, 
  GetEventParams, 
  ListingsForEventParams,
  SmartNflFinderParams,
  UniversalEventFinderParams
} from '../types/mcp.js';
import { SmartTicketPresenterParams } from './ticket-optimization.js';

export interface EntertainmentEventFinderParams {
  query: string;
  date?: string;
  location?: string;
  event_type?: 'concert' | 'comedy' | 'theater' | 'broadway' | 'any';
  weeks_ahead?: number;
  budget_per_ticket?: number;
  requested_quantity?: number;
}
import { createTevoError, TEVO_ERROR_CODES } from './errors.js';
import { ProductionValidator } from './production-validation.js';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const searchSuggestionsSchema: JSONSchemaType<SearchSuggestionsParams> = {
  type: 'object',
  properties: {
    q: { type: 'string', minLength: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 20, nullable: true },
    fuzzy: { type: 'boolean', nullable: true }
  },
  required: ['q'],
  additionalProperties: false
};

const listEventsSchema: JSONSchemaType<ListEventsParams> = {
  type: 'object',
  properties: {
    performer_id: { type: 'integer', nullable: true },
    venue_id: { type: 'integer', nullable: true },
    lat: { type: 'number', nullable: true },
    lon: { type: 'number', nullable: true },
    within: { type: 'integer', minimum: 1, nullable: true },
    occurs_at_gte: { type: 'string', format: 'date-time', nullable: true },
    occurs_at_lt: { type: 'string', format: 'date-time', nullable: true },
    page: { type: 'integer', minimum: 1, nullable: true },
    per_page: { type: 'integer', minimum: 1, maximum: 100, nullable: true }
  },
  required: [],
  additionalProperties: false
};

const getEventSchema: JSONSchemaType<GetEventParams> = {
  type: 'object',
  properties: {
    event_id: { type: 'integer', minimum: 1 }
  },
  required: ['event_id'],
  additionalProperties: false
};

const listingsForEventSchema: JSONSchemaType<ListingsForEventParams> = {
  type: 'object',
  properties: {
    event_id: { type: 'integer', minimum: 1 },
    requested_quantity: { type: 'integer', minimum: 1 },
    price_min: { type: 'number', minimum: 0, nullable: true },
    price_max: { type: 'number', minimum: 0, nullable: true },
    section: { type: 'string', nullable: true },
    row: { type: 'string', nullable: true },
    type: { type: 'string', enum: ['event', 'parking'], nullable: true },
    format: { 
      type: 'string', 
      enum: ['Physical', 'Eticket', 'Flash_seats', 'TM_mobile', 'Paperless'], 
      nullable: true 
    },
    instant_delivery: { type: 'boolean', nullable: true },
    wheelchair: { type: 'boolean', nullable: true },
    order_by: { 
      type: 'string', 
      enum: [
        'retail_price ASC', 'retail_price DESC', 
        'section ASC', 'section DESC', 
        'row ASC', 'row DESC', 
        'format ASC', 'format DESC'
      ], 
      nullable: true 
    },
    return_top: { type: 'integer', minimum: 1, maximum: 5, nullable: true }
  },
  required: ['event_id', 'requested_quantity'],
  additionalProperties: false
};

const validateSearchSuggestions = ajv.compile(searchSuggestionsSchema);
const validateListEvents = ajv.compile(listEventsSchema);
const validateGetEvent = ajv.compile(getEventSchema);
const validateListingsForEvent = ajv.compile(listingsForEventSchema);

export function validateSearchSuggestionsParams(params: unknown): SearchSuggestionsParams {
  if (!validateSearchSuggestions(params)) {
    const errors = validateSearchSuggestions.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
    throw createTevoError(`Search suggestions validation failed: ${errors}`, TEVO_ERROR_CODES.VALIDATION_ERROR);
  }
  return params;
}

export function validateListEventsParams(params: unknown): ListEventsParams {
  if (!validateListEvents(params)) {
    const errors = validateListEvents.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
    throw createTevoError(`List events validation failed: ${errors}`, TEVO_ERROR_CODES.VALIDATION_ERROR);
  }
  return params;
}

export function validateGetEventParams(params: unknown): GetEventParams {
  if (!validateGetEvent(params)) {
    const errors = validateGetEvent.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
    throw createTevoError(`Get event validation failed: ${errors}`, TEVO_ERROR_CODES.VALIDATION_ERROR);
  }
  return params;
}

export function validateListingsForEventParams(params: unknown): ListingsForEventParams {
  if (!validateListingsForEvent(params)) {
    const errors = validateListingsForEvent.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
    throw createTevoError(`Listings for event validation failed: ${errors}`, TEVO_ERROR_CODES.VALIDATION_ERROR);
  }
  
  const validatedParams = params as ListingsForEventParams;
  
  if (validatedParams.price_min && validatedParams.price_max && validatedParams.price_min > validatedParams.price_max) {
    throw createTevoError('price_min cannot be greater than price_max', TEVO_ERROR_CODES.VALIDATION_ERROR);
  }
  
  
  return validatedParams;
}

const smartNflFinderSchema: JSONSchemaType<SmartNflFinderParams> = {
  type: 'object',
  properties: {
    away_team: { type: 'string', minLength: 1 },
    home_team: { type: 'string', minLength: 1 },
    weeks_ahead: { type: 'integer', minimum: 1, maximum: 52, nullable: true },
    budget_per_ticket: { type: 'number', minimum: 1, nullable: true },
    requested_quantity: { type: 'integer', minimum: 1, maximum: 20, nullable: true },
    return_top: { type: 'integer', minimum: 1, maximum: 10, nullable: true }
  },
  required: ['away_team', 'home_team'],
  additionalProperties: false
};

const validateSmartNflFinder = ajv.compile(smartNflFinderSchema);

export function validateSmartNflFinderParams(params: unknown): SmartNflFinderParams {
  if (!validateSmartNflFinder(params)) {
    const errors = validateSmartNflFinder.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
    throw createTevoError(`Smart NFL finder validation failed: ${errors}`, TEVO_ERROR_CODES.VALIDATION_ERROR);
  }
  
  const validatedParams = params as SmartNflFinderParams;
  
  // Set defaults
  return {
    ...validatedParams,
    weeks_ahead: validatedParams.weeks_ahead ?? 8,
    requested_quantity: validatedParams.requested_quantity ?? 1,
    return_top: validatedParams.return_top ?? 5
  };
}

const universalEventFinderSchema: JSONSchemaType<UniversalEventFinderParams> = {
  type: 'object',
  properties: {
    query: { type: 'string', minLength: 1 },
    date: { type: 'string', format: 'date', nullable: true },
    location: { type: 'string', nullable: true },
    weeks_ahead: { type: 'integer', minimum: 1, maximum: 52, nullable: true },
    budget_per_ticket: { type: 'number', minimum: 1, nullable: true },
    requested_quantity: { type: 'integer', minimum: 1, maximum: 20, nullable: true }
  },
  required: ['query'],
  additionalProperties: false
};

const validateUniversalEventFinder = ajv.compile(universalEventFinderSchema);

export function validateUniversalEventFinderParams(params: unknown): UniversalEventFinderParams {
  if (!validateUniversalEventFinder(params)) {
    const errors = validateUniversalEventFinder.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
    throw createTevoError(`Universal event finder validation failed: ${errors}`, TEVO_ERROR_CODES.VALIDATION_ERROR);
  }
  
  const validatedParams = params as UniversalEventFinderParams;
  
  // Apply production validation with enhanced security checks
  const sanitizedQuery = ProductionValidator.validateQuery(validatedParams.query);
  const validatedQuantity = ProductionValidator.validateQuantity(validatedParams.requested_quantity);
  const validatedWeeks = ProductionValidator.validateWeeksAhead(validatedParams.weeks_ahead);
  
  let validatedBudget: number | undefined;
  if (validatedParams.budget_per_ticket !== undefined) {
    validatedBudget = ProductionValidator.validateBudget(validatedParams.budget_per_ticket);
  }
  
  // Validate date range if provided
  if (validatedParams.date) {
    ProductionValidator.validateDateRange(validatedParams.date);
  }
  
  const result: UniversalEventFinderParams = {
    query: sanitizedQuery,
    weeks_ahead: validatedWeeks,
    requested_quantity: validatedQuantity
  };
  
  if (validatedParams.date !== undefined) {
    result.date = validatedParams.date;
  }
  
  if (validatedParams.location !== undefined) {
    result.location = validatedParams.location;
  }
  
  if (validatedBudget !== undefined) {
    result.budget_per_ticket = validatedBudget;
  }
  
  return result;
}

// Create the schema without JSONSchemaType for now to avoid type issues
const smartTicketPresenterSchema = {
  type: 'object' as const,
  properties: {
    event_id: { type: 'integer' as const, minimum: 1 },
    requested_quantity: { type: 'integer' as const, minimum: 1, maximum: 20 },
    budget_per_ticket: { type: 'number' as const, minimum: 1 },
    seating_preference: { 
      type: 'string' as const, 
      enum: ['budget', 'premium', 'mixed', 'best_value'] as const,
    },
    venue_type: { 
      type: 'string' as const, 
      enum: ['arena', 'stadium', 'theater', 'concert_hall', 'amphitheater', 'unknown'] as const,
    },
    include_explanations: { type: 'boolean' as const }
  },
  required: ['event_id', 'requested_quantity', 'budget_per_ticket'] as const,
  additionalProperties: false
};

const validateSmartTicketPresenterAjv = ajv.compile(smartTicketPresenterSchema);

export function validateSmartTicketPresenterParams(params: unknown): SmartTicketPresenterParams {
  if (!validateSmartTicketPresenterAjv(params)) {
    throw createTevoError(
      TEVO_ERROR_CODES.VALIDATION_ERROR,
      `Invalid smart ticket presenter parameters: ${ajv.errorsText(validateSmartTicketPresenterAjv.errors)}`
    );
  }
  
  const validatedParams = params as SmartTicketPresenterParams;
  
  // Set defaults
  const result: SmartTicketPresenterParams = {
    event_id: validatedParams.event_id,
    requested_quantity: validatedParams.requested_quantity,
    budget_per_ticket: validatedParams.budget_per_ticket,
    seating_preference: validatedParams.seating_preference || 'mixed',
    venue_type: validatedParams.venue_type || 'unknown',
    include_explanations: validatedParams.include_explanations !== undefined ? validatedParams.include_explanations : true
  };
  
  return result;
}

const entertainmentEventFinderSchema: JSONSchemaType<EntertainmentEventFinderParams> = {
  type: 'object',
  properties: {
    query: { type: 'string', minLength: 1 },
    date: { type: 'string', format: 'date', nullable: true },
    location: { type: 'string', nullable: true },
    event_type: { 
      type: 'string', 
      enum: ['concert', 'comedy', 'theater', 'broadway', 'any'],
      nullable: true 
    },
    weeks_ahead: { type: 'integer', minimum: 1, maximum: 52, nullable: true },
    budget_per_ticket: { type: 'number', minimum: 1, nullable: true },
    requested_quantity: { type: 'integer', minimum: 1, maximum: 20, nullable: true }
  },
  required: ['query'],
  additionalProperties: false
};

const validateEntertainmentEventFinderAjv = ajv.compile(entertainmentEventFinderSchema);

export function validateEntertainmentEventFinderParams(params: unknown): EntertainmentEventFinderParams {
  if (!validateEntertainmentEventFinderAjv(params)) {
    throw createTevoError(
      TEVO_ERROR_CODES.VALIDATION_ERROR,
      `Invalid entertainment event finder parameters: ${ajv.errorsText(validateEntertainmentEventFinderAjv.errors)}`
    );
  }
  
  const validatedParams = params as EntertainmentEventFinderParams;
  
  // Validate and sanitize query
  const sanitizedQuery = validatedParams.query.trim();
  if (sanitizedQuery.length === 0) {
    throw createTevoError(
      TEVO_ERROR_CODES.VALIDATION_ERROR,
      'Query cannot be empty'
    );
  }
  
  // Validate weeks_ahead
  const validatedWeeks = validatedParams.weeks_ahead !== undefined ? 
    Math.max(1, Math.min(52, Math.floor(validatedParams.weeks_ahead))) : 16;
  
  // Validate requested_quantity
  const validatedQuantity = validatedParams.requested_quantity !== undefined ?
    Math.max(1, Math.min(20, Math.floor(validatedParams.requested_quantity))) : 2;
  
  // Validate budget
  const validatedBudget = validatedParams.budget_per_ticket !== undefined ?
    Math.max(1, validatedParams.budget_per_ticket) : undefined;
  
  // Validate date range if provided
  if (validatedParams.date) {
    ProductionValidator.validateDateRange(validatedParams.date);
  }
  
  const result: EntertainmentEventFinderParams = {
    query: sanitizedQuery,
    event_type: validatedParams.event_type || 'any',
    weeks_ahead: validatedWeeks,
    requested_quantity: validatedQuantity
  };
  
  if (validatedParams.date !== undefined) {
    result.date = validatedParams.date;
  }
  
  if (validatedParams.location !== undefined) {
    result.location = validatedParams.location.trim();
  }
  
  if (validatedBudget !== undefined) {
    result.budget_per_ticket = validatedBudget;
  }
  
  return result;
}