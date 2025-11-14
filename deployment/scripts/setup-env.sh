#!/bin/bash
set -e

# ============================================================================
# Environment Variable Setup Helper
# ============================================================================
#
# This script helps you configure all required environment variables for
# Railway (backend) and Vercel (frontend) deployments.
#
# Usage:
#   ./setup-env.sh check          # Check which variables are set
#   ./setup-env.sh railway        # Set Railway variables interactively
#   ./setup-env.sh vercel         # Set Vercel variables interactively
#   ./setup-env.sh all            # Set all variables interactively
#   ./setup-env.sh export         # Export .env file template
#
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Environment Variable Definitions
# ============================================================================

# Railway (Backend) - Required
RAILWAY_REQUIRED=(
  "OPENAI_API_KEY:OpenAI API key for AI-powered WCAG analysis:sk-..."
  "LAUNCHDARKLY_SDK_KEY:LaunchDarkly SDK key for feature flags:sdk-..."
  "WEBHOOK_SECRET:Secret for webhook signature validation:random-string"
)

# Railway (Backend) - Optional
RAILWAY_OPTIONAL=(
  "API_RATE_LIMIT:API rate limit (requests per 15 min):100"
  "SENTRY_DSN:Sentry DSN for error tracking:https://...@sentry.io/..."
  "JAEGER_ENDPOINT:Jaeger endpoint for distributed tracing:http://jaeger:14268/api/traces"
  "AWS_ACCESS_KEY_ID:AWS access key for S3 screenshot storage:AKIA..."
  "AWS_SECRET_ACCESS_KEY:AWS secret key for S3:..."
  "AWS_REGION:AWS region for S3:us-east-1"
  "PAGERDUTY_INTEGRATION_KEY:PagerDuty integration key for alerts:..."
)

# Vercel (Frontend) - Required
VERCEL_REQUIRED=(
  "VITE_API_URL:Backend API URL:https://your-api.railway.app"
)

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

check_railway_cli() {
  if ! command -v railway &> /dev/null; then
    echo -e "${RED}✗ Railway CLI not installed${NC}"
    echo -e "  Install: ${YELLOW}npm install -g @railway/cli${NC}"
    return 1
  fi
  echo -e "${GREEN}✓ Railway CLI installed${NC}"
  return 0
}

check_vercel_cli() {
  if ! command -v vercel &> /dev/null; then
    echo -e "${RED}✗ Vercel CLI not installed${NC}"
    echo -e "  Install: ${YELLOW}npm install -g vercel${NC}"
    return 1
  fi
  echo -e "${GREEN}✓ Vercel CLI installed${NC}"
  return 0
}

parse_var_definition() {
  local definition="$1"
  IFS=':' read -r var_name var_desc var_example <<< "$definition"
  echo "$var_name|$var_desc|$var_example"
}

is_var_set() {
  local var_name="$1"
  local platform="$2"  # "railway" or "vercel"

  if [ "$platform" = "railway" ]; then
    railway variables get "$var_name" &> /dev/null
    return $?
  elif [ "$platform" = "vercel" ]; then
    vercel env ls 2>&1 | grep -q "$var_name"
    return $?
  else
    [ -n "${!var_name}" ]
    return $?
  fi
}

check_var() {
  local definition="$1"
  local platform="$2"
  local required="$3"

  IFS='|' read -r var_name var_desc var_example <<< "$(parse_var_definition "$definition")"

  local status=""
  if is_var_set "$var_name" "$platform"; then
    status="${GREEN}✓ SET${NC}"
  else
    if [ "$required" = "true" ]; then
      status="${RED}✗ MISSING (REQUIRED)${NC}"
    else
      status="${YELLOW}○ Not set (optional)${NC}"
    fi
  fi

  printf "  %-30s %s\n" "$var_name" "$(echo -e "$status")"
}

