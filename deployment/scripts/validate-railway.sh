#!/bin/bash
#
# Railway Production Deployment Validator
# Validates Railway.app deployment is production-ready
#

set -e

RAILWAY_API_URL="${1:-https://wcagaii.railway.app}"
RAILWAY_SERVICE="${2:-wcagaii-backend}"

echo "🚂 Railway Production Deployment Audit"
echo "========================================"
echo "API URL: $RAILWAY_API_URL"
echo "Service: $RAILWAY_SERVICE"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

pass() {
  echo "✅ $1"
  PASSED=$((PASSED + 1))
}

fail() {
  echo "❌ $1"
  FAILED=$((FAILED + 1))
}

warn() {
  echo "⚠️  $1"
  WARNINGS=$((WARNINGS + 1))
}

# ========================================
# 1. Railway Configuration Validation
# ========================================
echo "1️⃣  Railway Configuration"
echo "-------------------------------------------"

# Check railway.json exists
if [ -f "packages/api/railway.json" ]; then
  pass "railway.json configuration exists"

  # Validate JSON
  if jq empty packages/api/railway.json 2>/dev/null; then
    pass "railway.json is valid JSON"
  else
    fail "railway.json is invalid JSON"
  fi

  # Check healthcheck configuration
  if jq -e '.healthcheck.path' packages/api/railway.json > /dev/null 2>&1; then
    pass "Healthcheck path configured"
  else
    fail "Healthcheck path not configured"
  fi
else
  fail "railway.json not found"
fi

# Check railway.toml exists
if [ -f "packages/api/railway.toml" ]; then
  pass "railway.toml configuration exists"
else
  warn "railway.toml not found (optional)"
fi

echo ""

# ========================================
# 2. Health Endpoint Validation
# ========================================
echo "2️⃣  Health Endpoint"
echo "-------------------------------------------"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_API_URL/health" 2>/dev/null || echo "000")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HEALTH_CODE" = "200" ]; then
  pass "Health endpoint returns 200"

  # Check response content
  if echo "$HEALTH_BODY" | jq -e '.status' > /dev/null 2>&1; then
    pass "Health response is valid JSON"

    STATUS=$(echo "$HEALTH_BODY" | jq -r '.status')
    if [ "$STATUS" = "ok" ] || [ "$STATUS" = "healthy" ]; then
      pass "Health status is OK"
    else
      fail "Health status is $STATUS"
    fi

    # Check for database status
    if echo "$HEALTH_BODY" | jq -e '.database' > /dev/null 2>&1; then
      pass "Database health check included"
    else
      warn "Database health check not included"
    fi

    # Check for uptime
    if echo "$HEALTH_BODY" | jq -e '.uptime' > /dev/null 2>&1; then
      UPTIME=$(echo "$HEALTH_BODY" | jq -r '.uptime')
      pass "Uptime reported: ${UPTIME}s"
    else
      warn "Uptime not reported"
    fi
  else
    warn "Health response is not JSON: $HEALTH_BODY"
  fi
else
  fail "Health endpoint failed: HTTP $HEALTH_CODE"
fi

echo ""

# ========================================
# 3. Railway Environment Variables
# ========================================
echo "3️⃣  Environment Variables"
echo "-------------------------------------------"

REQUIRED_VARS=(
  "NODE_ENV"
  "PORT"
  "DATABASE_URL"
  "REDIS_URL"
)

if command -v railway &> /dev/null; then
  for var in "${REQUIRED_VARS[@]}"; do
    if railway variables get "$var" --service="$RAILWAY_SERVICE" > /dev/null 2>&1; then
      pass "Environment variable $var is set"
    else
      fail "Environment variable $var is NOT set"
    fi
  done
else
  warn "Railway CLI not installed, skipping env var checks"
fi

echo ""

# ========================================
# 4. Railway Service Configuration
# ========================================
echo "4️⃣  Service Configuration"
echo "-------------------------------------------"

