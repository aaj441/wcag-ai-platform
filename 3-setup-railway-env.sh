#!/bin/bash
# Step 3: Setup Railway Environment

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  STEP 3: SETUP RAILWAY ENVIRONMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "Railway CLI not found. Run ./2-setup-github-secrets.sh first"
    exit 1
fi

# Verify we're linked
echo "Verifying Railway connection..."
railway status >/dev/null 2>&1 || {
    echo "Not linked to Railway. Run ./2-setup-github-secrets.sh first"
    exit 1
}
echo "✅ Connected to Railway"
echo ""

# Check for databases
echo "Checking Railway plugins..."
echo ""

HAS_POSTGRES=$(railway variables 2>/dev/null | grep -c "DATABASE_URL" || echo "0")
HAS_REDIS=$(railway variables 2>/dev/null | grep -c "REDIS" || echo "0")

if [ "$HAS_POSTGRES" -eq 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 ADD POSTGRESQL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "PostgreSQL plugin not found."
    echo ""
    echo "To add it:"
    echo "1. Go to your Railway project dashboard"
    echo "2. Click 'New' → 'Database' → 'Add PostgreSQL'"
    echo "3. Railway will auto-create DATABASE_URL"
    echo ""
    read -p "Press ENTER when PostgreSQL is added..."
else
    echo "✅ PostgreSQL configured"
fi

if [ "$HAS_REDIS" -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚡ ADD REDIS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Redis plugin not found."
    echo ""
    echo "To add it:"
    echo "1. Go to your Railway project dashboard"
    echo "2. Click 'New' → 'Database' → 'Add Redis'"
    echo "3. Railway will auto-create Redis variables"
    echo ""
    read -p "Press ENTER when Redis is added..."
else
    echo "✅ Redis configured"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 ENVIRONMENT VARIABLES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Current environment variables:"
railway variables
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Required variables (see RAILWAY_ENV_TEMPLATE.txt):"
echo ""
echo "✅ DATABASE_URL (auto from PostgreSQL)"
echo "✅ REDIS_HOST, REDIS_PORT, REDIS_PASSWORD (auto from Redis)"
echo ""
echo "🔑 YOU NEED TO ADD:"
echo "   - OPENAI_API_KEY (required)"
echo "   - SENTRY_DSN (required)"
echo "   - CLERK_SECRET_KEY (recommended)"
echo "   - STRIPE_SECRET_KEY (recommended)"
echo "   - See API_KEYS_SETUP_GUIDE.md for all keys"
echo ""

read -p "Would you like to add variables now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Opening Railway dashboard variables page..."

    # Get project URL
    PROJECT_ID=$(railway status --json 2>/dev/null | jq -r '.projectId' || echo "")
    SERVICE_ID=$(railway status --json 2>/dev/null | jq -r '.serviceId' || echo "")

    if [ -n "$PROJECT_ID" ] && [ -n "$SERVICE_ID" ]; then
        VAR_URL="https://railway.app/project/$PROJECT_ID/service/$SERVICE_ID/variables"

        if command -v xdg-open &> /dev/null; then
            xdg-open "$VAR_URL"
        elif command -v open &> /dev/null; then
            open "$VAR_URL"
        else
            echo "Visit: $VAR_URL"
        fi
    else
        echo "Visit your Railway project → Service → Variables tab"
    fi

    echo ""
    echo "Reference files:"
    echo "  - RAILWAY_ENV_TEMPLATE.txt (template with all variables)"
    echo "  - API_KEYS_SETUP_GUIDE.md (how to get API keys)"
    echo ""

    read -p "Press ENTER when variables are configured..."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ STEP 3 COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next: Run ./4-deploy.sh"
echo ""
