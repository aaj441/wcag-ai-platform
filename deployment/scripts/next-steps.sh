#!/bin/bash

# ============================================================================
# Smart Next Steps Automation
# ============================================================================
#
# This script analyzes your current state and recommends the best next steps
# Usage: ./next-steps.sh
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

print_header() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
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

print_action() {
  echo -e "${MAGENTA}▶ $1${NC}"
}

# ============================================================================
# State Detection
# ============================================================================

check_state() {
  local state=""
  
  # Check if CLI tools installed
  if ! command -v railway &> /dev/null || ! command -v vercel &> /dev/null; then
    state="needs_cli"
  # Check if environment variables set
  elif ! railway variables &> /dev/null 2>&1; then
    state="needs_env"
  # Check if already deployed
  elif railway status &> /dev/null 2>&1; then
    state="deployed"
  # Ready to deploy
  else
    state="ready_to_deploy"
  fi
  
  echo "$state"
}

# ============================================================================
# Recommendations
# ============================================================================

recommend_needs_cli() {
  print_header "📦 Next Step: Install CLI Tools"
  
  echo "I detected that you need to install Railway and/or Vercel CLI tools."
  echo ""
  echo "This will enable you to deploy your WCAG AI Platform to production."
  echo ""
  
  print_action "Recommended Action"
  echo ""
  echo "  Run: ${YELLOW}./install-cli.sh all${NC}"
  echo ""
  echo "This will:"
  echo "  • Install Railway CLI (backend deployment)"
  echo "  • Install Vercel CLI (frontend deployment)"
  echo "  • Authenticate both CLIs (browser-based)"
  echo "  • Verify installations"
  echo ""
  echo "Time estimate: ${CYAN}5-10 minutes${NC}"
  echo ""
  
  read -p "Would you like me to run this now? (Y/n): " response
  if [[ ! "$response" =~ ^[Nn]$ ]]; then
    ./install-cli.sh all
    echo ""
    print_success "CLI tools installed!"
    echo ""
    echo "Next, run ${YELLOW}./next-steps.sh${NC} again to continue."
  fi
}

recommend_needs_env() {
  print_header "🔧 Next Step: Configure Environment Variables"
  
  echo "CLI tools are installed! Now you need to configure environment variables."
  echo ""
  echo "Required variables:"
  echo "  • Railway (10 variables): API keys, secrets, etc."
  echo "  • Vercel (1 variable): Backend API URL"
  echo ""
  
  print_action "Recommended Action"
  echo ""
  echo "  Run: ${YELLOW}./setup-env.sh all${NC}"
  echo ""
  echo "This will:"
  echo "  • Guide you through setting Railway environment variables"
  echo "  • Guide you through setting Vercel environment variables"
  echo "  • Validate all required variables are set"
  echo ""
  echo "Time estimate: ${CYAN}10-15 minutes${NC}"
  echo ""
  
  read -p "Would you like me to run this now? (Y/n): " response
  if [[ ! "$response" =~ ^[Nn]$ ]]; then
    ./setup-env.sh all
    echo ""
    print_success "Environment variables configured!"
    echo ""
    echo "Next, run ${YELLOW}./next-steps.sh${NC} again to continue."
  fi
}

recommend_ready_to_deploy() {
  print_header "🚀 Next Step: Deploy to Production"
  
  echo "Everything is ready! You can now deploy to production."
  echo ""
  
  print_action "Recommended Action"
  echo ""
  echo "  Run: ${YELLOW}./quick-start.sh --skip-cli --skip-env${NC}"
  echo ""
  echo "This will:"
  echo "  • Build and test your code"
  echo "  • Deploy API to Railway"
  echo "  • Deploy Web App to Vercel"
  echo "  • Verify deployment health"
  echo ""
  echo "Time estimate: ${CYAN}3-5 minutes${NC}"
  echo ""
  
  read -p "Would you like me to run this now? (Y/n): " response
  if [[ ! "$response" =~ ^[Nn]$ ]]; then
    ./quick-start.sh --skip-cli --skip-env
    echo ""
    print_success "Deployed to production!"
  fi
}

recommend_deployed() {
  print_header "✅ Already Deployed! What's Next?"
  
  echo "Your WCAG AI Platform is already deployed to production."
  echo ""
  
  print_action "Recommended Next Steps"
  echo ""
  echo "1. ${YELLOW}Test your deployment${NC}"
  echo "   curl https://your-api.railway.app/health"
  echo ""
  echo "2. ${YELLOW}View logs${NC}"
  echo "   railway logs"
  echo ""
  echo "3. ${YELLOW}Monitor metrics${NC}"
  echo "   open deployment/dashboard/index.html"
  echo ""
  echo "4. ${YELLOW}Read the strategic framework${NC}"
  echo "   open docs/WCAGAI_Executive_OnePager.md"
  echo ""
  echo "5. ${YELLOW}Implement consultant workflow${NC}"
  echo "   open docs/WCAGAI_Consultant_Roadmap.md"
  echo ""
  echo "6. ${YELLOW}Start 30-day implementation sprint${NC}"
  echo "   See docs/WCAGAI_Complete_Strategy.md Part V"
  echo ""
}

# ============================================================================
# Alternative Paths
# ============================================================================

show_alternative_paths() {
  echo ""
  print_header "🔀 Alternative Paths"
  echo ""
  echo "Not ready to deploy? Here are other things you can do:"
  echo ""
  echo "A. ${YELLOW}Learn the Masonic philosophy${NC}"
  echo "   open docs/WCAGAI_Masonic_Code.md"
  echo ""
  echo "B. ${YELLOW}Understand the business strategy${NC}"
  echo "   open docs/WCAGAI_Complete_Strategy.md"
  echo ""
  echo "C. ${YELLOW}Review the architecture${NC}"
  echo "   open docs/WCAGAI_Architecture_Flow.md"
  echo ""
  echo "D. ${YELLOW}Explore deployment automation${NC}"
  echo "   cat deployment/scripts/quick-start.sh"
  echo ""
  echo "E. ${YELLOW}Run dry-run deployment test${NC}"
  echo "   ./deploy-dry-run.sh"
  echo ""
}

# ============================================================================
# Main
# ============================================================================

main() {
  clear
  
  print_header "🎯 WCAG AI Platform: Smart Next Steps"
  
  echo "Analyzing your current state..."
  echo ""
  
  state=$(check_state)
  
  case "$state" in
    needs_cli)
      recommend_needs_cli
      ;;
    needs_env)
      recommend_needs_env
      ;;
    ready_to_deploy)
      recommend_ready_to_deploy
      ;;
    deployed)
      recommend_deployed
      ;;
    *)
      print_error "Unable to determine current state"
      ;;
  esac
  
  show_alternative_paths
  
  echo ""
  print_header "📚 Documentation"
  echo ""
  echo "For complete documentation:"
  echo "  • Quick Start: ${BLUE}README.md${NC}"
  echo "  • Strategy: ${BLUE}docs/WCAGAI_Complete_Strategy.md${NC}"
  echo "  • One-Pager: ${BLUE}docs/WCAGAI_Executive_OnePager.md${NC}"
  echo ""
}

main "$@"
