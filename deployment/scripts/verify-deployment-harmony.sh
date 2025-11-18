#!/bin/bash
#
# Unified Deployment Verification System
# Orchestrates all deployment checks for Railway + Vercel
#
# Usage: ./verify-deployment-harmony.sh [--pre-deploy|--post-deploy] [environment]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default values
MODE="${1:---pre-deploy}"
ENVIRONMENT="${2:-production}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Results storage
CRITICAL_ISSUES=()
WARNINGS=()
RECOMMENDATIONS=()

log() {
  echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
  CRITICAL_ISSUES+=("$1")
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
  WARNINGS+=("$1")
}

info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

section() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check() {
  local name="$1"
  local result="$2"
  local is_critical="${3:-true}"
  
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  
  if [ "$result" = "0" ]; then
    echo -e "${GREEN}✅${NC} $name"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    if [ "$is_critical" = "true" ]; then
      echo -e "${RED}❌${NC} $name"
      FAILED_CHECKS=$((FAILED_CHECKS + 1))
      error "$name"
    else
      echo -e "${YELLOW}⚠️${NC}  $name"
      WARNING_CHECKS=$((WARNING_CHECKS + 1))
      warn "$name"
    fi
  fi
}

# ============================================================================
# MAIN VERIFICATION LOGIC
# ============================================================================

main() {
  echo ""
  echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${MAGENTA}║  WCAG AI Platform - Deployment Harmony Verification      ║${NC}"
  echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  info "Mode: $MODE"
  info "Environment: $ENVIRONMENT"
  info "Project Root: $PROJECT_ROOT"
  echo ""

  cd "$PROJECT_ROOT"

  # Phase 1: Type Consistency Check
  verify_type_consistency

  # Phase 2: API Contract Validation
  verify_api_contracts

  # Phase 3: Configuration Validation
  verify_configurations

  # Phase 4: Build Validation
  verify_builds

  # Phase 5: Deployment Configuration
  verify_deployment_configs

  # Phase 6: Security Checks
  verify_security

  # Phase 7: Cross-Platform Integration
  verify_integration

  if [ "$MODE" = "--post-deploy" ]; then
    # Phase 8: Live Service Validation
    verify_live_services
  fi

  # Generate Report
  generate_report
}

# ============================================================================
# PHASE 1: Type Consistency
# ============================================================================
verify_type_consistency() {
  section "Phase 1: Type Consistency Verification"

  # Check if type files exist
  if [ -f "packages/api/src/types.ts" ] && [ -f "packages/webapp/src/types.ts" ]; then
    check "Type files exist in both packages" 0
    
    # Compare type definitions
    API_TYPES=$(cat packages/api/src/types.ts)
    WEBAPP_TYPES=$(cat packages/webapp/src/types.ts)
    
    # Check for common type exports
    COMMON_TYPES=("EmailDraft" "Violation" "Consultant" "EmailStatus" "ViolationSeverity")
    
    for type in "${COMMON_TYPES[@]}"; do
      if echo "$API_TYPES" | grep -q "export.*$type" && echo "$WEBAPP_TYPES" | grep -q "export.*$type"; then
        check "Type '$type' exists in both packages" 0 false
      else
        check "Type '$type' exists in both packages" 1 false
      fi
    done
    
    RECOMMENDATIONS+=("Consider using a shared types package to ensure consistency")
  else
    check "Type files exist in both packages" 1
  fi
}

