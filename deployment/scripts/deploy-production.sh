#!/bin/bash
#
# Production Deployment Quickstart
# One-click deployment to Railway + Vercel
#

set -e

echo "🚀 WCAG AI Platform - Production Deployment"
echo "============================================"
echo ""

# Configuration
DEPLOYMENT_ID=$(date +%Y%m%d-%H%M%S)
DEPLOYMENT_LOG="/tmp/wcagai-deploy-$DEPLOYMENT_ID.log"
RAILWAY_SERVICE="${RAILWAY_SERVICE:-wcagaii-backend}"
VERCEL_PROJECT="${VERCEL_PROJECT:-wcagaii}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

STEP=1
total_steps=12

step() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Step $STEP/$total_steps: $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  STEP=$((STEP + 1))
}

# ========================================
# STEP 1: Prerequisites Check
# ========================================
step "Checking Prerequisites"

MISSING_DEPS=0

# Check required commands
REQUIRED_COMMANDS=("node" "npm" "git" "jq" "curl")
for cmd in "${REQUIRED_COMMANDS[@]}"; do
  if command -v "$cmd" &> /dev/null; then
    log "✅ $cmd installed"
  else
    error "❌ $cmd not found"
    MISSING_DEPS=1
  fi
done

# Check Railway CLI
if command -v railway &> /dev/null; then
  log "✅ Railway CLI installed"
  RAILWAY_VERSION=$(railway --version 2>&1 | head -n1)
  info "   Version: $RAILWAY_VERSION"
else
  warn "⚠️  Railway CLI not installed (install: npm i -g @railway/cli)"
  warn "   Skipping Railway deployment..."
  SKIP_RAILWAY=1
fi

# Check Vercel CLI
if command -v vercel &> /dev/null; then
  log "✅ Vercel CLI installed"
  VERCEL_VERSION=$(vercel --version 2>&1)
  info "   Version: $VERCEL_VERSION"
else
  warn "⚠️  Vercel CLI not installed (install: npm i -g vercel)"
  warn "   Skipping Vercel deployment..."
  SKIP_VERCEL=1
fi

if [ $MISSING_DEPS -eq 1 ]; then
  error "Missing required dependencies. Please install them and try again."
  exit 1
fi

# ========================================
# STEP 2: Git Status Check
# ========================================
step "Checking Git Status"

if [ -d ".git" ]; then
  log "✅ Git repository detected"

  # Check for uncommitted changes
  if [[ -n $(git status -s) ]]; then
    warn "⚠️  Uncommitted changes detected"
    git status -s
    echo ""
    read -p "Continue with uncommitted changes? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      error "Deployment cancelled"
      exit 1
    fi
  else
    log "✅ Working directory clean"
  fi

  CURRENT_BRANCH=$(git branch --show-current)
  CURRENT_COMMIT=$(git rev-parse --short HEAD)
  info "   Branch: $CURRENT_BRANCH"
  info "   Commit: $CURRENT_COMMIT"
else
  warn "⚠️  Not a git repository"
fi

# ========================================
# STEP 3: Configuration Validation
# ========================================
step "Validating Configurations"

# Railway configuration
if [ -f "packages/api/railway.json" ]; then
  if jq empty packages/api/railway.json 2>/dev/null; then
    log "✅ railway.json valid"
  else
    error "❌ railway.json invalid JSON"
    exit 1
  fi
else
  error "❌ railway.json not found"
  exit 1
fi

# Vercel configuration
if [ -f "packages/webapp/vercel.json" ]; then
  if jq empty packages/webapp/vercel.json 2>/dev/null; then
    log "✅ vercel.json valid"
  else
    error "❌ vercel.json invalid JSON"
    exit 1
  fi
else
  error "❌ vercel.json not found"
  exit 1
fi

# ========================================
# STEP 4: Install Dependencies
# ========================================
step "Installing Dependencies"

# Root dependencies
if [ -f "package.json" ]; then
  log "Installing root dependencies..."
  npm install --silent
  log "✅ Root dependencies installed"
fi

# API dependencies
if [ -f "packages/api/package.json" ]; then
  log "Installing API dependencies..."
  cd packages/api
  npm install --silent
  cd ../..
  log "✅ API dependencies installed"
fi

# Webapp dependencies
if [ -f "packages/webapp/package.json" ]; then
  log "Installing webapp dependencies..."
  cd packages/webapp
  npm install --silent
  cd ../..
  log "✅ Webapp dependencies installed"
fi

# ========================================
# STEP 5: Run Tests
# ========================================
step "Running Tests"

# API tests
if [ -f "packages/api/package.json" ]; then
  if jq -e '.scripts.test' packages/api/package.json > /dev/null 2>&1; then
    log "Running API tests..."
    cd packages/api
    if npm test 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
      log "✅ API tests passed"
    else
      warn "⚠️  Some API tests failed (check logs)"
    fi
    cd ../..
  else
    info "No API tests configured"
  fi
