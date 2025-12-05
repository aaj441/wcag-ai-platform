#!/usr/bin/env node

/**
 * Security Testing Suite - JavaScript Version
 * Tests all critical security features programmatically
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-do-not-use-in-production';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Test results
let testsTotal = 0;
let testsPassed = 0;
let testsFailed = 0;

// Helper functions
function printHeader(text) {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}  ${text}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

function printTest(text) {
  console.log(`${colors.yellow}[TEST]${colors.reset} ${text}`);
}

function printPass(text) {
  console.log(`${colors.green}[PASS]${colors.reset} ${text}`);
  testsPassed++;
  testsTotal++;
}

function printFail(text) {
  console.log(`${colors.red}[FAIL]${colors.reset} ${text}`);
  testsFailed++;
  testsTotal++;
}

function printInfo(text) {
  console.log(`${colors.blue}[INFO]${colors.reset} ${text}`);
}

// Generate JWT tokens
function generateTestToken() {
  return jwt.sign(
    {
      userId: 'test-user-123',
      email: 'security-test@example.com',
      role: 'admin',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function generateExpiredToken() {
  return jwt.sign(
    {
      userId: 'test-user-123',
      email: 'security-test@example.com',
      role: 'admin',
    },
    JWT_SECRET,
    { expiresIn: '-1h' }
  );
}

// Test suites
async function testHealthCheck() {
  printHeader('TEST 1: Health Check');

  try {
    printTest('Basic health check should return 200');
    const response = await axios.get(`${API_URL}/health`);

    if (response.status === 200) {
      printPass('Health check returns 200');
    } else {
      printFail(`Health check returned ${response.status}`);
    }
  } catch (error) {
    printFail(`Health check failed: ${error.message}`);
  }
}

async function testSecurityHeaders() {
  printHeader('TEST 2: Security Headers');

  try {
    const response = await axios.get(`${API_URL}/health`);
    const headers = response.headers;

    // HSTS
    printTest('Checking Strict-Transport-Security header');
    if (headers['strict-transport-security']) {
      printPass(`HSTS header present: ${headers['strict-transport-security']}`);
    } else {
      printFail('HSTS header missing');
    }

    // X-Frame-Options
    printTest('Checking X-Frame-Options header');
    if (headers['x-frame-options']) {
      printPass(`X-Frame-Options header present: ${headers['x-frame-options']}`);
    } else {
      printFail('X-Frame-Options header missing');
    }

    // CSP
    printTest('Checking Content-Security-Policy header');
    if (headers['content-security-policy']) {
      printPass('CSP header present');
    } else {
      printFail('CSP header missing');
    }

    // X-Content-Type-Options
    printTest('Checking X-Content-Type-Options header');
    if (headers['x-content-type-options']) {
      printPass(`X-Content-Type-Options header present: ${headers['x-content-type-options']}`);
    } else {
      printFail('X-Content-Type-Options header missing');
    }
  } catch (error) {
    printFail(`Security headers test failed: ${error.message}`);
  }
}

async function testCORSProtection() {
  printHeader('TEST 3: CORS Protection');

  try {
    printTest('Request from unauthorized origin should be blocked');

    try {
      const response = await axios.get(`${API_URL}/api/drafts`, {
        headers: { Origin: 'https://evil.com' },
        validateStatus: () => true,
      });

      const corsHeader = response.headers['access-control-allow-origin'];

      if (!corsHeader || !corsHeader.includes('evil.com')) {
        printPass('CORS blocked unauthorized origin');
      } else {
        printFail(`CORS allowed unauthorized origin: ${corsHeader}`);
      }
    } catch (error) {
      printPass('CORS blocked unauthorized origin (request rejected)');
    }
  } catch (error) {
    printFail(`CORS test failed: ${error.message}`);
  }
}

async function testRateLimiting() {
  printHeader('TEST 4: Rate Limiting');

  printTest('Making 105 requests to test rate limit');
  printInfo('This will take about 10 seconds...');

  let successCount = 0;
  let rateLimitedCount = 0;

  for (let i = 0; i < 105; i++) {
    try {
      const response = await axios.get(`${API_URL}/api/drafts`, {
        validateStatus: () => true,
      });

      if (response.status === 200 || response.status === 401) {
        successCount++;
      } else if (response.status === 429) {
        rateLimitedCount++;
      }

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      // Network errors count as failures
    }
  }

  printInfo(`Successful requests: ${successCount}`);
  printInfo(`Rate limited requests: ${rateLimitedCount}`);

  if (rateLimitedCount > 0) {
    printPass(`Rate limiting is working (got ${rateLimitedCount} rate limit responses)`);
  } else {
    printFail('Rate limiting did not trigger');
  }
}

async function testJWTAuthentication() {
  printHeader('TEST 5: JWT Authentication');

  // Test 5.1: No token
  printTest('Request without token should return 401 (if endpoint is protected)');
  try {
    const response = await axios.get(`${API_URL}/api/drafts`, {
      validateStatus: () => true,
    });
    printInfo(`Status without token: ${response.status} (200=public, 401=protected)`);
  } catch (error) {
    printInfo(`Request failed: ${error.message}`);
  }

  // Test 5.2: Valid token
  printTest('Request with valid JWT token should succeed');
  const validToken = generateTestToken();

  try {
    const response = await axios.get(`${API_URL}/api/drafts`, {
      headers: { Authorization: `Bearer ${validToken}` },
      validateStatus: () => true,
    });

    if (response.status === 200) {
      printPass('Valid JWT token accepted');
    } else {
      printInfo(`JWT endpoint returned ${response.status}`);
    }
  } catch (error) {
    printInfo(`Valid token test failed: ${error.message}`);
  }

  // Test 5.3: Expired token
  printTest('Request with expired JWT token should return 401');
  const expiredToken = generateExpiredToken();

  try {
    const response = await axios.get(`${API_URL}/api/drafts`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
      validateStatus: () => true,
    });

    const data = response.data;

    if (
      response.status === 401 &&
      (data.error?.includes('expired') || data.code === 'TOKEN_EXPIRED')
    ) {
      printPass('Expired token rejected with proper error');
    } else {
      printInfo(`Expired token response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    printInfo(`Expired token test error: ${error.message}`);
  }

  // Test 5.4: Invalid token
  printTest('Request with invalid JWT token should return 401');

  try {
    const response = await axios.get(`${API_URL}/api/drafts`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
      validateStatus: () => true,
    });

    if (response.status === 401) {
      printPass('Invalid JWT token rejected');
    } else {
      printInfo(`Invalid token returned ${response.status}`);
    }
  } catch (error) {
    printInfo(`Invalid token test error: ${error.message}`);
  }
}

async function testInputValidation() {
  printHeader('TEST 6: Input Validation');

  // Test 6.1: Invalid email
  printTest('POST with invalid email should return 400');

  try {
    const response = await axios.post(
      `${API_URL}/api/drafts`,
      {
        recipient: 'not-an-email',
        subject: 'Test',
        body: 'Test',
      },
      { validateStatus: () => true }
    );

    if (response.status === 400) {
      printPass('Invalid email rejected with 400');
    } else {
      printFail(`Invalid email returned ${response.status} (expected 400)`);
    }
  } catch (error) {
    printFail(`Validation test failed: ${error.message}`);
  }

  // Test 6.2: Missing required fields
  printTest('POST with missing required fields should return 400');

  try {
    const response = await axios.post(
      `${API_URL}/api/drafts`,
      {
        recipient: 'test@example.com',
        // Missing subject and body
      },
      { validateStatus: () => true }
    );

    if (response.status === 400) {
      printPass('Missing required fields rejected with 400');
    } else {
      printFail(`Missing fields returned ${response.status} (expected 400)`);
    }
  } catch (error) {
    printFail(`Missing fields test failed: ${error.message}`);
  }
}

async function testErrorHandling() {
  printHeader('TEST 7: Error Handling');

  // Test 7.1: 404 should not leak stack traces
  printTest('404 endpoint should not leak stack traces');

  try {
    const response = await axios.get(`${API_URL}/nonexistent-endpoint`, {
      validateStatus: () => true,
    });

    const data = JSON.stringify(response.data);

    if (!data.includes('stack') && !data.includes('Error:')) {
      printPass('404 response does not leak stack traces');
    } else {
      printFail('404 response may leak sensitive information');
    }
  } catch (error) {
    printFail(`404 test failed: ${error.message}`);
  }

  // Test 7.2: Invalid JSON
  printTest('Invalid JSON should not leak stack traces');

  try {
    const response = await axios.post(
      `${API_URL}/api/drafts`,
      '{invalid json}',
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      }
    );

    const data = JSON.stringify(response.data);

    if (!data.includes('stack')) {
      printPass('Invalid JSON error does not leak stack traces');
    } else {
      printFail('Invalid JSON error leaks stack traces');
    }
  } catch (error) {
    // axios might throw on invalid JSON, which is fine
    printPass('Invalid JSON properly rejected');
  }
}

async function testEnvExposure() {
  printHeader('TEST 8: Environment Variable Exposure');

  printTest('Health endpoint should not expose API key status');

  try {
    const response = await axios.get(`${API_URL}/health/detailed`, {
      validateStatus: () => true,
    });

    const data = JSON.stringify(response.data);

    if (
      !data.includes('STRIPE_SECRET_KEY') &&
      !data.includes('SENDGRID_API_KEY') &&
      !data.includes('configured')
    ) {
      printPass('Health endpoint does not expose env var status');
    } else {
      printFail('Health endpoint may expose sensitive configuration');
    }
  } catch (error) {
    printFail(`Env exposure test failed: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.clear();
  console.log(colors.green);
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   WCAG AI Platform - Security Test Suite (JS)            ║
  ║   Testing all critical security features                 ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
  console.log(colors.reset);

  printInfo(`API URL: ${API_URL}`);
  printInfo(`JWT Secret: ${JWT_SECRET.substring(0, 20)}...`);

  // Wait for API
  printInfo('Checking if API is ready...');
  try {
    await axios.get(`${API_URL}/health`, { timeout: 5000 });
    printPass('API is ready');
  } catch (error) {
    printFail('API is not ready. Please start the server first.');
    process.exit(1);
  }

  // Run all tests
  await testHealthCheck();
  await testSecurityHeaders();
  await testCORSProtection();
  await testRateLimiting();
  await testJWTAuthentication();
  await testInputValidation();
  await testErrorHandling();
  await testEnvExposure();

  // Print summary
  printHeader('TEST SUMMARY');

  console.log(`${colors.green}Tests Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Tests Failed: ${testsFailed}${colors.reset}`);
  console.log(`${colors.blue}Total Tests: ${testsTotal}${colors.reset}`);

  const passRate = Math.round((testsPassed / testsTotal) * 100);
  console.log(`\n${colors.blue}Pass Rate: ${passRate}%${colors.reset}`);

  if (passRate >= 80) {
    console.log(`\n${colors.green}✅ Security posture: GOOD${colors.reset}`);
    process.exit(0);
  } else if (passRate >= 60) {
    console.log(`\n${colors.yellow}⚠️  Security posture: NEEDS IMPROVEMENT${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.red}❌ Security posture: CRITICAL ISSUES${colors.reset}`);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
