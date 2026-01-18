import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  handleError,
} from '../../src/utils/errorHandler.js';

describe('Error Handling', () => {
  describe('AppError', () => {
    test('should create AppError with default values', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('ERR_APP');
      expect(error.httpStatus).toBe(400);
      expect(error).toBeInstanceOf(Error);
    });

    test('should create AppError with custom values', () => {
      const error = new AppError('Custom error', 'CUSTOM_CODE', 500);

      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.httpStatus).toBe(500);
    });
  });

  describe('Specific Error Types', () => {
    test('should create ValidationError', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('ERR_VALIDATION');
      expect(error.httpStatus).toBe(400);
    });

    test('should create AuthenticationError', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication required');
      expect(error.code).toBe('ERR_AUTHENTICATION');
      expect(error.httpStatus).toBe(401);
    });

    test('should create AuthorizationError', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe('ERR_AUTHORIZATION');
      expect(error.httpStatus).toBe(403);
    });

    test('should create NotFoundError', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe('ERR_NOT_FOUND');
      expect(error.httpStatus).toBe(404);
    });

    test('should create ConflictError', () => {
      const error = new ConflictError();

      expect(error.message).toBe('Resource already exists');
      expect(error.code).toBe('ERR_CONFLICT');
      expect(error.httpStatus).toBe(409);
    });
  });

  describe('handleError utility', () => {
    test('should return AppError as-is', () => {
      const originalError = new ValidationError('Test validation error');
      const handledError = handleError(originalError);

      expect(handledError).toBe(originalError);
    });

    test('should convert regular Error to AppError', () => {
      const originalError = new Error('Regular error');
      const handledError = handleError(originalError);

      expect(handledError).toBeInstanceOf(AppError);
      expect(handledError.message).toBe('Regular error');
      expect(handledError.code).toBe('ERR_APP');
    });

    test('should handle unknown errors', () => {
      const handledError = handleError('string error');

      expect(handledError).toBeInstanceOf(AppError);
      expect(handledError.message).toBe('An unexpected error occurred');
      expect(handledError.code).toBe('ERR_UNKNOWN');
      expect(handledError.httpStatus).toBe(500);
    });
  });
});
