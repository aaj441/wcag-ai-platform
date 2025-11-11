#!/bin/bash
set -e

# ============================================================================
# Quick Start - One-Click Deployment
# ============================================================================
#
# This script guides you through the complete deployment process:
#   1. Check prerequisites (Node.js, npm, git)
#   2. Install CLIs (Railway, Vercel)
#   3. Build and test locally
#   4. Setup environment variables
#   5. Deploy to production
#
# Usage:
#   ./quick-start.sh                # Interactive mode (recommended)
#   ./quick-start.sh --auto         # Automatic mode (skip confirmations)
#   ./quick-start.sh --skip-cli     # Skip CLI installation
#   ./quick-start.sh --skip-env     # Skip environment setup
#   ./quick-start.sh --dry-run      # Test only, don't deploy
#
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
AUTO_MODE=false
SKIP_CLI=false
SKIP_ENV=false
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --auto)
      AUTO_MODE=true
      ;;
    --skip-cli)
      SKIP_CLI=true
      ;;
    --skip-env)
      SKIP_ENV=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    --help|-h)
      cat <<EOF
${CYAN}WCAG AI Platform - Quick Start Deployment${NC}

This script guides you through the complete deployment process from zero to production.

${YELLOW}USAGE:${NC}
  ./quick-start.sh [options]

${YELLOW}OPTIONS:${NC}
  --auto         Automatic mode (skip confirmations where possible)
  --skip-cli     Skip CLI installation (if already installed)
  --skip-env     Skip environment variable setup (if already configured)
  --dry-run      Run tests and validation only, don't deploy
  --help, -h     Show this help message

${YELLOW}EXAMPLES:${NC}
  # Interactive mode (recommended for first-time setup)
  ./quick-start.sh

  # Quick deployment (if CLIs and env vars already set up)
  ./quick-start.sh --skip-cli --skip-env

  # Test everything without deploying
  ./quick-start.sh --dry-run