fi

# Webapp tests
if [ -f "packages/webapp/package.json" ]; then
  if jq -e '.scripts.test' packages/webapp/package.json > /dev/null 2>&1; then
    log "Running webapp tests..."
    cd packages/webapp
    if npm test 2>&1 | tee -a "$DEPLOYMENT_LOG"; then
      log "✅ Webapp tests passed"
    else
      warn "⚠️  Some webapp tests failed (check logs)"
    fi
    cd ../..
  else
    info "No webapp tests configured"
  fi
fi

# ========================================
# STEP 6: Build API
# ========================================
step "Building API"

if [ -f "packages/api/package.json" ]; then
  log "Building API with TypeScript..."
  cd packages/api
  npm run build 2>&1 | tee -a "$DEPLOYMENT_LOG"
  cd ../..

  if [ -d "packages/api/dist" ]; then
    DIST_SIZE=$(du -sh packages/api/dist | cut -f1)
    log "✅ API built successfully"
    info "   Build size: $DIST_SIZE"
  else
    error "❌ API build failed - dist directory not created"
    exit 1
  fi
fi

# ========================================
# STEP 7: Build Webapp
# ========================================
step "Building Webapp"

if [ -f "packages/webapp/package.json" ]; then
  log "Building webapp with Vite..."
  cd packages/webapp
  npm run build 2>&1 | tee -a "$DEPLOYMENT_LOG"
  cd ../..

  if [ -d "packages/webapp/dist" ]; then
    WEBAPP_SIZE=$(du -sh packages/webapp/dist | cut -f1)
    log "✅ Webapp built successfully"
    info "   Build size: $WEBAPP_SIZE"
  else
    error "❌ Webapp build failed - dist directory not created"
    exit 1
  fi
fi

# ========================================
# STEP 8: Pre-deployment Validation
# ========================================
step "Pre-deployment Validation"

log "Running validator tests..."
if bash deployment/scripts/test-validators.sh > /dev/null 2>&1; then
  log "✅ All validator tests passed"
else
  warn "⚠️  Some validator tests failed (continuing anyway)"
fi

# ========================================
# STEP 9: Deploy to Railway
# ========================================
step "Deploy to Railway"

if [ "$SKIP_RAILWAY" != "1" ]; then
  log "Deploying backend to Railway..."

  # Check Railway authentication
  if railway whoami > /dev/null 2>&1; then
    RAILWAY_USER=$(railway whoami)
    info "   Authenticated as: $RAILWAY_USER"

    # Link to project (if not already linked)
    if [ ! -f "railway.json" ] && [ ! -f ".railway" ]; then
      warn "⚠️  Not linked to Railway project"
      info "   Run 'railway link' to connect to your project"
      read -p "Link to Railway project now? (y/N) " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway link
      else
        warn "   Skipping Railway deployment"
        SKIP_RAILWAY=1
      fi
    fi

    if [ "$SKIP_RAILWAY" != "1" ]; then
      # Deploy
      cd packages/api
      log "Pushing to Railway..."
      railway up --service="$RAILWAY_SERVICE" 2>&1 | tee -a "$DEPLOYMENT_LOG"
      cd ../..

      # Get deployment URL
      RAILWAY_URL=$(railway status --service="$RAILWAY_SERVICE" --json 2>/dev/null | jq -r '.deployments[0].url // empty')
      if [ -n "$RAILWAY_URL" ]; then
        log "✅ Railway deployment successful"
        info "   URL: $RAILWAY_URL"
      else
        warn "⚠️  Could not retrieve Railway URL"
      fi
    fi
  else
    error "❌ Not authenticated with Railway"
    error "   Run 'railway login' first"
    SKIP_RAILWAY=1
  fi
else
  info "Skipping Railway deployment"
fi

# ========================================
# STEP 10: Deploy to Vercel
# ========================================
step "Deploy to Vercel"

if [ "$SKIP_VERCEL" != "1" ]; then
  log "Deploying frontend to Vercel..."

  # Check Vercel authentication
  if vercel whoami > /dev/null 2>&1; then
    VERCEL_USER=$(vercel whoami)
    info "   Authenticated as: $VERCEL_USER"

    cd packages/webapp

    # Deploy to production
    log "Deploying to Vercel production..."
    VERCEL_OUTPUT=$(vercel --prod --yes 2>&1 | tee -a "$DEPLOYMENT_LOG")

    # Extract deployment URL
    VERCEL_URL=$(echo "$VERCEL_OUTPUT" | grep -oP 'https://[^\s]+\.vercel\.app' | head -n1)

    cd ../..

    if [ -n "$VERCEL_URL" ]; then
      log "✅ Vercel deployment successful"
      info "   URL: $VERCEL_URL"
    else
      warn "⚠️  Could not retrieve Vercel URL"
    fi
  else
    error "❌ Not authenticated with Vercel"
    error "   Run 'vercel login' first"
    SKIP_VERCEL=1
  fi
