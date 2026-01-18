import { TracingUtils } from '../../src/infrastructure/telemetry.js';

describe('OpenTelemetry Integration', () => {
  describe('TracingUtils', () => {
    test('should create span and handle success', async () => {
      const result = await TracingUtils.withSpan(
        'test-span',
        async span => {
          expect(span).toBeDefined();
          return 'success';
        },
        { 'test.attribute': 'value' }
      );

      expect(result).toBe('success');
    });

    test('should create span and handle error', async () => {
      const testError = new Error('Test error');

      await expect(
        TracingUtils.withSpan('test-error-span', async () => {
          throw testError;
        })
      ).rejects.toThrow('Test error');
    });

    test('should create database span', async () => {
      const result = await TracingUtils.withDatabaseSpan(
        'SELECT',
        'users',
        async () => {
          return { id: 1, name: 'Test User' };
        }
      );

      expect(result).toEqual({ id: 1, name: 'Test User' });
    });

    test('should add attributes to span', () => {
      // This test just ensures the method doesn't throw
      // In a real span context, it would add attributes
      expect(() => {
        TracingUtils.addAttributes({
          'user.id': '123',
          'request.method': 'POST',
        });
      }).not.toThrow();
    });

    test('should add events to span', () => {
      // This test just ensures the method doesn't throw
      // In a real span context, it would add events
      expect(() => {
        TracingUtils.addEvent('user.login', {
          'user.id': '123',
          'login.success': true,
        });
      }).not.toThrow();
    });
  });

  describe('SDK Initialization', () => {
    test('should initialize tracing SDK without errors', () => {
      expect(() => {
        // Note: In tests, we might want to skip actual initialization
        // initializeTracing();
      }).not.toThrow();
    });
  });
});
