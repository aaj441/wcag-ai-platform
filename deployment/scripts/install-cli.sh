#!/bin/bash
set -e

# ============================================================================
# CLI Installation Automation
# ============================================================================
#
# This script automates the installation and authentication of:
#   • Railway CLI (@railway/cli)
#   • Vercel CLI (vercel)
#
# Usage:
#   ./install-cli.sh                # Install both CLIs
#   ./install-cli.sh railway        # Install Railway CLI only
#   ./install-cli.sh vercel         # Install Vercel CLI only
#   ./install-cli.sh check          # Check installation status
#
# Requirements:
#   • Node.js >= 18.x
#   • npm >= 8.x
#
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
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

check_command() {
  command -v "$1" &> /dev/null
}

get_version() {
  local cmd="$1"
  if check_command "$cmd"; then
    case "$cmd" in
      node)
        node --version | sed 's/v//'
        ;;
      npm)
        npm --version
        ;;
      railway)
        railway --version 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1 || echo "unknown"
        ;;
      vercel)
        vercel --version 2>&1 | head -1
        ;;
      *)
        echo "unknown"
        ;;
    esac
  else
    echo "not installed"
  fi
}

compare_version() {
  local version="$1"
  local required="$2"

  if [ "$version" = "not installed" ]; then
    return 1
  fi

  # Simple version comparison (good enough for major versions)
  local ver_major=$(echo "$version" | cut -d. -f1)
  local req_major=$(echo "$required" | cut -d. -f1)

  [ "$ver_major" -ge "$req_major" ]
}

# ============================================================================
# Prerequisite Checks
# ============================================================================

check_prerequisites() {
  print_header "Checking Prerequisites"

  local all_ok=true

  # Check Node.js
  if check_command node; then
    local node_version=$(get_version node)
    if compare_version "$node_version" "18"; then
      print_success "Node.js $node_version (>= 18.0 required)"
    else
      print_error "Node.js $node_version is too old (>= 18.0 required)"
      all_ok=false
    fi
  else
    print_error "Node.js not installed (>= 18.0 required)"
    print_info "Install from: https://nodejs.org/"
    all_ok=false
  fi

  # Check npm
  if check_command npm; then
    local npm_version=$(get_version npm)
    if compare_version "$npm_version" "8"; then
      print_success "npm $npm_version (>= 8.0 required)"
    else
      print_error "npm $npm_version is too old (>= 8.0 required)"
      all_ok=false
    fi
  else
    print_error "npm not installed (>= 8.0 required)"
    all_ok=false
  fi

  echo ""

  if [ "$all_ok" = false ]; then
    print_error "Prerequisites not met. Please install required software."
    exit 1
  fi

  print_success "All prerequisites met!"
  return 0
}

# ============================================================================
# Railway CLI
# ============================================================================

check_railway() {
  if check_command railway; then
    local version=$(get_version railway)
    print_success "Railway CLI installed (version $version)"
    return 0
  else
    print_warning "Railway CLI not installed"
    return 1
  fi
}

install_railway() {
  print_header "Installing Railway CLI"

  if check_railway; then
    echo ""
    read -p "Railway CLI is already installed. Reinstall? (y/N): " reinstall
    if [[ ! "$reinstall" =~ ^[Yy]$ ]]; then
      print_info "Skipping Railway CLI installation"
      return 0
    fi
  fi

  print_info "Installing @railway/cli via npm..."
  echo ""

  # Install globally
  if npm install -g @railway/cli; then
    echo ""
    print_success "Railway CLI installed successfully!"

    # Verify installation
    if check_railway; then
      local version=$(get_version railway)
      print_success "Verified: Railway CLI version $version"
      return 0
    else
      print_error "Installation verification failed"
      return 1
    fi
  else
    echo ""
    print_error "Failed to install Railway CLI"
    return 1
  fi
}

