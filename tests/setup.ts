import 'jest-extended';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(() => {
  // Global setup before all tests
});

afterAll(async () => {
  // Global cleanup after all tests
  // Force close any remaining handles
  await new Promise(resolve => setTimeout(resolve, 100));
});
