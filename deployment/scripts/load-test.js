/**
 * k6 Load Test for WCAG AI Platform
 *
 * Usage:
 *   k6 run --vus 10 --duration 60s load-test.js
 *   k6 run --vus 50 --duration 5m load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const scanDuration = new Trend('scan_duration');

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.1'],     // Less than 10% errors
    errors: ['rate<0.1'],
  },
};

// Test URLs
const TEST_URLS = [
  'https://example.com',
  'https://www.w3.org',
  'https://google.com',
  'https://github.com',
];

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 2. API status
  const statusRes = http.get(`${BASE_URL}/api/status`);
  check(statusRes, {
    'status endpoint is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 3. Scan request
  const testUrl = TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)];
  const scanPayload = JSON.stringify({
    url: testUrl,
    wcagLevel: 'AA',
    includeWarnings: false,
  });

  const scanStart = Date.now();
  const scanRes = http.post(`${BASE_URL}/api/scan`, scanPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const duration = Date.now() - scanStart;
  scanDuration.add(duration);

  const scanOk = check(scanRes, {
    'scan request accepted': (r) => r.status === 200 || r.status === 202,
    'scan response has scanId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.scanId !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!scanOk) {
    errorRate.add(1);
    console.error(`Scan failed: ${scanRes.status} ${scanRes.body}`);
  } else {
    errorRate.add(0);
  }

  sleep(2);

  // 4. Metrics endpoint
  const metricsRes = http.get(`${BASE_URL}/metrics`);
  check(metricsRes, {
    'metrics endpoint is 200': (r) => r.status === 200,
    'metrics has prometheus format': (r) => r.body.includes('wcagai_'),
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let output = '\n';
  output += `${indent}✅ Load Test Summary\n`;
  output += `${indent}${'='.repeat(50)}\n`;
  output += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  output += `${indent}Failed Requests: ${data.metrics.http_req_failed.values.passes}\n`;
  output += `${indent}Request Duration (avg): ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  output += `${indent}Request Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  output += `${indent}Request Duration (p99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;

  if (data.metrics.errors) {
    output += `${indent}Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  }

  return output;
}
