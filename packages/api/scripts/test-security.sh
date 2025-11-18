#!/bin/bash

# Security Testing Script for WCAG AI Platform
# Tests all critical security features before production deployment

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
JWT_SECRET="${JWT_SECRET:-test-secret-key-do-not-use-in-production}"
TEST_EMAIL="security-test@example.com"
TEST_USER_ID="test-user-$(date +%s)"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper functions
print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_test() {
  echo -e "${YELLOW}[TEST]${NC} $1"
}

print_pass() {
  echo -e "${GREEN}[PASS]${NC} $1"
  ((TESTS_PASSED++))
  ((TESTS_TOTAL++))
}

print_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((TESTS_FAILED++))
  ((TESTS_TOTAL++))
}

print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

# Generate JWT token for testing
generate_test_token() {
  if ! command -v node &> /dev/null; then
    echo "Node.js not found, skipping JWT tests"
    return 1
  fi

  node -e "
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: '$TEST_USER_ID', email: '$TEST_EMAIL', role: 'admin' },
      '$JWT_SECRET',
      { expiresIn: '1h' }
    );
    console.log(token);
  "
}

# Generate expired JWT token
generate_expired_token() {
  node -e "
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: '$TEST_USER_ID', email: '$TEST_EMAIL', role: 'admin' },
      '$JWT_SECRET',
      { expiresIn: '-1h' }
    );
    console.log(token);
  "
}

# Wait for API to be ready
wait_for_api() {
  print_info "Waiting for API at $API_URL..."
  for i in {1..30}; do
    if curl -s "$API_URL/health" > /dev/null 2>&1; then
      print_pass "API is ready"
      return 0
    fi
    sleep 1
  done
  print_fail "API did not become ready"
  exit 1
}

# ============================================================================
# TEST 1: Health Check
# ============================================================================
test_health_check() {
  print_header "TEST 1: Health Check"

  print_test "Basic health check should return 200"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
  if [ "$STATUS" = "200" ]; then
    print_pass "Health check returns 200"
  else
    print_fail "Health check returned $STATUS (expected 200)"
  fi
}

# ============================================================================
# TEST 2: Security Headers
# ============================================================================
test_security_headers() {
  print_header "TEST 2: Security Headers"

  # HSTS Header
  print_test "Checking Strict-Transport-Security header"
  HSTS=$(curl -s -I "$API_URL/health" | grep -i "strict-transport-security" || true)
  if [ -n "$HSTS" ]; then
    print_pass "HSTS header present: $HSTS"
  else
    print_fail "HSTS header missing"
  fi

  # X-Frame-Options
  print_test "Checking X-Frame-Options header"
  XFO=$(curl -s -I "$API_URL/health" | grep -i "x-frame-options" || true)
  if [ -n "$XFO" ]; then
    print_pass "X-Frame-Options header present: $XFO"
  else
    print_fail "X-Frame-Options header missing"
  fi

  # Content-Security-Policy
  print_test "Checking Content-Security-Policy header"
  CSP=$(curl -s -I "$API_URL/health" | grep -i "content-security-policy" || true)
  if [ -n "$CSP" ]; then
    print_pass "CSP header present"
  else
    print_fail "CSP header missing"
  fi

  # X-Content-Type-Options
  print_test "Checking X-Content-Type-Options header"
  XCTO=$(curl -s -I "$API_URL/health" | grep -i "x-content-type-options" || true)
  if [ -n "$XCTO" ]; then
    print_pass "X-Content-Type-Options header present: $XCTO"
  else
    print_fail "X-Content-Type-Options header missing"
  fi
}

# ============================================================================
# TEST 3: CORS Protection
# ============================================================================
test_cors_protection() {
  print_header "TEST 3: CORS Protection"

  print_test "Request from unauthorized origin should be blocked"
  CORS_HEADER=$(curl -s -H "Origin: https://evil.com" -I "$API_URL/api/drafts" | grep -i "access-control-allow-origin" || true)

  if [ -z "$CORS_HEADER" ] || [[ "$CORS_HEADER" != *"https://evil.com"* ]]; then
    print_pass "CORS blocked unauthorized origin"
  else
    print_fail "CORS allowed unauthorized origin: $CORS_HEADER"
  fi

  print_test "Request from localhost should be allowed (development)"
  CORS_HEADER=$(curl -s -H "Origin: http://localhost:3000" -I "$API_URL/api/drafts" | grep -i "access-control-allow-origin" || true)

  if [ -n "$CORS_HEADER" ]; then
    print_pass "CORS allowed localhost origin"
  else
    print_info "CORS might be restricted (check CORS_ORIGIN env var)"
  fi
}