authenticate_railway() {
  print_header "Railway CLI Authentication"

  if ! check_command railway; then
    print_error "Railway CLI not installed. Run './install-cli.sh railway' first."
    return 1
  fi

  print_info "Checking Railway authentication status..."

  # Check if already authenticated
  if railway whoami &> /dev/null; then
    local user=$(railway whoami 2>/dev/null || echo "Unknown")
    print_success "Already authenticated as: $user"
    echo ""
    read -p "Re-authenticate? (y/N): " reauth
    if [[ ! "$reauth" =~ ^[Yy]$ ]]; then
      return 0
    fi
  fi

  echo ""
  print_info "This will open a browser window for authentication..."
  read -p "Press Enter to continue or Ctrl+C to cancel..."

  if railway login; then
    echo ""
    print_success "Railway authentication successful!"
    local user=$(railway whoami 2>/dev/null || echo "Unknown")
    print_info "Logged in as: $user"
    return 0
  else
    echo ""
    print_error "Railway authentication failed"
    return 1
  fi
}

# ============================================================================
# Vercel CLI
# ============================================================================

check_vercel() {
  if check_command vercel; then
    local version=$(get_version vercel)
    print_success "Vercel CLI installed (version $version)"
    return 0
  else
    print_warning "Vercel CLI not installed"
    return 1
  fi
}

install_vercel() {
  print_header "Installing Vercel CLI"

  if check_vercel; then
    echo ""
    read -p "Vercel CLI is already installed. Reinstall? (y/N): " reinstall
    if [[ ! "$reinstall" =~ ^[Yy]$ ]]; then
      print_info "Skipping Vercel CLI installation"
      return 0
    fi
  fi

  print_info "Installing vercel via npm..."
  echo ""

  # Install globally
  if npm install -g vercel; then
    echo ""
    print_success "Vercel CLI installed successfully!"

    # Verify installation
    if check_vercel; then
      local version=$(get_version vercel)
      print_success "Verified: Vercel CLI version $version"
      return 0
    else
      print_error "Installation verification failed"
      return 1
    fi
  else
    echo ""
    print_error "Failed to install Vercel CLI"
    return 1
  fi
}

authenticate_vercel() {
  print_header "Vercel CLI Authentication"

  if ! check_command vercel; then
    print_error "Vercel CLI not installed. Run './install-cli.sh vercel' first."
    return 1
  fi

  print_info "Checking Vercel authentication status..."

  # Check if already authenticated
  if vercel whoami &> /dev/null; then
    local user=$(vercel whoami 2>/dev/null || echo "Unknown")
    print_success "Already authenticated as: $user"
    echo ""
    read -p "Re-authenticate? (y/N): " reauth
    if [[ ! "$reauth" =~ ^[Yy]$ ]]; then
      return 0
    fi
  fi

  echo ""
  print_info "This will open a browser window for authentication..."
  read -p "Press Enter to continue or Ctrl+C to cancel..."

  if vercel login; then
    echo ""
    print_success "Vercel authentication successful!"
    local user=$(vercel whoami 2>/dev/null || echo "Unknown")
    print_info "Logged in as: $user"
    return 0
  else
    echo ""
    print_error "Vercel authentication failed"
    return 1
  fi
}

# ============================================================================
# Commands
# ============================================================================

cmd_check() {
  print_header "CLI Installation Status"

  check_prerequisites

  echo ""
  print_header "Railway CLI"
  if check_railway; then
    echo ""
    if railway whoami &> /dev/null; then
      local user=$(railway whoami 2>/dev/null || echo "Unknown")
      print_success "Authenticated as: $user"
    else
      print_warning "Not authenticated"
      print_info "Run: ${YELLOW}./install-cli.sh railway${NC} to authenticate"
    fi
  else
    echo ""
    print_info "To install: ${YELLOW}./install-cli.sh railway${NC}"
  fi

  echo ""
  print_header "Vercel CLI"
  if check_vercel; then
    echo ""
    if vercel whoami &> /dev/null; then
      local user=$(vercel whoami 2>/dev/null || echo "Unknown")
      print_success "Authenticated as: $user"
    else
      print_warning "Not authenticated"
      print_info "Run: ${YELLOW}./install-cli.sh vercel${NC} to authenticate"
    fi
  else
    echo ""
    print_info "To install: ${YELLOW}./install-cli.sh vercel${NC}"
  fi

  echo ""
}

