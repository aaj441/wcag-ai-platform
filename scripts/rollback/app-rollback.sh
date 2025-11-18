#!/bin/bash
#
# Application Rollback Script
# Quickly rollback to previous deployment on Railway/Vercel
#
# Usage: ./app-rollback.sh [service-name] [deployment-id]
# Example: ./app-rollback.sh wcagai-api
#          ./app-rollback.sh wcagai-api d-abc123xyz
#

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Parse arguments
SERVICE_NAME=${1:-"wcagai-api"}
DEPLOYMENT_ID=$2

echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   APPLICATION ROLLBACK                 ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo -e "${RED}Error: Railway CLI not installed${NC}"
  echo "Install with: npm install -g @railway/cli"
  exit 1
fi

# Check if RAILWAY_TOKEN is set
if [ -z "$RAILWAY_TOKEN" ]; then
  echo -e "${YELLOW}Warning: RAILWAY_TOKEN not set, using interactive login${NC}"
  railway login
fi

# List recent deployments
echo -e "${YELLOW}Recent deployments for $SERVICE_NAME:${NC}"
echo ""
railway deployments --service "$SERVICE_NAME" --limit 5

# If no deployment ID specified, use previous deployment
if [ -z "$DEPLOYMENT_ID" ]; then
  echo ""
  echo -e "${YELLOW}No deployment ID specified${NC}"
  echo "Rolling back to previous deployment..."
  echo ""

  # Confirmation
  read -p "Confirm rollback to previous deployment? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Rollback cancelled${NC}"
    exit 0
  fi

  # Execute rollback
  echo ""
  echo -e "${YELLOW}Executing rollback...${NC}"
  railway rollback --service "$SERVICE_NAME"
else
  echo ""
  echo -e "${YELLOW}Rolling back to deployment: $DEPLOYMENT_ID${NC}"
  echo ""

  # Confirmation
  read -p "Confirm rollback to $DEPLOYMENT_ID? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Rollback cancelled${NC}"
    exit 0
  fi

  # Execute rollback to specific deployment
  echo ""
  echo -e "${YELLOW}Executing rollback...${NC}"
  railway rollback --service "$SERVICE_NAME" --deployment "$DEPLOYMENT_ID"
fi

# Wait for rollback to complete
echo ""
echo -e "${YELLOW}Waiting for rollback to complete...${NC}"
sleep 10

# Verify rollback
echo ""
echo -e "${YELLOW}Verifying rollback...${NC}"

# Check deployment status
CURRENT_DEPLOYMENT=$(railway deployments --service "$SERVICE_NAME" --limit 1 | tail -n 1)
echo "Current deployment:"
echo "$CURRENT_DEPLOYMENT"

# Health check
echo ""
echo -e "${YELLOW}Running health check...${NC}"

# Determine API URL based on service
if [[ "$SERVICE_NAME" == *"api"* ]]; then
  API_URL="${API_URL:-https://api.wcagai.com}"

  # Basic health check
  HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")

  if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ Health check passed (HTTP $HEALTH_STATUS)${NC}"
  else
    echo -e "${RED}✗ Health check failed (HTTP $HEALTH_STATUS)${NC}"
    echo "Manual verification required"
  fi

  # Readiness check
  echo ""
  READINESS=$(curl -s "$API_URL/health/ready" || echo '{"status":"error"}')
  echo "Readiness check:"
  echo "$READINESS" | jq . || echo "$READINESS"
fi

# Monitor logs
echo ""
echo -e "${YELLOW}Tailing logs (Ctrl+C to exit)...${NC}"
echo "Watch for any errors after rollback"
echo ""
sleep 2

railway logs --service "$SERVICE_NAME" --tail

# If we get here, user stopped tailing logs
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ROLLBACK PROCEDURE COMPLETE          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor application metrics"
echo "  2. Check error rates in Sentry"
echo "  3. Verify user-facing functionality"
echo "  4. Investigate root cause of failure"
echo "  5. Prepare fix for next deployment"
echo ""
