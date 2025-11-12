#!/bin/bash
#
# Evidence Vault Test Suite
# Quick validation of Evidence Vault endpoints and functionality
#

echo "🧪 Evidence Vault Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

API_URL="${API_URL:-http://localhost:3001}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
passed_count=0
failed_count=0

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    test_count=$((test_count + 1))
    echo -n "Test $test_count: $name... "
    
    if [ -n "$data" ]; then
        response=$(curl -s -X "$method" "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "\n%{http_code}")
    else
        response=$(curl -s -X "$method" "$API_URL$endpoint" -w "\n%{http_code}")
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        passed_count=$((passed_count + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Response: $body"
        failed_count=$((failed_count + 1))
        return 1
    fi
}

echo "📍 Testing API at: $API_URL"
echo ""

# Test 1: Health Check
test_endpoint "Health Check" "GET" "/health"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Evidence Vault API Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 2: Store Evidence
test_endpoint "Store Evidence" "POST" "/api/evidence/store" '{
  "scanId": "test-scan-123",
  "url": "https://example.com",
  "complianceScore": 85,
  "violations": [
    {
      "id": "v1",
      "url": "https://example.com",
      "pageTitle": "Home",
      "element": "<button>",
      "wcagCriteria": "WCAG 1.4.3",
      "wcagLevel": "AA",
      "severity": "high",
      "description": "Insufficient color contrast",
      "recommendation": "Increase contrast ratio",
      "priority": 2
    }
  ],
  "scanType": "automated",
  "scanTool": "test-runner",
  "retentionDays": 90,
  "tags": ["test", "automated"]
}'

# Test 3: Get All Evidence
test_endpoint "Get All Evidence" "GET" "/api/evidence"

# Test 4: Get Compliance Metrics (Monthly)
test_endpoint "Get Monthly Metrics" "GET" "/api/evidence/metrics/dashboard?period=monthly"

# Test 5: Get Compliance Metrics (Quarterly)
test_endpoint "Get Quarterly Metrics" "GET" "/api/evidence/metrics/dashboard?period=quarterly"

# Test 6: Store CI Scan Result
test_endpoint "Store CI Scan" "POST" "/api/evidence/ci-scan" '{
  "commitSha": "abc123def456",
  "branch": "main",
  "passed": true,
  "complianceScore": 92,
  "violations": [],
  "criticalBlockers": 0,
  "scanDurationMs": 1234,
  "tool": "axe-core"
}'

# Test 7: Get CI Scan Results
test_endpoint "Get CI Scans" "GET" "/api/evidence/ci-scans/list"

# Test 8: Generate Quarterly Report
test_endpoint "Generate Quarterly Report" "POST" "/api/evidence/quarterly-report" '{
  "quarter": "Q4-2024"
}'

# Test 9: Get Quarterly Reports
test_endpoint "Get Quarterly Reports" "GET" "/api/evidence/quarterly-reports/list"

# Test 10: Filter Evidence by Scan Type
test_endpoint "Filter by Scan Type" "GET" "/api/evidence?scanType=automated"

# Test 11: Filter by Compliance Score
test_endpoint "Filter by Score" "GET" "/api/evidence?minComplianceScore=80&maxComplianceScore=95"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Tests:  $test_count"
echo -e "Passed:       ${GREEN}$passed_count${NC}"
echo -e "Failed:       ${RED}$failed_count${NC}"
echo ""

if [ $failed_count -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