# ============================================================================
# PHASE 2: API Contract Validation
# ============================================================================
verify_api_contracts() {
  section "Phase 2: API Contract Validation"

  # Find all API routes in backend
  if [ -d "packages/api/src/routes" ]; then
    check "API routes directory exists" 0
    
    # Check for common endpoints
    EXPECTED_ROUTES=("drafts" "violations" "consultants" "health")
    
    for route in "${EXPECTED_ROUTES[@]}"; do
      if [ -f "packages/api/src/routes/${route}.ts" ]; then
        check "Route '${route}' exists" 0 false
      else
        check "Route '${route}' exists" 1 false
      fi
    done
  else
    check "API routes directory exists" 1
  fi

  # Check frontend API service
  if [ -f "packages/webapp/src/services/api.ts" ]; then
    check "Frontend API service exists" 0
    
    API_SERVICE=$(cat packages/webapp/src/services/api.ts)
    
    # Verify API calls match backend routes
    if echo "$API_SERVICE" | grep -q "/api/drafts"; then
      check "Frontend calls /api/drafts endpoint" 0 false
    fi
    
    if echo "$API_SERVICE" | grep -q "API_BASE.*VITE_API_BASE_URL"; then
      check "Frontend uses environment variable for API URL" 0
    else
      warn "Frontend may not be using environment variable for API URL"
    fi
  else
    check "Frontend API service exists" 1
  fi
}

# ============================================================================
# PHASE 3: Configuration Validation
# ============================================================================
verify_configurations() {
  section "Phase 3: Configuration Validation"

  # Railway configuration
  if [ -f "packages/api/railway.json" ]; then
    check "Railway configuration exists" 0
    
    if jq empty packages/api/railway.json 2>/dev/null; then
      check "Railway JSON is valid" 0
      
      # Check for required fields
      if jq -e '.healthcheck.path' packages/api/railway.json > /dev/null 2>&1; then
        check "Health check path configured in Railway" 0
      else
        check "Health check path configured in Railway" 1
      fi
      
      if jq -e '.deploy.restartPolicyType' packages/api/railway.json > /dev/null 2>&1; then
        check "Restart policy configured in Railway" 0
      else
        check "Restart policy configured in Railway" 1 false
      fi
    else
      check "Railway JSON is valid" 1
    fi
  else
    check "Railway configuration exists" 1
  fi

  # Vercel configuration
  if [ -f "packages/webapp/vercel.json" ]; then
    check "Vercel configuration exists" 0
    
    if jq empty packages/webapp/vercel.json 2>/dev/null; then
      check "Vercel JSON is valid" 0
      
      # Check for security headers
      if jq -e '.headers' packages/webapp/vercel.json > /dev/null 2>&1; then
        HEADER_COUNT=$(jq '[.headers[].headers[]] | length' packages/webapp/vercel.json)
        check "Security headers configured ($HEADER_COUNT rules)" 0
      else
        check "Security headers configured" 1 false
      fi
      
      # Check for rewrites (SPA routing)
      if jq -e '.rewrites' packages/webapp/vercel.json > /dev/null 2>&1; then
        check "SPA rewrites configured in Vercel" 0
      else
        check "SPA rewrites configured in Vercel" 1 false
      fi
    else
      check "Vercel JSON is valid" 1
    fi
  else
    check "Vercel configuration exists" 1
  fi

  # Environment variable documentation
  if [ -f "deployment/config/.env.template" ] || [ -f ".env.example" ]; then
    check "Environment variables documented" 0
  else
    check "Environment variables documented" 1 false
    RECOMMENDATIONS+=("Create .env.example to document required environment variables")
  fi
}

# ============================================================================
# PHASE 4: Build Validation
# ============================================================================
verify_builds() {
  section "Phase 4: Build Validation"

  # Build backend
  info "Building API package..."
  if cd packages/api && npm install --silent > /dev/null 2>&1; then
    check "API dependencies installed" 0
    
    if npm run build > /dev/null 2>&1; then
      check "API builds successfully" 0
      
      if [ -d "dist" ]; then
        check "API dist directory created" 0
        DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
        info "API build size: $DIST_SIZE"
      else
        check "API dist directory created" 1
      fi
    else
      check "API builds successfully" 1
      error "API build failed - check TypeScript compilation errors"
    fi
    
    cd "$PROJECT_ROOT"
  else
    check "API dependencies installed" 1
    cd "$PROJECT_ROOT"
  fi

  # Build frontend
  info "Building webapp package..."
  if cd packages/webapp && npm install --silent > /dev/null 2>&1; then
    check "Webapp dependencies installed" 0
    
    if npm run build > /dev/null 2>&1; then
      check "Webapp builds successfully" 0
      
      if [ -d "dist" ]; then
        check "Webapp dist directory created" 0
        WEBAPP_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
        info "Webapp build size: $WEBAPP_SIZE"
      else
        check "Webapp dist directory created" 1
      fi
    else
      check "Webapp builds successfully" 1
      error "Webapp build failed - check Vite configuration"
    fi
    
    cd "$PROJECT_ROOT"
  else
    check "Webapp dependencies installed" 1
    cd "$PROJECT_ROOT"
  fi
}

