#!/bin/bash
# Integration Test for Warranty Onboarding System
# Tests all API endpoints and the complete onboarding flow

set -e

API_BASE="${API_BASE:-http://localhost:3002}"
API_ENDPOINT="$API_BASE/api/onboarding"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 WCAG AI Platform - Integration Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Testing API: $API_BASE"
echo ""

PASSED=0
FAILED=0

# Test function
test_endpoint() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_key="$5"
  
  echo -n "Testing: $test_name... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s "$endpoint")
  else
    response=$(curl -s -X POST "$endpoint" -H "Content-Type: application/json" -d "$data")
  fi
  
  # Check if response contains expected key
  if echo "$response" | grep -q "$expected_key"; then
    echo "✅ PASSED"
    PASSED=$((PASSED + 1))
  else
    echo "❌ FAILED"
    echo "   Response: $response"
    FAILED=$((FAILED + 1))
  fi
}

# Health Check
test_endpoint "Health Check" "GET" "$API_BASE/health" "" '"success":true'

# Test 1: Get All Tiers
test_endpoint "Get All Tiers" "GET" "$API_ENDPOINT/tiers" "" '"tier"'

# Test 2: Get Basic Tier
test_endpoint "Get Basic Tier" "GET" "$API_ENDPOINT/tier/basic" "" '"tier":"basic"'

# Test 3: Get Pro Tier
test_endpoint "Get Pro Tier" "GET" "$API_ENDPOINT/tier/pro" "" '"tier":"pro"'

# Test 4: Get Enterprise Tier
test_endpoint "Get Enterprise Tier" "GET" "$API_ENDPOINT/tier/enterprise" "" '"tier":"enterprise"'

# Test 5: Get Legal Terms
test_endpoint "Get Legal Terms" "GET" "$API_ENDPOINT/legal" "" '"slaTerms"'

# Test 6: Validation - Missing Email
test_endpoint "Validation - Missing Email" "POST" "$API_ENDPOINT/validate" \
  '{"company":"Test","contactName":"Test"}' \
  '"success":false'

# Test 7: Validation - Invalid Email
test_endpoint "Validation - Invalid Email" "POST" "$API_ENDPOINT/validate" \
  '{"email":"invalid","company":"Test","contactName":"Test","websiteUrl":"https://test.com","tier":"basic","acceptedTerms":true,"acceptedPrivacy":true,"acceptedWarrantyTerms":true,"estimatedPages":10}' \
  '"success":false'

# Test 8: Validation - Valid Request
test_endpoint "Validation - Valid Request" "POST" "$API_ENDPOINT/validate" \
  '{"email":"test@example.com","company":"Test","contactName":"Test","websiteUrl":"https://test.com","tier":"basic","acceptedTerms":true,"acceptedPrivacy":true,"acceptedWarrantyTerms":true,"estimatedPages":10}' \
  '"success":true'

# Test 9: CLI Template Generation - Basic
test_endpoint "CLI Template - Basic" "POST" "$API_ENDPOINT/cli-template/basic" \
  '{"email":"test@example.com","company":"Test","websiteUrl":"https://test.com"}' \
  '"template"'

# Test 10: CLI Template Generation - Pro
test_endpoint "CLI Template - Pro" "POST" "$API_ENDPOINT/cli-template/pro" \
  '{"email":"test@example.com","company":"Test","websiteUrl":"https://test.com"}' \
  '"template"'

# Test 11: Complete Onboarding - Basic Tier
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
test_endpoint "Complete Onboarding - Basic" "POST" "$API_ENDPOINT/warranty" \
  "{\"email\":\"test-basic@example.com\",\"company\":\"Test Basic\",\"contactName\":\"Test User\",\"websiteUrl\":\"https://testbasic.com\",\"estimatedPages\":30,\"tier\":\"basic\",\"billingCycle\":\"monthly\",\"acceptedTerms\":true,\"acceptedPrivacy\":true,\"acceptedWarrantyTerms\":true,\"acceptanceTimestamp\":\"$TIMESTAMP\",\"enableDailyScans\":true}" \
  '"clientId"'

# Test 12: Complete Onboarding - Pro Tier
test_endpoint "Complete Onboarding - Pro" "POST" "$API_ENDPOINT/warranty" \
  "{\"email\":\"test-pro@example.com\",\"company\":\"Test Pro\",\"contactName\":\"Test User\",\"websiteUrl\":\"https://testpro.com\",\"estimatedPages\":100,\"tier\":\"pro\",\"billingCycle\":\"annual\",\"acceptedTerms\":true,\"acceptedPrivacy\":true,\"acceptedWarrantyTerms\":true,\"acceptanceTimestamp\":\"$TIMESTAMP\",\"enableDailyScans\":true,\"preferredScanTime\":\"03:00:00\",\"timezone\":\"America/New_York\"}" \
  '"clientId"'

# Test 13: Complete Onboarding - Enterprise Tier
test_endpoint "Complete Onboarding - Enterprise" "POST" "$API_ENDPOINT/warranty" \
  "{\"email\":\"test-ent@example.com\",\"company\":\"Test Enterprise\",\"contactName\":\"Test User\",\"websiteUrl\":\"https://testent.com\",\"estimatedPages\":500,\"tier\":\"enterprise\",\"billingCycle\":\"annual\",\"acceptedTerms\":true,\"acceptedPrivacy\":true,\"acceptedWarrantyTerms\":true,\"acceptanceTimestamp\":\"$TIMESTAMP\",\"enableDailyScans\":true}" \
  '"clientId"'

# Test 14: Onboarding - Duplicate Email
test_endpoint "Onboarding - Duplicate Email" "POST" "$API_ENDPOINT/warranty" \
  "{\"email\":\"test-basic@example.com\",\"company\":\"Test\",\"contactName\":\"Test\",\"websiteUrl\":\"https://test.com\",\"estimatedPages\":10,\"tier\":\"basic\",\"billingCycle\":\"monthly\",\"acceptedTerms\":true,\"acceptedPrivacy\":true,\"acceptedWarrantyTerms\":true,\"acceptanceTimestamp\":\"$TIMESTAMP\",\"enableDailyScans\":false}" \
  '"error"'

# Test 15: Onboarding - Legal Not Accepted
test_endpoint "Onboarding - Legal Not Accepted" "POST" "$API_ENDPOINT/warranty" \
  "{\"email\":\"test-legal@example.com\",\"company\":\"Test\",\"contactName\":\"Test\",\"websiteUrl\":\"https://test.com\",\"estimatedPages\":10,\"tier\":\"basic\",\"billingCycle\":\"monthly\",\"acceptedTerms\":false,\"acceptedPrivacy\":true,\"acceptedWarrantyTerms\":true,\"acceptanceTimestamp\":\"$TIMESTAMP\",\"enableDailyScans\":false}" \
  '"error"'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "  📈 Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 All tests passed!"
  echo ""
  exit 0
else
  echo "⚠️  Some tests failed"
  echo ""
  exit 1
fi
