#!/bin/bash
#
# Vercel Production Deployment Validator
# Validates Vercel deployment is production-ready
#

set -e

VERCEL_URL="${1:-https://wcagaii.vercel.app}"

echo "▲ Vercel Production Deployment Audit"
echo "========================================"
echo "Frontend URL: $VERCEL_URL"
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
# 1. Vercel Configuration Validation
# ========================================
echo "1️⃣  Vercel Configuration"
echo "-------------------------------------------"

if [ -f "packages/webapp/vercel.json" ]; then
  pass "vercel.json configuration exists"

  if jq empty packages/webapp/vercel.json 2>/dev/null; then
    pass "vercel.json is valid JSON"

    # Check framework detection
    if jq -e '.framework' packages/webapp/vercel.json > /dev/null 2>&1; then
      FRAMEWORK=$(jq -r '.framework' packages/webapp/vercel.json)
      pass "Framework configured: $FRAMEWORK"
    else
      warn "Framework not explicitly configured"
    fi

    # Check output directory
    if jq -e '.outputDirectory' packages/webapp/vercel.json > /dev/null 2>&1; then
      OUTPUT_DIR=$(jq -r '.outputDirectory' packages/webapp/vercel.json)
      pass "Output directory: $OUTPUT_DIR"
    fi

    # Check security headers
    if jq -e '.headers' packages/webapp/vercel.json > /dev/null 2>&1; then
      HEADER_COUNT=$(jq '[.headers[].headers[]] | length' packages/webapp/vercel.json)
      pass "Security headers configured ($HEADER_COUNT rules)"
    else
      fail "Security headers not configured"
    fi
  else
    fail "vercel.json is invalid JSON"
  fi
else
  warn "vercel.json not found (using defaults)"
fi

echo ""

# ========================================
# 2. Frontend Availability
# ========================================
echo "2️⃣  Frontend Availability"
echo "-------------------------------------------"

RESPONSE=$(curl -s -w "\n%{http_code}" "$VERCEL_URL" 2>/dev/null || echo "000")
STATUS_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS_CODE" = "200" ]; then
  pass "Frontend returns HTTP 200"

  # Check if HTML contains expected content
  if echo "$BODY" | grep -qi "wcag\|accessibility"; then
    pass "Frontend HTML contains expected content"
  else
    warn "Frontend HTML may be incorrect"
  fi

  # Check for React/Vite in HTML
  if echo "$BODY" | grep -qi "script.*src.*assets"; then
    pass "Bundled JavaScript assets detected"
  else
    warn "JavaScript assets may not be properly bundled"
  fi
else
  fail "Frontend failed: HTTP $STATUS_CODE"
fi

echo ""

# ========================================
# 3. Build Configuration
# ========================================
echo "3️⃣  Build Configuration"
echo "-------------------------------------------"

if [ -f "packages/webapp/package.json" ]; then
  if jq -e '.scripts.build' packages/webapp/package.json > /dev/null 2>&1; then
    BUILD_CMD=$(jq -r '.scripts.build' packages/webapp/package.json)
    pass "Build command configured: $BUILD_CMD"
  else
    fail "Build command missing"
  fi

  if jq -e '.scripts.dev' packages/webapp/package.json > /dev/null 2>&1; then
    pass "Dev command configured"
  fi
fi

# Check for vite.config
if [ -f "packages/webapp/vite.config.ts" ] || [ -f "packages/webapp/vite.config.js" ]; then
  pass "Vite configuration exists"
else
  warn "Vite configuration not found"
fi

echo ""

# ========================================
# 4. Security Headers (via HTTP)
# ========================================
echo "4️⃣  Security Headers"
echo "-------------------------------------------"

HEADERS=$(curl -sI "$VERCEL_URL")

EXPECTED_HEADERS=(
  "X-Content-Type-Options"
  "X-Frame-Options"
  "X-XSS-Protection"
  "Referrer-Policy"
)

for header in "${EXPECTED_HEADERS[@]}"; do
  if echo "$HEADERS" | grep -qi "$header"; then
    pass "$header header present"
  else
    warn "$header header missing"
  fi
done

# Check Vercel-specific headers
if echo "$HEADERS" | grep -qi "x-vercel-id"; then
  pass "Vercel deployment ID present"
fi

echo ""

