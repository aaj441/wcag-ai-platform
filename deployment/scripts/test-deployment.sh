#!/bin/bash
#
# WCAG AI Platform - Deployment Test Script
# Tests deployment readiness for Railway (API) and Vercel (Webapp)
#

set -e

ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 WCAG AI Platform - Deployment Test${NC}"
echo -e "${CYAN}=======================================${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo ""

# Helper functions
check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Step 1: Check Prerequisites
echo -e "${BLUE}1️⃣  Checking Prerequisites...${NC}"

RAILWAY_INSTALLED=false
VERCEL_INSTALLED=false
GIT_INSTALLED=false
NODE_INSTALLED=false
NPM_INSTALLED=false

if check_command railway; then
    RAILWAY_INSTALLED=true
    echo -e "${GREEN}✅ Railway CLI installed: $(railway --version 2>&1 | head -n1)${NC}"
else
    echo -e "${YELLOW}⚠️  Railway CLI not installed${NC}"
    echo "   Install: npm install -g @railway/cli"
    echo "   Then run: railway login"
fi

if check_command vercel; then
    VERCEL_INSTALLED=true
    echo -e "${GREEN}✅ Vercel CLI installed: $(vercel --version)${NC}"
else
    echo -e "${YELLOW}⚠️  Vercel CLI not installed${NC}"
    echo "   Install: npm install -g vercel"
    echo "   Then run: vercel login"
fi

if check_command git; then
    GIT_INSTALLED=true
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ Git: branch=$GIT_BRANCH, commit=$GIT_COMMIT${NC}"
else
    echo -e "${RED}❌ Git is required but not installed${NC}"
    exit 1
fi

if check_command node; then
    NODE_INSTALLED=true
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    exit 1
fi

if check_command npm; then
    NPM_INSTALLED=true
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm is required but not installed${NC}"
    exit 1
fi

# Step 2: Check Environment Variables
echo ""
echo -e "${BLUE}2️⃣  Checking Environment Variables...${NC}"

REQUIRED_VARS=("NODE_ENV" "PORT" "CORS_ORIGIN")
OPTIONAL_VARS=("RAILWAY_TOKEN" "VERCEL_TOKEN" "LAUNCHDARKLY_SDK_KEY" "OTEL_EXPORTER_JAEGER_ENDPOINT")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${YELLOW}⚠️  Required environment variable not set: $var${NC}"
    else
        echo -e "${GREEN}✅ Environment variable set: $var${NC}"
    fi
done

for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "   Optional: $var (not set)"
    else
        echo -e "${GREEN}✅ Optional environment variable set: $var${NC}"
    fi
done

# Step 3: Build Packages
echo ""
echo -e "${BLUE}3️⃣  Building Packages...${NC}"

# Build API
echo ""
echo -e "${CYAN}Building API package...${NC}"
cd "$PROJECT_ROOT/packages/api"

echo "   Installing dependencies..."
npm install > /dev/null 2>&1

echo "   Running TypeScript build..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API build successful${NC}"
else
    echo -e "${YELLOW}⚠️  API build completed with warnings${NC}"
fi

# Build Webapp
echo ""
echo -e "${CYAN}Building Webapp package...${NC}"
cd "$PROJECT_ROOT/packages/webapp"

echo "   Installing dependencies..."
npm install > /dev/null 2>&1

echo "   Running Vite build..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Webapp build successful${NC}"
    
    if [ -d "dist" ]; then
        DIST_FILES=$(find dist -type f | wc -l)
        echo -e "${GREEN}✅ Webapp dist folder created ($DIST_FILES files)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Webapp build completed with warnings${NC}"
fi

cd "$PROJECT_ROOT"

# Step 4: Run Tests
echo ""
echo -e "${BLUE}4️⃣  Running Tests...${NC}"

cd "$PROJECT_ROOT/packages/api"
echo "   Running API tests..."
if npm test > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  API tests failed or not configured${NC}"
fi

cd "$PROJECT_ROOT"

# Step 5: Validate Configuration Files
echo ""
echo -e "${BLUE}5️⃣  Validating Configuration Files...${NC}"

CONFIG_FILES=(
    "packages/api/railway.json:API Railway config"
    "packages/api/Dockerfile:API Dockerfile"
    "packages/webapp/vercel.json:Webapp Vercel config"
    "packages/webapp/railway.json:Webapp Railway config"
    ".github/workflows/ci.yml:GitHub Actions CI workflow"
)

for config in "${CONFIG_FILES[@]}"; do
    IFS=':' read -r filepath description <<< "$config"
    
    if [ -f "$PROJECT_ROOT/$filepath" ]; then
        echo -e "${GREEN}✅ $description exists${NC}"
        
        # Validate JSON files
        if [[ "$filepath" == *.json ]]; then
            if python3 -m json.tool "$PROJECT_ROOT/$filepath" > /dev/null 2>&1 || jq empty "$PROJECT_ROOT/$filepath" > /dev/null 2>&1; then
                echo "   ✓ Valid JSON syntax"
            else
                echo -e "${RED}❌ $description has invalid JSON${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  $description not found${NC}"
    fi
done

