#!/bin/bash

# InfinitySoul Deployment Script
# Deploys frontend to Vercel with pre-deployment checks

set -e  # Exit on error

echo "🚀 InfinitySoul Deployment Script"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Parse arguments
ENVIRONMENT=${1:-"preview"}  # default to preview

if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "preview" ]; then
    echo -e "${RED}❌ Invalid environment. Use 'production' or 'preview'${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Pre-deployment Checks${NC}"
echo "Environment: $ENVIRONMENT"

# 1. Check Node version
NODE_VERSION=$(node -v)
echo "✓ Node version: $NODE_VERSION"

# 2. Check pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm not found. Please install pnpm first.${NC}"
    exit 1
fi
echo "✓ pnpm installed"

# 3. Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pnpm install

# 4. Type checking
echo -e "${YELLOW}🔍 Running type checks...${NC}"
pnpm type-check || {
    echo -e "${RED}❌ Type checking failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Type checks passed${NC}"

# 5. Build packages
echo -e "${YELLOW}🔨 Building packages...${NC}"
pnpm build:infinitysoul || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Build successful${NC}"

# 6. Deploy to Vercel
echo -e "${YELLOW}🚀 Deploying to Vercel ($ENVIRONMENT)...${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    vercel --prod
else
    vercel
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
