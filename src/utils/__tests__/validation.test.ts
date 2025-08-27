import {
  validateSearchSuggestionsParams,
  validateListEventsParams,
  validateGetEventParams,
  validateListingsForEventParams
} from '../validation';
import { TEVO_ERROR_CODES } from '../errors';

describe('Parameter Validation', () => {
  describe('validateSearchSuggestionsParams', () => {
    it('should validate valid search suggestions params', () => {
      const params = {
        q: 'Taylor Swift',
        limit: 10,
        fuzzy: true
      };

      const result = validateSearchSuggestionsParams(params);
      expect(result).toEqual(params);
    });

    it('should require q parameter', () => {
      const params = {
        limit: 10
      };

      expect(() => validateSearchSuggestionsParams(params)).toThrow();
    });

    it('should reject empty q parameter', () => {
      const params = {
        q: '',
        limit: 10
      };

      expect(() => validateSearchSuggestionsParams(params)).toThrow();
    });

    it('should reject limit outside valid range', () => {
      const params = {
        q: 'test',
        limit: 25
      };

      expect(() => validateSearchSuggestionsParams(params)).toThrow();
    });
  });

  describe('validateListEventsParams', () => {
    it('should validate valid list events params', () => {
      const params = {
        performer_id: 123,
        venue_id: 456,
        lat: 40.7128,
        lon: -74.0060,
        within: 50,
        occurs_at_gte: '2025-08-01T00:00:00Z',
        occurs_at_lt: '2025-08-31T23:59:59Z',
        page: 1,
        per_page: 25
      };

      const result = validateListEventsParams(params);
      expect(result).toEqual(params);
    });

    it('should validate empty params (all optional)', () => {
      const params = {};

      const result = validateListEventsParams(params);
      expect(result).toEqual(params);
    });

    it('should reject invalid date formats', () => {
      const params = {
        occurs_at_gte: 'invalid-date'
      };

      expect(() => validateListEventsParams(params)).toThrow();
    });

    it('should reject per_page outside valid range', () => {
      const params = {
        per_page: 150
      };

      expect(() => validateListEventsParams(params)).toThrow();
    });
  });

  describe('validateGetEventParams', () => {
    it('should validate valid get event params', () => {
      const params = {
        event_id: 12345
      };

      const result = validateGetEventParams(params);
      expect(result).toEqual(params);
    });

    it('should require event_id parameter', () => {
      const params = {};

      expect(() => validateGetEventParams(params)).toThrow();
    });

    it('should reject non-positive event_id', () => {
      const params = {
        event_id: 0
      };

      expect(() => validateGetEventParams(params)).toThrow();
    });
  });

  describe('validateListingsForEventParams', () => {
    it('should validate valid listings params', () => {
      const params = {
        event_id: 123,
        requested_quantity: 2,
        price_min: 50,
        price_max: 200,
        section: 'A',
        row: '1',
        type: 'event' as const,
        format: 'Eticket' as const,
        instant_delivery: true,
        wheelchair: false,
        order_by: 'retail_price ASC' as const,
        return_top: 5
      };

      const result = validateListingsForEventParams(params);
      expect(result).toEqual(params);
    });

    it('should require event_id and requested_quantity', () => {
      const params = {
        event_id: 123
      };

      expect(() => validateListingsForEventParams(params)).toThrow();
    });

    it('should reject invalid type enum', () => {
      const params = {
        event_id: 123,
        requested_quantity: 2,
        type: 'invalid'
      };

      expect(() => validateListingsForEventParams(params)).toThrow();
    });

    it('should reject invalid format enum', () => {
      const params = {
        event_id: 123,
        requested_quantity: 2,
        format: 'InvalidFormat'
      };

      expect(() => validateListingsForEventParams(params)).toThrow();
    });

    it('should reject invalid order_by enum', () => {
      const params = {
        event_id: 123,
        requested_quantity: 2,
        order_by: 'invalid_order'
      };

      expect(() => validateListingsForEventParams(params)).toThrow();
    });

    it('should reject return_top outside valid range', () => {
      const params = {
        event_id: 123,
        requested_quantity: 2,
        return_top: 10
      };

      expect(() => validateListingsForEventParams(params)).toThrow();
    });

    it('should reject price_min greater than price_max', () => {
      const params = {
        event_id: 123,
        requested_quantity: 2,
        price_min: 200,
        price_max: 100
      };

      expect(() => validateListingsForEventParams(params)).toThrow('price_min cannot be greater than price_max');
    });

    it('should reject lat without lon', () => {
      const params = {
        event_id: 123,
        requested_quantity: 2,
        lat: 40.7128
      };

      expect(() => validateListingsForEventParams(params)).toThrow('lon is required when lat is provided');
    });

    it('should reject lon without lat', () => {
      const params = {
        event_id: 123,
        requested_quantity: 2,
        lon: -74.0060
      };

      expect(() => validateListingsForEventParams(params)).toThrow('lat is required when lon is provided');
    });
  });

  describe('Error handling', () => {
    it('should throw TevoError with validation error code', () => {
      const params = {
        q: ''
      };

      try {
        validateSearchSuggestionsParams(params);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(TEVO_ERROR_CODES.VALIDATION_ERROR);
      }
    });
  });
});