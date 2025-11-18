#!/bin/bash
#
# Railway Environment Validation Script
#
# Validates Railway configuration and environment variables
#
# Usage: ./deployment/scripts/validate-railway.sh
#

set -e

echo "🚂 Validating Railway Environment..."
echo ""

ERRORS=0

# Check Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed"
    echo "   Install: npm install -g @railway/cli"
    ((ERRORS++))
else
    echo "✅ Railway CLI is installed"
fi

# Check Railway token
if [ -z "$RAILWAY_TOKEN" ]; then
    echo "❌ RAILWAY_TOKEN environment variable is not set"
    echo "   Get token from: https://railway.app/account/tokens"
    ((ERRORS++))
else
    echo "✅ RAILWAY_TOKEN is set"
fi

# Check Railway service ID
if [ -z "$RAILWAY_SERVICE_ID" ]; then
    echo "⚠️  RAILWAY_SERVICE_ID not set (using default service)"
else
    echo "✅ RAILWAY_SERVICE_ID is set: $RAILWAY_SERVICE_ID"
fi

# Try to get Railway status
if [ -n "$RAILWAY_TOKEN" ]; then
    echo ""
    echo "📊 Checking Railway service status..."
    
    if railway status > /dev/null 2>&1; then
        echo "✅ Railway service is accessible"
        
        # Show current deployment info
        CURRENT_ENV=$(railway status --json 2>/dev/null | jq -r '.environment' || echo "unknown")
        echo "   Current environment: $CURRENT_ENV"
    else
        echo "❌ Cannot access Railway service"
        echo "   Check your RAILWAY_TOKEN and service configuration"
        ((ERRORS++))
    fi
fi

echo ""

# Check required environment variables in Railway
echo "🔐 Checking required environment variables..."
REQUIRED_VARS=(
    "DATABASE_URL"
    "REDIS_URL"
    "NODE_ENV"
)

# Note: Can't easily check Railway env vars without deploying
# This is a placeholder for future enhancement
echo "⚠️  Railway env var validation requires deployment (skipped)"
echo ""

# Summary
if [ $ERRORS -eq 0 ]; then
    echo "✅ Railway validation passed"
    exit 0
else
    echo "❌ Railway validation failed with $ERRORS errors"
    exit 1
fi
