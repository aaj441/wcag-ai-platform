#!/bin/bash
#
# Production Rollback Script
#
# Safely rolls back to previous deployment with verification
#
# Usage: ./deployment/scripts/rollback.sh [--force]
#

set -e

FORCE_ROLLBACK=false

# Parse arguments
if [ "$1" == "--force" ]; then
    FORCE_ROLLBACK=true
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 PRODUCTION ROLLBACK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Railway CLI installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not installed"
    echo "   Install: npm install -g @railway/cli"
    exit 1
fi

# Check Railway token
if [ -z "$RAILWAY_TOKEN" ]; then
    echo "❌ RAILWAY_TOKEN environment variable not set"
    echo "   Get token from: https://railway.app/account/tokens"
    exit 1
fi

# Get current deployment info
echo "📊 Fetching current deployment info..."
CURRENT_DEPLOYMENT=$(railway status --service ${RAILWAY_SERVICE_ID:-wcagaii-backend} --json 2>/dev/null || echo "{}")

if [ "$CURRENT_DEPLOYMENT" == "{}" ]; then
    echo "❌ Could not fetch deployment info"
    echo "   Check RAILWAY_TOKEN and service configuration"
    exit 1
fi

CURRENT_COMMIT=$(echo "$CURRENT_DEPLOYMENT" | jq -r '.deployment.meta.commitSha // "unknown"')
CURRENT_TIME=$(echo "$CURRENT_DEPLOYMENT" | jq -r '.deployment.createdAt // "unknown"')

echo "   Current deployment:"
echo "   - Commit: $CURRENT_COMMIT"
echo "   - Deployed: $CURRENT_TIME"
echo ""

# Confirmation prompt (unless --force)
if [ "$FORCE_ROLLBACK" != "true" ]; then
    echo "⚠️  This will rollback to the previous deployment"
    echo "   Current deployment will be replaced"
    echo ""
    read -p "Continue with rollback? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        echo "❌ Rollback cancelled by user"
        exit 1
    fi
    echo ""
fi

# Perform rollback
echo "🔄 Initiating rollback..."
railway rollback --service ${RAILWAY_SERVICE_ID:-wcagaii-backend} --environment production || {
    echo "❌ Rollback command failed"
    echo "   Try rolling back manually via Railway dashboard"
    echo "   Dashboard: https://railway.app/dashboard"
    exit 1
}

echo "✅ Rollback command executed"
echo ""

# Wait for rollback to complete
echo "⏳ Waiting for rollback to complete (60 seconds)..."
sleep 60

# Get deployment URL
DEPLOY_URL=$(railway status --service ${RAILWAY_SERVICE_ID:-wcagaii-backend} --json 2>/dev/null | jq -r '.url' || echo "")

if [ -z "$DEPLOY_URL" ]; then
    echo "⚠️  Could not determine deployment URL"
    echo "   Manual verification required"
    DEPLOY_URL="https://api.wcagai.com"
fi

echo "🔗 Deployment URL: $DEPLOY_URL"
echo ""

# Health check
echo "🏥 Performing health check..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/health" || echo "000")

    if [ "$HTTP_CODE" == "200" ]; then
        echo "✅ Health check passed (HTTP 200)"
        break
    fi

    ((RETRY_COUNT++))
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES: HTTP $HTTP_CODE, retrying in 10s..."
    sleep 10
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Health check failed after $MAX_RETRIES attempts"
    echo "   Manual intervention required"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check Railway logs: railway logs --service wcagaii-backend"
    echo "  2. Check Railway dashboard: https://railway.app/dashboard"
    echo "  3. Verify environment variables are set"
    echo "  4. Check database connectivity"
    exit 1
fi

echo ""

# Detailed health check
echo "🔍 Performing detailed health check..."
DETAILED_HEALTH=$(curl -s "$DEPLOY_URL/health/detailed" || echo "{}")

if echo "$DETAILED_HEALTH" | jq empty 2>/dev/null; then
    STATUS=$(echo "$DETAILED_HEALTH" | jq -r '.status // "unknown"')
    DB_HEALTHY=$(echo "$DETAILED_HEALTH" | jq -r '.checks.database.healthy // false')
    REDIS_HEALTHY=$(echo "$DETAILED_HEALTH" | jq -r '.checks.redis.healthy // false')

    echo "   System Status: $STATUS"
    echo "   Database: $DB_HEALTHY"
    echo "   Redis: $REDIS_HEALTHY"

    if [ "$STATUS" == "healthy" ] && [ "$DB_HEALTHY" == "true" ]; then
        echo "✅ Detailed health check passed"
    else
        echo "⚠️  System is in degraded state"
        echo "   Manual review recommended"
    fi
else
    echo "⚠️  Could not parse detailed health response"
    echo "   Manual verification recommended"
fi

echo ""

# Create rollback report
REPORT_FILE="rollback-report-$(date +%Y%m%d-%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
PRODUCTION ROLLBACK REPORT
==========================

Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Performed by: ${USER:-unknown}
Force rollback: $FORCE_ROLLBACK

Previous Deployment:
- Commit: $CURRENT_COMMIT
- Deployed: $CURRENT_TIME

Health Check Results:
- Basic health: $([ "$HTTP_CODE" == "200" ] && echo "PASS" || echo "FAIL")
- System status: $STATUS
- Database: $DB_HEALTHY
- Redis: $REDIS_HEALTHY

Deployment URL: $DEPLOY_URL

Next Steps:
1. Monitor Sentry for errors
2. Check error rates in metrics
3. Review customer reports
4. Create incident report if needed
5. Fix issue that caused rollback
6. Test fix in staging before re-deploying

Troubleshooting:
- Logs: railway logs --service wcagaii-backend
- Dashboard: https://railway.app/dashboard
- Sentry: https://sentry.io/organizations/wcagai/
EOF

echo "📄 Rollback report saved: $REPORT_FILE"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 ROLLBACK SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Status: $([ "$HTTP_CODE" == "200" ] && echo "✅ SUCCESS" || echo "❌ NEEDS ATTENTION")"
echo "Deployment URL: $DEPLOY_URL"
echo "Health Status: $STATUS"
echo ""
echo "Next Steps:"
echo "  1. Monitor application for 30 minutes"
echo "  2. Check Sentry for new errors"
echo "  3. Verify key user flows working"
echo "  4. Create incident report"
echo "  5. Fix root cause before re-deploying"
echo ""
echo "Report: $REPORT_FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
