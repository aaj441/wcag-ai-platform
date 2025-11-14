#!/bin/bash
#
# Final Deployment Readiness Check
# Verifies everything is ready for Railway deployment
#

echo "🔍 Final Deployment Readiness Check"
echo "====================================="
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

pass() {
  echo "✅ $1"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

fail() {
  echo "❌ $1"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

cd /home/runner/work/wcag-ai-platform/wcag-ai-platform

# 1. Check builds
echo "1️⃣  Verifying Builds"
echo "-------------------------------------------"

if cd packages/api && npm run build > /dev/null 2>&1; then
  pass "API builds successfully"
else
  fail "API build failed"
fi

if cd ../webapp && npm run build > /dev/null 2>&1; then
  pass "Webapp builds successfully"
else
  fail "Webapp build failed"
fi

cd ../..
echo ""

# 2. Check configuration files
echo "2️⃣  Verifying Configuration"
echo "-------------------------------------------"

if [ -f "packages/api/railway.json" ]; then
  pass "API railway.json exists"
else
  fail "API railway.json missing"
fi

if [ -f "packages/webapp/railway.json" ]; then
  pass "Webapp railway.json exists"
else
  fail "Webapp railway.json missing"
fi

echo ""

# 3. Check documentation
echo "3️⃣  Verifying Documentation"
echo "-------------------------------------------"

if [ -f "RAILWAY_DEPLOYMENT_GUIDE.md" ]; then
  pass "Deployment guide exists"
else
  fail "Deployment guide missing"
fi

if [ -f "RAILWAY_QUICK_START.md" ]; then
  pass "Quick start guide exists"
else
  fail "Quick start guide missing"
fi

if [ -f "RAILWAY_DEPLOYMENT_SUMMARY.md" ]; then
  pass "Deployment summary exists"
else
  fail "Deployment summary missing"
fi

echo ""

# 4. Check test scripts
echo "4️⃣  Verifying Test Scripts"
echo "-------------------------------------------"

if [ -f "deployment/scripts/test-railway-simulation.sh" ]; then
  pass "Railway simulation test exists"
else
  fail "Railway simulation test missing"
fi

if [ -x "deployment/scripts/test-railway-simulation.sh" ]; then
  pass "Railway simulation test is executable"
else
  fail "Railway simulation test not executable"
fi

echo ""

# 5. Check server files
echo "5️⃣  Verifying Server Files"
echo "-------------------------------------------"

if [ -f "packages/api/dist/server.js" ]; then
  pass "API server bundle exists"
else
  fail "API server bundle missing (run npm run build)"
fi

if [ -f "packages/webapp/dist/index.html" ]; then
  pass "Webapp static files exist"
else
  fail "Webapp static files missing (run npm run build)"
fi

if [ -f "packages/webapp/server.js" ]; then
  pass "Webapp server exists"
else
  fail "Webapp server missing"
fi

echo ""

# 6. Summary
echo "==========================================="
echo "📊 Final Readiness Check Summary"
echo "==========================================="
echo ""
echo "Checks Passed: $CHECKS_PASSED"
echo "Checks Failed: $CHECKS_FAILED"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED!"
  echo ""
  echo "🎉 The WCAG AI Platform is READY for Railway deployment!"
  echo ""
  echo "Next steps:"
  echo "  1. Install Railway CLI: npm install -g @railway/cli"
  echo "  2. Login: railway login"
  echo "  3. Deploy: See RAILWAY_QUICK_START.md"
  echo ""
  exit 0
else
  echo "❌ SOME CHECKS FAILED"
  echo ""
  echo "Please fix the issues above before deploying."
  echo ""
  exit 1
fi