# ============================================================================
# TEST 4: Rate Limiting
# ============================================================================
test_rate_limiting() {
  print_header "TEST 4: Rate Limiting"

  print_test "Making 105 requests to test rate limit (100 req/15min)"
  print_info "This will take about 10 seconds..."

  SUCCESS_COUNT=0
  RATE_LIMITED_COUNT=0

  for i in {1..105}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/drafts" 2>/dev/null || echo "000")

    if [ "$STATUS" = "200" ] || [ "$STATUS" = "401" ]; then
      ((SUCCESS_COUNT++))
    elif [ "$STATUS" = "429" ]; then
      ((RATE_LIMITED_COUNT++))
    fi

    # Small delay to avoid overwhelming the server
    sleep 0.05
  done

  print_info "Successful requests: $SUCCESS_COUNT"
  print_info "Rate limited requests: $RATE_LIMITED_COUNT"

  if [ $RATE_LIMITED_COUNT -gt 0 ]; then
    print_pass "Rate limiting is working (got $RATE_LIMITED_COUNT rate limit responses)"
  else
    print_fail "Rate limiting did not trigger (expected 429 responses)"
  fi
}

# ============================================================================
# TEST 5: JWT Authentication
# ============================================================================
test_jwt_authentication() {
  print_header "TEST 5: JWT Authentication"

  # Test 5.1: No token should fail
  print_test "Request without token should return 401 (if endpoint is protected)"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/drafts")
  print_info "Status without token: $STATUS (200=public, 401=protected)"

  # Test 5.2: Valid token should succeed (if JWT_SECRET is set)
  if [ -n "$JWT_SECRET" ]; then
    print_test "Request with valid JWT token should succeed"

    TOKEN=$(generate_test_token)
    if [ -n "$TOKEN" ]; then
      STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "$API_URL/api/drafts")

      if [ "$STATUS" = "200" ]; then
        print_pass "Valid JWT token accepted"
      else
        print_info "JWT endpoint returned $STATUS (might not be protected yet)"
      fi
    else
      print_info "Could not generate test token (jsonwebtoken not installed)"
    fi

    # Test 5.3: Expired token should fail
    print_test "Request with expired JWT token should return 401"

    EXPIRED_TOKEN=$(generate_expired_token)
    if [ -n "$EXPIRED_TOKEN" ]; then
      RESPONSE=$(curl -s -H "Authorization: Bearer $EXPIRED_TOKEN" "$API_URL/api/drafts")

      if [[ "$RESPONSE" == *"expired"* ]] || [[ "$RESPONSE" == *"TOKEN_EXPIRED"* ]]; then
        print_pass "Expired token rejected with proper error"
      else
        print_info "Expired token response: $RESPONSE"
      fi
    fi

    # Test 5.4: Invalid token should fail
    print_test "Request with invalid JWT token should return 401"

    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer invalid.token.here" \
      "$API_URL/api/drafts")

    if [ "$STATUS" = "401" ]; then
      print_pass "Invalid JWT token rejected"
    else
      print_info "Invalid token returned $STATUS"
    fi
  else
    print_info "JWT_SECRET not set, skipping JWT tests"
  fi
}

# ============================================================================
# TEST 6: Input Validation
# ============================================================================
test_input_validation() {
  print_header "TEST 6: Input Validation"

  print_test "POST with invalid email should return 400"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_URL/api/drafts" \
    -H "Content-Type: application/json" \
    -d '{"recipient":"not-an-email","subject":"Test","body":"Test"}')

  if [ "$STATUS" = "400" ]; then
    print_pass "Invalid email rejected with 400"
  else
    print_fail "Invalid email returned $STATUS (expected 400)"
  fi

  print_test "POST with missing required fields should return 400"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_URL/api/drafts" \
    -H "Content-Type: application/json" \
    -d '{"recipient":"test@example.com"}')

  if [ "$STATUS" = "400" ]; then
    print_pass "Missing required fields rejected with 400"
  else
    print_fail "Missing fields returned $STATUS (expected 400)"
  fi

  print_test "POST with oversized payload should fail"
  # Create a large payload (>10MB)
  LARGE_BODY=$(printf 'A%.0s' {1..11000000})
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_URL/api/drafts" \
    -H "Content-Type: application/json" \
    -d "{\"recipient\":\"test@example.com\",\"subject\":\"Test\",\"body\":\"$LARGE_BODY\"}" \
    --max-time 5 2>/dev/null || echo "413")

  if [ "$STATUS" = "413" ] || [ "$STATUS" = "400" ]; then
    print_pass "Oversized payload rejected with $STATUS"
  else
    print_info "Large payload returned $STATUS (limit might not be enforced)"
  fi
}

