#!/bin/bash
#
# Deployment Dry Run
# Validates everything without actually deploying
#

set -e

echo "🧪 WCAG AI Platform - Deployment Dry Run"
echo "==========================================="
echo "This script validates your deployment without actually deploying."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0

check_pass() {
  echo -e "${GREEN}✅${NC} $1"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

check_fail() {
  echo -e "${RED}❌${NC} $1"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

check_warn() {
  echo -e "${YELLOW}⚠️${NC}  $1"
  CHECKS_WARNED=$((CHECKS_WARNED + 1))
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  check_pass "Node.js installed: $NODE_VERSION"
else
  check_fail "Node.js not installed"
fi

# npm
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm --version)
  check_pass "npm installed: $NPM_VERSION"
else
  check_fail "npm not installed"
fi

# Git
if command -v git &> /dev/null; then
  GIT_VERSION=$(git --version | cut -d' ' -f3)
  check_pass "Git installed: $GIT_VERSION"
else
  check_fail "Git not installed"
fi

# jq
if command -v jq &> /dev/null; then
  check_pass "jq installed"
else
  check_fail "jq not installed (required for JSON parsing)"
fi

# Railway CLI
if command -v railway &> /dev/null; then
  check_pass "Railway CLI installed"
  if railway whoami > /dev/null 2>&1; then
    RAILWAY_USER=$(railway whoami)
    check_pass "Railway authenticated: $RAILWAY_USER"
  else
    check_warn "Railway CLI not authenticated (run 'railway login')"
  fi
else
  check_warn "Railway CLI not installed (npm i -g @railway/cli)"
fi

# Vercel CLI
if command -v vercel &> /dev/null; then
  check_pass "Vercel CLI installed"
  if vercel whoami > /dev/null 2>&1; then
    VERCEL_USER=$(vercel whoami)
    check_pass "Vercel authenticated: $VERCEL_USER"
  else
    check_warn "Vercel CLI not authenticated (run 'vercel login')"
  fi
else
  check_warn "Vercel CLI not installed (npm i -g vercel)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Checking Configuration Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Railway configuration
if [ -f "packages/api/railway.json" ]; then
  check_pass "railway.json exists"

  if jq empty packages/api/railway.json 2>/dev/null; then
    check_pass "railway.json is valid JSON"

    # Check healthcheck
    if jq -e '.healthcheck.path' packages/api/railway.json > /dev/null 2>&1; then
      HEALTH_PATH=$(jq -r '.healthcheck.path' packages/api/railway.json)
      check_pass "Healthcheck configured: $HEALTH_PATH"
    else
      check_warn "Healthcheck path not configured"
    fi

    # Check restart policy
    if jq -e '.deploy.restartPolicyType' packages/api/railway.json > /dev/null 2>&1; then
      RESTART=$(jq -r '.deploy.restartPolicyType' packages/api/railway.json)
      check_pass "Restart policy: $RESTART"
    else
      check_warn "Restart policy not configured"
    fi
  else
    check_fail "railway.json is invalid JSON"
  fi
else
  check_fail "railway.json not found"
fi

# Vercel configuration
if [ -f "packages/webapp/vercel.json" ]; then
  check_pass "vercel.json exists"

  if jq empty packages/webapp/vercel.json 2>/dev/null; then
    check_pass "vercel.json is valid JSON"

    # Check framework
    if jq -e '.framework' packages/webapp/vercel.json > /dev/null 2>&1; then
      FRAMEWORK=$(jq -r '.framework' packages/webapp/vercel.json)
      check_pass "Framework: $FRAMEWORK"
    else
      check_warn "Framework not explicitly configured"
    fi

    # Check headers
    if jq -e '.headers' packages/webapp/vercel.json > /dev/null 2>&1; then
      HEADER_COUNT=$(jq '[.headers[].headers[]] | length' packages/webapp/vercel.json)
      check_pass "Security headers configured: $HEADER_COUNT rules"
    else
      check_fail "Security headers not configured"
    fi
  else
    check_fail "vercel.json is invalid JSON"
  fi
else
  check_fail "vercel.json not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Checking Package Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# API package.json
if [ -f "packages/api/package.json" ]; then
  check_pass "API package.json exists"

  jq -e '.scripts.build' packages/api/package.json > /dev/null 2>&1 && check_pass "API build script configured" || check_fail "API build script missing"
  jq -e '.scripts.start' packages/api/package.json > /dev/null 2>&1 && check_pass "API start script configured" || check_fail "API start script missing"
  jq -e '.scripts.dev' packages/api/package.json > /dev/null 2>&1 && check_pass "API dev script configured" || check_warn "API dev script missing"
else
  check_fail "API package.json not found"
fi

# Webapp package.json
if [ -f "packages/webapp/package.json" ]; then
  check_pass "Webapp package.json exists"

  jq -e '.scripts.build' packages/webapp/package.json > /dev/null 2>&1 && check_pass "Webapp build script configured" || check_fail "Webapp build script missing"
  jq -e '.scripts.dev' packages/webapp/package.json > /dev/null 2>&1 && check_pass "Webapp dev script configured" || check_warn "Webapp dev script missing"
else
  check_fail "Webapp package.json not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Testing Build Process"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install dependencies (silently)
echo "Installing dependencies..."
if npm install --silent > /dev/null 2>&1; then
  check_pass "Root dependencies installed"
else
  check_warn "Root dependency installation had warnings"
fi

# Build API
echo "Building API..."
cd packages/api
if npm run build > /dev/null 2>&1; then
  if [ -d "dist" ]; then
    API_SIZE=$(du -sh dist | cut -f1)
    check_pass "API build successful (size: $API_SIZE)"
  else
    check_fail "API build failed - no dist directory"
  fi
else
  check_fail "API build failed"
fi
cd ../..

# Build Webapp
echo "Building webapp..."
cd packages/webapp
if npm run build > /dev/null 2>&1; then
  if [ -d "dist" ]; then
    WEBAPP_SIZE=$(du -sh dist | cut -f1)
    check_pass "Webapp build successful (size: $WEBAPP_SIZE)"
  else
    check_fail "Webapp build failed - no dist directory"
  fi
else
  check_fail "Webapp build failed"
fi
cd ../..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Running Validator Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "deployment/scripts/test-validators.sh" ]; then
  if bash deployment/scripts/test-validators.sh > /dev/null 2>&1; then
    check_pass "All validator tests passed"
  else
    check_warn "Some validator tests failed"
  fi
else
  check_warn "Validator test script not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Checking Git Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -d ".git" ]; then
  check_pass "Git repository detected"

  CURRENT_BRANCH=$(git branch --show-current)
  check_pass "Current branch: $CURRENT_BRANCH"

  if [[ -n $(git status -s) ]]; then
    check_warn "Uncommitted changes detected"
    git status -s
  else
    check_pass "Working directory clean"
  fi
else
  check_warn "Not a git repository"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Dry Run Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checks Passed:  $CHECKS_PASSED"
echo "Checks Failed:  $CHECKS_FAILED"
echo "Warnings:       $CHECKS_WARNED"
echo ""

TOTAL_CHECKS=$((CHECKS_PASSED + CHECKS_FAILED))
if [ $TOTAL_CHECKS -gt 0 ]; then
  SUCCESS_RATE=$(echo "scale=1; ($CHECKS_PASSED * 100) / $TOTAL_CHECKS" | bc)
  echo "Success Rate: ${SUCCESS_RATE}%"
fi
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Ready for production deployment!${NC}"
  echo ""
  echo "To deploy, run:"
  echo "  ./deployment/scripts/deploy-production.sh"
  echo ""
  exit 0
else
  echo -e "${RED}❌ $CHECKS_FAILED critical issue(s) found${NC}"
  echo ""
  echo "Please fix the failed checks before deploying."
  echo ""
  exit 1
fi