cmd_railway() {
  check_prerequisites
  install_railway

  if [ $? -eq 0 ]; then
    echo ""
    read -p "Authenticate with Railway now? (Y/n): " auth
    if [[ ! "$auth" =~ ^[Nn]$ ]]; then
      authenticate_railway
    fi
  fi

  echo ""
  print_header "Railway CLI Setup Complete!"
  echo "Next steps:"
  echo "  1. Link project: ${YELLOW}railway link${NC}"
  echo "  2. Set variables: ${YELLOW}../setup-env.sh railway${NC}"
  echo "  3. Deploy: ${YELLOW}railway up${NC}"
  echo ""
}

cmd_vercel() {
  check_prerequisites
  install_vercel

  if [ $? -eq 0 ]; then
    echo ""
    read -p "Authenticate with Vercel now? (Y/n): " auth
    if [[ ! "$auth" =~ ^[Nn]$ ]]; then
      authenticate_vercel
    fi
  fi

  echo ""
  print_header "Vercel CLI Setup Complete!"
  echo "Next steps:"
  echo "  1. Link project: ${YELLOW}vercel link${NC}"
  echo "  2. Set variables: ${YELLOW}../setup-env.sh vercel${NC}"
  echo "  3. Deploy: ${YELLOW}vercel --prod${NC}"
  echo ""
}

cmd_all() {
  check_prerequisites

  echo ""
  install_railway
  local railway_ok=$?

  echo ""
  install_vercel
  local vercel_ok=$?

  echo ""

  if [ $railway_ok -eq 0 ]; then
    read -p "Authenticate with Railway now? (Y/n): " auth
    if [[ ! "$auth" =~ ^[Nn]$ ]]; then
      authenticate_railway
    fi
  fi

  echo ""

  if [ $vercel_ok -eq 0 ]; then
    read -p "Authenticate with Vercel now? (Y/n): " auth
    if [[ ! "$auth" =~ ^[Nn]$ ]]; then
      authenticate_vercel
    fi
  fi

  echo ""
  print_header "CLI Setup Complete!"
  echo "Next steps:"
  echo "  1. Setup environment variables: ${YELLOW}../setup-env.sh all${NC}"
  echo "  2. Deploy: ${YELLOW}../deploy-production.sh${NC}"
  echo ""
}

cmd_help() {
  print_header "CLI Installation Automation"

  cat <<EOF
This script automates the installation and authentication of Railway CLI
and Vercel CLI for WCAG AI Platform deployments.

${YELLOW}USAGE:${NC}
  ./install-cli.sh [command]

${YELLOW}COMMANDS:${NC}
  check          Check installation status
  railway        Install and authenticate Railway CLI
  vercel         Install and authenticate Vercel CLI
  all            Install and authenticate both CLIs (default)
  help           Show this help message

${YELLOW}EXAMPLES:${NC}
  # Check current status
  ./install-cli.sh check

  # Install Railway CLI only
  ./install-cli.sh railway

  # Install Vercel CLI only
  ./install-cli.sh vercel

  # Install both CLIs
  ./install-cli.sh all

${YELLOW}REQUIREMENTS:${NC}
  • Node.js >= 18.0
  • npm >= 8.0

${YELLOW}WHAT THIS SCRIPT DOES:${NC}
  1. Checks Node.js and npm versions
  2. Installs Railway CLI globally via npm
  3. Installs Vercel CLI globally via npm
  4. Authenticates both CLIs (opens browser)
  5. Verifies installations

${YELLOW}AFTER INSTALLATION:${NC}
  • Setup environment variables: ${BLUE}./setup-env.sh${NC}
  • Deploy to production: ${BLUE}./deploy-production.sh${NC}

${YELLOW}MORE INFO:${NC}
  • Railway CLI: https://docs.railway.app/develop/cli
  • Vercel CLI:  https://vercel.com/docs/cli

EOF
}

# ============================================================================
# Main
# ============================================================================

# Default to 'all' if no command specified
COMMAND="${1:-all}"

case "$COMMAND" in
  check)
    cmd_check
    ;;
  railway)
    cmd_railway
    ;;
  vercel)
    cmd_vercel
    ;;
  all)
    cmd_all
    ;;
  help|--help|-h)
    cmd_help
    ;;
  *)
    print_error "Unknown command: $COMMAND"
    echo ""
    cmd_help
    exit 1
    ;;
esac