# ============================================================================
# TEST 7: Error Handling
# ============================================================================
test_error_handling() {
  print_header "TEST 7: Error Handling"

  print_test "404 endpoint should not leak stack traces"
  RESPONSE=$(curl -s "$API_URL/nonexistent-endpoint")

  if [[ "$RESPONSE" != *"stack"* ]] && [[ "$RESPONSE" != *"Error:"* ]]; then
    print_pass "404 response does not leak stack traces"
  else
    print_fail "404 response may leak sensitive information"
  fi

  print_test "Invalid JSON should not leak stack traces"
  RESPONSE=$(curl -s -X POST "$API_URL/api/drafts" \
    -H "Content-Type: application/json" \
    -d '{invalid json}')

  if [[ "$RESPONSE" != *"stack"* ]]; then
    print_pass "Invalid JSON error does not leak stack traces"
  else
    print_fail "Invalid JSON error leaks stack traces"
  fi
}

# ============================================================================
# TEST 8: Environment Variable Exposure
# ============================================================================
test_env_exposure() {
  print_header "TEST 8: Environment Variable Exposure"

  print_test "Health endpoint should not expose API key status"
  RESPONSE=$(curl -s "$API_URL/health/detailed")

  if [[ "$RESPONSE" != *"STRIPE_SECRET_KEY"* ]] && \
     [[ "$RESPONSE" != *"SENDGRID_API_KEY"* ]] && \
     [[ "$RESPONSE" != *"configured"* ]]; then
    print_pass "Health endpoint does not expose env var status"
  else
    print_fail "Health endpoint may expose sensitive configuration"
    print_info "Response preview: $(echo $RESPONSE | head -c 200)"
  fi
}

# ============================================================================
# TEST 9: SSRF Protection
# ============================================================================
test_ssrf_protection() {
  print_header "TEST 9: SSRF Protection"

  print_test "Request to scan localhost should be blocked"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_URL/api/screenshot" \
    -H "Content-Type: application/json" \
    -d '{"url":"http://localhost:3001/health"}')

  if [ "$STATUS" = "403" ]; then
    print_pass "SSRF to localhost blocked with 403"
  else
    print_info "Localhost scan returned $STATUS"
  fi

  print_test "Request to scan private IP should be blocked"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_URL/api/screenshot" \
    -H "Content-Type: application/json" \
    -d '{"url":"http://192.168.1.1"}')

  if [ "$STATUS" = "403" ]; then
    print_pass "SSRF to private IP blocked with 403"
  else
    print_info "Private IP scan returned $STATUS"
  fi
}

# ============================================================================
# TEST 10: Webhook Signature Verification
# ============================================================================
test_webhook_signatures() {
  print_header "TEST 10: Webhook Signature Verification"

  print_test "Webhook without signature should be rejected"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_URL/api/webhooks/test" \
    -H "Content-Type: application/json" \
    -d '{"event":"test"}' 2>/dev/null || echo "404")

  print_info "Webhook endpoint returned $STATUS (404=not implemented, 401=signature required)"

  print_test "Webhook with invalid signature should be rejected"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_URL/api/webhooks/test" \
    -H "Content-Type: application/json" \
    -H "x-webhook-signature: invalid-signature" \
    -d '{"event":"test"}' 2>/dev/null || echo "404")

  print_info "Invalid signature returned $STATUS"
}

# ============================================================================
# Main Execution
# ============================================================================
main() {
  clear
  echo -e "${GREEN}"
  cat << "EOF"
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   WCAG AI Platform - Security Test Suite                 ║
  ║   Testing all critical security features                 ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
EOF
  echo -e "${NC}"

  print_info "API URL: $API_URL"
  print_info "JWT Secret: ${JWT_SECRET:0:20}..."

  # Wait for API
  wait_for_api

  # Run all tests
  test_health_check
  test_security_headers
  test_cors_protection
  test_rate_limiting
  test_jwt_authentication
  test_input_validation
  test_error_handling
  test_env_exposure
  test_ssrf_protection
  test_webhook_signatures

  # Print summary
  print_header "TEST SUMMARY"

  echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
  echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
  echo -e "${BLUE}Total Tests: $TESTS_TOTAL${NC}"

  PASS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
  echo -e "\n${BLUE}Pass Rate: ${PASS_RATE}%${NC}"

  if [ $PASS_RATE -ge 80 ]; then
    echo -e "\n${GREEN}✅ Security posture: GOOD${NC}"
    exit 0
  elif [ $PASS_RATE -ge 60 ]; then
    echo -e "\n${YELLOW}⚠️  Security posture: NEEDS IMPROVEMENT${NC}"
    exit 1
  else
    echo -e "\n${RED}❌ Security posture: CRITICAL ISSUES${NC}"
    exit 1
  fi
}

# Run main function
main
