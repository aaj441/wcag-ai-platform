/**
 * Jest Global Setup
 * Configures the test environment before running tests
 */

import { setupTests, teardownTests } from './testUtils';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Setup before all tests
beforeAll(async () => {
  await setupTests();
});

// Cleanup after all tests
afterAll(async () => {
  await teardownTests();
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REDIS_TEST_DB = '1';
process.env.AI_COST_LIMIT_DAILY = '1000';

// Suppress console logs during tests (optional)
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}
