#!/bin/bash
#
# Unified Deployment Script
#
# Deploys both API (Railway) and Webapp (Vercel) in coordinated fashion
# Includes pre-checks, health validation, and rollback capability
#
# Usage: ./deployment/scripts/deploy-unified.sh [staging|production]
#

set -e

ENVIRONMENT=${1:-production}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 UNIFIED DEPLOYMENT TO $ENVIRONMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "   Usage: $0 [staging|production]"
    exit 1
fi

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."
if ! ./deployment/scripts/verify-deployment-harmony.sh; then
    echo "❌ Pre-deployment checks failed"
    exit 1
fi
echo "✅ Pre-deployment checks passed"
echo ""

# Validate Railway environment
echo "🚂 Validating Railway environment..."
if ! ./deployment/scripts/validate-railway.sh; then
    echo "❌ Railway validation failed"
    exit 1
fi
echo "✅ Railway validation passed"
echo ""

# Deploy API to Railway
echo "📦 Deploying API to Railway..."
cd packages/api

if [ "$ENVIRONMENT" == "production" ]; then
    railway up --service wcagaii-backend --environment production
else
    railway up --service wcagaii-backend --environment staging
fi

API_DEPLOY_EXIT=$?
cd ../..

if [ $API_DEPLOY_EXIT -ne 0 ]; then
    echo "❌ API deployment failed"
    exit 1
fi

echo "✅ API deployed successfully"
echo ""

# Wait for API to be healthy
echo "⏳ Waiting for API to become healthy..."
sleep 30

API_URL=$(railway status --service wcagaii-backend --environment $ENVIRONMENT --json | jq -r '.url')
echo "   API URL: $API_URL"

# Health check with retries
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo "✅ API health check passed"
        break
    fi
    
    ((RETRY_COUNT++))
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES: HTTP $HTTP_CODE, retrying..."
    sleep 10
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ API health check failed after $MAX_RETRIES attempts"
    echo "   Initiating rollback..."
    railway rollback --service wcagaii-backend --environment $ENVIRONMENT
    exit 1
fi
echo ""

# Deploy Webapp to Vercel (if exists)
if [ -d "packages/webapp" ]; then
    echo "🌐 Deploying Webapp to Vercel..."
    
    if ! ./deployment/scripts/validate-vercel.sh; then
        echo "⚠️  Vercel validation failed, skipping webapp deployment"
    else
        cd packages/webapp
        
        if [ "$ENVIRONMENT" == "production" ]; then
            vercel --prod --yes
        else
            vercel --yes
        fi
        
        cd ../..
        echo "✅ Webapp deployed successfully"
    fi
else
    echo "⚠️  Webapp directory not found, skipping"
fi
echo ""

# Final smoke tests
echo "🧪 Running smoke tests..."
if [ -f "deployment/scripts/smoke-test.sh" ]; then
    if ./deployment/scripts/smoke-test.sh "$API_URL"; then
        echo "✅ Smoke tests passed"
    else
        echo "⚠️  Smoke tests failed (deployment succeeded but tests failed)"
    fi
else
    echo "⚠️  smoke-test.sh not found, skipping"
fi
echo ""

# Success
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEPLOYMENT COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Environment: $ENVIRONMENT"
echo "API URL: $API_URL"
echo "Deployed at: $(date)"
echo ""
echo "Next steps:"
echo "  1. Monitor logs for errors"
echo "  2. Check Sentry for exceptions"
echo "  3. Verify key user flows"
echo ""
