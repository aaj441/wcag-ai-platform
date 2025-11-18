#!/bin/bash

###############################################################################
# Security Setup Script for WCAG AI Platform
#
# This script automates the setup of security tools and configurations
# Run once in your development environment
#
# Usage: ./scripts/setup-security.sh
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}       WCAG AI Platform - Security Setup Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to print status
print_status() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

###############################################################################
# 1. Install Node.js Dependencies
###############################################################################

echo ""
echo -e "${BLUE}Step 1: Installing Node.js dependencies...${NC}"

if command -v npm &> /dev/null; then
  npm install --save-dev husky
  npm install --save-dev @types/node
  npm install dompurify
  npm install --save-dev @types/dompurify
  print_status "Node.js dependencies installed"
else
  print_error "npm not found. Please install Node.js first."
  exit 1
fi

###############################################################################
# 2. Install git-secrets
###############################################################################

echo ""
echo -e "${BLUE}Step 2: Installing git-secrets...${NC}"

if command -v git-secrets &> /dev/null; then
  print_status "git-secrets already installed"
else
  print_info "git-secrets not found. Installing..."

  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
      brew install git-secrets
      print_status "git-secrets installed via Homebrew"
    else
      print_warning "Homebrew not found. Please install git-secrets manually:"
      echo "  brew install git-secrets"
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    print_info "Installing git-secrets from source..."
    TMP_DIR=$(mktemp -d)
    cd "$TMP_DIR"
    git clone https://github.com/awslabs/git-secrets.git
    cd git-secrets
    make install
    cd - > /dev/null
    rm -rf "$TMP_DIR"
    print_status "git-secrets installed"
  else
    print_warning "Unsupported OS. Please install git-secrets manually from:"
    echo "  https://github.com/awslabs/git-secrets"
  fi
fi

###############################################################################
# 3. Initialize Husky
###############################################################################

echo ""
echo -e "${BLUE}Step 3: Initializing Husky...${NC}"

npx husky install
print_status "Husky initialized"

# Add execute permission to pre-commit hook
chmod +x .husky/pre-commit
print_status "Pre-commit hook made executable"

###############################################################################
# 4. Configure git-secrets
###############################################################################

echo ""
echo -e "${BLUE}Step 4: Configuring git-secrets...${NC}"

git secrets --install
print_status "git-secrets initialized"

git secrets --register-aws
print_status "AWS patterns registered"

# Register additional secret patterns
echo -e "${BLUE}Registering custom secret patterns...${NC}"

# Stripe keys
git config --local secrets.patterns 'sk_live_[0-9a-zA-Z]{24}'
git config --local secrets.patterns 'sk_test_[0-9a-zA-Z]{24}'
print_status "Stripe patterns registered"

# API keys (generic)
git config --local secrets.patterns 'api[_-]key[=:][0-9a-zA-Z\-\.]{20,}'
print_status "API key patterns registered"

# AWS keys
git config --local secrets.patterns 'AKIA[0-9A-Z]{16}'
print_status "AWS key patterns registered"

# GitHub tokens
git config --local secrets.patterns 'ghp_[A-Za-z0-9_]{36}'
print_status "GitHub token patterns registered"

# Anthropic/OpenAI keys
git config --local secrets.patterns 'sk-[a-zA-Z0-9]{48}'
print_status "Anthropic/OpenAI patterns registered"

###############################################################################
# 5. Verify Tools
###############################################################################

echo ""
echo -e "${BLUE}Step 5: Verifying installed tools...${NC}"

# Check npm packages
echo -e "${YELLOW}Checking Node packages...${NC}"
npm list husky > /dev/null 2>&1 && print_status "Husky installed" || print_error "Husky not found"
npm list dompurify > /dev/null 2>&1 && print_status "DOMPurify installed" || print_error "DOMPurify not found"

# Check git-secrets
echo -e "${YELLOW}Checking git-secrets...${NC}"
git secrets --version && print_status "git-secrets installed" || print_warning "git-secrets may need manual installation"

# Check ESLint
echo -e "${YELLOW}Checking ESLint...${NC}"
npx eslint --version > /dev/null 2>&1 && print_status "ESLint installed" || print_warning "ESLint not found (install if needed)"

###############################################################################
# 6. Create Development Configuration
###############################################################################

echo ""
echo -e "${BLUE}Step 6: Creating configuration files...${NC}"

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
  cp packages/api/.env.example .env.local
  print_status "Created .env.local from template"
else
  print_status ".env.local already exists"
fi

###############################################################################
# 7. Display Summary
###############################################################################

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     Security Setup Complete! ✓${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}What's been installed:${NC}"
echo "  ✓ Husky - Git hooks manager"
echo "  ✓ git-secrets - Secret detection"
echo "  ✓ Pre-commit hook - Automatic checks on each commit"
echo "  ✓ DOMPurify - HTML sanitization"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review SECURITY_REMEDIATION_ROADMAP.md"
echo "  2. Check SECURITY_TEAM_TASKS.md for your assigned tasks"
echo "  3. Run: git secrets --scan to check existing history"
echo "  4. Make your first commit to test the pre-commit hook"
echo ""

echo -e "${YELLOW}Pre-commit hook will:${NC}"
echo "  • Detect secrets (git-secrets)"
echo "  • Run ESLint (with auto-fix)"
echo "  • Format code (Prettier)"
echo ""

echo -e "${YELLOW}Useful commands:${NC}"
echo "  npm test                    - Run tests"
echo "  npm run lint                - Run ESLint"
echo "  npm run build               - Build project"
echo "  git secrets --scan          - Scan history for secrets"
echo "  git secrets --audit         - Run security audit"
echo ""

echo -e "${YELLOW}Documentation:${NC}"
echo "  • SECURITY.md - Security policies"
echo "  • SECURITY_REMEDIATION_ROADMAP.md - Implementation guide"
echo "  • SECURITY_TEAM_TASKS.md - Team task assignments"
echo ""

echo -e "${GREEN}Questions? See SECURITY_TEAM_TASKS.md for support options.${NC}"
echo ""
