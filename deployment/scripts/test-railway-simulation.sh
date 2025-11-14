#!/bin/bash
#
# Railway Deployment Simulation Test
# Simulates what Railway does during deployment
#

set -e

echo "🚂 Railway Deployment Simulation Test"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

pass() {
  echo -e "${GREEN}✅${NC} $1"
  TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
  echo -e "${RED}❌${NC} $1"
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

info() {
  echo -e "${BLUE}ℹ️${NC}  $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# ========================================
# Test 1: Build API (like Railway Nixpacks)
# ========================================
echo -e "${BLUE}1️⃣  Testing API Build${NC}"
echo "-------------------------------------------"

cd packages/api
info "Running: npm install"
if npm install > /dev/null 2>&1; then
  pass "API dependencies installed"
else
  fail "API dependencies failed to install"
  exit 1
fi

info "Running: npm run build"
if npm run build > /dev/null 2>&1; then
  pass "API build successful"
  
  if [ -f "dist/server.js" ]; then
    pass "Server bundle created"
  else
    fail "Server bundle not found"
  fi
else
  fail "API build failed"
  exit 1
fi

echo ""

# ========================================
# Test 2: Build Webapp (like Railway Nixpacks)
# ========================================
echo -e "${BLUE}2️⃣  Testing Webapp Build${NC}"
echo "-------------------------------------------"

cd "$PROJECT_ROOT/packages/webapp"
info "Running: npm install"
if npm install > /dev/null 2>&1; then
  pass "Webapp dependencies installed"
else
  fail "Webapp dependencies failed to install"
  exit 1
fi

info "Running: npm run build"
if npm run build > /dev/null 2>&1; then
  pass "Webapp build successful"
  
  if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    pass "Static files generated"
  else
    fail "Static files not found"
  fi
else
  fail "Webapp build failed"
  exit 1
fi

echo ""

# ========================================
# Test 3: Start API Server
# ========================================
echo -e "${BLUE}3️⃣  Testing API Server Start${NC}"
echo "-------------------------------------------"

cd "$PROJECT_ROOT/packages/api"
info "Starting API server on port 8080"

# Start server in background
PORT=8080 NODE_ENV=production node dist/server.js > /tmp/api-server.log 2>&1 &
API_PID=$!

# Wait for server to start
sleep 3

# Check if server is running
if kill -0 $API_PID 2>/dev/null; then
  pass "API server started successfully (PID: $API_PID)"
else
  fail "API server failed to start"
  cat /tmp/api-server.log
  exit 1
fi

echo ""

# ========================================
# Test 4: Health Check Endpoint
# ========================================
echo -e "${BLUE}4️⃣  Testing Health Check${NC}"
echo "-------------------------------------------"

info "Calling /health endpoint"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/health || echo "000")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HEALTH_CODE" = "200" ]; then
  pass "Health check returned 200 OK"
  
  # Verify JSON response
  if echo "$HEALTH_BODY" | jq . > /dev/null 2>&1; then
    pass "Health check returns valid JSON"
  else
    fail "Health check JSON is invalid"
  fi
  
  # Check for required fields
  if echo "$HEALTH_BODY" | jq -e '.success' > /dev/null 2>&1; then
    pass "Health check includes 'success' field"
  else
    fail "Health check missing 'success' field"
  fi
else
  fail "Health check failed (HTTP $HEALTH_CODE)"
fi

echo ""

# ========================================
# Test 5: API Endpoints
# ========================================
echo -e "${BLUE}5️⃣  Testing API Endpoints${NC}"
echo "-------------------------------------------"

# Test drafts endpoint
info "Testing /api/drafts"
DRAFTS_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/api/drafts)
DRAFTS_CODE=$(echo "$DRAFTS_RESPONSE" | tail -n1)

if [ "$DRAFTS_CODE" = "200" ]; then
  pass "Drafts endpoint returns 200 OK"
else
  fail "Drafts endpoint failed (HTTP $DRAFTS_CODE)"
fi