set_var_interactive() {
  local definition="$1"
  local platform="$2"

  IFS='|' read -r var_name var_desc var_example <<< "$(parse_var_definition "$definition")"

  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}Variable:${NC} $var_name"
  echo -e "${YELLOW}Description:${NC} $var_desc"
  echo -e "${YELLOW}Example:${NC} $var_example"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  # Check if already set
  if is_var_set "$var_name" "$platform"; then
    echo -e "${GREEN}This variable is already set.${NC}"
    read -p "Do you want to update it? (y/N): " update
    if [[ ! "$update" =~ ^[Yy]$ ]]; then
      echo "Skipping..."
      return
    fi
  fi

  # Read value
  read -p "Enter value (or press Enter to skip): " var_value

  if [ -z "$var_value" ]; then
    echo "Skipped."
    return
  fi

  # Set variable based on platform
  if [ "$platform" = "railway" ]; then
    railway variables set "$var_name=$var_value"
    echo -e "${GREEN}✓ Set on Railway${NC}"
  elif [ "$platform" = "vercel" ]; then
    echo "$var_value" | vercel env add "$var_name" production
    echo -e "${GREEN}✓ Set on Vercel${NC}"
  else
    echo "export $var_name=\"$var_value\"" >> .env.local
    echo -e "${GREEN}✓ Added to .env.local${NC}"
  fi
}

# ============================================================================
# Commands
# ============================================================================

cmd_check() {
  print_header "Environment Variable Status Check"

  echo "Checking CLI tools..."
  local railway_ok=false
  local vercel_ok=false

  check_railway_cli && railway_ok=true
  check_vercel_cli && vercel_ok=true

  echo ""

  # Railway Variables
  print_header "Railway (Backend) - Required Variables"
  if [ "$railway_ok" = true ]; then
    for var_def in "${RAILWAY_REQUIRED[@]}"; do
      check_var "$var_def" "railway" "true"
    done
  else
    echo -e "${YELLOW}⚠ Skipped: Railway CLI not installed${NC}"
  fi

  print_header "Railway (Backend) - Optional Variables"
  if [ "$railway_ok" = true ]; then
    for var_def in "${RAILWAY_OPTIONAL[@]}"; do
      check_var "$var_def" "railway" "false"
    done
  else
    echo -e "${YELLOW}⚠ Skipped: Railway CLI not installed${NC}"
  fi

  # Vercel Variables
  print_header "Vercel (Frontend) - Required Variables"
  if [ "$vercel_ok" = true ]; then
    for var_def in "${VERCEL_REQUIRED[@]}"; do
      check_var "$var_def" "vercel" "true"
    done
  else
    echo -e "${YELLOW}⚠ Skipped: Vercel CLI not installed${NC}"
  fi

  echo ""
  print_header "Next Steps"
  echo "To set variables interactively:"
  echo "  • Railway: ${YELLOW}./setup-env.sh railway${NC}"
  echo "  • Vercel:  ${YELLOW}./setup-env.sh vercel${NC}"
  echo "  • All:     ${YELLOW}./setup-env.sh all${NC}"
  echo ""
}

cmd_railway() {
  print_header "Railway Environment Variable Setup"

  if ! check_railway_cli; then
    echo ""
    echo -e "${RED}Please install Railway CLI first:${NC}"
    echo -e "  ${YELLOW}npm install -g @railway/cli${NC}"
    exit 1
  fi

  echo "This will help you set Railway environment variables interactively."
  echo ""
  read -p "Press Enter to continue or Ctrl+C to cancel..."

  print_header "Required Variables"
  for var_def in "${RAILWAY_REQUIRED[@]}"; do
    set_var_interactive "$var_def" "railway"
  done

  echo ""
  read -p "Do you want to set optional variables? (y/N): " set_optional

  if [[ "$set_optional" =~ ^[Yy]$ ]]; then
    print_header "Optional Variables"
    for var_def in "${RAILWAY_OPTIONAL[@]}"; do
      set_var_interactive "$var_def" "railway"
    done
  fi

  echo ""
  print_header "Railway Setup Complete!"
  echo -e "${GREEN}✓ Railway variables configured${NC}"
  echo ""
  echo "View all variables: ${YELLOW}railway variables${NC}"
  echo ""
}

