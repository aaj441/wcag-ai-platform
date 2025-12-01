# WCAG AI Platform - Comprehensive Testing Suite

## Overview

This testing suite provides comprehensive test coverage for the WCAG AI Platform, including:

1. **Backend API Tests** - Complete coverage of all 17 API endpoints
2. **Database Schema Validation** - Tests for schema integrity, constraints, and relationships
3. **Redis Rate Limiting Tests** - Tests for rate limiting, caching, and distributed locking
4. **Queue Processing Tests** - Tests for Bull queue job processing and orchestration
5. **Frontend Component Tests** - React component tests using React Testing Library
6. **Integration Tests** - End-to-end workflow tests
7. **Production Deployment Verification** - Comprehensive deployment checklist

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Setup test database
createdb wcag_ai_platform_test

# Configure environment variables
cp packages/api/.env.example packages/api/.env.test
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:api          # API endpoint tests
npm run test:database     # Database schema tests
npm run test:redis        # Redis/cache tests
npm run test:queue        # Queue processing tests
npm run test:integration  # Integration tests
```

---

## Test Structure

### Backend Tests (`packages/api/src/__tests__/`)

```
__tests__/
├── setup/
│   ├── testUtils.ts          # Test utilities and helpers
│   └── jest.setup.ts         # Jest configuration
├── api/
│   ├── health.test.ts        # Health check endpoints
│   ├── scans.test.ts         # Scan management
│   ├── violations.test.ts    # Violation management
│   ├── fixes.test.ts         # Fix generation and approval
│   └── transform.test.ts     # Site transformation
├── database/
│   └── schema-validation.test.ts  # Database integrity
├── redis/
│   └── rate-limiting.test.ts      # Redis caching & rate limiting
├── queue/
│   └── scan-queue.test.ts         # Bull queue processing
└── integration/
    └── full-workflow.test.ts      # End-to-end workflows
