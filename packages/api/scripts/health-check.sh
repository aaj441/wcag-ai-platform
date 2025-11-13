#!/bin/bash

##############################################################################
# WCAG AI Platform - Health Check and Recovery Script
# Monitors system health and triggers recovery if needed
# Usage: ./health-check.sh [base-url]
##############################################################################

BASE_URL="${1:-http://localhost:3001}"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🏥 WCAG AI Platform - Health Check${NC}"
echo "═══════════════════════════════════════════════════════════════"

# Check API health
echo -e "${YELLOW}1️⃣  Checking API health...${NC}"
API_HEALTH=$(curl -s -f "${BASE_URL}/health" 2>/dev/null)

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ API is healthy${NC}"
else
  echo -e "${RED}❌ API is unreachable or unhealthy${NC}"
fi

echo ""

# Check monitoring endpoints
echo -e "${YELLOW}2️⃣  Checking system components...${NC}"

HEALTH_REPORT=$(curl -s "${BASE_URL}/api/monitoring/health")

if [ -z "$HEALTH_REPORT" ]; then
  echo -e "${RED}❌ Failed to fetch health report${NC}"
else
  echo "$HEALTH_REPORT" | jq -r '
    .components | to_entries[] |
    (if .value.status == "healthy" then
      "\u001b[32m✅\u001b[0m \(.key): \(.value.message)"
    elif .value.status == "warning" then
      "\u001b[33m⚠️\u001b[0m  \(.key): \(.value.message)"
    else
      "\u001b[31m❌\u001b[0m \(.key): \(.value.message)"
    end)
  ' 2>/dev/null || echo "Error parsing health report"
fi

echo ""

# Check overall status
OVERALL=$(curl -s "${BASE_URL}/api/monitoring/health" | jq -r '.status' 2>/dev/null)

echo -e "${YELLOW}3️⃣  Overall Status${NC}"

if [ "$OVERALL" == "healthy" ]; then
  echo -e "${GREEN}✅ System is HEALTHY${NC}"
elif [ "$OVERALL" == "warning" ]; then
  echo -e "${YELLOW}⚠️  System has WARNINGS - Monitoring required${NC}"
else
  echo -e "${RED}❌ System is CRITICAL - Recovery recommended${NC}"

  echo ""
  echo -e "${YELLOW}4️⃣  Attempting automatic recovery...${NC}"

  RECOVERY=$(curl -s -X POST "${BASE_URL}/api/monitoring/recover")

  if [ -z "$RECOVERY" ]; then
    echo -e "${RED}❌ Recovery request failed${NC}"
  else
    RECOVERY_SUCCESS=$(echo "$RECOVERY" | jq -r '.success' 2>/dev/null)

    if [ "$RECOVERY_SUCCESS" == "true" ]; then
      echo -e "${GREEN}✅ Recovery completed${NC}"
      echo "$RECOVERY" | jq '.newStatus'
    else
      echo -e "${RED}❌ Recovery failed${NC}"
    fi
  fi
fi

echo ""

# Show detailed metrics
echo -e "${YELLOW}5️⃣  Detailed Metrics${NC}"
echo "───────────────────────────────────────────────────────────────"

DASHBOARD=$(curl -s "${BASE_URL}/api/monitoring/dashboard")

if [ -z "$DASHBOARD" ]; then
  echo -e "${RED}❌ Failed to fetch dashboard${NC}"
else
  echo "$DASHBOARD" | jq '
    "Queue Status:",
    "  • Waiting: \(.queue.waiting)",
    "  • Active: \(.queue.active)",
    "  • Failed: \(.queue.failed)",
    "  • Completed: \(.queue.completed)",
    "",
    "Puppeteer:",
    "  • Initialized: \(.puppeteer.initialized)",
    "  • Active Pages: \(.puppeteer.activePages)",
    "  • Memory: \(.puppeteer.memoryUsageMB)MB",
    "",
    "Reliability:",
    "  • Success Rate: \(.reliability.successRate)",
    "  • Avg Score: \(.reliability.averageScore)",
    "  • Total Scans: \(.reliability.totalScans)"
  ' 2>/dev/null
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Recommendations
echo -e "${YELLOW}📋 Recommendations:${NC}"

FAILED_COUNT=$(echo "$DASHBOARD" | jq '.queue.failed' 2>/dev/null || echo "0")

if [ "$FAILED_COUNT" -gt 10 ]; then
  echo -e "  • ${YELLOW}⚠️  High number of failed jobs (${FAILED_COUNT})${NC}"
  echo "     Check failed jobs: curl ${BASE_URL}/api/monitoring/queue/failed"
fi

MEMORY_MB=$(echo "$DASHBOARD" | jq '.puppeteer.memoryUsageMB' 2>/dev/null || echo "0")

if [ "$MEMORY_MB" -gt 500 ]; then
  echo -e "  • ${YELLOW}⚠️  High memory usage (${MEMORY_MB}MB)${NC}"
  echo "     Consider restarting the service"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo "✅ Health check completed!"
