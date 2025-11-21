#!/bin/bash
# setup.sh - Quick setup script for fintech workflow testing

set -e

echo "========================================"
echo "🚀 WCAG AI Platform - Fintech Test Setup"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating from template..."
  cat > .env << 'EOF'
# Fintech Workflow Testing Environment Variables

# Bing Web Search API
# Get your key: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
BING_API_KEY=your_bing_api_key_here

# Fellou Accessibility Scanning API (optional - can use local Axe-core)
# Get your token: https://fellou.com
FELLOU_TOKEN=your_fellou_token_here

# Resend Email API
# Get your key: https://resend.com
RESEND_API_KEY=your_resend_api_key_here

# Database URL (optional - uses local DB if not set)
DATABASE_URL=

# Application Settings
NODE_ENV=development
PORT=3000
EOF
  echo "✅ Created .env file"
  echo "📝 Please edit .env and add your API keys"
  echo ""
else
  echo "✅ .env file found"
fi

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. You have: $(node -v)"
  exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Install dependencies
echo "Installing dependencies..."
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi
echo "✅ Dependencies installed"
echo ""

# Create test directories
echo "Creating test directories..."
mkdir -p tests/fintech/results
mkdir -p tests/fintech/reports
mkdir -p tests/fintech/logs
echo "✅ Test directories created"
echo ""

# Check API keys
echo "Checking API key configuration..."
source .env 2>/dev/null || true

MISSING_KEYS=""

if [ -z "$BING_API_KEY" ] || [ "$BING_API_KEY" = "your_bing_api_key_here" ]; then
  MISSING_KEYS="${MISSING_KEYS}  - BING_API_KEY\n"
fi

if [ -z "$RESEND_API_KEY" ] || [ "$RESEND_API_KEY" = "your_resend_api_key_here" ]; then
  MISSING_KEYS="${MISSING_KEYS}  - RESEND_API_KEY\n"
fi

if [ ! -z "$MISSING_KEYS" ]; then
  echo "⚠️  Missing API keys:"
  echo -e "$MISSING_KEYS"
  echo "Please update .env with your API keys before running tests."
  echo ""
else
  echo "✅ All required API keys configured"
  echo ""
fi

echo "========================================"
echo "✅ Setup complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Update API keys in .env file (if needed)"
echo ""
echo "2. Run individual tests:"
echo "   npm run test:fintech:discover"
echo "   npm run test:fintech:scan"
echo "   npm run test:fintech:outreach"
echo ""
echo "3. Or run the complete workflow:"
echo "   npm run test:fintech"
echo ""
echo "4. View documentation:"
echo "   cat tests/fintech/README.md"
echo ""
echo "========================================"