${YELLOW}REQUIREMENTS:${NC}
  • Node.js >= 18.0
  • npm >= 8.0
  • git
  • Railway account (https://railway.app)
  • Vercel account (https://vercel.com)

${YELLOW}WHAT YOU'LL NEED:${NC}
  • OpenAI API key (required)
  • LaunchDarkly SDK key (required)
  • Webhook secret (will generate if needed)

${YELLOW}TIME ESTIMATE:${NC}
  • First-time setup: 15-20 minutes
  • Subsequent deployments: 2-3 minutes

${YELLOW}MORE INFO:${NC}
  • Documentation: docs/DEPLOYMENT_TEST_REPORT.md
  • Troubleshooting: docs/AUDIT_VERIFICATION_REPORT.md

EOF
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option '$arg'${NC}"
      echo "Run './quick-start.sh --help' for usage information"
      exit 1
      ;;
  esac
done

# ============================================================================
# Helper Functions
# ============================================================================

print_banner() {
  clear
  echo -e "${CYAN}"
  cat <<'EOF'
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║                      WCAG AI PLATFORM                                    ║
║                   Quick Start Deployment                                 ║
║                                                                          ║
║  Deploy your WCAG accessibility platform to production in minutes!      ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
EOF
  echo -e "${NC}"
  echo ""
}

print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_step() {
  echo ""
  echo -e "${MAGENTA}▶ STEP $1/$2: $3${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

prompt_continue() {
  if [ "$AUTO_MODE" = true ]; then
    return 0
  fi

  echo ""
  read -p "Press Enter to continue or Ctrl+C to cancel..."
  echo ""
}

check_command() {
  command -v "$1" &> /dev/null
}

# ============================================================================
# Step 1: Welcome & Prerequisites
# ============================================================================

step_welcome() {
  print_banner

  cat <<EOF
Welcome to the WCAG AI Platform Quick Start installer!

This wizard will guide you through:
  ${GREEN}✓${NC} Installing required CLI tools
  ${GREEN}✓${NC} Building and testing your code
  ${GREEN}✓${NC} Configuring environment variables
  ${GREEN}✓${NC} Deploying to Railway (backend) and Vercel (frontend)

${YELLOW}What you'll need:${NC}
  • OpenAI API key (get from: https://platform.openai.com/api-keys)
  • LaunchDarkly SDK key (get from: https://app.launchdarkly.com)
  • Railway account (sign up: https://railway.app)
  • Vercel account (sign up: https://vercel.com)

${YELLOW}Time estimate:${NC}
  • First-time setup: ${CYAN}15-20 minutes${NC}
  • Subsequent deployments: ${CYAN}2-3 minutes${NC}

${YELLOW}Need help?${NC}
  • Documentation: ${BLUE}docs/DEPLOYMENT_TEST_REPORT.md${NC}
  • Report issues: ${BLUE}https://github.com/your-org/wcag-ai-platform/issues${NC}

EOF

  prompt_continue
}

step_prerequisites() {
  print_step 1 6 "Checking Prerequisites"

  local all_ok=true

  # Check Node.js
  if check_command node; then
    local node_version=$(node --version | sed 's/v//')
    local node_major=$(echo "$node_version" | cut -d. -f1)
    if [ "$node_major" -ge 18 ]; then
      print_success "Node.js $node_version (>= 18.0 required)"
    else
      print_error "Node.js $node_version is too old (>= 18.0 required)"
      print_info "Install from: https://nodejs.org/"
      all_ok=false
    fi
  else
    print_error "Node.js not installed"
    print_info "Install from: https://nodejs.org/"
    all_ok=false
  fi

  # Check npm
  if check_command npm; then
    local npm_version=$(npm --version)
    local npm_major=$(echo "$npm_version" | cut -d. -f1)
    if [ "$npm_major" -ge 8 ]; then
      print_success "npm $npm_version (>= 8.0 required)"
    else
      print_error "npm $npm_version is too old (>= 8.0 required)"
      all_ok=false
    fi
  else
    print_error "npm not installed"
    all_ok=false
  fi

  # Check git
  if check_command git; then
    local git_version=$(git --version | grep -oP '\d+\.\d+\.\d+')
    print_success "git $git_version"
  else
    print_error "git not installed"
    all_ok=false
  fi

  echo ""

  if [ "$all_ok" = false ]; then
    print_error "Prerequisites not met. Please install required software and try again."
    exit 1
  fi

  print_success "All prerequisites met!"
  prompt_continue
}

# ============================================================================
# Step 2: Install CLIs
# ============================================================================

step_install_clis() {
  if [ "$SKIP_CLI" = true ]; then
    print_info "Skipping CLI installation (--skip-cli flag)"
    return 0
  fi

  print_step 2 6 "Installing CLI Tools"

  print_info "Checking if Railway and Vercel CLIs are already installed..."
  echo ""

  local need_install=false

  if check_command railway; then
    print_success "Railway CLI already installed"
  else
    print_warning "Railway CLI not installed"
    need_install=true
  fi

  if check_command vercel; then
    print_success "Vercel CLI already installed"
  else
    print_warning "Vercel CLI not installed"
    need_install=true
  fi

  if [ "$need_install" = false ]; then
    print_success "All CLIs already installed!"
    prompt_continue
    return 0
  fi

  echo ""
  echo "Would you like to install the missing CLIs now?"
  echo ""

  if [ "$AUTO_MODE" = true ]; then
    echo "Running in auto mode, installing..."
    ./install-cli.sh all
  else
    read -p "Install missing CLIs? (Y/n): " install_response
    if [[ ! "$install_response" =~ ^[Nn]$ ]]; then
      ./install-cli.sh all
    else
      print_warning "Skipping CLI installation. You may need to install manually."
    fi
  fi

  prompt_continue
}

# ============================================================================
# Step 3: Build & Test
# ============================================================================

step_build_test() {
  print_step 3 6 "Building and Testing"

  print_info "Installing dependencies..."
  cd packages/api
  npm install --silent
  cd ../..

  echo ""
  print_success "Dependencies installed"

  echo ""
  print_info "Building API..."
  cd packages/api
  npm run build
  cd ../..

  echo ""
  print_success "API built successfully"

  echo ""
  print_info "Running deployment dry-run validation..."
  ./deploy-dry-run.sh

  echo ""
  print_success "Build and validation complete!"
  prompt_continue
}

# ============================================================================
# Step 4: Environment Variables
# ============================================================================

step_environment() {
  if [ "$SKIP_ENV" = true ]; then
    print_info "Skipping environment setup (--skip-env flag)"
    return 0
  fi

  print_step 4 6 "Configuring Environment Variables"

  print_info "Checking current environment variable status..."
  echo ""

  ./setup-env.sh check

  echo ""
  echo "Would you like to set up environment variables now?"
  echo "This will guide you through setting Railway and Vercel variables interactively."
  echo ""

  if [ "$AUTO_MODE" = true ]; then
    print_warning "Auto mode: Skipping interactive environment setup"
    print_info "You'll need to set environment variables manually:"
    echo "  - Railway: ${YELLOW}railway variables set KEY=value${NC}"
    echo "  - Vercel:  ${YELLOW}vercel env add KEY production${NC}"
  else
    read -p "Setup environment variables now? (Y/n): " env_response
    if [[ ! "$env_response" =~ ^[Nn]$ ]]; then
      ./setup-env.sh all
    else
      print_warning "Skipping environment setup. Remember to set variables before deploying!"
      echo ""
      print_info "Export template: ${YELLOW}./setup-env.sh export${NC}"
      echo ""
    fi
  fi

  prompt_continue
}

# ============================================================================
# Step 5: Deploy
# ============================================================================

step_deploy() {
  if [ "$DRY_RUN" = true ]; then
    print_step 5 6 "Dry Run - Skipping Deployment"
    print_info "Dry run mode: Skipping actual deployment"
    print_success "Validation complete! Run without --dry-run to deploy."
    return 0
  fi

  print_step 5 6 "Deploying to Production"

  print_info "This will deploy:"
  echo "  • ${BLUE}Backend (API)${NC} → Railway"
  echo "  • ${BLUE}Frontend (Web App)${NC} → Vercel"
  echo ""

  if [ "$AUTO_MODE" = false ]; then
    read -p "Start deployment? (Y/n): " deploy_response
    if [[ "$deploy_response" =~ ^[Nn]$ ]]; then
      print_warning "Deployment cancelled by user"
      exit 0
    fi
  fi

  echo ""
  print_info "Starting production deployment..."
  echo ""

  # Run production deployment script
  ./deploy-production.sh

  echo ""
  print_success "Deployment complete!"
  prompt_continue
}

# ============================================================================
# Step 6: Success & Next Steps
# ============================================================================

step_success() {
  print_step 6 6 "Deployment Complete!"

  print_banner

  cat <<EOF
${GREEN}╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║                    🎉 DEPLOYMENT SUCCESSFUL! 🎉                          ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝${NC}

Your WCAG AI Platform is now live in production!

${YELLOW}▶ BACKEND (API)${NC}
  Railway Dashboard: ${BLUE}https://railway.app/dashboard${NC}
  API Health Check:  ${BLUE}<your-api-url>/health${NC}
  API Metrics:       ${BLUE}<your-api-url>/metrics${NC}

${YELLOW}▶ FRONTEND (WEB APP)${NC}
  Vercel Dashboard:  ${BLUE}https://vercel.com/dashboard${NC}
  Web App:           ${BLUE}<your-app-url>${NC}

${YELLOW}▶ MONITORING${NC}
  Health Dashboard:  ${BLUE}deployment/dashboard/index.html${NC}
  API Documentation: ${BLUE}docs/api/index.html${NC}

${YELLOW}▶ NEXT STEPS${NC}
  1. Test your deployment:
     ${CYAN}curl <your-api-url>/health${NC}

  2. Run WCAG scan:
     ${CYAN}curl -X POST <your-api-url>/api/scan \\
       -H "Content-Type: application/json" \\
       -d '{"url": "https://example.com", "wcagLevel": "AA"}'${NC}

  3. Monitor metrics:
     ${CYAN}open deployment/dashboard/index.html${NC}

  4. View logs:
     ${CYAN}railway logs${NC}

${YELLOW}▶ USEFUL COMMANDS${NC}
  • Check deployment: ${CYAN}./deploy-dry-run.sh${NC}
  • View env vars:    ${CYAN}railway variables${NC}
  • View env vars:    ${CYAN}vercel env ls${NC}
  • Redeploy:         ${CYAN}./deploy-production.sh${NC}

${YELLOW}▶ DOCUMENTATION${NC}
  • Deployment Report: ${BLUE}docs/DEPLOYMENT_TEST_REPORT.md${NC}
  • Audit Report:      ${BLUE}docs/AUDIT_VERIFICATION_REPORT.md${NC}
  • API Docs:          ${BLUE}docs/api/README.md${NC}
  • ADHD UI Guide:     ${BLUE}docs/ADHD_FRIENDLY_UI.md${NC}

${YELLOW}▶ SUPPORT${NC}
  • Report issues:     ${BLUE}https://github.com/your-org/wcag-ai-platform/issues${NC}
  • Documentation:     ${BLUE}docs/${NC}

${GREEN}Thank you for using WCAG AI Platform!${NC}
${GREEN}Making the web accessible for everyone. ♿${NC}

EOF
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  # Change to script directory
  cd "$(dirname "$0")"

  # Run all steps
  step_welcome
  step_prerequisites
  step_install_clis
  step_build_test
  step_environment
  step_deploy
  step_success
}

# Run main function
main
