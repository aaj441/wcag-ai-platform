# WCAGAI Production Stress Tests

Comprehensive stress testing suite to validate production readiness per **MEGA PROMPT 1** requirements.

## Success Criteria

- ✅ System handles 50 concurrent scans without crashing
- ✅ No memory leaks after 1000 scan cycles
- ✅ All external API failures handled gracefully
- ✅ Response times stay under 30s even at 80% capacity

---

## Test Suite Overview

### 1. 100 Concurrent Scans (k6)

**File:** `100-concurrent-scans.js`

High-load k6 test that simulates production traffic patterns with aggressive ramp-up to 100 concurrent users.

**Requirements:**
- k6 installed (`brew install k6` or [download](https://k6.io/docs/get-started/installation/))

**Run:**
```bash
# Quick test (default)
k6 run stress-tests/100-concurrent-scans.js

# Against production
k6 run --env API_URL=https://api.wcagai.com stress-tests/100-concurrent-scans.js

# With custom API key
k6 run --env API_KEY=your-key stress-tests/100-concurrent-scans.js

# Save detailed results
k6 run --out json=results.json stress-tests/100-concurrent-scans.js
```

**Test Phases:**
1. Warmup (10 users) - 1 min
2. Comfortable Load (25 users) - 2 min
3. Approach Capacity (50 users) - 2 min
4. Stress Test (75 users) - 2 min
5. Breaking Point (100 users) - 3 min
6. **Sustained Stress (100 users)** - 5 min 🔥
7. Recovery (50 users) - 2 min
8. Cool Down (10 users) - 2 min
9. Ramp Down (0 users) - 1 min

**Total Duration:** ~20 minutes

**Output:**
- `stress-test-results.json` - Full metrics
- `stress-test-report.html` - Visual report
- `stress-test-summary.txt` - Pass/fail verdict

---

### 2. Memory Leak Detector (Node/TypeScript)

**File:** `memory-leak-detector.ts`

Node-based stress test with real-time memory monitoring. Detects leaks via heap growth analysis and GC effectiveness tracking.

**Requirements:**
- Node.js 18+
- tsx (`npm install -g tsx`)

**Run:**
```bash
# Quick test (10 concurrent, 100 cycles)
tsx stress-tests/memory-leak-detector.ts

# Production test (50 concurrent, 1000 cycles)
tsx stress-tests/memory-leak-detector.ts --concurrent=50 --cycles=1000

# With GC profiling (recommended)
node --expose-gc -r tsx/register stress-tests/memory-leak-detector.ts --concurrent=50 --cycles=1000

# Against custom endpoint
API_URL=https://api.wcagai.com tsx stress-tests/memory-leak-detector.ts
```

**Parameters:**
- `--concurrent=N` - Number of concurrent requests per cycle (default: 10)
- `--cycles=N` - Number of test cycles (default: 100)
- `API_URL` - Target API endpoint (default: http://localhost:8080)
- `API_KEY` - Authentication key (optional)

**What it Checks:**
- ✅ Heap growth < 50MB over test duration
- ✅ GC effectiveness > 80%
- ✅ No continuous upward memory trend
- ✅ Error rate < 10%
- ✅ P95 response time < 30s

**Exit Codes:**
- `0` - All checks passed ✅
- `1` - One or more checks failed ❌

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Production Stress Tests

on:
  schedule:
    - cron: '0 2 * * *' # Run nightly at 2 AM
  workflow_dispatch:

jobs:
  stress-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm install
        working-directory: packages/api

      - name: Run Memory Leak Detector
        run: |
          node --expose-gc -r tsx/register stress-tests/memory-leak-detector.ts \
            --concurrent=50 --cycles=1000
        working-directory: packages/api
        env:
          API_URL: ${{ secrets.STAGING_API_URL }}
          API_KEY: ${{ secrets.API_KEY }}

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: stress-test-results
          path: packages/api/stress-test-*.txt
```

---

## Interpreting Results

### k6 Test (100-concurrent-scans.js)

**Passing Criteria:**
```
✅ P95 Response Time < 30s
✅ Error Rate < 10%
✅ Success Rate > 90%
✅ Timeout Rate < 5%
```

**Red Flags:**
- 🚨 P95 > 30s → Need to optimize scan processing or scale workers
- 🚨 Error Rate > 10% → Check logs for failure patterns (DB, Redis, external APIs)
- 🚨 Timeouts → Increase worker timeout or reduce queue concurrency

### Memory Leak Detector

**Passing Criteria:**
```
✅ Heap Growth < 50MB
✅ GC Effectiveness > 80%
✅ No Memory Leak Detected
✅ Error Rate < 10%
```

**Red Flags:**
- 🚨 Heap Growth > 50MB → Investigate object retention issues
- 🚨 GC Effectiveness < 80% → Objects not being freed (possible leak)
- 🚨 Memory Leak Detected → Run with `--inspect` and take heap snapshots

---

## Debugging Memory Leaks

### 1. Run with Profiler

```bash
node --inspect --expose-gc -r tsx/register stress-tests/memory-leak-detector.ts
```

Open `chrome://inspect` and take heap snapshots before/after test.

### 2. Identify Retained Objects

Common culprits in WCAGAI:
- Puppeteer pages not closed (`PuppeteerService.ts:169`)
- Event listeners not removed
- Bull job references not cleared
- Redis connections not returned to pool
- Large scan results cached indefinitely

### 3. Fix Patterns

```typescript
// ❌ BAD: Page not guaranteed to close
const page = await browser.newPage();
const result = await scanPage(page);
return result;

// ✅ GOOD: Page always closed
const page = await browser.newPage();
try {
  const result = await scanPage(page);
  return result;
} finally {
  await page.close();
}
```

---

## Pre-Production Checklist

Before deploying to production, run all stress tests and verify:

- [ ] k6 test passes with 100 concurrent users
- [ ] Memory leak detector passes 1000 cycle test
- [ ] No memory leaks detected
- [ ] P95 response time < 30s
- [ ] Error rate < 5% (stricter than 10% threshold)
- [ ] System recovers gracefully after stress (cool-down phase passes)
- [ ] All health checks green after test completion

---

## Troubleshooting

### "Health check failed" on startup

Check that services are running:
```bash
docker-compose up -d postgres redis
```

### k6 not installed

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### "Cannot find tsx"

```bash
npm install -g tsx
```

### Out of memory during test

Increase Node heap size:
```bash
NODE_OPTIONS="--max-old-space-size=4096" tsx stress-tests/memory-leak-detector.ts
```

---

## References

- [MEGA PROMPT 1: Load Stability & Stress Hardening](../../docs/mega-prompts.md#1)
- [k6 Documentation](https://k6.io/docs/)
- [Node.js Memory Management](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Puppeteer Best Practices](https://pptr.dev/guides/best-practices)