cmd_vercel() {
  print_header "Vercel Environment Variable Setup"

  if ! check_vercel_cli; then
    echo ""
    echo -e "${RED}Please install Vercel CLI first:${NC}"
    echo -e "  ${YELLOW}npm install -g vercel${NC}"
    exit 1
  fi

  echo "This will help you set Vercel environment variables interactively."
  echo ""
  read -p "Press Enter to continue or Ctrl+C to cancel..."

  print_header "Required Variables"
  for var_def in "${VERCEL_REQUIRED[@]}"; do
    set_var_interactive "$var_def" "vercel"
  done

  echo ""
  print_header "Vercel Setup Complete!"
  echo -e "${GREEN}✓ Vercel variables configured${NC}"
  echo ""
  echo "View all variables: ${YELLOW}vercel env ls${NC}"
  echo ""
}

cmd_all() {
  cmd_railway
  echo ""
  cmd_vercel
}

cmd_export() {
  print_header "Exporting .env Template"

  local env_file=".env.template"

  cat > "$env_file" <<EOF
# ============================================================================
# WCAG AI Platform - Environment Variables
# ============================================================================
#
# Copy this file to .env.local and fill in the values.
#
# For Railway deployment: Use 'railway variables set KEY=value'
# For Vercel deployment: Use 'vercel env add KEY production'
#
# ============================================================================

# ----------------------------------------------------------------------------
# Railway (Backend) - Required
# ----------------------------------------------------------------------------

# OpenAI API key for AI-powered WCAG analysis
OPENAI_API_KEY=sk-...

# LaunchDarkly SDK key for feature flags
LAUNCHDARKLY_SDK_KEY=sdk-...

# Secret for webhook signature validation (generate a random string)
WEBHOOK_SECRET=your-random-secret-here

# ----------------------------------------------------------------------------
# Railway (Backend) - Optional
# ----------------------------------------------------------------------------

# API rate limit (requests per 15 minutes, default: 100)
API_RATE_LIMIT=100

# Sentry DSN for error tracking
# SENTRY_DSN=https://...@sentry.io/...

# Jaeger endpoint for distributed tracing
# JAEGER_ENDPOINT=http://jaeger:14268/api/traces

# AWS credentials for S3 screenshot storage
# AWS_ACCESS_KEY_ID=AKIA...
# AWS_SECRET_ACCESS_KEY=...
# AWS_REGION=us-east-1

# PagerDuty integration key for alerts
# PAGERDUTY_INTEGRATION_KEY=...

# ----------------------------------------------------------------------------
# Vercel (Frontend) - Required
# ----------------------------------------------------------------------------

# Backend API URL (your Railway deployment URL)
VITE_API_URL=https://your-api.railway.app

# ============================================================================
# End of Configuration
# ============================================================================
EOF

  echo -e "${GREEN}✓ Template exported to: $env_file${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Copy: ${YELLOW}cp $env_file .env.local${NC}"
  echo "  2. Edit: ${YELLOW}nano .env.local${NC}"
  echo "  3. Fill in your actual values"
  echo ""
}

cmd_help() {
  print_header "Environment Variable Setup Helper"

  cat <<EOF
This script helps you configure all required environment variables for
Railway (backend) and Vercel (frontend) deployments.

${YELLOW}USAGE:${NC}
  ./setup-env.sh <command>

${YELLOW}COMMANDS:${NC}
  check          Check which variables are set
  railway        Set Railway variables interactively
  vercel         Set Vercel variables interactively
  all            Set all variables interactively
  export         Export .env file template
  help           Show this help message

${YELLOW}EXAMPLES:${NC}
  # Check current status
  ./setup-env.sh check

  # Set Railway variables
  ./setup-env.sh railway

  # Set Vercel variables
  ./setup-env.sh vercel

  # Set all variables
  ./setup-env.sh all

  # Export template for manual editing
  ./setup-env.sh export

${YELLOW}REQUIREMENTS:${NC}
  • Railway CLI: ${BLUE}npm install -g @railway/cli${NC}
  • Vercel CLI:  ${BLUE}npm install -g vercel${NC}

${YELLOW}MORE INFO:${NC}
  • Railway docs: https://docs.railway.app/develop/variables
  • Vercel docs:  https://vercel.com/docs/concepts/projects/environment-variables

EOF
}

# ============================================================================
# Main
# ============================================================================

case "${1:-help}" in
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
  export)
    cmd_export
    ;;
  help|--help|-h)
    cmd_help
    ;;
  *)
    echo -e "${RED}Error: Unknown command '$1'${NC}"
    echo ""
    cmd_help
    exit 1
    ;;
esac
