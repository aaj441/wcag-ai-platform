#!/bin/bash

##############################################################################
# Comprehensive Deployment Verification Script
# 
# Purpose: Automated verification of WCAG AI Platform deployment completeness
# Usage: ./comprehensive-deployment-check.sh [api-url] [frontend-url]
# Example: ./comprehensive-deployment-check.sh https://api.railway.app https://app.vercel.app
#
# Exit Codes:
#   0 - All checks passed (>90% success rate)
#   1 - Critical failures (deployment not ready)
#   2 - Missing dependencies
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Test results array
declare -a RESULTS

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${YELLOW}▶ $1${NC}"
    echo ""
}

pass_check() {
    ((TOTAL_CHECKS++))
    ((PASSED_CHECKS++))
    echo -e "${GREEN}✅ PASS${NC}: $1"
    RESULTS+=("PASS: $1")
}

fail_check() {
    ((TOTAL_CHECKS++))
    ((FAILED_CHECKS++))
    echo -e "${RED}❌ FAIL${NC}: $1"
    RESULTS+=("FAIL: $1")
}

warn_check() {
    ((TOTAL_CHECKS++))
    ((WARNING_CHECKS++))
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    RESULTS+=("WARN: $1")
}

##############################################################################
# Dependency Checks
##############################################################################

check_dependencies() {
    print_header "Checking Dependencies"
    
    local missing_deps=0
    
    # Check curl
    if command -v curl &> /dev/null; then
        pass_check "curl is installed"
    else
        fail_check "curl is not installed"
        ((missing_deps++))
    fi
    
    # Check jq
    if command -v jq &> /dev/null; then
        pass_check "jq is installed"
    else
        fail_check "jq is not installed (required for JSON parsing)"
        ((missing_deps++))
    fi
    
    # Check node
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        pass_check "Node.js is installed ($NODE_VERSION)"
    else
        warn_check "Node.js not found (optional for local testing)"
    fi
    
    if [ $missing_deps -gt 0 ]; then
        echo ""
        echo -e "${RED}ERROR: Missing required dependencies${NC}"
        echo "Install with: brew install curl jq (Mac) or apt-get install curl jq (Linux)"
        exit 2
    fi
}

##############################################################################
# API Health Checks
##############################################################################

check_api_health() {
    print_header "API Health Checks"
    local api_url="$1"
    
    print_section "1.1 Basic Connectivity"
    
    # Health endpoint
    if curl -sf "$api_url/health" > /dev/null 2>&1; then
        pass_check "Health endpoint responds"
        
        # Check response format
        HEALTH_RESPONSE=$(curl -s "$api_url/health")
        if echo "$HEALTH_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
            pass_check "Health endpoint returns valid JSON"
            
            if [ "$(echo "$HEALTH_RESPONSE" | jq -r '.success')" = "true" ]; then
                pass_check "Health check reports healthy status"
            else
                fail_check "Health check reports unhealthy status"
            fi
        else
            fail_check "Health endpoint returns invalid JSON"
        fi
    else
        fail_check "Health endpoint not responding"
    fi
    
    print_section "1.2 Response Time"
    
    # Measure response time
    RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s "$api_url/health")
    if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
        pass_check "Response time acceptable (${RESPONSE_TIME}s < 1.0s)"
    elif (( $(echo "$RESPONSE_TIME < 3.0" | bc -l) )); then
        warn_check "Response time slow (${RESPONSE_TIME}s)"
    else
        fail_check "Response time too slow (${RESPONSE_TIME}s > 3.0s)"
    fi
    
    print_section "1.3 API Endpoints"
    
    # Test /api/drafts
    if curl -sf "$api_url/api/drafts" > /dev/null 2>&1; then
        pass_check "/api/drafts endpoint responds"
        
        DRAFTS_RESPONSE=$(curl -s "$api_url/api/drafts")
        if echo "$DRAFTS_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
            pass_check "/api/drafts returns data array"
        else
            warn_check "/api/drafts response format unexpected"
        fi
    else
        fail_check "/api/drafts endpoint not responding"
    fi
    
    print_section "1.4 Error Handling"
    
    # Test 404
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$api_url/api/nonexistent")
    if [ "$HTTP_CODE" = "404" ]; then
        pass_check "404 error handling works"
    else
        warn_check "404 handling unexpected (got $HTTP_CODE)"
    fi
    
    # Test invalid JSON
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$api_url/api/drafts" \
        -H "Content-Type: application/json" \
        -d '{invalid}')
    if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "500" ]; then
        pass_check "Invalid JSON handled gracefully"
    else
        warn_check "Invalid JSON handling unexpected (got $HTTP_CODE)"
    fi
}

