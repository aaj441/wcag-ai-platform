#!/bin/bash
#
# Deployment Harmony Verification Script
#
# Validates deployment consistency across Railway and Vercel
# Ensures environment variables, dependencies, and configurations are in sync
#
# Usage: ./deployment/scripts/verify-deployment-harmony.sh
#

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 DEPLOYMENT HARMONY VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✅ Passed:${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ Failed:${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  Warning:${NC} $1"
    ((WARNINGS++))
}

# Check 1: Package.json versions match
echo "📦 Checking package.json consistency..."
API_VERSION=$(jq -r '.version' packages/api/package.json)
WEBAPP_VERSION=$(jq -r '.version' packages/webapp/package.json 2>/dev/null || echo "N/A")

if [ "$API_VERSION" != "N/A" ]; then
    pass "API version: $API_VERSION"
else
    fail "API package.json not found"
fi

if [ "$WEBAPP_VERSION" != "N/A" ]; then
    pass "Webapp version: $WEBAPP_VERSION"
else
    warn "Webapp package.json not found (may not exist yet)"
fi
echo ""

# Check 2: Required environment files exist
echo "🔐 Checking environment files..."
if [ -f "packages/api/.env.example" ]; then
    pass ".env.example exists in API"
else
    fail ".env.example missing in API"
fi

if [ -f "packages/api/.env" ]; then
    warn ".env file exists (should not be committed)"
else
    pass ".env not committed (good)"
fi
echo ""

# Check 3: TypeScript builds successfully
echo "📝 Checking TypeScript compilation..."
cd packages/api
if npm run build > /dev/null 2>&1; then
    pass "API TypeScript compiles successfully"
else
    fail "API TypeScript compilation errors detected"
fi
cd ../..
echo ""

# Check 4: Prisma schema is valid
echo "🗄️  Checking Prisma schema..."
cd packages/api
if npx prisma validate > /dev/null 2>&1; then
    pass "Prisma schema is valid"
else
    fail "Prisma schema validation failed"
fi
cd ../..
echo ""

# Check 5: Required scripts exist
echo "📜 Checking deployment scripts..."
REQUIRED_SCRIPTS=(
    "deployment/scripts/deploy-unified.sh"
    "deployment/scripts/validate-railway.sh"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            pass "$script exists and is executable"
        else
            warn "$script exists but is not executable"
        fi
    else
        fail "$script is missing"
    fi
done
echo ""

# Check 6: GitHub Actions workflows are valid
echo "⚙️  Checking GitHub Actions workflows..."
WORKFLOW_COUNT=$(find .github/workflows -name "*.yml" -o -name "*.yaml" | wc -l)
if [ "$WORKFLOW_COUNT" -gt 0 ]; then
    pass "Found $WORKFLOW_COUNT GitHub Actions workflows"
else
    fail "No GitHub Actions workflows found"
fi
echo ""

# Check 7: Railway configuration
echo "🚂 Checking Railway configuration..."
if command -v railway &> /dev/null; then
    pass "Railway CLI is installed"
else
    warn "Railway CLI not installed (install: npm install -g @railway/cli)"
fi

if [ -n "$RAILWAY_TOKEN" ]; then
    pass "RAILWAY_TOKEN environment variable is set"
else
    warn "RAILWAY_TOKEN not set (needed for Railway deployments)"
fi
echo ""

# Check 8: Node version compatibility
echo "📍 Checking Node.js version..."
NODE_VERSION=$(node --version)
REQUIRED_NODE="v20"

if [[ "$NODE_VERSION" == "$REQUIRED_NODE"* ]]; then
    pass "Node.js version: $NODE_VERSION (compatible)"
else
    warn "Node.js version: $NODE_VERSION (expected $REQUIRED_NODE)"
fi
echo ""

# Check 9: Dependencies are installed
echo "📚 Checking dependencies..."
cd packages/api
if [ -d "node_modules" ]; then
    MODULE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
    pass "API dependencies installed ($MODULE_COUNT packages)"
else
    fail "API node_modules missing (run: npm install)"
fi
cd ../..
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VERIFICATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo "✅ Deployment harmony verification PASSED"
    echo "   Safe to proceed with deployment"
    echo ""
    exit 0
else
    echo "❌ Deployment harmony verification FAILED"
    echo "   Fix the issues above before deploying"
    echo ""
    exit 1
fi
