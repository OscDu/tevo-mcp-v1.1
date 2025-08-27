import { createTevoError, TEVO_ERROR_CODES } from './errors.js';

export class ProductionValidator {
  
  static validateEventId(eventId: any): number {
    if (eventId === null || eventId === undefined) {
      throw createTevoError('Event ID is required', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    const numericId = Number(eventId);
    if (isNaN(numericId) || numericId <= 0 || !Number.isInteger(numericId)) {
      throw createTevoError('Event ID must be a positive integer', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    if (numericId > 2147483647) { // Max 32-bit integer
      throw createTevoError('Event ID is too large', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    return numericId;
  }
  
  static validateBudget(budget: any): number {
    if (budget === null || budget === undefined) {
      throw createTevoError('Budget is required', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    const numericBudget = Number(budget);
    if (isNaN(numericBudget) || numericBudget <= 0) {
      throw createTevoError('Budget must be a positive number', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    if (numericBudget > 100000) { // Max $100k per ticket
      throw createTevoError('Budget exceeds maximum allowed amount', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    return numericBudget;
  }
  
  static validateQuantity(quantity: any): number {
    if (quantity === null || quantity === undefined) {
      return 2; // Default quantity
    }
    
    const numericQuantity = Number(quantity);
    if (isNaN(numericQuantity) || numericQuantity <= 0 || !Number.isInteger(numericQuantity)) {
      throw createTevoError('Quantity must be a positive integer', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    if (numericQuantity > 50) { // Max 50 tickets
      throw createTevoError('Quantity exceeds maximum allowed (50 tickets)', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    return numericQuantity;
  }
  
  static validateQuery(query: any): string {
    if (!query || typeof query !== 'string') {
      throw createTevoError('Search query is required and must be a string', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      throw createTevoError('Search query cannot be empty', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    if (trimmedQuery.length > 200) {
      throw createTevoError('Search query is too long (max 200 characters)', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    // Basic sanitization - remove potentially dangerous characters
    const sanitized = trimmedQuery.replace(/[<>\"'&]/g, '');
    if (sanitized !== trimmedQuery) {
      console.error(JSON.stringify({
        type: 'query_sanitized',
        original: trimmedQuery,
        sanitized,
        timestamp: new Date().toISOString()
      }));
    }
    
    return sanitized;
  }
  
  static validateCoordinates(lat: any, lon: any): { lat: number, lon: number } {
    if (lat !== undefined) {
      const numericLat = Number(lat);
      if (isNaN(numericLat) || numericLat < -90 || numericLat > 90) {
        throw createTevoError('Latitude must be between -90 and 90', TEVO_ERROR_CODES.VALIDATION_ERROR);
      }
    }
    
    if (lon !== undefined) {
      const numericLon = Number(lon);
      if (isNaN(numericLon) || numericLon < -180 || numericLon > 180) {
        throw createTevoError('Longitude must be between -180 and 180', TEVO_ERROR_CODES.VALIDATION_ERROR);
      }
    }
    
    return { lat: Number(lat), lon: Number(lon) };
  }
  
  static validateDateRange(startDate?: any, endDate?: any): { start?: Date, end?: Date } {
    let start: Date | undefined = undefined;
    let end: Date | undefined = undefined;
    
    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        throw createTevoError('Invalid start date format', TEVO_ERROR_CODES.VALIDATION_ERROR);
      }
      
      // Don't allow dates more than 2 years in the past or future
      const now = new Date();
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
      
      if (start < twoYearsAgo || start > twoYearsFromNow) {
        throw createTevoError('Start date must be within 2 years of current date', TEVO_ERROR_CODES.VALIDATION_ERROR);
      }
    }
    
    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw createTevoError('Invalid end date format', TEVO_ERROR_CODES.VALIDATION_ERROR);
      }
      
      if (start && end <= start) {
        throw createTevoError('End date must be after start date', TEVO_ERROR_CODES.VALIDATION_ERROR);
      }
    }
    
    const result: { start?: Date, end?: Date } = {};
    if (start !== undefined) result.start = start;
    if (end !== undefined) result.end = end;
    return result;
  }
  
  static validatePaginationParams(page?: any, perPage?: any): { page: number, perPage: number } {
    let validPage = 1;
    let validPerPage = 25;
    
    if (page !== undefined) {
      const numericPage = Number(page);
      if (isNaN(numericPage) || numericPage < 1 || !Number.isInteger(numericPage)) {
        throw createTevoError('Page must be a positive integer', TEVO_ERROR_CODES.VALIDATION_ERROR);
      }
      if (numericPage > 1000) { // Prevent excessive pagination
        throw createTevoError('Page number too high (max 1000)', TEVO_ERROR_CODES.VALIDATION_ERROR);
      }
      validPage = numericPage;
    }
    
    if (perPage !== undefined) {
      const numericPerPage = Number(perPage);
      if (isNaN(numericPerPage) || numericPerPage < 1 || !Number.isInteger(numericPerPage)) {
        throw createTevoError('Per page must be a positive integer', TEVO_ERROR_CODES.VALIDATION_ERROR);
      }
      if (numericPerPage > 100) { // Limit to prevent overload
        throw createTevoError('Per page limit too high (max 100)', TEVO_ERROR_CODES.VALIDATION_ERROR);
      }
      validPerPage = numericPerPage;
    }
    
    return { page: validPage, perPage: validPerPage };
  }
  
  static sanitizeForLog(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sensitiveFields = ['password', 'secret', 'token', 'key', 'auth', 'credential'];
    const sanitized = JSON.parse(JSON.stringify(data));
    
    const sanitizeObject = (obj: any): void => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
        }
      }
    };
    
    sanitizeObject(sanitized);
    return sanitized;
  }
  
  static validateWeeksAhead(weeks: any): number {
    if (weeks === undefined || weeks === null) {
      return 12; // Default to 12 weeks
    }
    
    const numericWeeks = Number(weeks);
    if (isNaN(numericWeeks) || numericWeeks < 1 || !Number.isInteger(numericWeeks)) {
      throw createTevoError('Weeks ahead must be a positive integer', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    if (numericWeeks > 52) {
      throw createTevoError('Weeks ahead cannot exceed 52 (1 year)', TEVO_ERROR_CODES.VALIDATION_ERROR);
    }
    
    return numericWeeks;
  }
}