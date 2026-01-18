import { DateUtils } from '../../src/utils/dateUtils.js';
import { ValidationUtils } from '../../src/utils/validationUtils.js';
import { PaginationUtils } from '../../src/utils/paginationUtils.js';

describe('Helper Utilities', () => {
  describe('DateUtils', () => {
    test('should format date for display', () => {
      const date = new Date('2023-12-05T10:30:00Z');
      const formatted = DateUtils.formatForDisplay(date, 'yyyy-MM-dd');
      expect(formatted).toBe('2023-12-05');
    });

    test('should check if date is in the past', () => {
      const pastDate = new Date('2020-01-01');
      const futureDate = new Date('2030-01-01');

      expect(DateUtils.isPast(pastDate)).toBe(true);
      expect(DateUtils.isPast(futureDate)).toBe(false);
    });

    test('should get day bounds', () => {
      const date = new Date('2023-12-05T15:30:00Z');
      const bounds = DateUtils.getDayBounds(date);

      expect(bounds.start.getHours()).toBe(0);
      expect(bounds.end.getHours()).toBe(23);
    });
  });

  describe('ValidationUtils', () => {
    test('should validate email', () => {
      expect(ValidationUtils.isValidEmail('test@example.com')).toBe(true);
      expect(ValidationUtils.isValidEmail('invalid-email')).toBe(false);
    });

    test('should validate password', () => {
      expect(ValidationUtils.isValidPassword('password123')).toBe(true);
      expect(ValidationUtils.isValidPassword('short')).toBe(false);
    });

    test('should sanitize string', () => {
      const dirty = '  hello    world  ';
      const clean = ValidationUtils.sanitizeString(dirty);
      expect(clean).toBe('hello world');
    });

    test('should validate pagination params', () => {
      const validParams = { page: 1, limit: 20 };
      const result = ValidationUtils.validatePagination(validParams);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortOrder).toBe('asc');
    });
  });

  describe('PaginationUtils', () => {
    test('should calculate offset', () => {
      expect(PaginationUtils.calculateOffset(1, 20)).toBe(0);
      expect(PaginationUtils.calculateOffset(2, 20)).toBe(20);
      expect(PaginationUtils.calculateOffset(3, 10)).toBe(20);
    });

    test('should calculate total pages', () => {
      expect(PaginationUtils.calculateTotalPages(100, 20)).toBe(5);
      expect(PaginationUtils.calculateTotalPages(101, 20)).toBe(6);
    });

    test('should create pagination result', () => {
      const data = [1, 2, 3, 4, 5];
      const result = PaginationUtils.createResult(data, 1, 5, 100);

      expect(result.data).toEqual(data);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.totalPages).toBe(20);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(false);
    });

    test('should validate pagination params', () => {
      expect(() => PaginationUtils.validateParams(0, 20)).toThrow(
        'Page must be at least 1'
      );
      expect(() => PaginationUtils.validateParams(1, 0)).toThrow(
        'Limit must be between 1 and 100'
      );
      expect(() => PaginationUtils.validateParams(1, 101)).toThrow(
        'Limit must be between 1 and 100'
      );

      // Should not throw for valid params
      expect(() => PaginationUtils.validateParams(1, 20)).not.toThrow();
    });
  });
});
