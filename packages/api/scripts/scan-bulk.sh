#!/bin/bash

##############################################################################
# WCAG AI Platform - Bulk Scan Script
# Usage: ./scan-bulk.sh <prospect-ids-file> [queue-type] [base-url]
#
# Examples:
#   ./scan-bulk.sh prospect-ids.txt high http://localhost:3001
#   ./scan-bulk.sh prospects.csv low https://wcag-api.example.com
##############################################################################

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROSPECT_FILE="${1:-.}"
QUEUE_TYPE="${2:-low}"
BASE_URL="${3:-http://localhost:3001}"
API_ENDPOINT="${BASE_URL}/api/scan/queue"

# Validation
if [[ "$PROSPECT_FILE" == "." ]] || [[ -z "$PROSPECT_FILE" ]]; then
  echo -e "${RED}❌ Usage: ./scan-bulk.sh <prospect-ids-file> [queue-type] [base-url]${NC}"
  echo ""
  echo "Arguments:"
  echo "  prospect-ids-file: File containing prospect IDs (one per line)"
  echo "  queue-type:        'high' or 'low' (default: low)"
  echo "  base-url:          API base URL (default: http://localhost:3001)"
  echo ""
  echo "Examples:"
  echo "  ./scan-bulk.sh prospects.txt high"
  echo "  ./scan-bulk.sh prospects.txt low https://wcag-api.example.com"
  exit 1
fi

# Check if file exists
if [ ! -f "$PROSPECT_FILE" ]; then
  echo -e "${RED}❌ File not found: $PROSPECT_FILE${NC}"
  exit 1
fi

# Check if API is reachable
echo -e "${BLUE}🔗 Checking API connectivity...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health")

if [[ "$HTTP_CODE" != "200" ]]; then
  echo -e "${RED}❌ API is not reachable at ${BASE_URL} (HTTP ${HTTP_CODE})${NC}"
  exit 1
fi

echo -e "${GREEN}✅ API is healthy${NC}"

# Count total lines
TOTAL_LINES=$(wc -l < "$PROSPECT_FILE")

if [ "$TOTAL_LINES" -eq 0 ]; then
  echo -e "${RED}❌ File is empty: $PROSPECT_FILE${NC}"
  exit 1
fi

echo -e "${BLUE}📋 Starting bulk scan of $TOTAL_LINES prospects...${NC}"
echo -e "${BLUE}📍 Queue type: ${QUEUE_TYPE}${NC}"
echo -e "${BLUE}🔗 API endpoint: ${API_ENDPOINT}${NC}"
echo ""

# Process each line
PROCESSED=0
SUCCESSFUL=0
FAILED=0

while IFS= read -r prospectId || [ -n "$prospectId" ]; do
  # Skip empty lines and comments
  if [[ -z "$prospectId" ]] || [[ "$prospectId" =~ ^#.* ]]; then
    continue
  fi

  # Trim whitespace
  prospectId=$(echo "$prospectId" | xargs)

  PROCESSED=$((PROCESSED + 1))

  # Create URL from prospect ID (adjust this logic as needed)
  URL="https://example.com"  # Placeholder - your logic here

  # Show progress
  printf "\r${BLUE}[%d/%d]${NC} Processing... " "$PROCESSED" "$TOTAL_LINES"

  # Send request to API
  RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}" \
    -d "{
      \"prospectId\": \"$prospectId\",
      \"url\": \"$URL\",
      \"queue\": \"$QUEUE_TYPE\",
      \"priority\": 5
    }")

  # Extract HTTP status code (last line)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "201" ]]; then
    SUCCESSFUL=$((SUCCESSFUL + 1))
  else
    FAILED=$((FAILED + 1))
    echo -e "\n${RED}❌ Failed for $prospectId (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $BODY"
  fi

done < "$PROSPECT_FILE"

# Summary
echo ""
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Bulk scan completed!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "📊 Total processed: ${PROCESSED}"
echo -e "${GREEN}✅ Successful:     ${SUCCESSFUL}${NC}"
if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}❌ Failed:         ${FAILED}${NC}"
fi
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check queue health
echo -e "${BLUE}🔍 Checking queue health...${NC}"
HEALTH_RESPONSE=$(curl -s "${BASE_URL}/api/monitoring/queue/health")
echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"

echo ""
echo -e "${BLUE}📊 Monitor progress at: ${BASE_URL}/api/monitoring/dashboard${NC}"
echo -e "${BLUE}📋 View failed jobs at: ${BASE_URL}/api/monitoring/queue/failed${NC}"

exit 0