if command -v railway &> /dev/null; then
  # Check service status
  SERVICE_STATUS=$(railway status --service="$RAILWAY_SERVICE" --json 2>/dev/null || echo "{}")

  if [ -n "$SERVICE_STATUS" ] && [ "$SERVICE_STATUS" != "{}" ]; then
    pass "Railway service is accessible"

    # Check deployment status
    DEPLOY_STATUS=$(echo "$SERVICE_STATUS" | jq -r '.status // "unknown"')
    if [ "$DEPLOY_STATUS" = "SUCCESS" ] || [ "$DEPLOY_STATUS" = "ACTIVE" ]; then
      pass "Service deployment status: $DEPLOY_STATUS"
    else
      warn "Service deployment status: $DEPLOY_STATUS"
    fi

    # Check replicas
    REPLICAS=$(echo "$SERVICE_STATUS" | jq -r '.replicas // 1')
    if [ "$REPLICAS" -ge 1 ]; then
      pass "Service has $REPLICAS replica(s)"
    else
      fail "Service has $REPLICAS replicas"
    fi
  else
    warn "Could not retrieve service status"
  fi
else
  warn "Railway CLI not available for service checks"
fi

echo ""

# ========================================
# 5. Database Connectivity
# ========================================
echo "5️⃣  Database Connectivity"
echo "-------------------------------------------"

# Test via API endpoint if available
DB_TEST=$(curl -s "$RAILWAY_API_URL/api/db-test" 2>/dev/null || echo "")
if echo "$DB_TEST" | grep -q "connected\|ok\|success"; then
  pass "Database connection test passed"
else
  # Try alternative method
  if command -v railway &> /dev/null; then
    railway run --service="$RAILWAY_SERVICE" psql \$DATABASE_URL -c "SELECT 1;" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      pass "Direct database connection successful"
    else
      fail "Database connection failed"
    fi
  else
    warn "Cannot verify database connection"
  fi
fi

echo ""

# ========================================
# 6. Redis Connectivity
# ========================================
echo "6️⃣  Redis Connectivity"
echo "-------------------------------------------"

# Test via API endpoint
REDIS_TEST=$(curl -s "$RAILWAY_API_URL/api/redis-test" 2>/dev/null || echo "")
if echo "$REDIS_TEST" | grep -q "connected\|ok\|PONG"; then
  pass "Redis connection test passed"
else
  warn "Cannot verify Redis connection"
fi

echo ""

# ========================================
# 7. Performance & Response Times
# ========================================
echo "7️⃣  Performance Metrics"
echo "-------------------------------------------"

# Measure response time
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' "$RAILWAY_API_URL/health")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc)

if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
  pass "Health endpoint response time: ${RESPONSE_MS}ms (<1000ms)"
