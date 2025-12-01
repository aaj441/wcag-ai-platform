# Comprehensive Testing Guide

**Version:** 1.0.0
**Last Updated:** 2025-12-01
**Purpose:** Complete guide to the WCAG AI Platform testing infrastructure

## Table of Contents

1. [Overview](#overview)
2. [Test Infrastructure](#test-infrastructure)
3. [Running Tests](#running-tests)
4. [Test Suites](#test-suites)
5. [Writing Tests](#writing-tests)
6. [Best Practices](#best-practices)
7. [Continuous Integration](#continuous-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The WCAG AI Platform has a comprehensive testing strategy covering:

- **Unit Tests**: Individual functions and components
- **Integration Tests**: Multiple components working together
- **End-to-End Tests**: Complete user workflows
- **Performance Tests**: Load and stress testing
- **Security Tests**: Authentication, authorization, and input validation

### Test Coverage Goals

- **Code Coverage**: > 80% overall
- **Critical Paths**: 100% coverage
- **API Endpoints**: All endpoints tested
- **UI Components**: All major components tested

---

## Test Infrastructure

### Backend Testing (API)

**Framework**: Jest
**Location**: `packages/api/src/__tests__/`

```
packages/api/src/__tests__/
├── database/           # Database schema and Prisma tests
│   └── schema-validation.test.ts
├── middleware/         # Middleware tests
│   └── rate-limiting.test.ts
├── queue/             # Bull queue tests
│   └── bull-queue.test.ts
├── integration/       # End-to-end workflow tests
│   └── end-to-end-workflows.test.ts
├── services/          # Service layer tests
└── routes/            # API endpoint tests
```

**Dependencies:**
- Jest: Test runner
- Supertest: HTTP assertion library
- ts-jest: TypeScript support for Jest
- @types/jest: TypeScript types

### Frontend Testing (Webapp)

**Framework**: Vitest
**Location**: `packages/webapp/src/__tests__/`

```
packages/webapp/src/__tests__/
├── components/        # React component tests
│   ├── Dashboard.test.tsx
│   ├── Scanner.test.tsx
│   └── Results.test.tsx
├── hooks/            # Custom React hooks tests
├── utils/            # Utility function tests
└── integration/      # Frontend integration tests
```

**Dependencies:**
- Vitest: Fast unit test framework
- @testing-library/react: React testing utilities
- @testing-library/jest-dom: Custom Jest matchers
- jsdom: DOM implementation for Node.js

---

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run API tests only
npm run test:api

# Run webapp tests only
npm run test:webapp

# Run with coverage
npm run test:coverage
```

### Specific Test Suites

```bash
# Database tests
npm run test:database

# Middleware tests
npm run test:middleware

# Queue tests
npm run test:queue

# Integration tests
npm run test:integration

# Component tests
npm run test:components

# Run all test suites
npm run test:all
```

### Watch Mode

```bash
# Watch API tests
npm run test:api:watch

# Watch webapp tests
npm run test:webapp:watch
```

### Coverage Reports

```bash
# Generate coverage reports
npm run test:coverage

# View coverage reports
# API: packages/api/coverage/lcov-report/index.html
# Webapp: packages/webapp/coverage/index.html
```

---

## Test Suites

### 1. Database Schema Validation Tests

**File**: `packages/api/src/__tests__/database/schema-validation.test.ts`

**What it tests:**
- Prisma client connection
- Schema file validation
- Migration status
- Model creation and validation
- Foreign key relationships
- Cascade deletes
- Data constraints
- Transaction handling
- Performance and indexing

**Run:**
```bash
npm run test:database
```

**Key tests:**
- ✅ Prisma client connects successfully
- ✅ Schema file is valid and contains all required models
- ✅ All migrations are applied
- ✅ Models enforce required fields and constraints
- ✅ Relationships work correctly (Client → Scan → Violation)
- ✅ Cascade deletes maintain data integrity
- ✅ Transactions rollback on failure
- ✅ Indexes improve query performance

**Example:**
```typescript
it('should create a scan with all required fields', async () => {
  const scan = await prisma.scan.create({
    data: {
      websiteUrl: 'https://example.com',
      scanResults: JSON.stringify({ violations: [] }),
      aiConfidenceScore: 0.95,
    },
  });

  expect(scan).toBeDefined();
  expect(scan.id).toBeDefined();
  expect(scan.createdAt).toBeInstanceOf(Date);
});
```

---

### 2. Redis-Based Rate Limiting Tests

**File**: `packages/api/src/__tests__/middleware/rate-limiting.test.ts`

**What it tests:**
- General API rate limiting (100 req/15min)
- Strict scan rate limiting (10 req/hour)
- Rate limit headers
- Redis integration
- IP-based rate limiting
- Error handling
- Performance under load

**Run:**
```bash
npm run test:middleware
```

**Key tests:**
- ✅ Allows requests within rate limit
- ✅ Returns proper rate limit headers
- ✅ Enforces rate limit after threshold exceeded
- ✅ Returns 429 status with proper error message
- ✅ Skips rate limiting for health checks
- ✅ Resets rate limit after window expires
- ✅ Handles different IPs independently
- ✅ Persists rate limits via Redis
- ✅ Handles concurrent requests correctly

**Example:**
```typescript
it('should enforce rate limit after exceeding threshold', async () => {
  const limit = parseInt(process.env.API_RATE_LIMIT || '100');

  // Exhaust rate limit
  for (let i = 0; i < limit; i++) {
    await request(app).get('/api/test');
  }

  // Next request should be rate limited
  const response = await request(app).get('/api/test');

  expect(response.status).toBe(429);
  expect(response.body).toHaveProperty('error');
});
```

---

### 3. Bull Queue Job Lifecycle Tests

**File**: `packages/api/src/__tests__/queue/bull-queue.test.ts`

**What it tests:**
- Queue initialization
- Job creation and processing
- Retry logic with exponential backoff
- Failed job handling
- Queue statistics and monitoring
- Event handling
- Concurrency
- Error recovery

**Run:**
```bash
npm run test:queue
```

**Key tests:**
- ✅ Queue initializes with correct configuration
- ✅ Jobs added to queue successfully
- ✅ Jobs processed with correct priority
- ✅ Failed jobs retry automatically
- ✅ Jobs marked as failed after max retries
- ✅ Queue statistics accurate
- ✅ Event handlers fire correctly
- ✅ Failed job data saved to database
- ✅ Handles concurrent job processing
- ✅ Queue cleanup works correctly

**Example:**
```typescript
it('should retry failed jobs automatically', async () => {
  let attemptCount = 0;

  mockPuppeteerService.scanUrl.mockImplementation(() => {
    attemptCount++;
    if (attemptCount === 1) {
      return Promise.reject(new Error('Temporary failure'));
    }
    return Promise.resolve({ score: 85, violations: [] });
  });

  const job = await scanQueue.addScan({
    prospectId: 'prospect-123',
    url: 'https://example.com',
  });

  await job.finished();

  expect(attemptCount).toBeGreaterThan(1);
});
```

---

### 4. Frontend Component Tests

**Files**:
- `packages/webapp/src/__tests__/components/Dashboard.test.tsx`
- `packages/webapp/src/__tests__/components/Scanner.test.tsx`
- `packages/webapp/src/__tests__/components/Results.test.tsx`

**What it tests:**
- Component rendering
- User interactions
- State management
- Data loading
- Error handling
- Accessibility (ARIA, keyboard nav)
- Performance

**Run:**
```bash
npm run test:components
```

**Key tests:**

**Dashboard:**
- ✅ Renders without crashing
- ✅ Displays loading state
- ✅ Loads and displays email drafts
- ✅ Filters and sorts data correctly
- ✅ Handles user interactions (approve, reject, edit)
- ✅ Shows notifications
- ✅ Accessible with keyboard navigation

**Scanner:**
- ✅ Renders scan form
- ✅ Validates URL input
- ✅ Calls API on scan button click
- ✅ Shows loading state during scan
- ✅ Displays results after successful scan
- ✅ Handles errors gracefully
- ✅ Supports keyboard navigation

**Results:**
- ✅ Displays scan results and score
- ✅ Shows violation list with details
- ✅ Handles empty results
- ✅ Supports export functionality
- ✅ Filters violations by severity
- ✅ Accessible to screen readers

**Example:**
```typescript
it('should call API on scan button click', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ violations: [], score: 100 }),
  });

  render(<Scanner />);

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'https://example.com' },
  });

  fireEvent.click(screen.getByRole('button', { name: /scan/i }));

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
  });
});
```

---

### 5. Integration Tests (End-to-End Workflows)

**File**: `packages/api/src/__tests__/integration/end-to-end-workflows.test.ts`

**What it tests:**
- Complete scan workflow (create → process → retrieve)
- Multi-tenant isolation
- Violation management workflow
- Review and approval workflow
- Audit trail maintenance
- Error handling across services
- Data consistency
- Transaction integrity
- Performance under concurrent load

**Run:**
```bash
npm run test:integration
```

**Key workflows tested:**
- ✅ Create scan → Process → Retrieve results
- ✅ Create scan with violations → Review → Approve
- ✅ Multi-client data isolation
- ✅ Audit trail for consultant actions
- ✅ Concurrent scan creation
- ✅ Batch operations
- ✅ Database transactions rollback on error
- ✅ Foreign key constraint enforcement

**Example:**
```typescript
it('should complete full scan workflow', async () => {
  // Step 1: Create scan
  const createResponse = await request(app)
    .post('/api/scan')
    .send({
      url: 'https://example.com',
      clientId: testClientId,
    });

  expect(createResponse.status).toBe(200);
  const scanId = createResponse.body.scanId;

  // Step 2: Retrieve results
  const getResponse = await request(app)
    .get(`/api/scan/${scanId}`);

  expect(getResponse.status).toBe(200);
  expect(getResponse.body).toHaveProperty('id', scanId);
  expect(getResponse.body).toHaveProperty('websiteUrl');
});
```

---

## Writing Tests

### Test Structure

Follow the **Arrange-Act-Assert** pattern:

```typescript
it('should do something specific', async () => {
  // Arrange: Set up test data and mocks
  const testData = { url: 'https://example.com' };
  mockService.mockReturnValue(expectedResult);

  // Act: Execute the code being tested
  const result = await functionUnderTest(testData);

  // Assert: Verify the results
  expect(result).toEqual(expectedResult);
  expect(mockService).toHaveBeenCalledWith(testData);
});
```

### Naming Conventions

```typescript
describe('ComponentName or FeatureName', () => {
  describe('specific functionality', () => {
    it('should do something specific when condition X', () => {
      // test implementation
    });

    it('should handle error case Y', () => {
      // error test
    });
  });
});
```

### Mocking Best Practices

```typescript
// Mock external dependencies
jest.mock('../../services/external', () => ({
  externalService: jest.fn(),
}));

