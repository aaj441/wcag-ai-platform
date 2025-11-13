#!/bin/bash

##############################################################################
# WCAG AI Platform - Queue Monitor Script
# Real-time monitoring of scan queue health and metrics
# Usage: ./monitor-queue.sh [base-url] [refresh-interval]
##############################################################################

BASE_URL="${1:-http://localhost:3001}"
REFRESH_INTERVAL="${2:-5}"

# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Clear screen function
clear_screen() {
  clear
}

# Print header
print_header() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC}  WCAG AI Platform - Queue Monitor                           ${BLUE}║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo -e "🔗 API: ${BASE_URL}"
  echo -e "⏱️  Refreshing every ${REFRESH_INTERVAL}s"
  echo ""
}

# Fetch and display data
fetch_data() {
  echo -e "${YELLOW}📊 Queue Statistics${NC}"
  echo "─────────────────────────────────────────────────────────────────"

  STATS=$(curl -s "${BASE_URL}/api/monitoring/queue/stats")

  if [ -z "$STATS" ]; then
    echo -e "${RED}❌ Failed to fetch queue stats${NC}"
    return 1
  fi

  echo "$STATS" | jq -r '
    "Waiting:   \(.stats.waiting // 0) jobs",
    "Active:    \(.stats.active // 0) jobs",
    "Completed: \(.stats.completed // 0) jobs",
    "Failed:    \(.stats.failed // 0) jobs",
    "Delayed:   \(.stats.delayed // 0) jobs"
  ' 2>/dev/null || echo "Error parsing stats"

  echo ""
  echo -e "${YELLOW}🏥 Health Status${NC}"
  echo "─────────────────────────────────────────────────────────────────"

  HEALTH=$(curl -s "${BASE_URL}/api/monitoring/queue/health")

  if [ -z "$HEALTH" ]; then
    echo -e "${RED}❌ Failed to fetch health status${NC}"
    return 1
  fi

  echo "$HEALTH" | jq -r '
    if .healthy then
      "Status:    \u001b[32m✅ Healthy\u001b[0m"
    else
      "Status:    \u001b[31m⚠️  Warning\u001b[0m"
    end,
    "Message:   \(.message // "N/A")"
  ' 2>/dev/null || echo "Error parsing health"

  echo ""
  echo -e "${YELLOW}🔧 Failed Jobs${NC}"
  echo "─────────────────────────────────────────────────────────────────"

  FAILED_JOBS=$(curl -s "${BASE_URL}/api/monitoring/queue/failed?limit=5")

  if [ -z "$FAILED_JOBS" ]; then
    echo -e "${RED}❌ Failed to fetch failed jobs${NC}"
    return 1
  fi

  FAILED_COUNT=$(echo "$FAILED_JOBS" | jq '.count // 0')

  if [ "$FAILED_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ No failed jobs${NC}"
  else
    echo -e "${RED}❌ ${FAILED_COUNT} failed jobs:${NC}"
    echo "$FAILED_JOBS" | jq -r '.jobs[] |
      "  - \(.url) (Attempts: \(.attempts))"
    ' 2>/dev/null || echo "Error parsing failed jobs"
  fi

  echo ""
  echo -e "${YELLOW}📈 Reliability (Last 7 Days)${NC}"
  echo "─────────────────────────────────────────────────────────────────"

  RELIABILITY=$(curl -s "${BASE_URL}/api/monitoring/reliability")

  if [ -z "$RELIABILITY" ]; then
    echo -e "${RED}❌ Failed to fetch reliability metrics${NC}"
    return 1
  fi

  echo "$RELIABILITY" | jq -r '
    "Success Rate: \(.summary.successRate)",
    "Total Scans:  \(.summary.totalScans)",
    "Avg Score:    \(.summary.averageScore)"
  ' 2>/dev/null || echo "Error parsing reliability"

  echo ""
  echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"
  echo -e "Last updated: $(date '+%Y-%m-%d %H:%M:%S')"
  echo -e "${BLUE}Press Ctrl+C to exit${NC}"
}

# Main loop
while true; do
  clear_screen
  print_header
  fetch_data
  sleep "$REFRESH_INTERVAL"
done