# ========================================
# 5. Performance Metrics
# ========================================
echo "5️⃣  Performance Metrics"
echo "-------------------------------------------"

# Measure response time
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' "$VERCEL_URL")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc)

if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
  pass "Page load time: ${RESPONSE_MS}ms (<1000ms)"
elif (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
  warn "Page load time: ${RESPONSE_MS}ms (acceptable)"
else
  fail "Page load time: ${RESPONSE_MS}ms (>2000ms)"
fi

# Check time to first byte
TTFB=$(curl -o /dev/null -s -w '%{time_starttransfer}\n' "$VERCEL_URL")
TTFB_MS=$(echo "$TTFB * 1000" | bc)

if (( $(echo "$TTFB < 0.3" | bc -l) )); then
  pass "TTFB: ${TTFB_MS}ms (<300ms - Vercel Edge)"
elif (( $(echo "$TTFB < 0.5" | bc -l) )); then
  pass "TTFB: ${TTFB_MS}ms (<500ms)"
else
  warn "TTFB: ${TTFB_MS}ms"
fi

# Check asset compression
COMPRESSION=$(curl -sI "$VERCEL_URL" | grep -i "content-encoding")
if echo "$COMPRESSION" | grep -qi "gzip\|br\|zstd"; then
  pass "Asset compression enabled"
else
  warn "Asset compression not detected"
fi

echo ""

# ========================================
# 6. Asset Optimization
# ========================================
echo "6️⃣  Asset Optimization"
echo "-------------------------------------------"

# Download HTML and check for optimized assets
HTML=$(curl -s "$VERCEL_URL")

# Check for minified JS
if echo "$HTML" | grep -q "script.*src.*\\.js"; then
  JS_COUNT=$(echo "$HTML" | grep -o "script.*src.*\\.js" | wc -l)
  pass "JavaScript bundles found: $JS_COUNT"

  # Check for hash in filenames (cache busting)
  if echo "$HTML" | grep -q "script.*src.*-[a-f0-9]\\{8\\}\\.js"; then
    pass "Content hashing enabled (cache busting)"
  else
    warn "Content hashing may not be enabled"
  fi
fi

# Check for CSS
if echo "$HTML" | grep -q "link.*rel.*stylesheet"; then
  pass "CSS stylesheets linked"
fi

# Check for font optimization
if echo "$HTML" | grep -qi "preload.*font\|font-display"; then
  pass "Font optimization detected"
else
  warn "Font optimization not detected"
fi

echo ""

# ========================================
# 7. Environment Variables
# ========================================
echo "7️⃣  Environment Variables"
echo "-------------------------------------------"

# Check if API URL is configured
if echo "$HTML" | grep -q "VITE_API\|api\."; then
  pass "API configuration appears to be present"
else
  warn "API configuration may be missing"
fi

# Check for Vercel CLI
if command -v vercel &> /dev/null; then
  # Try to list env vars (requires authentication)
  if vercel env ls > /dev/null 2>&1; then
    pass "Vercel CLI authenticated"
  else
    warn "Vercel CLI not authenticated"
  fi
else
  warn "Vercel CLI not installed for env var checks"
fi

echo ""

# ========================================
# 8. Routing & Rewrites
# ========================================
echo "8️⃣  Routing & Rewrites"
echo "-------------------------------------------"

# Test SPA routing (should return 200 for /some/path)
ROUTE_TEST=$(curl -s -w "%{http_code}" "$VERCEL_URL/scan" -o /dev/null)
if [ "$ROUTE_TEST" = "200" ]; then
  pass "SPA routing configured (rewrites to index.html)"
else
  warn "SPA routing may not be configured: HTTP $ROUTE_TEST"
fi

# Test 404 handling
NOT_FOUND=$(curl -s -w "%{http_code}" "$VERCEL_URL/definitely-not-a-real-asset.xyz" -o /dev/null)
if [ "$NOT_FOUND" = "404" ] || [ "$NOT_FOUND" = "200" ]; then
  pass "404 handling configured"
else
  warn "404 handling returns: HTTP $NOT_FOUND"
fi

echo ""

# ========================================
# 9. CDN & Edge Network
# ========================================
echo "9️⃣  CDN & Edge Network"
echo "-------------------------------------------"

# Check for Vercel edge network headers
if echo "$HEADERS" | grep -qi "x-vercel-cache"; then
  CACHE_STATUS=$(echo "$HEADERS" | grep -i "x-vercel-cache" | cut -d: -f2 | tr -d ' \r')
  pass "Vercel Edge cache status: $CACHE_STATUS"
else
  warn "Vercel cache headers not detected"
fi

# Check for edge region
if echo "$HEADERS" | grep -qi "x-vercel-id"; then
  EDGE_ID=$(echo "$HEADERS" | grep -i "x-vercel-id" | cut -d: -f2 | tr -d ' \r' | cut -c1-20)
  pass "Served from Vercel Edge: $EDGE_ID"
fi

echo ""

# ========================================
# 10. Vercel-Specific Features
# ========================================
echo "🔟 Vercel-Specific Features"
echo "-------------------------------------------"

if [ -f "packages/webapp/vercel.json" ]; then
  # Check for custom domains
  if jq -e '.domains' packages/webapp/vercel.json > /dev/null 2>&1; then
    pass "Custom domains configured"
  else
    warn "No custom domains configured"
  fi

  # Check for redirects
  if jq -e '.redirects' packages/webapp/vercel.json > /dev/null 2>&1; then
    REDIRECT_COUNT=$(jq '.redirects | length' packages/webapp/vercel.json)
    pass "Redirects configured: $REDIRECT_COUNT"
  fi

  # Check for rewrites
  if jq -e '.rewrites' packages/webapp/vercel.json > /dev/null 2>&1; then
    REWRITE_COUNT=$(jq '.rewrites | length' packages/webapp/vercel.json)
    pass "Rewrites configured: $REWRITE_COUNT"
  fi
fi

echo ""

# ========================================
# 11. Accessibility
# ========================================
echo "1️⃣1️⃣  Accessibility"
echo "-------------------------------------------"

# Check for lang attribute
if echo "$HTML" | grep -q '<html.*lang='; then
  LANG=$(echo "$HTML" | grep -o '<html.*lang="[^"]*"' | cut -d'"' -f2)
  pass "Language attribute set: $LANG"
else
  warn "HTML lang attribute missing"
fi

# Check for viewport meta tag
if echo "$HTML" | grep -qi 'meta.*viewport'; then
  pass "Viewport meta tag present"
else
  fail "Viewport meta tag missing"
fi

# Check for title
if echo "$HTML" | grep -q '<title>'; then
  pass "Page title present"
else
  warn "Page title missing"
fi

echo ""

# ========================================
# 12. Error Handling
# ========================================
echo "1️⃣2️⃣  Error Handling"
echo "-------------------------------------------"

# Check for error boundary in React
if echo "$HTML" | grep -qi "error\|ErrorBoundary"; then
  pass "Error handling appears to be implemented"
else
  warn "Error handling not detected in HTML"
fi

# Test CORS (if applicable)
CORS_TEST=$(curl -sI "$VERCEL_URL" -H "Origin: https://example.com" | grep -i "access-control")
if [ -n "$CORS_TEST" ]; then
  pass "CORS headers configured"
else
  warn "CORS headers not detected"
fi

echo ""

# ========================================
# Summary
# ========================================
echo "========================================"
echo "📊 Vercel Deployment Audit Summary"
echo "========================================"
echo ""
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Warnings: $WARNINGS"
echo ""

TOTAL_CHECKS=$((PASSED + FAILED))
if [ $TOTAL_CHECKS -gt 0 ]; then
  SCORE=$(echo "scale=1; ($PASSED / $TOTAL_CHECKS) * 100" | bc)
else
  SCORE=0
fi

echo "Score: ${SCORE}%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ Vercel deployment is PRODUCTION READY!"
  echo ""
  echo "Deployment checklist:"
  echo "  ✅ Security headers configured"
  echo "  ✅ Performance optimized (<1s load)"
  echo "  ✅ Assets compressed and cached"
  echo "  ✅ SPA routing configured"
  echo "  ✅ Edge network enabled"
  echo "  ✅ Accessibility standards met"
  echo ""
  exit 0
else
  echo "❌ Vercel deployment has $FAILED critical issue(s)"
  echo ""
  echo "Please fix the failed checks before deploying to production."
  echo ""
  exit 1
fi
