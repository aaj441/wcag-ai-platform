#!/bin/bash

# Production Monitoring Script
# Checks health, security, and performance of production API

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-https://your-api.railway.app}"
ALERT_EMAIL="${ALERT_EMAIL:-alerts@yourdomain.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Metrics
HEALTH_STATUS=""
RESPONSE_TIME=0
ERRORS_COUNT=0
RATE_LIMIT_HITS=0

echo "================================================"
echo "🔍 Production Monitoring - WCAG AI Platform"
echo "================================================"
echo "API URL: $API_URL"
echo "Time: $(date)"
echo "================================================"

# Function to send alerts
send_alert() {
  local message="$1"
  local severity="$2"

  echo -e "${RED}[ALERT] $message${NC}"

  # Email alert (requires mailutils)
  if command -v mail &> /dev/null; then
    echo "$message" | mail -s "[$severity] WCAG API Alert" $ALERT_EMAIL
  fi

  # Slack webhook
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"[$severity] $message\"}" \
      --silent
  fi
}

# 1. Health Check
echo -e "\n${YELLOW}[CHECK]${NC} Testing health endpoint..."
HEALTH_START=$(date +%s%N)
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health" || echo "ERROR\n000")
HEALTH_END=$(date +%s%N)
RESPONSE_TIME=$(( ($HEALTH_END - $HEALTH_START) / 1000000 ))

HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Health check passed${NC} (${RESPONSE_TIME}ms)"
  HEALTH_STATUS=$(echo "$HEALTH_BODY" | jq -r '.status' 2>/dev/null || echo "unknown")
else
  send_alert "Health check failed with status $HTTP_CODE" "CRITICAL"
  ERRORS_COUNT=$((ERRORS_COUNT + 1))
fi

# 2. Response Time Check
echo -e "\n${YELLOW}[CHECK]${NC} Checking response time..."
if [ $RESPONSE_TIME -lt 500 ]; then
  echo -e "${GREEN}✅ Response time excellent${NC} (${RESPONSE_TIME}ms)"
elif [ $RESPONSE_TIME -lt 1000 ]; then
  echo -e "${YELLOW}⚠️  Response time acceptable${NC} (${RESPONSE_TIME}ms)"
else
  echo -e "${RED}❌ Response time slow${NC} (${RESPONSE_TIME}ms)"
  send_alert "API response time is ${RESPONSE_TIME}ms (threshold: 1000ms)" "WARNING"
fi

# 3. Security Headers Check
echo -e "\n${YELLOW}[CHECK]${NC} Verifying security headers..."
HEADERS=$(curl -s -I "$API_URL/health")

check_header() {
  local header=$1
  local name=$2

  if echo "$HEADERS" | grep -qi "$header"; then
    echo -e "${GREEN}✅ $name present${NC}"
  else
    echo -e "${RED}❌ $name missing${NC}"
    send_alert "Security header missing: $name" "HIGH"
    ERRORS_COUNT=$((ERRORS_COUNT + 1))
  fi
}

check_header "Strict-Transport-Security" "HSTS"
check_header "X-Frame-Options" "X-Frame-Options"
check_header "Content-Security-Policy" "CSP"
check_header "X-Content-Type-Options" "X-Content-Type-Options"

# 4. Rate Limiting Check
echo -e "\n${YELLOW}[CHECK]${NC} Testing rate limiting..."
RATE_LIMIT_COUNT=0
for i in {1..105}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/drafts")
  if [ "$STATUS" = "429" ]; then
    RATE_LIMIT_COUNT=$((RATE_LIMIT_COUNT + 1))
  fi
done

if [ $RATE_LIMIT_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Rate limiting working${NC} ($RATE_LIMIT_COUNT rate limited)"
else
  echo -e "${RED}❌ Rate limiting not working${NC}"
  send_alert "Rate limiting not functioning correctly" "HIGH"
  ERRORS_COUNT=$((ERRORS_COUNT + 1))
fi

# 5. Database Connection Check
echo -e "\n${YELLOW}[CHECK]${NC} Checking database connectivity..."
DETAILED_HEALTH=$(curl -s "$API_URL/health/detailed")
DB_STATUS=$(echo "$DETAILED_HEALTH" | jq -r '.checks.database.status' 2>/dev/null || echo "unknown")

if [ "$DB_STATUS" = "healthy" ]; then
  echo -e "${GREEN}✅ Database connection healthy${NC}"
else
  echo -e "${RED}❌ Database connection issues${NC}"
  send_alert "Database connection status: $DB_STATUS" "CRITICAL"
  ERRORS_COUNT=$((ERRORS_COUNT + 1))
fi

# 6. SSL Certificate Check
echo -e "\n${YELLOW}[CHECK]${NC} Checking SSL certificate..."
SSL_EXPIRY=$(echo | openssl s_client -servername $(echo $API_URL | sed 's|https://||' | sed 's|/.*||') -connect $(echo $API_URL | sed 's|https://||' | sed 's|/.*||'):443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

if [ -n "$SSL_EXPIRY" ]; then
  echo -e "${GREEN}✅ SSL certificate valid${NC}"
  echo "   Expires: $SSL_EXPIRY"

  # Check if expiring soon (30 days)
  EXPIRY_SECONDS=$(date -d "$SSL_EXPIRY" +%s 2>/dev/null || echo "0")
  NOW_SECONDS=$(date +%s)
  DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_SECONDS - $NOW_SECONDS) / 86400 ))

  if [ $DAYS_UNTIL_EXPIRY -lt 30 ] && [ $DAYS_UNTIL_EXPIRY -gt 0 ]; then
    echo -e "${YELLOW}⚠️  SSL certificate expires in $DAYS_UNTIL_EXPIRY days${NC}"
    send_alert "SSL certificate expires in $DAYS_UNTIL_EXPIRY days" "WARNING"
  fi
fi

# 7. Error Rate Check (from logs if available)
echo -e "\n${YELLOW}[CHECK]${NC} Checking error rates..."
# This would typically query your logging service (Sentry, CloudWatch, etc.)
echo "   (Requires logging service integration)"

# Summary
echo -e "\n================================================"
echo "📊 MONITORING SUMMARY"
echo "================================================"
echo "Health Status: $HEALTH_STATUS"
echo "Response Time: ${RESPONSE_TIME}ms"
echo "Errors Detected: $ERRORS_COUNT"
echo "Rate Limit Working: $([ $RATE_LIMIT_COUNT -gt 0 ] && echo 'Yes' || echo 'No')"
echo "Database Status: $DB_STATUS"
echo "================================================"

if [ $ERRORS_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! System healthy.${NC}"
  exit 0
else
  echo -e "${RED}❌ $ERRORS_COUNT checks failed! Review issues above.${NC}"
  send_alert "$ERRORS_COUNT monitoring checks failed" "HIGH"
  exit 1
fi
