/**
 * PRODUCTION STRESS TEST - 100 Concurrent Scans
 *
 * Tests system behavior under extreme load to identify:
 * - Memory leaks
 * - Queue saturation points
 * - Response time degradation
 * - Error rates under load
 * - Recovery behavior
 *
 * Usage:
 *   k6 run --out json=stress-test-results.json stress-tests/100-concurrent-scans.js
 *   k6 run --env API_URL=https://your-api.com stress-tests/100-concurrent-scans.js
 *
 * Success Criteria (from MEGA PROMPT 1):
 * - System handles 50 concurrent scans without crashing
 * - Response times stay under 30s even at 80% capacity
 * - All external API failures handled gracefully
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// ============================================================================
// Custom Metrics
// ============================================================================

const errorRate = new Rate('errors');
const scanDuration = new Trend('scan_duration');
const queueDepth = new Gauge('queue_depth');
const memoryUsage = new Gauge('memory_usage_mb');
const scanSuccess = new Rate('scan_success');
const scanFailure = new Rate('scan_failure');
const timeoutRate = new Rate('timeout_rate');
const queuedScans = new Counter('queued_scans');

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = __ENV.API_URL || 'http://localhost:8080';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Aggressive load profile to reach 100 concurrent
export const options = {
  stages: [
    // Phase 1: Warmup (10 users)
    { duration: '1m', target: 10 },

    // Phase 2: Ramp to comfortable load (25 users)
    { duration: '2m', target: 25 },

    // Phase 3: Approach capacity (50 users)
    { duration: '2m', target: 50 },

    // Phase 4: Stress test (75 users)
    { duration: '2m', target: 75 },

    // Phase 5: Breaking point (100 users)
    { duration: '3m', target: 100 },

    // Phase 6: Sustained stress (maintain 100 users)
    { duration: '5m', target: 100 },

    // Phase 7: Gradual recovery (back to 50)
    { duration: '2m', target: 50 },

    // Phase 8: Cool down (back to 10)
    { duration: '2m', target: 10 },

    // Phase 9: Final ramp down
    { duration: '1m', target: 0 },
  ],

  thresholds: {
    // Response time requirements
    'http_req_duration': [
      'p(95)<30000', // 95% under 30s (MEGA PROMPT requirement)
      'p(99)<45000', // 99% under 45s
    ],

    // Error rate requirements
    'http_req_failed': ['rate<0.05'], // Less than 5% HTTP errors
    'errors': ['rate<0.1'], // Less than 10% application errors
    'timeout_rate': ['rate<0.05'], // Less than 5% timeouts

    // Success rate requirements
    'scan_success': ['rate>0.9'], // 90%+ success rate

    // Performance requirements at capacity
    'scan_duration{scenario:high_load}': ['p(95)<30000'], // Under 30s at 80% capacity
  },

  // Abort test if critical thresholds breached
  abortOnFail: false,

  // Don't discard samples during warmup
  discardResponseBodies: false,

  // Connection settings
  noConnectionReuse: false,
  userAgent: 'WCAGAI-StressTest/1.0',
};

// ============================================================================
// Test Data
// ============================================================================

const TEST_URLS = [
  'https://example.com',
  'https://www.w3.org/WAI/',
  'https://github.com',
  'https://developer.mozilla.org',
  'https://www.google.com',
  'https://stackoverflow.com',
  'https://wikipedia.org',
  'https://reddit.com',
];

const WCAG_LEVELS = ['A', 'AA', 'AAA'];

// ============================================================================
// Helper Functions
// ============================================================================

function getRandomUrl() {
  return TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)];
}

function getRandomWcagLevel() {
  return WCAG_LEVELS[Math.floor(Math.random() * WCAG_LEVELS.length)];
}

function createScanPayload() {
  return JSON.stringify({
    url: getRandomUrl(),
    wcagLevel: getRandomWcagLevel(),
    includeWarnings: Math.random() > 0.5,
    waitForImages: Math.random() > 0.7,
    userAgent: 'WCAGAI-StressTest',
  });
}

// ============================================================================
// Health Monitoring
// ============================================================================

function checkSystemHealth() {
  const healthRes = http.get(`${BASE_URL}/health`);

  const healthy = check(healthRes, {
    'health check responds': (r) => r.status === 200,
    'database is healthy': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.database === 'healthy' || body.status === 'ok';
      } catch {
        return false;
      }
    },
    'redis is healthy': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.redis === 'healthy' || body.status === 'ok';
      } catch {
        return false;
      }
    },
  });

  if (!healthy) {
    console.warn('⚠️  System health check failed!');
  }

  // Extract queue metrics if available
  try {
    const body = JSON.parse(healthRes.body);
    if (body.queue) {
      queueDepth.add(body.queue.waiting || 0);
    }
    if (body.memory) {
      memoryUsage.add(body.memory.heapUsed / 1024 / 1024);
    }
  } catch (e) {
    // Silently ignore parsing errors
  }

  return healthy;
}

function checkMetrics() {
  const metricsRes = http.get(`${BASE_URL}/metrics`);

  check(metricsRes, {
    'metrics endpoint responds': (r) => r.status === 200,
    'metrics has prometheus format': (r) => r.body.includes('wcagai_'),
  });

  return metricsRes;
}

// ============================================================================
// Main Test Flow
// ============================================================================

export default function () {
  const currentVUs = __VU;
  const scenario = currentVUs > 80 ? 'breaking_point' :
                   currentVUs > 50 ? 'high_load' :
                   currentVUs > 25 ? 'comfortable_load' : 'warmup';

  // 1. Health check (every 10th user to avoid overwhelming endpoint)
  if (currentVUs % 10 === 0) {
    group('Health Monitoring', () => {
      checkSystemHealth();
    });
  }

  // 2. Scan request (core functionality)
  group('Scan Execution', () => {
    const scanPayload = createScanPayload();
    const scanStart = Date.now();

    const scanRes = http.post(`${BASE_URL}/api/scan`, scanPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Test-Scenario': scenario,
      },
      timeout: '60s', // 60s timeout
      tags: { scenario: scenario },
    });

    const duration = Date.now() - scanStart;
    scanDuration.add(duration, { scenario: scenario });

    const scanOk = check(scanRes, {
      'scan accepted (200/202)': (r) => r.status === 200 || r.status === 202,
      'scan response has scanId': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.scanId !== undefined || body.data?.scanId !== undefined;
        } catch {
          return false;
        }
      },
      'scan response time < 30s': (r) => duration < 30000,
      'no timeout': (r) => r.status !== 0,
    });

    // Track metrics
    if (scanRes.status === 0) {
      timeoutRate.add(1);
      errorRate.add(1);
      scanFailure.add(1);
      console.error(`❌ Scan timeout after ${duration}ms`);
    } else if (!scanOk) {
      errorRate.add(1);
      scanFailure.add(1);
      console.error(`❌ Scan failed: ${scanRes.status} - ${scanRes.body?.substring(0, 100)}`);
    } else {
      errorRate.add(0);
      timeoutRate.add(0);
      scanSuccess.add(1);
      queuedScans.add(1);
    }

    // Extract scan ID for potential polling (in real scenario)
    try {
      const body = JSON.parse(scanRes.body);
      // In a real scenario, you might poll for scan status using body.scanId or body.data?.scanId
    } catch (e) {
      // Ignore parse errors
    }
  });

  // 3. Metrics check (every 20th user)
  if (currentVUs % 20 === 0) {
    group('Metrics Collection', () => {
      checkMetrics();
    });
  }

  // 4. Variable think time based on load
  // Higher load = less sleep (more aggressive)
  const thinkTime = scenario === 'breaking_point' ? 0.5 :
                    scenario === 'high_load' ? 1 :
                    scenario === 'comfortable_load' ? 2 : 3;

  sleep(thinkTime);
}

// ============================================================================
// Setup & Teardown
// ============================================================================

export function setup() {
  console.log('🚀 Starting WCAGAI Stress Test - 100 Concurrent Scans');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log('⏱️  Duration: ~20 minutes');
  console.log('');
  console.log('Test Phases:');
  console.log('  Phase 1: Warmup (10 users)');
  console.log('  Phase 2: Comfortable Load (25 users)');
  console.log('  Phase 3: Approach Capacity (50 users)');
  console.log('  Phase 4: Stress Test (75 users)');
  console.log('  Phase 5-6: Breaking Point (100 users, sustained)');
  console.log('  Phase 7-9: Recovery & Cool Down');
  console.log('');

  // Pre-flight health check
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`❌ Pre-flight health check failed: ${healthRes.status}`);
  }

  console.log('✅ Pre-flight health check passed');
  console.log('');

  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('');
  console.log('🏁 Stress Test Complete');
  console.log(`   Started: ${data.startTime}`);
  console.log(`   Ended: ${new Date().toISOString()}`);
  console.log('');

  // Final health check
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status === 200) {
    console.log('✅ Post-test health check passed - system recovered');
  } else {
    console.log('⚠️  Post-test health check failed - system may need attention');
  }
}

// ============================================================================
// Summary Report
// ============================================================================

export function handleSummary(data) {
  // Calculate custom statistics
  const totalRequests = data.metrics.http_reqs?.values.count || 0;
  const failedRequests = data.metrics.http_req_failed?.values.passes || 0;
  const avgDuration = data.metrics.http_req_duration?.values.avg || 0;
  const p95Duration = data.metrics.http_req_duration?.values['p(95)'] || 0;
  const p99Duration = data.metrics.http_req_duration?.values['p(99)'] || 0;
  const errorRateValue = data.metrics.errors?.values.rate || 0;
  const successRateValue = data.metrics.scan_success?.values.rate || 0;
  const timeoutRateValue = data.metrics.timeout_rate?.values.rate || 0;

  // Pass/Fail determination
  const passed =
    p95Duration < 30000 && // Response time requirement
    errorRateValue < 0.1 && // Error rate requirement
    successRateValue > 0.9 && // Success rate requirement
    timeoutRateValue < 0.05; // Timeout rate requirement

  const verdict = passed ? '✅ PASSED' : '❌ FAILED';

  // Generate reports
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'stress-test-results.json': JSON.stringify(data, null, 2),
    'stress-test-report.html': htmlReport(data),
    'stress-test-summary.txt': `
╔════════════════════════════════════════════════════════════════════╗
║  WCAGAI Production Stress Test - 100 Concurrent Scans              ║
║  ${verdict}                                                        ║
╚════════════════════════════════════════════════════════════════════╝

📊 TEST STATISTICS
${'─'.repeat(70)}
Total Requests:           ${totalRequests}
Failed Requests:          ${failedRequests}
Success Rate:             ${(successRateValue * 100).toFixed(2)}%
Error Rate:               ${(errorRateValue * 100).toFixed(2)}%
Timeout Rate:             ${(timeoutRateValue * 100).toFixed(2)}%

⏱️  RESPONSE TIMES
${'─'.repeat(70)}
Average:                  ${avgDuration.toFixed(2)}ms
95th Percentile (p95):    ${p95Duration.toFixed(2)}ms ${p95Duration < 30000 ? '✅' : '❌ (>30s)'}
99th Percentile (p99):    ${p99Duration.toFixed(2)}ms

📋 SUCCESS CRITERIA (MEGA PROMPT 1)
${'─'.repeat(70)}
${p95Duration < 30000 ? '✅' : '❌'} Response times under 30s at 80% capacity
${successRateValue > 0.9 ? '✅' : '❌'} 90%+ scan success rate
${errorRateValue < 0.1 ? '✅' : '❌'} Error rate below 10%
${timeoutRateValue < 0.05 ? '✅' : '❌'} Timeout rate below 5%

🎯 VERDICT: ${verdict}

${passed ?
  '🎉 System is production-ready for high load!' :
  '⚠️  System needs optimization before production deployment.'
}

Generated: ${new Date().toISOString()}
`,
  };
}