# ============================================================================
# PHASE 5: Deployment Configuration
# ============================================================================
verify_deployment_configs() {
  section "Phase 5: Deployment Configuration"

  # Check package.json scripts
  if [ -f "packages/api/package.json" ]; then
    if jq -e '.scripts.build' packages/api/package.json > /dev/null 2>&1; then
      check "API build script configured" 0
    else
      check "API build script configured" 1
    fi
    
    if jq -e '.scripts.start' packages/api/package.json > /dev/null 2>&1; then
      check "API start script configured" 0
    else
      check "API start script configured" 1
    fi
  fi

  if [ -f "packages/webapp/package.json" ]; then
    if jq -e '.scripts.build' packages/webapp/package.json > /dev/null 2>&1; then
      check "Webapp build script configured" 0
    else
      check "Webapp build script configured" 1
    fi
  fi

  # Check for deployment scripts
  if [ -f "deployment/scripts/deploy-production.sh" ]; then
    check "Production deployment script exists" 0
    
    if [ -x "deployment/scripts/deploy-production.sh" ]; then
      check "Deployment script is executable" 0
    else
      check "Deployment script is executable" 1 false
      RECOMMENDATIONS+=("Make deployment script executable: chmod +x deployment/scripts/deploy-production.sh")
    fi
  else
    check "Production deployment script exists" 1 false
  fi

  # Check for validation scripts
  if [ -f "deployment/scripts/validate-railway.sh" ]; then
    check "Railway validation script exists" 0
  else
    check "Railway validation script exists" 1 false
  fi

  if [ -f "deployment/scripts/validate-vercel.sh" ]; then
    check "Vercel validation script exists" 0
  else
    check "Vercel validation script exists" 1 false
  fi
}

# ============================================================================
# PHASE 6: Security Checks
# ============================================================================
verify_security() {
  section "Phase 6: Security Checks"

  # Check for .gitignore
  if [ -f ".gitignore" ]; then
    check ".gitignore exists" 0
    
    if grep -q "\.env" .gitignore; then
      check ".env files ignored in git" 0
    else
      check ".env files ignored in git" 1
      error "Add .env to .gitignore to prevent secrets leakage"
    fi
    
    if grep -q "node_modules" .gitignore; then
      check "node_modules ignored in git" 0
    else
      check "node_modules ignored in git" 1 false
    fi
  else
    check ".gitignore exists" 1
  fi

  # Check for security middleware
  if [ -f "packages/api/src/middleware/security.ts" ]; then
    check "Security middleware exists" 0
    
    SECURITY_MW=$(cat packages/api/src/middleware/security.ts)
    
    if echo "$SECURITY_MW" | grep -q "helmet"; then
      check "Helmet security headers configured" 0
    else
      check "Helmet security headers configured" 1 false
    fi
    
    if echo "$SECURITY_MW" | grep -q "rateLimit"; then
      check "Rate limiting configured" 0
    else
      check "Rate limiting configured" 1
      warn "Consider adding rate limiting to prevent abuse"
    fi
  else
    check "Security middleware exists" 1 false
    RECOMMENDATIONS+=("Create security middleware with Helmet and rate limiting")
  fi

  # Check for SSRF protection
  if grep -r "ssrfProtection\|isPrivateIP" packages/api/src/ > /dev/null 2>&1; then
    check "SSRF protection implemented" 0
  else
    check "SSRF protection implemented" 1 false
    warn "Consider implementing SSRF protection for URL scanning"
  fi
}

