#!/bin/bash
#
# Vercel Environment Validation Script
#
# Validates Vercel configuration and deployment readiness
#
# Usage: ./deployment/scripts/validate-vercel.sh
#

set -e

echo "🌐 Validating Vercel Environment..."
echo ""

ERRORS=0

# Check if webapp exists
if [ ! -d "packages/webapp" ]; then
    echo "⚠️  Webapp directory not found"
    echo "   Vercel deployment not applicable"
    exit 0
fi

# Check Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed"
    echo "   Install: npm install -g vercel"
    ((ERRORS++))
else
    echo "✅ Vercel CLI is installed"
    VERCEL_VERSION=$(vercel --version)
    echo "   Version: $VERCEL_VERSION"
fi

# Check Vercel token
if [ -z "$VERCEL_TOKEN" ]; then
    echo "⚠️  VERCEL_TOKEN environment variable is not set"
    echo "   You may need to login: vercel login"
else
    echo "✅ VERCEL_TOKEN is set"
fi

# Check for vercel.json configuration
if [ -f "packages/webapp/vercel.json" ]; then
    echo "✅ vercel.json configuration found"
else
    echo "⚠️  vercel.json not found (using defaults)"
fi

# Check package.json exists
if [ -f "packages/webapp/package.json" ]; then
    echo "✅ package.json found"
    
    # Check build script
    if grep -q '"build"' packages/webapp/package.json; then
        echo "✅ Build script configured"
    else
        echo "❌ Build script missing in package.json"
        ((ERRORS++))
    fi
else
    echo "❌ package.json not found"
    ((ERRORS++))
fi

# Check node_modules
if [ -d "packages/webapp/node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  node_modules not found (run: npm install)"
fi

echo ""

# Try to get Vercel project info
if command -v vercel &> /dev/null && [ -n "$VERCEL_TOKEN" ]; then
    echo "📊 Checking Vercel project..."
    
    cd packages/webapp
    if vercel inspect > /dev/null 2>&1; then
        echo "✅ Vercel project is linked"
    else
        echo "⚠️  Vercel project not linked (run: vercel link)"
    fi
    cd ../..
fi

echo ""

# Summary
if [ $ERRORS -eq 0 ]; then
    echo "✅ Vercel validation passed"
    exit 0
else
    echo "❌ Vercel validation failed with $ERRORS errors"
    exit 1
fi
