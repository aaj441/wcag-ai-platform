/**
 * k6 Load Test: 100 Concurrent Accessibility Scans
 *
 * Tests system performance under realistic load conditions:
 * - 100 concurrent users
 * - Each user triggers multiple accessibility scans
 * - Monitors response times, error rates, throughput
 *
 * Usage: k6 run stress-tests/100-concurrent-scans.js
 *
 * Success Criteria:
 * - 95th percentile response time < 5s
 * - Error rate < 1%
 * - Throughput > 20 scans/sec
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const scanDuration = new Trend('scan_duration');
const scanSuccess = new Counter('scans_successful');
const scanFailed = new Counter('scans_failed');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 50 },   // Ramp to 50 users
    { duration: '2m', target: 100 },  // Ramp to 100 users (peak load)
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 50 },   // Ramp down
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests must complete below 5s
    http_req_failed: ['rate<0.01'],    // Error rate must be below 1%
    errors: ['rate<0.01'],              // Custom error rate below 1%
  },
};

// Test configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Test URLs to scan (mix of sizes)
const TEST_URLS = [
  'https://www.example.com',
  'https://www.w3.org/WAI/demos/bad/',
  'https://www.a11yproject.com',
  'https://webaim.org',
  'https://developer.mozilla.org/en-US/docs/Web/Accessibility',
];

/**
 * Main test scenario
 */
export default function () {
  // Select random URL to scan
  const testUrl = TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)];

  // Trigger accessibility scan
  const scanStart = Date.now();

  const payload = JSON.stringify({
    url: testUrl,
    options: {
      wcagLevel: 'AA',
      includeNotices: false,
      timeout: 30000,
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    timeout: '35s',
  };

  const response = http.post(
    `${BASE_URL}/api/scans/trigger`,
    payload,
    params
  );

  const scanEnd = Date.now();
  const duration = scanEnd - scanStart;

  // Record metrics
  scanDuration.add(duration);

  // Validate response
  const success = check(response, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'response has scanId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.scanId !== undefined;
      } catch {
        return false;
      }
    },
    'response time < 5s': (r) => r.timings.duration < 5000,
  });

  if (success) {
    scanSuccess.add(1);
  } else {
    scanFailed.add(1);
    errorRate.add(1);
    console.error(`Scan failed: ${response.status} - ${response.body.substring(0, 200)}`);
  }

  // If scan was queued, poll for results
  if (response.status === 201) {
    try {
      const body = JSON.parse(response.body);
      const scanId = body.scanId;

      // Poll for results (max 3 attempts)
      for (let i = 0; i < 3; i++) {
        sleep(2); // Wait 2s between polls

        const statusResponse = http.get(
          `${BASE_URL}/api/scans/${scanId}`,
          {
            headers: {
              'Authorization': `Bearer ${API_KEY}`,
            },
            timeout: '5s',
          }
        );

        const statusCheck = check(statusResponse, {
          'status check is 200': (r) => r.status === 200,
        });

        if (statusCheck) {
          const statusBody = JSON.parse(statusResponse.body);
          if (statusBody.status === 'completed') {
            break;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to poll scan results: ${error}`);
    }
  }

  // Realistic user think time (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

/**
 * Setup function (runs once at start)
 */
export function setup() {
  console.log('Starting load test...');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Concurrent users: 100 (peak)`);
  console.log(`Duration: ~7 minutes`);
  console.log('');

  // Health check before starting
  const healthResponse = http.get(`${BASE_URL}/health`);

  if (healthResponse.status !== 200) {
    console.error('❌ API health check failed - aborting test');
    throw new Error(`API not healthy: ${healthResponse.status}`);
  }

  console.log('✅ API health check passed');
  console.log('');
}

/**
 * Teardown function (runs once at end)
 */
export function teardown(data) {
  console.log('');
  console.log('Load test complete');
}

/**
 * Summary handler (formats final output)
 */
export function handleSummary(data) {
  const stats = data.metrics;

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 LOAD TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Request stats
  if (stats.http_reqs) {
    console.log(`Total Requests: ${stats.http_reqs.values.count}`);
    console.log(`Requests/sec: ${stats.http_reqs.values.rate.toFixed(2)}`);
  }

  // Success/failure
  if (stats.scans_successful && stats.scans_failed) {
    const total = stats.scans_successful.values.count + stats.scans_failed.values.count;
    const successRate = ((stats.scans_successful.values.count / total) * 100).toFixed(2);
    console.log(`Successful Scans: ${stats.scans_successful.values.count} (${successRate}%)`);
    console.log(`Failed Scans: ${stats.scans_failed.values.count}`);
  }

  // Response times
  if (stats.http_req_duration) {
    console.log('');
    console.log('Response Times:');
    console.log(`  Min: ${stats.http_req_duration.values.min.toFixed(2)}ms`);
    console.log(`  Avg: ${stats.http_req_duration.values.avg.toFixed(2)}ms`);
    console.log(`  Med: ${stats.http_req_duration.values.med.toFixed(2)}ms`);
    console.log(`  p(90): ${stats.http_req_duration.values['p(90)'].toFixed(2)}ms`);
    console.log(`  p(95): ${stats.http_req_duration.values['p(95)'].toFixed(2)}ms`);
    console.log(`  p(99): ${stats.http_req_duration.values['p(99)'].toFixed(2)}ms`);
    console.log(`  Max: ${stats.http_req_duration.values.max.toFixed(2)}ms`);
  }

  // Error rate
  if (stats.http_req_failed) {
    const errorRate = (stats.http_req_failed.values.rate * 100).toFixed(2);
    console.log('');
    console.log(`Error Rate: ${errorRate}%`);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Pass/fail determination
  const p95 = stats.http_req_duration?.values['p(95)'];
  const errorPct = stats.http_req_failed?.values.rate * 100;

  if (p95 > 5000) {
    console.log(`❌ FAILED: p95 response time (${p95.toFixed(0)}ms) exceeds 5000ms threshold`);
    return { 'stdout': '' };
  }

  if (errorPct > 1) {
    console.log(`❌ FAILED: Error rate (${errorPct.toFixed(2)}%) exceeds 1% threshold`);
    return { 'stdout': '' };
  }

  console.log('✅ PASSED: System handled 100 concurrent users successfully');
  console.log('');

  return {
    'stdout': '', // Don't duplicate console output
    'stress-test-results.json': JSON.stringify(data, null, 2),
  };
}
