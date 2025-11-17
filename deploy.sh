#!/bin/bash

# WCAGAI Platform - Quick Deployment Script
# This script guides you through the automated deployment process

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 WCAGAI AUTOMATED DEPLOYMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Railway CLI
echo "Step 1/6: Checking Railway CLI..."
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI not found${NC}"
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
    echo -e "${GREEN}✅ Railway CLI installed${NC}"
else
    echo -e "${GREEN}✅ Railway CLI already installed${NC}"
fi
echo ""

# Step 2: Railway Login
echo "Step 2/6: Railway Authentication..."
echo "Please log in to Railway in the browser window that opens..."
railway login
echo -e "${GREEN}✅ Logged in to Railway${NC}"
echo ""

# Step 3: Link Project
echo "Step 3/6: Linking Railway Project..."
echo "If prompted, select your WCAGAI project"
railway link
echo -e "${GREEN}✅ Project linked${NC}"
echo ""

# Step 4: Get Railway Tokens
echo "Step 4/6: Retrieving Railway Configuration..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 GITHUB SECRETS NEEDED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get service ID
SERVICE_ID=$(railway status --json | jq -r '.serviceId' 2>/dev/null || echo "")
if [ -n "$SERVICE_ID" ]; then
    echo -e "${GREEN}Service ID:${NC} $SERVICE_ID"
    echo ""
    echo "Add this to GitHub Secrets:"
    echo "  Name: RAILWAY_SERVICE_ID"
    echo "  Value: $SERVICE_ID"
else
    echo -e "${RED}❌ Could not retrieve Service ID${NC}"
    echo "Get it manually from Railway dashboard URL"
fi
echo ""

# Get Railway token
echo "To get your RAILWAY_TOKEN:"
echo "1. Visit: https://railway.app/account/tokens"
echo "2. Click 'Create New Token'"
echo "3. Name it: 'GitHub Actions Deploy'"
echo "4. Copy the token"
echo ""
echo "Add to GitHub Secrets:"
echo "  Name: RAILWAY_TOKEN"
echo "  Value: <your-token>"
echo ""

echo "Configure secrets here:"
echo "👉 https://github.com/aaj441/wcag-ai-platform/settings/secrets/actions"
echo ""

read -p "Press ENTER when GitHub secrets are configured..."
echo ""

# Step 5: Verify Railway Environment
echo "Step 5/6: Verifying Railway Environment..."
echo ""

echo "Checking required environment variables..."
HAS_DATABASE=$(railway variables | grep -c "DATABASE_URL" || echo "0")
HAS_REDIS=$(railway variables | grep -c "REDIS" || echo "0")

if [ "$HAS_DATABASE" -gt 0 ]; then
    echo -e "${GREEN}✅ PostgreSQL configured${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL not found - add PostgreSQL plugin in Railway dashboard${NC}"
fi

if [ "$HAS_REDIS" -gt 0 ]; then
    echo -e "${GREEN}✅ Redis configured${NC}"
else
    echo -e "${YELLOW}⚠️  Redis not found - add Redis plugin in Railway dashboard${NC}"
fi

echo ""
echo "Review all environment variables:"
railway variables
echo ""

echo "If any required variables are missing, see:"
echo "  - RAILWAY_ENV_TEMPLATE.txt (template)"
echo "  - API_KEYS_SETUP_GUIDE.md (how to get API keys)"
echo ""

read -p "Press ENTER when Railway environment is ready..."
echo ""

# Step 6: Ready to Deploy
echo "Step 6/6: Ready for Deployment!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Create/Merge PR:"
echo "   👉 https://github.com/aaj441/wcag-ai-platform/compare/main...claude/production-hardening-01VaiUp8MLXU3JjtGyyzVTzy?expand=1"
echo ""
echo "2. GitHub Actions will automatically:"
echo "   ✅ Validate code (TypeScript, tests)"
echo "   ✅ Deploy to Railway"
echo "   ✅ Run database migrations"
echo "   ✅ Apply performance indexes"
echo "   ✅ Run health checks"
echo "   ✅ Auto-rollback if issues detected"
echo ""
echo "3. Monitor deployment:"
echo "   👉 https://github.com/aaj441/wcag-ai-platform/actions"
echo ""
echo "4. Once deployed, check health:"
railway run curl -s \$RAILWAY_STATIC_URL/health/detailed | jq . 2>/dev/null || echo "   (Deploy first, then run: railway run curl \$RAILWAY_STATIC_URL/health/detailed)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 SETUP COMPLETE - READY FOR AUTOMATED DEPLOYMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Deployment time: ~10-15 minutes"
echo "Rollback time: <2 minutes (automatic)"
echo ""