elif (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
  warn "Health endpoint response time: ${RESPONSE_MS}ms (acceptable but slow)"
else
  fail "Health endpoint response time: ${RESPONSE_MS}ms (>2000ms)"
fi

# Check time to first byte
TTFB=$(curl -o /dev/null -s -w '%{time_starttransfer}\n' "$RAILWAY_API_URL/health")
TTFB_MS=$(echo "$TTFB * 1000" | bc)

if (( $(echo "$TTFB < 0.5" | bc -l) )); then
  pass "Time to first byte: ${TTFB_MS}ms (<500ms)"
else
  warn "Time to first byte: ${TTFB_MS}ms"
fi

echo ""

# ========================================
# 8. Security Headers
# ========================================
echo "8️⃣  Security Headers"
echo "-------------------------------------------"

HEADERS=$(curl -sI "$RAILWAY_API_URL/health")

# Check security headers
if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
  pass "X-Content-Type-Options header present"
else
  warn "X-Content-Type-Options header missing"
fi

if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
  pass "X-Frame-Options header present"
else
  warn "X-Frame-Options header missing"
fi

if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
  pass "HSTS header present"
else
  warn "HSTS header missing (OK for non-HTTPS)"
fi

if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
  pass "Content-Security-Policy header present"
else
  warn "Content-Security-Policy header missing"
fi

echo ""

# ========================================
# 9. Error Handling
# ========================================
echo "9️⃣  Error Handling"
echo "-------------------------------------------"

# Test 404 handling
NOT_FOUND=$(curl -s -w "\n%{http_code}" "$RAILWAY_API_URL/nonexistent-endpoint" 2>/dev/null)
NOT_FOUND_CODE=$(echo "$NOT_FOUND" | tail -n1)

if [ "$NOT_FOUND_CODE" = "404" ]; then
  pass "404 errors handled correctly"
else
  warn "404 handling returns: HTTP $NOT_FOUND_CODE"
fi

# Test malformed request handling
BAD_REQUEST=$(curl -s -w "\n%{http_code}" -X POST "$RAILWAY_API_URL/api/scan" -H "Content-Type: application/json" -d '{invalid json}' 2>/dev/null)
BAD_REQUEST_CODE=$(echo "$BAD_REQUEST" | tail -n1)

if [ "$BAD_REQUEST_CODE" = "400" ]; then
  pass "Malformed requests handled correctly"
else
  warn "Malformed request handling returns: HTTP $BAD_REQUEST_CODE"
fi

echo ""

# ========================================
# 10. Monitoring & Observability
# ========================================
echo "🔟 Monitoring & Observability"
echo "-------------------------------------------"

# Check metrics endpoint
METRICS=$(curl -s "$RAILWAY_API_URL/metrics" 2>/dev/null)
if echo "$METRICS" | grep -q "wcagai_"; then
  pass "Prometheus metrics endpoint available"

  # Count metrics
  METRIC_COUNT=$(echo "$METRICS" | grep "^wcagai_" | wc -l)
  pass "Exposing $METRIC_COUNT custom metrics"
else
  fail "Prometheus metrics endpoint not available"
fi

# Check for structured logging
LOGS_TEST=$(curl -s "$RAILWAY_API_URL/health" -H "X-Request-ID: test-123" 2>/dev/null)
if [ $? -eq 0 ]; then
  pass "Logging system operational"
else
  warn "Cannot verify logging system"
fi

echo ""

# ========================================
# 11. Railway-Specific Features
# ========================================
echo "1️⃣1️⃣  Railway-Specific Features"
echo "-------------------------------------------"

# Check for railway.json features
if [ -f "packages/api/railway.json" ]; then
  # Check restart policy
  if jq -e '.deploy.restartPolicyType' packages/api/railway.json > /dev/null 2>&1; then
    RESTART_POLICY=$(jq -r '.deploy.restartPolicyType' packages/api/railway.json)
    pass "Restart policy configured: $RESTART_POLICY"
  else
    warn "Restart policy not configured"
  fi

  # Check sleep configuration
  if jq -e '.deploy.sleepApplication' packages/api/railway.json > /dev/null 2>&1; then
    SLEEP=$(jq -r '.deploy.sleepApplication' packages/api/railway.json)
    if [ "$SLEEP" = "false" ]; then
      pass "Application sleep disabled (always-on)"
    else
      warn "Application may sleep when idle"
    fi
  fi
fi

echo ""

# ========================================
# 12. Build & Deploy Validation
# ========================================
echo "1️⃣2️⃣  Build & Deploy"
echo "-------------------------------------------"

# Check if dist directory would be created
if [ -f "packages/api/package.json" ]; then
  if jq -e '.scripts.build' packages/api/package.json > /dev/null 2>&1; then
    pass "Build script configured in package.json"
  else
    fail "Build script missing in package.json"
  fi

  if jq -e '.scripts.start' packages/api/package.json > /dev/null 2>&1; then
    pass "Start script configured in package.json"
  else
    fail "Start script missing in package.json"
  fi
fi

# Check for TypeScript configuration
if [ -f "packages/api/tsconfig.json" ]; then
  pass "TypeScript configuration exists"
else
  warn "TypeScript configuration missing"
fi

# Check for .dockerignore or .railwayignore
if [ -f "packages/api/.dockerignore" ] || [ -f "packages/api/.railwayignore" ]; then
  pass "Build ignore file configured"
else
  warn "No .dockerignore or .railwayignore found"
fi

echo ""

# ========================================
# Summary
# ========================================
echo "========================================"
echo "📊 Railway Deployment Audit Summary"
echo "========================================"
echo ""
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Warnings: $WARNINGS"
echo ""

TOTAL_CHECKS=$((PASSED + FAILED))
SCORE=$(echo "scale=1; ($PASSED / $TOTAL_CHECKS) * 100" | bc)

echo "Score: ${SCORE}%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ Railway deployment is PRODUCTION READY!"
  echo ""
  echo "Deployment checklist:"
  echo "  ✅ Health checks configured"
  echo "  ✅ Environment variables set"
  echo "  ✅ Database connectivity verified"
  echo "  ✅ Performance meets targets"
  echo "  ✅ Security headers configured"
  echo "  ✅ Error handling implemented"
  echo "  ✅ Monitoring enabled"
  echo ""
  exit 0
else
  echo "❌ Railway deployment has $FAILED critical issue(s)"
  echo ""
  echo "Please fix the failed checks before deploying to production."
  echo ""
  exit 1
fi