# ============================================================================
# PHASE 7: Cross-Platform Integration
# ============================================================================
verify_integration() {
  section "Phase 7: Cross-Platform Integration"

  # Check CORS configuration
  if grep -r "cors" packages/api/src/server.ts > /dev/null 2>&1; then
    check "CORS configured in backend" 0
  else
    check "CORS configured in backend" 1
    error "CORS must be configured for frontend-backend communication"
  fi

  # Check API URL configuration in frontend
  if [ -f "packages/webapp/vercel.json" ]; then
    if jq -e '.env.VITE_API_BASE_URL' packages/webapp/vercel.json > /dev/null 2>&1; then
      check "API URL configured in Vercel" 0
    else
      check "API URL configured in Vercel" 1 false
      RECOMMENDATIONS+=("Configure VITE_API_BASE_URL in vercel.json for production")
    fi
  fi

  # Check for health check endpoint
  if grep -r "health" packages/api/src/ > /dev/null 2>&1; then
    check "Health check endpoint exists" 0
  else
    check "Health check endpoint exists" 1
  fi
}

# ============================================================================
# PHASE 8: Live Service Validation (Post-Deploy Only)
# ============================================================================
verify_live_services() {
  section "Phase 8: Live Service Validation"

  # This would be called with actual URLs in post-deploy mode
  info "Live service validation requires deployment URLs"
  info "Run: ./validate-railway.sh <railway_url>"
  info "Run: ./validate-vercel.sh <vercel_url>"
}

# ============================================================================
# Report Generation
# ============================================================================
generate_report() {
  section "Verification Report"

  echo ""
  echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${MAGENTA}║                    SUMMARY                                ║${NC}"
  echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  echo -e "${GREEN}✅ Passed:${NC}   $PASSED_CHECKS/$TOTAL_CHECKS"
  echo -e "${RED}❌ Failed:${NC}   $FAILED_CHECKS/$TOTAL_CHECKS"
  echo -e "${YELLOW}⚠️  Warnings:${NC} $WARNING_CHECKS"
  echo ""
  
  if [ $TOTAL_CHECKS -gt 0 ]; then
    SCORE=$(echo "scale=1; ($PASSED_CHECKS / $TOTAL_CHECKS) * 100" | bc)
    echo -e "${CYAN}Score:${NC} ${SCORE}%"
  fi
  echo ""

  # Critical Issues
  if [ ${#CRITICAL_ISSUES[@]} -gt 0 ]; then
    echo -e "${RED}Critical Issues:${NC}"
    for issue in "${CRITICAL_ISSUES[@]}"; do
      echo "  • $issue"
    done
    echo ""
  fi

  # Warnings
  if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Warnings:${NC}"
    for warning in "${WARNINGS[@]}"; do
      echo "  • $warning"
    done
    echo ""
  fi

  # Recommendations
  if [ ${#RECOMMENDATIONS[@]} -gt 0 ]; then
    echo -e "${BLUE}Recommendations:${NC}"
    for rec in "${RECOMMENDATIONS[@]}"; do
      echo "  • $rec"
    done
    echo ""
  fi

  # Final verdict
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ DEPLOYMENT HARMONY VERIFIED${NC}"
    echo ""
    echo "All critical checks passed. The system is ready for deployment."
    echo ""
    exit 0
  else
    echo -e "${RED}❌ DEPLOYMENT HARMONY ISSUES DETECTED${NC}"
    echo ""
    echo "Fix the $FAILED_CHECKS critical issue(s) before deploying."
    echo ""
    exit 1
  fi
}

# ============================================================================
# Execute Main
# ============================================================================
main "$@"