```

### Frontend Tests (`packages/webapp/src/__tests__/`)

```
__tests__/
├── setup/
│   └── testUtils.tsx          # React Testing Library setup
├── components/
│   ├── ViolationCard.test.tsx           # Violation display
│   ├── FixPreview.test.tsx              # Fix code preview
│   └── MetroSelector.test.tsx           # Metro area selection
```

---

## Test Categories

### 1. API Endpoint Tests

**Location**: `packages/api/src/__tests__/api/`

Tests all 17 API endpoints including:
- Health checks
- Scan creation and management
- Violation detection and tracking
- Fix generation and approval
- Site transformation
- Lead discovery
- Proposal generation

**Run**: `npm run test:api`

**Example**:
```typescript
describe('POST /api/scans', () => {
  it('should create a new scan', async () => {
    const response = await api
      .post('/api/scans')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        url: 'https://example.com',
        wcagLevel: 'AA',
        clientId: client.id,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### 2. Database Schema Validation Tests

**Location**: `packages/api/src/__tests__/database/`

Tests database integrity including:
- Table creation and constraints
- Foreign key relationships
- Unique constraints
- Cascade deletions
- Index performance
- Enum validations

**Run**: `npm run test:database`

**Example**:
```typescript
it('should enforce foreign key constraint', async () => {
  await expect(
    prisma.scan.create({
      data: {
        url: 'https://example.com',
        clientId: 'non-existent-id',
        status: 'PENDING',
      },
    })
  ).rejects.toThrow();
});
```

### 3. Redis Rate Limiting Tests

**Location**: `packages/api/src/__tests__/redis/`

Tests Redis functionality including:
- API rate limiting
- Caching strategies
- Cache invalidation
- Distributed locking
- Pub/sub messaging
- Health monitoring

**Run**: `npm run test:redis`

**Example**:
```typescript
it('should enforce rate limit', async () => {
  // Make 100 requests
  const requests = Array.from({ length: 100 }, () =>
    api.get('/api/scans').set('Authorization', `Bearer ${authToken}`)
  );

  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.status === 429);

  expect(rateLimited.length).toBeGreaterThan(0);
});
```

### 4. Queue Processing Tests

**Location**: `packages/api/src/__tests__/queue/`

Tests Bull queue operations including:
- Job creation and processing
- Priority queues
- Retry logic with exponential backoff
- Job progress tracking
- Event handling
- Dead letter queue

**Run**: `npm run test:queue`

**Example**:
```typescript
it('should retry failed jobs', async () => {
  let attemptCount = 0;

  scanQueue.process(async (job) => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('Simulated failure');
    }
    return { status: 'completed' };
  });

  await scanQueue.add('scan', { url: 'https://example.com' }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });

  await wait(5000);
  expect(attemptCount).toBe(3);
});
```

### 5. Frontend Component Tests

**Location**: `packages/webapp/src/__tests__/components/`

Tests React components including:
- Rendering and display
- User interactions
- State management
- Accessibility (keyboard navigation, ARIA)
- Event handling

**Run**: `npm run test:components`

**Example**:
```typescript
it('should call onApprove when approve button clicked', () => {
  const handleApprove = vi.fn();

  render(
    <FixPreview
      fix={mockFix}
      originalCode={mockViolation.element}
      onApprove={handleApprove}
    />
  );

  const approveButton = screen.getByRole('button', { name: /approve/i });
  fireEvent.click(approveButton);

  expect(handleApprove).toHaveBeenCalledWith(mockFix.id);
});
```

### 6. Integration Tests

**Location**: `packages/api/src/__tests__/integration/`

End-to-end workflow tests including:
- Complete scan → violations → fixes → approval → apply workflow
- Lead discovery → risk scoring → proposal generation
- Site transformation → deployment
- Multi-LLM validation
- Caching and performance

**Run**: `npm run test:integration`

**Example**:
```typescript
it('should complete full workflow', async () => {
  // 1. Create scan
  const scanResponse = await api.post('/api/scans')...;

  // 2. Generate fixes
  const fixResponse = await api.post('/api/fixes/generate')...;

  // 3. Review and approve
  const approveResponse = await api.patch(`/api/fixes/${fixId}/review`)...;

  // 4. Apply fixes
  const applyResponse = await api.post(`/api/fixes/${fixId}/apply`)...;

  expect(applyResponse.body.status).toBe('APPLIED');
});
```

---

## Test Utilities

### Backend Test Utils (`packages/api/src/__tests__/setup/testUtils.ts`)

**Available Functions**:
- `cleanDatabase()` - Clear all test data
- `cleanRedis()` - Flush Redis test database
- `cleanupAll()` - Complete cleanup
- `createTestClient()` - Create test client
- `createTestConsultant()` - Create test consultant
- `createTestScan()` - Create test scan
- `createTestViolation()` - Create test violation
- `createTestFix()` - Create test fix
- `generateTestToken()` - Generate JWT token
- `mockExternalAPIs()` - Mock external API calls
- `wait()` - Async delay

**Example**:
```typescript
import { createTestClient, createTestScan, generateTestToken } from '../setup/testUtils';

const client = await createTestClient();
const scan = await createTestScan(client.id);
const authToken = generateTestToken({ clientId: client.id });
```

### Frontend Test Utils (`packages/webapp/src/__tests__/setup/testUtils.tsx`)

**Available Functions**:
- `render()` - Render component with providers
- `mockApiResponse()` - Mock API responses
- `mockScan` - Mock scan data
- `mockViolation` - Mock violation data
- `mockFix` - Mock fix data
- `waitFor()` - Wait for async updates

**Example**:
```typescript
import { render, screen, mockScan } from '../setup/testUtils';

render(<ScanDetails scan={mockScan} />);
expect(screen.getByText('85.5%')).toBeInTheDocument();
```

---

## Coverage Requirements

### Coverage Thresholds

```javascript
{
  branches: 80,
  functions: 80,
  lines: 85,
  statements: 85
}
```

### Critical Services (100% Coverage Required)
- RemediationEngine
- CircuitBreaker
- RiskScoringService

### Generate Coverage Report

```bash
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

---

## CI/CD Integration

### GitHub Actions

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
          node-version: '18'

      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

### Running Tests in CI

```bash
npm run test:ci
```

This command:
- Runs all tests in CI mode
- Generates coverage report
- Uses limited workers (2) for stability
- Fails on coverage below thresholds

---

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` to set up test data
- Use `afterEach` to clean up
- Don't rely on test execution order

### 2. Mock External Dependencies
```typescript
// Mock OpenAI API
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ choices: [{ message: { content: 'Fix code' } }] }),
});
```

### 3. Use Descriptive Test Names
```typescript
// Good
it('should return 404 when scan does not exist', async () => {...});

// Bad
it('test scan', async () => {...});
```

### 4. Test Error Cases
```typescript
it('should return 400 for invalid URL', async () => {
  const response = await api.post('/api/scans').send({
    url: 'not-a-url',
  });

  expect(response.status).toBe(400);
  expect(response.body.error).toMatch(/invalid url/i);
});
```

### 5. Use Factories for Test Data
```typescript
const createTestScan = (overrides = {}) => ({
  url: 'https://example.com',
  wcagLevel: 'AA',
  status: 'COMPLETED',
  ...overrides,
});
```

---

## Troubleshooting

### Tests Timing Out
```bash
# Increase timeout
jest.setTimeout(30000);

# Or per test
it('should complete', async () => {...}, 30000);
```

### Database Connection Errors
```bash
# Ensure test database exists
createdb wcag_ai_platform_test

# Check DATABASE_URL in .env.test
DATABASE_URL="postgresql://user:password@localhost:5432/wcag_ai_platform_test"
```

### Redis Connection Errors
```bash
# Ensure Redis is running
redis-cli ping

# Check REDIS_TEST_DB is set
REDIS_TEST_DB=1
```

### Port Already in Use
```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

---

## Performance Testing

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 http://localhost:3001/api/scans
```

### Benchmark Tests

```typescript
it('should query scans in <100ms', async () => {
  const start = Date.now();
  await prisma.scan.findMany({ where: { clientId } });
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(100);
});
```

---

## Deployment Verification

See [DEPLOYMENT_VERIFICATION_CHECKLIST.md](./DEPLOYMENT_VERIFICATION_CHECKLIST.md) for:
- Pre-deployment checklist
- Deployment steps
- Post-deployment verification
- Rollback procedures
- Monitoring guidelines

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

---

## Support

For questions or issues:
- Create an issue in the repository
- Contact the development team
- Check the existing tests for examples

---

## License

MIT