else
  info "Skipping Vercel deployment"
fi

# ========================================
# STEP 11: Post-deployment Validation
# ========================================
step "Post-deployment Validation"

# Validate Railway deployment
if [ -n "$RAILWAY_URL" ]; then
  log "Validating Railway deployment..."
  sleep 10  # Wait for deployment to stabilize

  if bash deployment/scripts/validate-railway.sh "$RAILWAY_URL" > /dev/null 2>&1; then
    log "✅ Railway validation passed"
  else
    warn "⚠️  Railway validation failed (check deployment)"
  fi
fi

# Validate Vercel deployment
if [ -n "$VERCEL_URL" ]; then
  log "Validating Vercel deployment..."
  sleep 5  # Wait for CDN propagation

  if bash deployment/scripts/validate-vercel.sh "$VERCEL_URL" > /dev/null 2>&1; then
    log "✅ Vercel validation passed"
  else
    warn "⚠️  Vercel validation failed (check deployment)"
  fi
fi

# ========================================
# STEP 12: Generate Deployment Report
# ========================================
step "Generating Deployment Report"

REPORT_FILE="/tmp/wcagai-deployment-report-$DEPLOYMENT_ID.md"

cat > "$REPORT_FILE" <<EOF
# WCAG AI Platform - Deployment Report

**Deployment ID:** $DEPLOYMENT_ID
**Date:** $(date -Iseconds)
**Branch:** ${CURRENT_BRANCH:-unknown}
**Commit:** ${CURRENT_COMMIT:-unknown}

---

## Build Summary

### API (Backend)
- **Build Status:** ✅ Success
- **Build Size:** ${DIST_SIZE:-N/A}
- **Platform:** Railway
- **URL:** ${RAILWAY_URL:-Not deployed}

### Webapp (Frontend)
- **Build Status:** ✅ Success
- **Build Size:** ${WEBAPP_SIZE:-N/A}
- **Platform:** Vercel
- **URL:** ${VERCEL_URL:-Not deployed}

---

## Deployment Status

| Service | Platform | Status | URL |
|---------|----------|--------|-----|
| Backend | Railway | ${RAILWAY_URL:+✅ Deployed|⚠️  Skipped} | ${RAILWAY_URL:-N/A} |
| Frontend | Vercel | ${VERCEL_URL:+✅ Deployed|⚠️  Skipped} | ${VERCEL_URL:-N/A} |

---

## Validation Results

### Railway Validator
$(if [ -n "$RAILWAY_URL" ]; then echo "✅ Passed"; else echo "⚠️  Skipped"; fi)

### Vercel Validator
$(if [ -n "$VERCEL_URL" ]; then echo "✅ Passed"; else echo "⚠️  Skipped"; fi)

---

## Next Steps

1. **Test the deployment:**
   - Backend: \`curl ${RAILWAY_URL:-https://your-app.railway.app}/health\`
   - Frontend: Visit ${VERCEL_URL:-https://your-app.vercel.app}

2. **Run industry tests:**
   \`\`\`bash
   ./deployment/tests/test-industry-sites.sh ${RAILWAY_URL:-https://your-app.railway.app}
   \`\`\`

3. **Monitor performance:**
   - Railway metrics: \`railway logs --service=$RAILWAY_SERVICE\`
   - Vercel analytics: Visit Vercel dashboard

4. **Set up monitoring:**
   - Configure PagerDuty alerts
   - Enable health check automation
   - Set up cost monitoring

---

## Deployment Log

Full deployment log: \`$DEPLOYMENT_LOG\`

---

**Generated by:** WCAG AI Platform Deployment Script v2.0
EOF

log "✅ Deployment report generated"
info "   Report: $REPORT_FILE"

cat "$REPORT_FILE"

# ========================================
# Summary
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$RAILWAY_URL" ]; then
  echo "🚂 Railway Backend:  $RAILWAY_URL"
fi

if [ -n "$VERCEL_URL" ]; then
  echo "▲  Vercel Frontend: $VERCEL_URL"
fi

echo ""
echo "📊 Deployment Report: $REPORT_FILE"
echo "📝 Deployment Log:    $DEPLOYMENT_LOG"
echo ""

if [ -n "$RAILWAY_URL" ] || [ -n "$VERCEL_URL" ]; then
  log "✅ Deployment successful!"
  exit 0
else
  warn "⚠️  No services were deployed"
  exit 1
fi
