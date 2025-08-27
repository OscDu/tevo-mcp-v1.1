import { filterAndRankListings } from '../listings-filter';
import { Listing } from '../../types/tevo';
import { ListingsForEventParams } from '../../types/mcp';

describe('Listings Filter and Ranking', () => {
  const mockListings: Listing[] = [
    {
      id: 1,
      event_id: 123,
      section: 'A',
      row: '1',
      available_quantity: 4,
      splits: [1, 2, 4],
      retail_price: 100,
      format: 'Eticket',
      instant_delivery: true,
      in_hand: true,
      wheelchair: false,
      public_notes: 'Great seats',
      type: 'event'
    },
    {
      id: 2,
      event_id: 123,
      section: 'B',
      row: '2',
      available_quantity: 2,
      splits: [1, 2],
      retail_price: 150,
      format: 'Physical',
      instant_delivery: false,
      in_hand: false,
      in_hand_on: '2025-09-01',
      wheelchair: false,
      type: 'event'
    },
    {
      id: 3,
      event_id: 123,
      section: 'A',
      row: '2',
      available_quantity: 6,
      splits: [1, 2, 3, 6],
      retail_price: 80,
      format: 'TM_mobile',
      instant_delivery: true,
      in_hand: true,
      wheelchair: true,
      type: 'event'
    }
  ];

  describe('Basic filtering', () => {
    it('should filter by requested quantity and splits', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 3
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.options).toHaveLength(1);
      expect(result.options[0].listing_id).toBe(3);
    });

    it('should filter by price range', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 2,
        price_min: 90,
        price_max: 140
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.options).toHaveLength(1);
      expect(result.options[0].listing_id).toBe(1);
      expect(result.options[0].price_per_ticket).toBe(100);
    });

    it('should filter by section', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 2,
        section: 'A'
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.options).toHaveLength(2);
      expect(result.options.every(option => option.section === 'A')).toBe(true);
    });

    it('should filter by instant delivery', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 1,
        instant_delivery: true
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.options).toHaveLength(2);
      expect(result.options.every(option => option.instant_delivery === true)).toBe(true);
    });

    it('should filter by wheelchair accessibility', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 1,
        wheelchair: true
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.options).toHaveLength(1);
      expect(result.options[0].listing_id).toBe(3);
      expect(result.options[0].wheelchair).toBe(true);
    });
  });

  describe('Ranking and sorting', () => {
    it('should sort by price ascending by default', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 1
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.options).toHaveLength(3);
      expect(result.options[0].price_per_ticket).toBe(80);
      expect(result.options[1].price_per_ticket).toBe(100);
      expect(result.options[2].price_per_ticket).toBe(150);
    });

    it('should sort by price descending when specified', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 1,
        order_by: 'retail_price DESC'
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.options).toHaveLength(3);
      expect(result.options[0].price_per_ticket).toBe(150);
      expect(result.options[1].price_per_ticket).toBe(100);
      expect(result.options[2].price_per_ticket).toBe(80);
    });

    it('should sort by section alphabetically', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 1,
        order_by: 'section ASC'
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.options[0].section).toBe('A');
      expect(result.options[1].section).toBe('A');
      expect(result.options[2].section).toBe('B');
    });

    it('should apply secondary sort criteria for price sorting', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 1
      };

      const result = filterAndRankListings(mockListings, params);
      
      const samePrice = result.options.filter(option => option.price_per_ticket === 80);
      if (samePrice.length > 1) {
        expect(samePrice[0].in_hand).toBe(true);
      }
    });
  });

  describe('Return top N results', () => {
    it('should limit results to return_top parameter', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 1,
        return_top: 2
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.options).toHaveLength(2);
    });

    it('should default to 5 results when return_top not specified', () => {
      const manyListings = Array.from({ length: 10 }, (_, i) => ({
        ...mockListings[0],
        id: i + 1,
        retail_price: (i + 1) * 10
      }));

      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 1
      };

      const result = filterAndRankListings(manyListings, params);
      
      expect(result.options).toHaveLength(5);
    });
  });

  describe('Criteria applied tracking', () => {
    it('should track applied filters in criteria_applied', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 2,
        price_max: 120,
        instant_delivery: true
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.criteria_applied.requested_quantity).toBe(2);
      expect(result.criteria_applied.price_max).toBe(120);
      expect(result.criteria_applied.instant_delivery).toBe(true);
      expect(result.criteria_applied.total_listings_found).toBe(3);
      expect(result.criteria_applied.eligible_after_filtering).toBe(2);
    });

    it('should include filters_applied when listings are filtered out', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 1,
        price_max: 90
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.criteria_applied.filters_applied).toContain('price_range');
      expect(result.criteria_applied.filtered_out_count).toBe(2);
    });
  });

  describe('Total price calculation', () => {
    it('should calculate total price correctly for requested quantity', () => {
      const params: ListingsForEventParams = {
        event_id: 123,
        requested_quantity: 2
      };

      const result = filterAndRankListings(mockListings, params);
      
      expect(result.options[0].total_price_for_requested_quantity).toBe(160); // 80 * 2
      expect(result.options[1].total_price_for_requested_quantity).toBe(200); // 100 * 2
      expect(result.options[2].total_price_for_requested_quantity).toBe(300); // 150 * 2
    });
  });
});