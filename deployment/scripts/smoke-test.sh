#!/bin/bash
#
# Smoke Tests for WCAG AI Platform
# Usage: ./smoke-test.sh <base_url>
#

set -e

BASE_URL="${1:-http://localhost:8080}"
FAILED=0

echo "🧪 Running smoke tests against: $BASE_URL"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local method="${4:-GET}"
  local data="${5:-}"

  echo -n "Testing $name... "

  if [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$url")
  else
    response=$(curl -s -w "\n%{http_code}" "$url")
  fi

  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $status_code)"
  else
    echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, got $status_code)"
    echo "Response: $body"
    FAILED=$((FAILED + 1))
  fi
}

# ========================================
# Health & Status Checks
# ========================================
echo ""
echo "1️⃣  Health & Status Checks"
echo "-------------------------------------------"

test_endpoint "Health check" "$BASE_URL/health" 200
test_endpoint "API status" "$BASE_URL/api/status" 200
test_endpoint "Metrics endpoint" "$BASE_URL/metrics" 200

# ========================================
# API Functionality
# ========================================
echo ""
echo "2️⃣  API Functionality"
echo "-------------------------------------------"

# Test scan endpoint (should require authentication or validation)
test_endpoint "Scan endpoint (no data)" "$BASE_URL/api/scan" 400 POST '{"url":""}'

# Test with valid URL
test_endpoint "Scan endpoint (valid)" "$BASE_URL/api/scan" 200 POST '{"url":"https://example.com","wcagLevel":"AA"}'

# Test rate limiting (should eventually hit limit)
# Commented out to avoid hitting production limits
# for i in {1..110}; do
#   curl -s "$BASE_URL/api/status" > /dev/null
# done
# test_endpoint "Rate limit enforcement" "$BASE_URL/api/status" 429

# ========================================
# Security Tests
# ========================================
echo ""
echo "3️⃣  Security Tests"
echo "-------------------------------------------"

# Test SSRF protection (should block private IPs)
test_endpoint "SSRF protection (localhost)" "$BASE_URL/api/scan" 403 POST '{"url":"http://localhost"}'
test_endpoint "SSRF protection (private IP)" "$BASE_URL/api/scan" 403 POST '{"url":"http://192.168.1.1"}'
test_endpoint "SSRF protection (metadata)" "$BASE_URL/api/scan" 403 POST '{"url":"http://169.254.169.254"}'

# Test input validation
test_endpoint "Input validation (too long)" "$BASE_URL/api/scan" 400 POST "{\"url\":\"$(python3 -c 'print("a"*3000)')\"}"

# ========================================
# CORS & Headers
# ========================================
echo ""
echo "4️⃣  CORS & Security Headers"
echo "-------------------------------------------"

headers=$(curl -s -I "$BASE_URL/health")

if echo "$headers" | grep -qi "X-Content-Type-Options"; then
  echo -e "${GREEN}✅${NC} X-Content-Type-Options header present"
else
  echo -e "${YELLOW}⚠️${NC}  X-Content-Type-Options header missing"
fi

if echo "$headers" | grep -qi "Strict-Transport-Security"; then
  echo -e "${GREEN}✅${NC} HSTS header present"
else
  echo -e "${YELLOW}⚠️${NC}  HSTS header missing (OK for non-HTTPS)"
fi

# ========================================
# Summary
# ========================================
echo ""
echo "============================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAILED test(s) failed${NC}"
  exit 1
fi
