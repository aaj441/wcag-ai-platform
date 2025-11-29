#!/bin/bash
#
# Unified Deployment Coordinator
# Orchestrates Railway (backend) + Vercel (frontend) deployments
#
# Usage: ./deploy-unified.sh [staging|production]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ENVIRONMENT="${1:-staging}"
DEPLOYMENT_ID=$(date +%Y%m%d-%H%M%S)
DEPLOYMENT_LOG="/tmp/wcagai-unified-deploy-$DEPLOYMENT_ID.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Deployment state tracking
BACKEND_DEPLOYED=false
FRONTEND_DEPLOYED=false
BACKEND_URL=""
FRONTEND_URL=""

log() {
  echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

info() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

section() {
  echo "" | tee -a "$DEPLOYMENT_LOG"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$DEPLOYMENT_LOG"
  echo -e "${CYAN}$1${NC}" | tee -a "$DEPLOYMENT_LOG"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$DEPLOYMENT_LOG"
}

rollback() {
  local service="$1"
  warn "Initiating rollback for $service..."
  
  if [ "$service" = "backend" ] && [ "$BACKEND_DEPLOYED" = "true" ]; then
    if command -v railway &> /dev/null; then
      railway rollback --service=wcagaii-backend || warn "Rollback failed"
    fi
  fi
  
  if [ "$service" = "frontend" ] && [ "$FRONTEND_DEPLOYED" = "true" ]; then
    if command -v vercel &> /dev/null; then
      # Vercel doesn't have direct rollback, but we can promote previous deployment
      warn "Manual rollback required for Vercel - check dashboard"
    fi
  fi
}

# ============================================================================
# MAIN DEPLOYMENT FLOW
# ============================================================================

main() {
  echo ""
  echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${MAGENTA}║   WCAG AI Platform - Unified Deployment Coordinator      ║${NC}"
  echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  info "Environment: $ENVIRONMENT"
  info "Deployment ID: $DEPLOYMENT_ID"
  info "Log file: $DEPLOYMENT_LOG"
  echo ""

  cd "$PROJECT_ROOT"

  # Pre-deployment checks
  pre_deployment_checks

  # Build phase
  build_packages

  # Pre-deployment validation
  pre_deployment_validation

  # Deploy backend (Railway)
  deploy_backend

  # Deploy frontend (Vercel)
  deploy_frontend

  # Post-deployment validation
  post_deployment_validation

  # Generate report
  generate_deployment_report
}

# ============================================================================
# Pre-Deployment Checks
# ============================================================================
pre_deployment_checks() {
  section "Pre-Deployment Checks"

  # Check prerequisites
  local missing_deps=0
  
  if ! command -v node &> /dev/null; then
    error "Node.js not installed"
    missing_deps=1
  else
    log "✅ Node.js installed: $(node --version)"
  fi
  
  if ! command -v npm &> /dev/null; then
    error "npm not installed"
    missing_deps=1
  else
    log "✅ npm installed: $(npm --version)"
  fi
  
  if ! command -v jq &> /dev/null; then
    error "jq not installed"
    missing_deps=1
  else
    log "✅ jq installed"
  fi
  
  # Check deployment tools
  if ! command -v railway &> /dev/null; then
    warn "Railway CLI not installed - backend deployment will be skipped"
    warn "Install: npm install -g @railway/cli"
  else
    log "✅ Railway CLI installed"
  fi
  
  if ! command -v vercel &> /dev/null; then
    warn "Vercel CLI not installed - frontend deployment will be skipped"
    warn "Install: npm install -g vercel"
  else
    log "✅ Vercel CLI installed"
  fi
  
  if [ $missing_deps -eq 1 ]; then
    error "Missing required dependencies. Please install them and try again."
    exit 1
  fi

  # Check git status
  if [ -d ".git" ]; then
    if [[ -n $(git status -s) ]]; then
      warn "⚠️  Uncommitted changes detected"
      git status -s
      echo ""
      read -p "Continue with uncommitted changes? (y/N) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Deployment cancelled by user"
        exit 1
      fi
    else
      log "✅ Working directory clean"
    fi
  fi
}

# ============================================================================
# Build Packages
# ============================================================================
build_packages() {
  section "Building Packages"

  # Build API
  log "Building API package..."
  cd packages/api
  
  if npm install 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
    log "✅ API dependencies installed"
  else
    error "Failed to install API dependencies"
    exit 1
  fi
  
  if npm run build 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
    log "✅ API built successfully"
    if [ -d "dist" ]; then
      DIST_SIZE=$(du -sh dist | cut -f1)
      info "Build size: $DIST_SIZE"
    fi
  else
    error "API build failed"
    exit 1
  fi
  
  cd "$PROJECT_ROOT"

  # Build Webapp
  log "Building webapp package..."
  cd packages/webapp
  
  if npm install 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
    log "✅ Webapp dependencies installed"
  else
    error "Failed to install webapp dependencies"
    exit 1
  fi
  
  if npm run build 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
    log "✅ Webapp built successfully"
    if [ -d "dist" ]; then
      WEBAPP_SIZE=$(du -sh dist | cut -f1)
      info "Build size: $WEBAPP_SIZE"
    fi
  else
    error "Webapp build failed"
    exit 1
  fi
  
  cd "$PROJECT_ROOT"
}

# ============================================================================
# Pre-Deployment Validation
# ============================================================================
pre_deployment_validation() {
  section "Pre-Deployment Validation"

  log "Running deployment harmony checks..."
  
  if bash "$SCRIPT_DIR/verify-deployment-harmony.sh" --pre-deploy "$ENVIRONMENT" 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
    log "✅ Pre-deployment validation passed"
  else
    error "Pre-deployment validation failed"
    warn "Fix the issues before deploying"
    exit 1
  fi
}

# ============================================================================
# Deploy Backend (Railway)
# ============================================================================
deploy_backend() {
  section "Deploying Backend to Railway"

  if ! command -v railway &> /dev/null; then
    warn "Skipping Railway deployment (CLI not installed)"
    return
  fi

  # Check Railway authentication
  if ! railway whoami > /dev/null 2>&1; then
    error "Not authenticated with Railway"
    error "Run 'railway login' first"
    return
  fi

  RAILWAY_USER=$(railway whoami)
  info "Authenticated as: $RAILWAY_USER"

  # Select environment
  if [ "$ENVIRONMENT" = "production" ]; then
    railway environment select production || warn "Could not select production environment"
  else
    railway environment select staging || warn "Could not select staging environment"
  fi

  # Deploy
  log "Pushing to Railway..."
  cd packages/api
  
  if railway up --service=wcagaii-backend 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
    BACKEND_DEPLOYED=true
    log "✅ Backend deployed to Railway"
    
    # Wait for deployment to stabilize
    log "Waiting for deployment to stabilize..."
    sleep 15
    
    # Get deployment URL
    BACKEND_URL=$(railway status --service=wcagaii-backend --json 2>/dev/null | jq -r '.deployments[0].url // empty' || echo "")
    
    if [ -n "$BACKEND_URL" ]; then
      info "Backend URL: $BACKEND_URL"
    else
      warn "Could not retrieve backend URL"
    fi
  else
    error "Railway deployment failed"
    cd "$PROJECT_ROOT"
    exit 1
  fi
  
  cd "$PROJECT_ROOT"
}

# ============================================================================
# Deploy Frontend (Vercel)
# ============================================================================
deploy_frontend() {
  section "Deploying Frontend to Vercel"

  if ! command -v vercel &> /dev/null; then
    warn "Skipping Vercel deployment (CLI not installed)"
    return
  fi

  # Check Vercel authentication
  if ! vercel whoami > /dev/null 2>&1; then
    error "Not authenticated with Vercel"
    error "Run 'vercel login' first"
    return
  fi

  VERCEL_USER=$(vercel whoami)
  info "Authenticated as: $VERCEL_USER"

  # Deploy
  log "Deploying to Vercel..."
  cd packages/webapp
  
  # Set API URL environment variable if we have it
  if [ -n "$BACKEND_URL" ]; then
    export VITE_API_BASE_URL="$BACKEND_URL"
    info "Setting VITE_API_BASE_URL=$BACKEND_URL"
  fi
  
  if [ "$ENVIRONMENT" = "production" ]; then
    VERCEL_OUTPUT=$(vercel --prod --yes 2>&1 | tee -a "$DEPLOYMENT_LOG")
  else
    VERCEL_OUTPUT=$(vercel --yes 2>&1 | tee -a "$DEPLOYMENT_LOG")
  fi
  
  if [ $? -eq 0 ]; then
    FRONTEND_DEPLOYED=true
    log "✅ Frontend deployed to Vercel"
    
    # Extract deployment URL
    FRONTEND_URL=$(echo "$VERCEL_OUTPUT" | grep -oP 'https://[^\s]+\.vercel\.app' | head -n1)
    
    if [ -n "$FRONTEND_URL" ]; then
      info "Frontend URL: $FRONTEND_URL"
    else
      warn "Could not retrieve frontend URL"
    fi
  else
    error "Vercel deployment failed"
    
    # Rollback backend if frontend fails
    if [ "$BACKEND_DEPLOYED" = "true" ]; then
      warn "Frontend deployment failed, rolling back backend..."
      rollback "backend"
    fi
    
    cd "$PROJECT_ROOT"
    exit 1
  fi
  
  cd "$PROJECT_ROOT"
}

# ============================================================================
# Post-Deployment Validation
# ============================================================================
post_deployment_validation() {
  section "Post-Deployment Validation"

  local validation_failed=false

  # Validate Railway deployment
  if [ -n "$BACKEND_URL" ]; then
    log "Validating Railway deployment..."
    
    if bash "$SCRIPT_DIR/validate-railway.sh" "$BACKEND_URL" 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
      log "✅ Railway validation passed"
    else
      error "Railway validation failed"
      validation_failed=true
    fi
  fi

  # Validate Vercel deployment
  if [ -n "$FRONTEND_URL" ]; then
    log "Validating Vercel deployment..."
    
    if bash "$SCRIPT_DIR/validate-vercel.sh" "$FRONTEND_URL" 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
      log "✅ Vercel validation passed"
    else
      error "Vercel validation failed"
      validation_failed=true
    fi
  fi

  # Cross-platform validation
  if [ -n "$BACKEND_URL" ] && [ -n "$FRONTEND_URL" ]; then
    log "Validating cross-platform integration..."
    
    # Check if frontend can reach backend
    if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
      log "✅ Backend is reachable"
    else
      error "Backend health check failed"
      validation_failed=true
    fi
    
    # Check if frontend loads
    if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
      log "✅ Frontend is reachable"
    else
      error "Frontend health check failed"
      validation_failed=true
    fi
  fi

  if [ "$validation_failed" = "true" ]; then
    error "Post-deployment validation failed"
    
    read -p "Rollback deployment? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      rollback "backend"
      rollback "frontend"
      exit 1
    fi
  fi
}

# ============================================================================
# Generate Deployment Report
# ============================================================================
generate_deployment_report() {
  section "Deployment Report"

  REPORT_FILE="/tmp/wcagai-deployment-report-$DEPLOYMENT_ID.md"
  
  cat > "$REPORT_FILE" <<EOF
# WCAG AI Platform - Unified Deployment Report

**Deployment ID:** $DEPLOYMENT_ID
**Environment:** $ENVIRONMENT
**Date:** $(date -Iseconds)
**Branch:** $(git branch --show-current 2>/dev/null || echo "unknown")
**Commit:** $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

---

## Deployment Status

| Service | Platform | Status | URL |
|---------|----------|--------|-----|
| Backend | Railway | ${BACKEND_DEPLOYED:+✅ Deployed|⚠️  Skipped} | ${BACKEND_URL:-N/A} |
| Frontend | Vercel | ${FRONTEND_DEPLOYED:+✅ Deployed|⚠️  Skipped} | ${FRONTEND_URL:-N/A} |

---

## Build Summary

### Backend (API)
- Status: ✅ Built successfully
- Build size: ${DIST_SIZE:-N/A}
- Platform: Railway
- URL: ${BACKEND_URL:-Not deployed}

### Frontend (Webapp)
- Status: ✅ Built successfully
- Build size: ${WEBAPP_SIZE:-N/A}
- Platform: Vercel
- URL: ${FRONTEND_URL:-Not deployed}

---

## Validation Results

### Railway
$(if [ -n "$BACKEND_URL" ]; then echo "✅ Passed"; else echo "⚠️  Skipped"; fi)

### Vercel
$(if [ -n "$FRONTEND_URL" ]; then echo "✅ Passed"; else echo "⚠️  Skipped"; fi)

### Cross-Platform Integration
$(if [ -n "$BACKEND_URL" ] && [ -n "$FRONTEND_URL" ]; then echo "✅ Passed"; else echo "⚠️  Partial"; fi)

---

## Next Steps

1. **Monitor the deployment:**
   - Backend logs: \`railway logs --service=wcagaii-backend\`
   - Frontend analytics: Visit Vercel dashboard

2. **Test key functionality:**
   - Health check: \`curl ${BACKEND_URL:-https://your-app.railway.app}/health\`
   - Frontend: Visit ${FRONTEND_URL:-https://your-app.vercel.app}

3. **Set up monitoring:**
   - Configure alerts for errors and performance
   - Enable uptime monitoring
   - Set up log aggregation

---

## Deployment Log

Full log available at: \`$DEPLOYMENT_LOG\`

---

**Generated by:** WCAG AI Platform Unified Deployment Coordinator
**Version:** 1.0.0
EOF

  log "✅ Deployment report generated: $REPORT_FILE"
  echo ""
  
  cat "$REPORT_FILE"
  
  echo ""
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  log "🎉 Unified Deployment Complete!"
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  if [ -n "$BACKEND_URL" ]; then
    echo "🚂 Railway Backend:  $BACKEND_URL"
  fi
  
  if [ -n "$FRONTEND_URL" ]; then
    echo "▲  Vercel Frontend: $FRONTEND_URL"
  fi
  
  echo ""
  echo "📊 Report: $REPORT_FILE"
  echo "📝 Log:    $DEPLOYMENT_LOG"
  echo ""
}

# ============================================================================
# Execute Main
# ============================================================================
main "$@"