# Test violations endpoint
info "Testing /api/violations"
VIOLATIONS_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/api/violations)
VIOLATIONS_CODE=$(echo "$VIOLATIONS_RESPONSE" | tail -n1)

if [ "$VIOLATIONS_CODE" = "200" ]; then
  pass "Violations endpoint returns 200 OK"
else
  fail "Violations endpoint failed (HTTP $VIOLATIONS_CODE)"
fi

echo ""

# ========================================
# Test 6: Start Webapp Server
# ========================================
echo -e "${BLUE}6️⃣  Testing Webapp Server Start${NC}"
echo "-------------------------------------------"

cd "$PROJECT_ROOT/packages/webapp"
info "Starting webapp server on port 3000"

# Start server in background
PORT=3000 NODE_ENV=production node server.js > /tmp/webapp-server.log 2>&1 &
WEBAPP_PID=$!

# Wait for server to start
sleep 2

# Check if server is running
if kill -0 $WEBAPP_PID 2>/dev/null; then
  pass "Webapp server started successfully (PID: $WEBAPP_PID)"
else
  fail "Webapp server failed to start"
  cat /tmp/webapp-server.log
  kill $API_PID 2>/dev/null || true
  exit 1
fi

echo ""

# ========================================
# Test 7: Webapp Serving
# ========================================
echo -e "${BLUE}7️⃣  Testing Webapp Serving${NC}"
echo "-------------------------------------------"

info "Fetching index.html"
INDEX_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/)
INDEX_CODE=$(echo "$INDEX_RESPONSE" | tail -n1)
INDEX_BODY=$(echo "$INDEX_RESPONSE" | head -n -1)

if [ "$INDEX_CODE" = "200" ]; then
  pass "Webapp returns 200 OK"
  
  # Check for HTML content
  if echo "$INDEX_BODY" | grep -q "<!DOCTYPE html>"; then
    pass "Webapp serves HTML content"
  else
    fail "Webapp does not serve HTML content"
  fi
  
  # Check for React
  if echo "$INDEX_BODY" | grep -q "WCAG AI Platform"; then
    pass "Webapp contains expected content"
  else
    fail "Webapp missing expected content"
  fi
else
  fail "Webapp failed (HTTP $INDEX_CODE)"
fi

echo ""

# ========================================
# Test 8: Railway Configuration Files
# ========================================
echo -e "${BLUE}8️⃣  Validating Railway Configuration${NC}"
echo "-------------------------------------------"

cd "$PROJECT_ROOT"

# Check API railway.json
if [ -f "packages/api/railway.json" ]; then
  pass "API railway.json exists"
  
  if jq empty packages/api/railway.json 2>/dev/null; then
    pass "API railway.json is valid JSON"
  else
    fail "API railway.json is invalid"
  fi
else
  fail "API railway.json not found"
fi

# Check webapp railway.json  
if [ -f "packages/webapp/railway.json" ]; then
  pass "Webapp railway.json exists"
  
  if jq empty packages/webapp/railway.json 2>/dev/null; then
    pass "Webapp railway.json is valid JSON"
  else
    fail "Webapp railway.json is invalid"
  fi
else
  fail "Webapp railway.json not found"
fi

echo ""

# ========================================
# Cleanup
# ========================================
echo -e "${BLUE}9️⃣  Cleanup${NC}"
echo "-------------------------------------------"

info "Stopping API server (PID: $API_PID)"
kill $API_PID 2>/dev/null || true
pass "API server stopped"

info "Stopping webapp server (PID: $WEBAPP_PID)"
kill $WEBAPP_PID 2>/dev/null || true
pass "Webapp server stopped"

echo ""

# ========================================
# Summary
# ========================================
echo "=========================================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=========================================="
echo ""
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  echo ""
  echo "Railway deployment is ready! ✨"
  echo ""
  echo "Next steps:"
  echo "  1. Install Railway CLI: npm install -g @railway/cli"
  echo "  2. Login: railway login"
  echo "  3. Deploy: cd packages/api && railway up"
  echo ""
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  echo ""
  echo "Please fix the issues above before deploying to Railway."
  echo ""
  exit 1
fi