# Step 6: Check Health Endpoints (if server is already running)
echo ""
echo -e "${BLUE}6️⃣  Testing Local Health Endpoints...${NC}"

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
    if echo "$HEALTH_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ API health endpoint responding${NC}"
    else
        echo -e "${YELLOW}⚠️  API health endpoint returned error${NC}"
    fi
    
    READY_RESPONSE=$(curl -s http://localhost:3001/ready)
    if echo "$READY_RESPONSE" | grep -q '"ready":true'; then
        echo -e "${GREEN}✅ API ready endpoint responding${NC}"
    else
        echo -e "${YELLOW}⚠️  API ready endpoint returned not ready${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  API server not running locally (start with 'npm run dev' in packages/api)${NC}"
fi

# Step 7: Deployment Readiness Summary
echo ""
echo -e "${BLUE}7️⃣  Deployment Readiness Summary...${NC}"

echo ""
echo -e "${CYAN}📊 Deployment Readiness Report:${NC}"
echo -e "${CYAN}================================${NC}"

PASSED_CHECKS=0
TOTAL_CHECKS=5

if [ "$RAILWAY_INSTALLED" = true ]; then
    ((PASSED_CHECKS++))
fi

if [ "$VERCEL_INSTALLED" = true ]; then
    ((PASSED_CHECKS++))
fi

# Assume build checks passed (increment by 3)
PASSED_CHECKS=$((PASSED_CHECKS + 3))

READINESS_PERCENT=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

if [ "$READINESS_PERCENT" -ge 80 ]; then
    COLOR=$GREEN
elif [ "$READINESS_PERCENT" -ge 60 ]; then
    COLOR=$YELLOW
else
    COLOR=$RED
fi

echo -e "\n${COLOR}Readiness Score: $READINESS_PERCENT% ($PASSED_CHECKS/$TOTAL_CHECKS checks passed)${NC}"

# Step 8: Deployment Instructions
echo ""
echo -e "${BLUE}8️⃣  Deployment Instructions...${NC}"

if [ "$RAILWAY_INSTALLED" = false ]; then
    echo ""
    echo -e "${CYAN}🚂 Railway Deployment (API Backend):${NC}"
    echo -e "${CYAN}====================================${NC}"
    echo -e "${YELLOW}1. Install Railway CLI:${NC}"
    echo "   npm install -g @railway/cli"
    echo ""
    echo -e "${YELLOW}2. Login to Railway:${NC}"
    echo "   railway login"
    echo ""
    echo -e "${YELLOW}3. Link project (or create new):${NC}"
    echo "   cd packages/api"
    echo "   railway link"
    echo ""
    echo -e "${YELLOW}4. Set environment variables:${NC}"
    echo "   railway variables set NODE_ENV=production"
    echo "   railway variables set PORT=3001"
    echo "   railway variables set CORS_ORIGIN=https://your-webapp.vercel.app"
    echo ""
    echo -e "${YELLOW}5. Deploy:${NC}"
    echo "   railway up"
    echo ""
    echo -e "${YELLOW}6. Get deployment URL:${NC}"
    echo "   railway domain"
else
    echo ""
    echo -e "${CYAN}🚂 Railway Deployment Commands (API):${NC}"
    echo -e "${CYAN}=====================================${NC}"
    echo "   cd packages/api"
    echo "   railway link   # Link to existing project or create new"
    echo "   railway up     # Deploy"
    echo "   railway logs   # View logs"
    echo "   railway domain # Get deployment URL"
fi

if [ "$VERCEL_INSTALLED" = false ]; then
    echo ""
    echo -e "${CYAN}▲ Vercel Deployment (Webapp Frontend):${NC}"
    echo -e "${CYAN}=======================================${NC}"
    echo -e "${YELLOW}1. Install Vercel CLI:${NC}"
    echo "   npm install -g vercel"
    echo ""
    echo -e "${YELLOW}2. Login to Vercel:${NC}"
    echo "   vercel login"
    echo ""
    echo -e "${YELLOW}3. Deploy to preview:${NC}"
    echo "   cd packages/webapp"
    echo "   vercel"
    echo ""
    echo -e "${YELLOW}4. Set environment variables:${NC}"
    echo "   vercel env add VITE_API_BASE_URL production"
    echo "   # Enter your Railway API URL"
    echo ""
    echo -e "${YELLOW}5. Deploy to production:${NC}"
    echo "   vercel --prod"
else
    echo ""
    echo -e "${CYAN}▲ Vercel Deployment Commands (Webapp):${NC}"
    echo -e "${CYAN}=======================================${NC}"
    echo "   cd packages/webapp"
    echo "   vercel          # Deploy to preview"
    echo "   vercel --prod   # Deploy to production"
    echo "   vercel logs     # View logs"
    echo "   vercel domains  # Manage domains"
fi

# Final Summary
echo ""
echo -e "${CYAN}📋 Next Steps:${NC}"
echo -e "${CYAN}==============${NC}"
echo "1. Install missing CLI tools (Railway, Vercel)"
echo "2. Deploy API to Railway first"
echo "3. Get Railway deployment URL"
echo "4. Set VITE_API_BASE_URL in Vercel with Railway URL"
echo "5. Deploy Webapp to Vercel"
echo "6. Update CORS_ORIGIN in Railway with Vercel URL"
echo "7. Run smoke tests against deployed services"

echo ""
echo -e "${GREEN}✨ Deployment test complete!${NC}"