// Mock Prisma
jest.mock('../../lib/prisma', () => ({
  prisma: {
    scan: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Testing Async Code

```typescript
// Use async/await
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// Use waitFor for DOM updates
it('should update UI asynchronously', async () => {
  render(<Component />);

  await waitFor(() => {
    expect(screen.getByText(/loaded/i)).toBeInTheDocument();
  });
});
```

### Error Testing

```typescript
// Test that errors are thrown
it('should throw error for invalid input', async () => {
  await expect(functionUnderTest(invalidInput))
    .rejects
    .toThrow('Expected error message');
});

// Test error handling
it('should handle errors gracefully', async () => {
  mockService.mockRejectedValue(new Error('Service failed'));

  const result = await functionWithErrorHandling();

  expect(result).toHaveProperty('error');
  expect(result.success).toBe(false);
});
```

---

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests:

```typescript
// Good: Each test is self-contained
describe('User Service', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await deleteTestUser(testUser.id);
  });

  it('should fetch user by ID', async () => {
    const user = await getUserById(testUser.id);
    expect(user).toEqual(testUser);
  });
});
```

### 2. Use Descriptive Test Names

```typescript
// Bad
it('works', () => { ... });

// Good
it('should return 404 when scan does not exist', () => { ... });
```

### 3. Test Edge Cases

```typescript
describe('URL Validation', () => {
  it('should accept valid HTTP URLs', () => { ... });
  it('should accept valid HTTPS URLs', () => { ... });
  it('should reject malformed URLs', () => { ... });
  it('should reject private IP addresses', () => { ... });
  it('should reject localhost', () => { ... });
  it('should reject URLs exceeding max length', () => { ... });
});
```

### 4. Keep Tests Simple

```typescript
// Bad: Testing multiple things
it('should create user and send email and log event', () => {
  // Too much in one test
});

// Good: One assertion per test
it('should create user with valid data', () => { ... });
it('should send welcome email after user creation', () => { ... });
it('should log user creation event', () => { ... });
```

### 5. Mock External Dependencies

```typescript
// Mock external APIs
jest.mock('axios');
axios.get.mockResolvedValue({ data: mockData });

// Mock file system
jest.mock('fs');
fs.readFileSync.mockReturnValue('file contents');
```

### 6. Clean Up After Tests

```typescript
afterEach(async () => {
  // Clean up test data
  await prisma.scan.deleteMany({ where: { id: testScanId } });

  // Clear mocks
  jest.clearAllMocks();
});

afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();
});
```

---

## Continuous Integration

### GitHub Actions Configuration

The tests are automatically run in CI on every push and pull request.

**Configuration**: `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Prisma migrations
        run: cd packages/api && npx prisma migrate deploy

      - name: Run tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/api/coverage/lcov.info,./packages/webapp/coverage/lcov.info
```

### Running Tests in CI

```bash
# Run all tests with CI-optimized settings
npm run test:ci
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Problem**: `Error: Can't reach database server`

**Solution**:
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Verify database is running
docker-compose ps

# Run migrations
cd packages/api && npx prisma migrate deploy
```

#### 2. Redis Connection Errors

**Problem**: `Error: Redis connection failed`

**Solution**:
```bash
# Check Redis is running
redis-cli ping

# Check REDIS_HOST and REDIS_PORT
echo $REDIS_HOST
echo $REDIS_PORT

# Start Redis if needed
docker-compose up -d redis
```

#### 3. Test Timeouts

**Problem**: Tests timing out

**Solution**:
```typescript
// Increase timeout for specific test
it('should complete long operation', async () => {
  // test code
}, 10000); // 10 second timeout

// Or in describe block
describe('Slow tests', () => {
  jest.setTimeout(30000); // 30 seconds for all tests

  it('should complete slow operation', async () => {
    // test code
  });
});
```

#### 4. Mock Not Working

**Problem**: Mocks not being applied

**Solution**:
```typescript
// Ensure mock is before imports
jest.mock('../../services/external');

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Verify mock is called
expect(mockFunction).toHaveBeenCalled();
```

#### 5. Snapshot Mismatches

**Problem**: Snapshot tests failing

**Solution**:
```bash
# Update snapshots after intentional changes
npm test -- -u

# Or specific test
npm test -- Scanner.test.tsx -u
```

---

## Coverage Goals

### Current Coverage

Run `npm run test:coverage` to see current coverage.

### Target Coverage by Category

| Category | Target | Current |
|----------|--------|---------|
| Overall | 80% | TBD |
| Critical Paths | 100% | TBD |
| API Endpoints | 90% | TBD |
| Middleware | 95% | TBD |
| Components | 80% | TBD |
| Services | 85% | TBD |

### Viewing Coverage Reports

```bash
# Generate coverage
npm run test:coverage

# Open in browser
# API: packages/api/coverage/lcov-report/index.html
# Webapp: packages/webapp/coverage/index.html
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/guide/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

---

## Quick Reference

### Most Used Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:api:watch

# Run specific test file
npm test -- schema-validation.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"

# Generate coverage report
npm run test:coverage

# Run CI tests
npm run test:ci
```

### Test File Locations

```
Backend Tests:  packages/api/src/__tests__/
Frontend Tests: packages/webapp/src/__tests__/
```

### Adding New Tests

1. Create test file: `*.test.ts` or `*.test.tsx`
2. Place in appropriate directory
3. Follow existing patterns
4. Run tests: `npm test`
5. Verify coverage: `npm run test:coverage`

---

**Last Updated**: 2025-12-01
**Maintained By**: WCAG AI Platform Team
