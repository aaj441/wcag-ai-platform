#!/usr/bin/env node

/**
 * Production Load Test Script
 *
 * Simulates realistic production load to verify system capacity
 * Tests critical endpoints with concurrent requests
 *
 * Usage: node deployment/scripts/load-test.js <base-url>
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:3001';
const CONCURRENT_REQUESTS = 50;
const REQUESTS_PER_USER = 5;
const TIMEOUT_MS = 30000;

// Test endpoints with expected response
const TEST_CASES = [
  { method: 'GET', path: '/health', expectedStatus: 200, weight: 10 },
  { method: 'GET', path: '/health/detailed', expectedStatus: 200, weight: 5 },
  { method: 'GET', path: '/api/scans', expectedStatus: [200, 401], weight: 3 }, // May require auth
];

let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
const responseTimes = [];

/**
 * Make HTTP request
 */
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;

    const startTime = Date.now();

    const req = client.request(
      url,
      {
        method: endpoint.method,
        timeout: TIMEOUT_MS,
        headers: {
          'User-Agent': 'WCAGAI-LoadTest/1.0',
        },
      },
      (res) => {
        const duration = Date.now() - startTime;
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const expectedStatuses = Array.isArray(endpoint.expectedStatus)
            ? endpoint.expectedStatus
            : [endpoint.expectedStatus];

          const success = expectedStatuses.includes(res.statusCode);

          resolve({
            success,
            status: res.statusCode,
            duration,
            endpoint: endpoint.path,
          });
        });
      }
    );

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      reject({
        success: false,
        error: error.message,
        duration,
        endpoint: endpoint.path,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      reject({
        success: false,
        error: 'Request timeout',
        duration,
        endpoint: endpoint.path,
      });
    });

    req.end();
  });
}

/**
 * Run load test for single user
 */
async function simulateUser(userId) {
  const results = [];

  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    // Select random endpoint based on weight
    const totalWeight = TEST_CASES.reduce((sum, tc) => sum + tc.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedEndpoint = TEST_CASES[0];

    for (const endpoint of TEST_CASES) {
      random -= endpoint.weight;
      if (random <= 0) {
        selectedEndpoint = endpoint;
        break;
      }
    }

    try {
      const result = await makeRequest(selectedEndpoint);
      results.push(result);
      totalRequests++;

      if (result.success) {
        successfulRequests++;
        responseTimes.push(result.duration);
      } else {
        failedRequests++;
      }

      // Random think time (100-500ms)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 400 + 100)
      );
    } catch (error) {
      results.push(error);
      totalRequests++;
      failedRequests++;
      responseTimes.push(error.duration || TIMEOUT_MS);
    }
  }

  return results;
}

/**
 * Calculate statistics
 */
function calculateStats(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const len = sorted.length;

  return {
    min: sorted[0],
    max: sorted[len - 1],
    avg: values.reduce((sum, v) => sum + v, 0) / len,
    p50: sorted[Math.floor(len * 0.5)],
    p90: sorted[Math.floor(len * 0.9)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
  };
}

/**
 * Main load test
 */
async function runLoadTest() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 PRODUCTION LOAD TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Concurrent Users: ${CONCURRENT_REQUESTS}`);
  console.log(`Requests per User: ${REQUESTS_PER_USER}`);
  console.log(`Total Requests: ${CONCURRENT_REQUESTS * REQUESTS_PER_USER}`);
  console.log('');

  // Health check before starting
  console.log('🏥 Running pre-test health check...');
  try {
    const health = await makeRequest({ method: 'GET', path: '/health', expectedStatus: 200 });
    if (!health.success) {
      console.error('❌ Health check failed - aborting load test');
      process.exit(1);
    }
    console.log('✅ Health check passed');
  } catch (error) {
    console.error('❌ Cannot reach target URL - aborting load test');
    console.error(`   Error: ${error.error || error.message}`);
    process.exit(1);
  }
  console.log('');

  // Run load test
  console.log('🚀 Starting load test...');
  const startTime = Date.now();

  const userSimulations = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    userSimulations.push(simulateUser(i));
  }

  await Promise.all(userSimulations);

  const duration = (Date.now() - startTime) / 1000;

  console.log('✅ Load test complete');
  console.log('');

  // Results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 LOAD TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Successful: ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Failed: ${failedRequests} (${((failedRequests / totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Throughput: ${(totalRequests / duration).toFixed(2)} req/s`);
  console.log('');

  if (responseTimes.length > 0) {
    const stats = calculateStats(responseTimes);

    console.log('Response Times (ms):');
    console.log(`  Min: ${stats.min.toFixed(0)}ms`);
    console.log(`  Avg: ${stats.avg.toFixed(0)}ms`);
    console.log(`  p50: ${stats.p50.toFixed(0)}ms`);
    console.log(`  p90: ${stats.p90.toFixed(0)}ms`);
    console.log(`  p95: ${stats.p95.toFixed(0)}ms`);
    console.log(`  p99: ${stats.p99.toFixed(0)}ms`);
    console.log(`  Max: ${stats.max.toFixed(0)}ms`);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Pass/fail criteria
  const errorRate = (failedRequests / totalRequests) * 100;
  const avgResponseTime = responseTimes.reduce((sum, v) => sum + v, 0) / responseTimes.length;

  if (errorRate > 5) {
    console.log(`❌ FAILED: Error rate (${errorRate.toFixed(2)}%) exceeds 5% threshold`);
    process.exit(1);
  }

  if (avgResponseTime > 2000) {
    console.log(`❌ FAILED: Average response time (${avgResponseTime.toFixed(0)}ms) exceeds 2000ms threshold`);
    process.exit(1);
  }

  console.log('✅ PASSED: System handled load successfully');
  console.log('');
  process.exit(0);
}

// Run test
runLoadTest().catch((error) => {
  console.error('❌ Load test failed with error:');
  console.error(error);
  process.exit(1);
});
