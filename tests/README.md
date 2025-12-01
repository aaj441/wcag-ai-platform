# WCAG AI Platform Test Suites

This directory contains comprehensive test suites for the WCAG AI Platform.

## Test Suites Created

### 1. Database Schema Validation Tests
**Location**: `packages/api/src/__tests__/database/schema-validation.test.ts`
- Tests Prisma schema validation and migrations
- Verifies database constraints and relationships
- Tests cascade deletes and transactions
- Ensures data integrity

### 2. Redis-Based Rate Limiting Tests
**Location**: `packages/api/src/__tests__/middleware/rate-limiting.test.ts`
- Tests API rate limiting (100 req/15min)
- Tests scan endpoint limiting (10 req/hour)
- Verifies Redis integration
- Tests concurrent requests and edge cases

### 3. Bull Queue Job Lifecycle Tests
**Location**: `packages/api/src/__tests__/queue/bull-queue.test.ts`
- Tests queue initialization and job processing
- Verifies retry logic with exponential backoff
- Tests failed job handling and recovery
- Validates event handling and monitoring

### 4. Frontend Component Tests
**Location**: `packages/webapp/src/__tests__/components/`
- Dashboard component tests (Dashboard.test.tsx)
- Scanner component tests (Scanner.test.tsx)
- Results component tests (Results.test.tsx)
- Tests user interactions and accessibility

### 5. Integration Tests
**Location**: `packages/api/src/__tests__/integration/end-to-end-workflows.test.ts`
- End-to-end workflow testing
- Multi-tenant isolation testing
- Audit trail verification
- Performance and concurrency tests

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:database
npm run test:middleware
npm run test:queue
npm run test:components
npm run test:integration

# Run all test suites
npm run test:all

# Run with coverage
npm run test:coverage

# Run in CI mode
npm run test:ci
```

## Documentation

- **COMPREHENSIVE_TESTING_GUIDE.md**: Complete guide to testing infrastructure
- **PRODUCTION_DEPLOYMENT_VERIFICATION.md**: Production deployment checklist

## Test Coverage Goals

- Overall: > 80%
- Critical Paths: 100%
- API Endpoints: 90%
- Middleware: 95%
- Components: 80%

## Configuration Files

- `packages/api/jest.config.js`: Jest configuration for API tests
- `packages/api/src/__tests__/setup.ts`: Jest setup file
- `packages/webapp/vitest.config.ts`: Vitest configuration for webapp tests
- `packages/webapp/src/__tests__/setup.ts`: Vitest setup file

## Quick Reference

| Test Type | Command | Location |
|-----------|---------|----------|
| Database | `npm run test:database` | `packages/api/src/__tests__/database/` |
| Middleware | `npm run test:middleware` | `packages/api/src/__tests__/middleware/` |
| Queue | `npm run test:queue` | `packages/api/src/__tests__/queue/` |
| Components | `npm run test:components` | `packages/webapp/src/__tests__/components/` |
| Integration | `npm run test:integration` | `packages/api/src/__tests__/integration/` |

## Production Ready Features

All tests include:
- ✅ Comprehensive error handling
- ✅ Proper mocking strategies
- ✅ Edge case coverage
- ✅ Performance testing
- ✅ Security validation
- ✅ Accessibility testing
- ✅ Detailed assertions

## Next Steps

1. Set up CI/CD pipeline to run tests automatically
2. Monitor test coverage and maintain > 80%
3. Add performance benchmarks
4. Implement visual regression testing
5. Add smoke tests for production deployments

For more details, see COMPREHENSIVE_TESTING_GUIDE.md