##############################################################################
# Security Checks
##############################################################################

check_security() {
    print_header "Security Checks"
    local api_url="$1"
    local frontend_url="$2"
    
    print_section "2.1 HTTPS Enforcement"
    
    # Check if HTTPS is used
    if [[ "$api_url" == https://* ]]; then
        pass_check "API uses HTTPS"
    else
        fail_check "API does not use HTTPS (security risk)"
    fi
    
    if [[ "$frontend_url" == https://* ]]; then
        pass_check "Frontend uses HTTPS"
    else
        fail_check "Frontend does not use HTTPS (security risk)"
    fi
    
    print_section "2.2 Security Headers"
    
    # Check frontend security headers
    HEADERS=$(curl -sI "$frontend_url")
    
    if echo "$HEADERS" | grep -qi "x-frame-options"; then
        pass_check "X-Frame-Options header present"
    else
        warn_check "X-Frame-Options header missing (clickjacking risk)"
    fi
    
    if echo "$HEADERS" | grep -qi "content-security-policy"; then
        pass_check "Content-Security-Policy header present"
    else
        warn_check "Content-Security-Policy header missing"
    fi
    
    if echo "$HEADERS" | grep -qi "strict-transport-security"; then
        pass_check "Strict-Transport-Security header present"
    else
        warn_check "HSTS header missing"
    fi
    
    if echo "$HEADERS" | grep -qi "x-content-type-options"; then
        pass_check "X-Content-Type-Options header present"
    else
        warn_check "X-Content-Type-Options header missing"
    fi
    
    print_section "2.3 CORS Configuration"
    
    # Test CORS with invalid origin
    CORS_RESPONSE=$(curl -sI -X OPTIONS "$api_url/api/drafts" \
        -H "Origin: https://malicious-site.com" \
        -H "Access-Control-Request-Method: GET")
    
    if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
        # Check if it allows the malicious origin
        if echo "$CORS_RESPONSE" | grep -qi "malicious-site.com"; then
            fail_check "CORS allows unauthorized origins (security risk)"
        else
            pass_check "CORS properly restricts origins"
        fi
    else
        pass_check "CORS properly restricts origins (no header for unauthorized)"
    fi
}

##############################################################################
# Frontend Checks
##############################################################################

check_frontend() {
    print_header "Frontend Checks"
    local frontend_url="$1"
    
    print_section "3.1 Page Load"
    
    # Check if frontend loads
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$frontend_url")
    if [ "$HTTP_CODE" = "200" ]; then
        pass_check "Frontend loads successfully (HTTP 200)"
    else
        fail_check "Frontend failed to load (HTTP $HTTP_CODE)"
    fi
    
    # Check for HTML content
    CONTENT=$(curl -s "$frontend_url")
    if echo "$CONTENT" | grep -qi "<!DOCTYPE html>"; then
        pass_check "Valid HTML document returned"
    else
        fail_check "Invalid HTML or no content returned"
    fi
    
    print_section "3.2 Critical Assets"
    
    # Check for JavaScript bundles
    if echo "$CONTENT" | grep -q 'script.*src'; then
        pass_check "JavaScript bundles present"
    else
        warn_check "No JavaScript bundles found"
    fi
    
    # Check for CSS
    if echo "$CONTENT" | grep -q 'stylesheet'; then
        pass_check "CSS stylesheets present"
    else
        warn_check "No CSS stylesheets found"
    fi
    
    print_section "3.3 Meta Tags"
    
    # Check for viewport meta tag (responsive design)
    if echo "$CONTENT" | grep -qi 'viewport'; then
        pass_check "Viewport meta tag present (mobile-friendly)"
    else
        warn_check "Viewport meta tag missing (mobile may not work)"
    fi
    
    # Check for charset
    if echo "$CONTENT" | grep -qi 'charset'; then
        pass_check "Character encoding specified"
    else
        warn_check "Character encoding not specified"
    fi
}

##############################################################################
# Integration Checks
##############################################################################

check_integration() {
    print_header "Integration Checks"
    local api_url="$1"
    local frontend_url="$2"
    
    print_section "4.1 API Connectivity from Frontend"
    
    # Check if frontend has API URL configured
    FRONTEND_CONTENT=$(curl -s "$frontend_url")
    
    # Look for API URL patterns in bundled JS
    if echo "$FRONTEND_CONTENT" | grep -q "$api_url"; then
        pass_check "Frontend appears to be configured with correct API URL"
    else
        warn_check "Cannot verify API URL configuration in frontend"
    fi
    
    print_section "4.2 Database Operations"
    
    # Test create operation
    CREATE_RESPONSE=$(curl -s -X POST "$api_url/api/drafts" \
        -H "Content-Type: application/json" \
        -d '{
            "recipient": "deployment-test@example.com",
            "subject": "Deployment Verification",
            "body": "Automated test draft"
        }')
    
    if echo "$CREATE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        if [ "$(echo "$CREATE_RESPONSE" | jq -r '.success')" = "true" ]; then
            pass_check "Create operation successful"
            
            # Get the created draft ID
            DRAFT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')
            
            # Verify it persists (read back)
            sleep 2
            READ_RESPONSE=$(curl -s "$api_url/api/drafts")
            if echo "$READ_RESPONSE" | jq -e ".data[] | select(.id==\"$DRAFT_ID\")" > /dev/null 2>&1; then
                pass_check "Database persistence verified"
            else
                warn_check "Created draft not found in subsequent read"
            fi
        else
            warn_check "Create operation returned success=false"
        fi
    else
        fail_check "Create operation failed or returned invalid JSON"
    fi
}

##############################################################################
# Performance Checks
##############################################################################

check_performance() {
    print_header "Performance Checks"
    local api_url="$1"
    local frontend_url="$2"
    
    print_section "5.1 API Response Times"
    
    # Test multiple requests and calculate average
    echo "Testing API response time (10 requests)..."
    TOTAL_TIME=0
    for i in {1..10}; do
        TIME=$(curl -w "%{time_total}" -o /dev/null -s "$api_url/api/drafts")
        TOTAL_TIME=$(echo "$TOTAL_TIME + $TIME" | bc)
    done
    AVG_TIME=$(echo "scale=3; $TOTAL_TIME / 10" | bc)
    
    if (( $(echo "$AVG_TIME < 1.0" | bc -l) )); then
        pass_check "Average API response time excellent (${AVG_TIME}s)"
    elif (( $(echo "$AVG_TIME < 2.0" | bc -l) )); then
        warn_check "Average API response time acceptable (${AVG_TIME}s)"
    else
        fail_check "Average API response time too slow (${AVG_TIME}s > 2.0s)"
    fi
    
    print_section "5.2 Frontend Load Time"
    
    # Measure frontend load time
    FRONTEND_TIME=$(curl -w "%{time_total}" -o /dev/null -s "$frontend_url")
    
    if (( $(echo "$FRONTEND_TIME < 3.0" | bc -l) )); then
        pass_check "Frontend load time excellent (${FRONTEND_TIME}s)"
    elif (( $(echo "$FRONTEND_TIME < 5.0" | bc -l) )); then
        warn_check "Frontend load time acceptable (${FRONTEND_TIME}s)"
    else
        fail_check "Frontend load time too slow (${FRONTEND_TIME}s > 5.0s)"
    fi
    
    print_section "5.3 Bundle Size"
    
    # Get total content size
    CONTENT_SIZE=$(curl -sI "$frontend_url" | grep -i content-length | awk '{print $2}' | tr -d '\r')
    if [ -n "$CONTENT_SIZE" ]; then
        SIZE_KB=$((CONTENT_SIZE / 1024))
        if [ "$SIZE_KB" -lt 500 ]; then
            pass_check "Initial page size reasonable (${SIZE_KB}KB)"
        else
            warn_check "Initial page size large (${SIZE_KB}KB > 500KB)"
        fi
    else
        warn_check "Could not determine page size"
    fi
}

##############################################################################
# Deployment Configuration Checks
##############################################################################

check_deployment_config() {
    print_header "Deployment Configuration"
    
    print_section "6.1 Environment Detection"
    
    # Check if we're running against production URLs
    if [[ "$1" == *"railway.app"* ]]; then
        pass_check "API deployed on Railway"
    else
        warn_check "API not on Railway (may be staging/local)"
    fi
    
    if [[ "$2" == *"vercel.app"* ]]; then
        pass_check "Frontend deployed on Vercel"
    else
        warn_check "Frontend not on Vercel (may be staging/local)"
    fi
    
    print_section "6.2 DNS & SSL"
    
    # Check SSL certificate validity (basic check)
    if [[ "$1" == https://* ]]; then
        if curl -sI "$1" | grep -qi "HTTP/2"; then
            pass_check "API using HTTP/2 (modern SSL)"
        else
            warn_check "API not using HTTP/2"
        fi
    fi
    
    if [[ "$2" == https://* ]]; then
        if curl -sI "$2" | grep -qi "HTTP/2"; then
            pass_check "Frontend using HTTP/2 (modern SSL)"
        else
            warn_check "Frontend not using HTTP/2"
        fi
    fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
    # Parse arguments
    if [ $# -lt 2 ]; then
        echo "Usage: $0 <api-url> <frontend-url>"
        echo "Example: $0 https://api.railway.app https://app.vercel.app"
        exit 1
    fi
    
    API_URL="${1%/}"  # Remove trailing slash
    FRONTEND_URL="${2%/}"  # Remove trailing slash
    
    # Print banner
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                                ║${NC}"
    echo -e "${BLUE}║    WCAG AI Platform - Comprehensive Deployment Verification   ║${NC}"
    echo -e "${BLUE}║                                                                ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "API URL:      ${GREEN}$API_URL${NC}"
    echo -e "Frontend URL: ${GREEN}$FRONTEND_URL${NC}"
    echo ""
    
    # Run all checks
    check_dependencies
    check_api_health "$API_URL"
    check_security "$API_URL" "$FRONTEND_URL"
    check_frontend "$FRONTEND_URL"
    check_integration "$API_URL" "$FRONTEND_URL"
    check_performance "$API_URL" "$FRONTEND_URL"
    check_deployment_config "$API_URL" "$FRONTEND_URL"
    
    # Print summary
    print_header "Test Summary"
    
    SUCCESS_RATE=$(echo "scale=2; ($PASSED_CHECKS / $TOTAL_CHECKS) * 100" | bc)
    
    echo ""
    echo -e "Total Checks:    ${BLUE}$TOTAL_CHECKS${NC}"
    echo -e "Passed:          ${GREEN}$PASSED_CHECKS${NC}"
    echo -e "Failed:          ${RED}$FAILED_CHECKS${NC}"
    echo -e "Warnings:        ${YELLOW}$WARNING_CHECKS${NC}"
    echo ""
    echo -e "Success Rate:    ${BLUE}${SUCCESS_RATE}%${NC}"
    echo ""
    
    # Determine overall status
    if (( $(echo "$SUCCESS_RATE >= 90" | bc -l) )) && [ "$FAILED_CHECKS" -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✅ DEPLOYMENT READY - All critical checks passed!             ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
        exit 0
    elif (( $(echo "$SUCCESS_RATE >= 75" | bc -l) )) && [ "$FAILED_CHECKS" -lt 5 ]; then
        echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║  ⚠️  CONDITIONAL GO - Minor issues detected                     ║${NC}"
        echo -e "${YELLOW}║     Review warnings and fix before full production launch      ║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
        exit 0
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  ❌ NOT READY - Critical issues must be fixed                  ║${NC}"
        echo -e "${RED}║     Review failed checks above                                 ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
