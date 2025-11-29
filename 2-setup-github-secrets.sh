#!/bin/bash
# Step 2: Setup GitHub Secrets

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 STEP 2: SETUP GITHUB SECRETS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for Railway CLI
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
    echo "✅ Railway CLI installed"
    echo ""
fi

# Login to Railway
echo "Please log in to Railway (browser will open)..."
railway login
echo "✅ Logged in to Railway"
echo ""

# Link project
echo "Please select your WCAGAI project when prompted..."
railway link
echo "✅ Project linked"
echo ""

# Get Service ID
echo "Retrieving Railway Service ID..."
SERVICE_ID=$(railway status --json 2>/dev/null | jq -r '.serviceId' || echo "")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 GITHUB SECRETS CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$SERVICE_ID" ]; then
    echo "✅ Railway Service ID retrieved:"
    echo "   $SERVICE_ID"
    echo ""

    # Try to set via gh CLI
    if command -v gh &> /dev/null; then
        echo "Setting RAILWAY_SERVICE_ID via GitHub CLI..."
        echo "$SERVICE_ID" | gh secret set RAILWAY_SERVICE_ID
        echo "✅ RAILWAY_SERVICE_ID configured"
    else
        echo "Set this in GitHub Secrets:"
        echo "   Name:  RAILWAY_SERVICE_ID"
        echo "   Value: $SERVICE_ID"
    fi
else
    echo "⚠️  Could not retrieve Service ID automatically"
    echo "Get it from Railway dashboard URL:"
    echo "https://railway.app/project/[PROJECT_ID]/service/[SERVICE_ID]"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 RAILWAY TOKEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To get your Railway token:"
echo "1. Opening Railway tokens page..."

# Try to open browser
TOKEN_URL="https://railway.app/account/tokens"
if command -v xdg-open &> /dev/null; then
    xdg-open "$TOKEN_URL"
elif command -v open &> /dev/null; then
    open "$TOKEN_URL"
else
    echo "   Visit: $TOKEN_URL"
fi

echo ""
echo "2. Click 'Create New Token'"
echo "3. Name: 'GitHub Actions Deploy'"
echo "4. Copy the token"
echo ""

read -p "Paste your Railway token here (hidden): " -s RAILWAY_TOKEN
echo ""

if [ -n "$RAILWAY_TOKEN" ]; then
    # Try to set via gh CLI
    if command -v gh &> /dev/null; then
        echo "$RAILWAY_TOKEN" | gh secret set RAILWAY_TOKEN
        echo "✅ RAILWAY_TOKEN configured"
    else
        echo "Set this in GitHub Secrets:"
        echo "   Name:  RAILWAY_TOKEN"
        echo "   Value: (your token)"
    fi
fi

echo ""
echo "GitHub Secrets page:"
echo "👉 https://github.com/aaj441/wcag-ai-platform/settings/secrets/actions"
echo ""

# Verify secrets if gh CLI available
if command -v gh &> /dev/null; then
    echo "Verifying GitHub secrets..."
    gh secret list
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ STEP 2 COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next: Run ./3-setup-railway-env.sh"
echo ""
