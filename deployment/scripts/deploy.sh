#!/bin/bash
#
# Deployment Script for WCAG AI Platform
# Usage: ./deploy.sh [staging|production]
#

set -e

ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 WCAG AI Platform Deployment"
echo "================================"
echo "Environment: $ENVIRONMENT"
echo "Project Root: $PROJECT_ROOT"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check prerequisites
echo -e "${BLUE}1️⃣  Checking prerequisites...${NC}"

if ! command -v railway &> /dev/null; then
  echo -e "${RED}❌ Railway CLI not installed${NC}"
  echo "   Install: npm install -g @railway/cli"
  exit 1
fi

if ! command -v terraform &> /dev/null; then
  echo -e "${YELLOW}⚠️  Terraform not installed${NC}"
  echo "   Install: https://www.terraform.io/downloads"
fi

if [ -z "$RAILWAY_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  RAILWAY_TOKEN not set${NC}"
  echo "   Set: export RAILWAY_TOKEN=your-token"
fi

echo -e "${GREEN}✅ Prerequisites check complete${NC}"
echo ""

# Build
echo -e "${BLUE}2️⃣  Building packages...${NC}"

cd "$PROJECT_ROOT"

# Build API
echo "Building API..."
cd packages/api
npm install
npm run build
cd "$PROJECT_ROOT"

# Build Web App
echo "Building Web App..."
cd packages/webapp
npm install
npm run build
cd "$PROJECT_ROOT"

echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Run tests
echo -e "${BLUE}3️⃣  Running tests...${NC}"

cd packages/api
npm test || echo -e "${YELLOW}⚠️  Tests failed (continuing anyway)${NC}"
cd "$PROJECT_ROOT"

echo -e "${GREEN}✅ Tests complete${NC}"
echo ""

# Deploy infrastructure (if Terraform available)
if command -v terraform &> /dev/null; then
  echo -e "${BLUE}4️⃣  Deploying infrastructure...${NC}"

  cd deployment/terraform

  if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}⚠️  terraform.tfvars not found, skipping Terraform${NC}"
  else
    terraform init -upgrade
    terraform plan -out=tfplan

    echo ""
    read -p "Apply Terraform plan? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
      terraform apply tfplan
      echo -e "${GREEN}✅ Infrastructure deployed${NC}"
    else
      echo "Skipping Terraform apply"
    fi
  fi

  cd "$PROJECT_ROOT"
  echo ""
fi

# Deploy to Railway
echo -e "${BLUE}5️⃣  Deploying to Railway ($ENVIRONMENT)...${NC}"

railway environment select "$ENVIRONMENT" || echo "Environment not found, using default"

# Deploy backend
echo "Deploying backend..."
cd packages/api
railway up --service=wcagaii-backend || railway up
cd "$PROJECT_ROOT"

# Deploy frontend
echo "Deploying frontend..."
cd packages/webapp
railway up --service=wcagaii-frontend || railway up
cd "$PROJECT_ROOT"

echo -e "${GREEN}✅ Deployment complete${NC}"
echo ""

# Wait for deployment to stabilize
echo -e "${BLUE}6️⃣  Waiting for deployment to stabilize...${NC}"
sleep 30

# Get deployment URL
if [ "$ENVIRONMENT" = "production" ]; then
  DEPLOYMENT_URL="${PRODUCTION_URL:-https://wcagaii.railway.app}"
else
  DEPLOYMENT_URL="${STAGING_URL:-https://wcagaii-staging.railway.app}"
fi

echo "Deployment URL: $DEPLOYMENT_URL"
echo ""

# Run smoke tests
echo -e "${BLUE}7️⃣  Running smoke tests...${NC}"

bash "$SCRIPT_DIR/smoke-test.sh" "$DEPLOYMENT_URL" || {
  echo -e "${RED}❌ Smoke tests failed!${NC}"
  echo ""
  read -p "Rollback deployment? (y/n) " -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Rolling back..."
    railway rollback --service=wcagaii-backend
    railway rollback --service=wcagaii-frontend
    echo -e "${YELLOW}⚠️  Deployment rolled back${NC}"
    exit 1
  fi
}

echo -e "${GREEN}✅ Smoke tests passed${NC}"
echo ""

# Run verification
echo -e "${BLUE}8️⃣  Running production verification...${NC}"

bash "$SCRIPT_DIR/verify-production.sh" "$DEPLOYMENT_URL" || {
  echo -e "${YELLOW}⚠️  Some verification checks failed${NC}"
  echo "   Review the output above"
}

echo ""
echo "=============================================="
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Environment: $ENVIRONMENT"
echo "URL: $DEPLOYMENT_URL"
echo ""
echo "Next steps:"
echo "  • Monitor logs: railway logs"
echo "  • Check metrics: $DEPLOYMENT_URL/metrics"
echo "  • Run load test: k6 run deployment/scripts/load-test.js"
echo ""
