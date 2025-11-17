#!/bin/bash
#
# Smoke Test Script
#
# Runs quick validation tests on critical endpoints post-deployment
# Ensures the application is functioning correctly
#
# Usage: ./deployment/scripts/smoke-test.sh <base-url>
#

set -e

BASE_URL=${1:-http://localhost:3001}

echo "🧪 Running Smoke Tests..."
echo "   Target: $BASE_URL"
echo ""

PASSED=0
FAILED=0

# Test helper function
test_endpoint() {
    local method=$1
    local path=$2
    local expected_status=$3
    local description=$4
    
    echo -n "   Testing: $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$path" 2>/dev/null || echo "000")
    
    if [ "$response" == "$expected_status" ]; then
        echo "✅ PASS (HTTP $response)"
        ((PASSED++))
    else
        echo "❌ FAIL (Expected HTTP $expected_status, got $response)"
        ((FAILED++))
    fi
}

# Critical endpoint tests
echo "🏥 Health Check Tests"
test_endpoint "GET" "/health" "200" "Basic health check"
test_endpoint "GET" "/health/detailed" "200" "Detailed health check"
echo ""

echo "📡 API Endpoint Tests"
test_endpoint "GET" "/api/scans" "200" "List scans endpoint (or 401 if auth required)"
test_endpoint "POST" "/api/scans/trigger" "400" "Trigger scan (should fail without body)"
echo ""

# Validate health check response
echo "🔍 Validating Health Response..."
health_response=$(curl -s "$BASE_URL/health/detailed")

# Check if response is valid JSON
if echo "$health_response" | jq empty 2>/dev/null; then
    echo "   ✅ Valid JSON response"
    ((PASSED++))
    
    # Check status field
    status=$(echo "$health_response" | jq -r '.status' 2>/dev/null || echo "unknown")
    
    if [ "$status" == "healthy" ]; then
        echo "   ✅ System status: healthy"
        ((PASSED++))
    elif [ "$status" == "degraded" ]; then
        echo "   ⚠️  System status: degraded (acceptable)"
        ((PASSED++))
    else
        echo "   ❌ System status: $status (unhealthy)"
        ((FAILED++))
    fi
    
    # Check database connectivity
    db_healthy=$(echo "$health_response" | jq -r '.checks.database.healthy' 2>/dev/null || echo "false")
    if [ "$db_healthy" == "true" ]; then
        echo "   ✅ Database: connected"
        ((PASSED++))
    else
        echo "   ❌ Database: disconnected"
        ((FAILED++))
    fi
    
else
    echo "   ❌ Invalid JSON response"
    ((FAILED++))
fi
echo ""

# Performance test
echo "⚡ Performance Test..."
echo -n "   Response time check... "

start_time=$(date +%s%N)
curl -s -o /dev/null "$BASE_URL/health" 2>/dev/null
end_time=$(date +%s%N)

response_time=$(( (end_time - start_time) / 1000000 )) # Convert to ms

if [ "$response_time" -lt 1000 ]; then
    echo "✅ PASS (${response_time}ms < 1000ms)"
    ((PASSED++))
else
    echo "⚠️  SLOW (${response_time}ms)"
    ((FAILED++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SMOKE TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo "✅ All smoke tests PASSED"
    echo "   Deployment is healthy"
    exit 0
else
    echo "❌ Smoke tests FAILED"
    echo "   $FAILED test(s) did not pass"
    echo "   Review the failures above"
    exit 1
fi
