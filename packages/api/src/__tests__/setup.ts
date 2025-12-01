/**
 * Jest Setup File
 * Configuration and global setup for backend tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.JWT_SECRET = 'test-secret-key';
process.env.API_RATE_LIMIT = '100';

// Global test timeout
jest.setTimeout(10000);

// Mock logger to reduce noise in tests
jest.mock('../utils/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    securityEvent: jest.fn(),
  },
}));

// Global test setup
beforeAll(() => {
  // Setup code that runs once before all tests
});

// Global test teardown
afterAll(() => {
  // Cleanup code that runs once after all tests
});
