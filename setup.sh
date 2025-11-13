#!/bin/bash
# WCAG AI Platform - Automated Setup Guide
# Executes the complete 30-day launch plan

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "WCAG AI PLATFORM - 30-DAY LAUNCH SETUP"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "This script will guide you through the complete setup process:"
echo "1. Check prerequisites"
echo "2. Create .env file"
echo "3. Set up PostgreSQL"
echo "4. Run database migration"
echo "5. Test the system"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node.js
echo "✅ Checking prerequisites..."
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not installed. Please install Node.js 18+${NC}"
  exit 1
fi
echo "   Node.js: $(node -v)"

if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm not installed${NC}"
  exit 1
fi
echo "   npm: $(npm -v)"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "STEP 1: EXTERNAL SERVICE CREDENTIALS SETUP"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "You need to create accounts and get API keys from 3 services."
echo "This takes ~15 minutes total."
echo ""

echo "1️⃣  CLERK AUTHENTICATION (5 minutes)"
echo "   Go to: https://clerk.com"
echo "   - Click 'Sign In' → 'Create account'"
echo "   - Create new application"
echo "   - In 'API Keys' section, copy:"
echo "     • Publishable Key (starts with pk_test_)"
echo "     • Secret Key (starts with sk_test_)"
echo ""
read -p "   Press Enter when you have your Clerk credentials..."

echo ""
echo "2️⃣  STRIPE BILLING (5 minutes)"
echo "   Go to: https://stripe.com/en-US/payments/features"
echo "   - Click 'Start now' → create account"
echo "   - In Dashboard → API Keys"
echo "   - Use TEST mode (not Live)"
echo "   - Copy:"
echo "     • Publishable Key (starts with pk_test_)"
echo "     • Secret Key (starts with sk_test_)"
echo "   - Then go to Webhooks:"
echo "     • Copy the Webhook Signing Secret (starts with whsec_test_)"
echo ""
read -p "   Press Enter when you have your Stripe credentials..."

echo ""
echo "3️⃣  SENDGRID EMAIL (5 minutes)"
echo "   Go to: https://sendgrid.com"
echo "   - Sign up for free account"
echo "   - Go to Settings → API Keys"
echo "   - Create new API Key"
echo "   - Copy the full key (starts with SG.)"
echo ""
read -p "   Press Enter when you have your SendGrid API key..."

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "STEP 2: CREATE .ENV FILE"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Check if .env already exists
if [ -f "packages/api/.env" ]; then
  echo -e "${YELLOW}⚠️  .env file already exists${NC}"
  read -p "Overwrite existing .env? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Keeping existing .env"
  else
    rm packages/api/.env
  fi
fi

if [ ! -f "packages/api/.env" ]; then
  echo "Creating .env file..."
  cp packages/api/.env.example packages/api/.env
  echo -e "${GREEN}✅ .env created from template${NC}"
fi

echo ""
echo "Now I'll help you fill in the credentials..."
echo ""

read -p "Enter Clerk Publishable Key (pk_test_...): " CLERK_PUB
read -p "Enter Clerk Secret Key (sk_test_...): " CLERK_SECRET
read -p "Enter Stripe Publishable Key (pk_test_...): " STRIPE_PUB
read -p "Enter Stripe Secret Key (sk_test_...): " STRIPE_SECRET
read -p "Enter Stripe Webhook Secret (whsec_test_...): " STRIPE_WEBHOOK
read -p "Enter SendGrid API Key (SG....): " SENDGRID_KEY

# Update .env with provided values
sed -i "" "s/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=.*/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${CLERK_PUB}/" packages/api/.env
sed -i "" "s/CLERK_SECRET_KEY=.*/CLERK_SECRET_KEY=${CLERK_SECRET}/" packages/api/.env
sed -i "" "s/STRIPE_PUBLISHABLE_KEY=.*/STRIPE_PUBLISHABLE_KEY=${STRIPE_PUB}/" packages/api/.env
sed -i "" "s/STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=${STRIPE_SECRET}/" packages/api/.env
sed -i "" "s/STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK}/" packages/api/.env
sed -i "" "s/SENDGRID_API_KEY=.*/SENDGRID_API_KEY=${SENDGRID_KEY}/" packages/api/.env

echo -e "${GREEN}✅ .env updated with credentials${NC}"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "STEP 3: POSTGRESQL DATABASE SETUP"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

echo "Choose your PostgreSQL setup:"
echo "  1) Docker (recommended, no installation needed)"
echo "  2) Cloud (Heroku, Railway, AWS RDS)"
echo "  3) Already running locally"
echo ""
read -p "Enter choice (1-3): " PG_CHOICE

case $PG_CHOICE in
  1)
    echo ""
    echo "Starting PostgreSQL via Docker..."
    if ! command -v docker &> /dev/null; then
      echo -e "${RED}❌ Docker not installed${NC}"
      echo "   Install from: https://docker.com/products/docker-desktop"
      exit 1
    fi

    # Stop existing container if running
    docker stop wcag-db 2>/dev/null || true
    docker rm wcag-db 2>/dev/null || true

    echo "Starting PostgreSQL 15 container..."
    docker run --name wcag-db \
      -e POSTGRES_PASSWORD=password \
      -e POSTGRES_DB=wcag_ai_dev \
      -p 5432:5432 \
      -d postgres:15

    echo "Waiting for database to be ready..."
    sleep 3

    DATABASE_URL="postgresql://postgres:password@localhost:5432/wcag_ai_dev"
    sed -i "" "s|DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" packages/api/.env

    echo -e "${GREEN}✅ PostgreSQL started via Docker${NC}"
    ;;

  2)
    echo ""
    echo "For cloud databases:"
    echo "  • Heroku: heroku addons:create heroku-postgresql:standard-0"
    echo "  • Railway: https://railway.app (add PostgreSQL plugin)"
    echo "  • AWS RDS: https://aws.amazon.com/rds/"
    echo ""
    read -p "Enter your cloud DATABASE_URL: " CLOUD_DB_URL
    sed -i "" "s|DATABASE_URL=.*|DATABASE_URL=${CLOUD_DB_URL}|" packages/api/.env
    echo -e "${GREEN}✅ Cloud database configured${NC}"
    ;;

  3)
    echo ""
    echo "Assuming PostgreSQL is running on localhost:5432"
    read -p "Enter your DATABASE_URL: " LOCAL_DB_URL
    sed -i "" "s|DATABASE_URL=.*|DATABASE_URL=${LOCAL_DB_URL}|" packages/api/.env
    echo -e "${GREEN}✅ Local database configured${NC}"
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "STEP 4: VERIFY DATABASE CONNECTION"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

source packages/api/.env

echo "Testing database connection..."
if command -v psql &> /dev/null; then
  if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
  else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please verify:"
    echo "  - PostgreSQL is running"
    echo "  - DATABASE_URL is correct"
    echo "  - Database exists"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  psql not installed, skipping connection test${NC}"
  echo "Install via: brew install postgresql@15"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "STEP 5: INSTALL DEPENDENCIES"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

cd packages/api
echo "Installing npm packages..."
npm install 2>&1 | tail -5

echo -e "${GREEN}✅ Dependencies installed${NC}"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "STEP 6: DATABASE MIGRATION"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

echo "Running database migrations..."
npx prisma migrate deploy 2>&1

echo ""
echo "Generating Prisma client..."
npx prisma generate

echo -e "${GREEN}✅ Database migrations complete${NC}"

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "STEP 7: VERIFICATION"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

echo "Verifying database schema..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
echo "Tables created: $TABLE_COUNT"

if [ "$TABLE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Database schema verified${NC}"
else
  echo -e "${RED}❌ No tables found in database${NC}"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 SETUP COMPLETE!${NC}"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Your WCAG AI Platform is ready!"
echo ""
echo "Next steps:"
echo "  1. Start the development server:"
echo "     cd packages/api"
echo "     npm run dev"
echo ""
echo "  2. Test client onboarding:"
echo "     curl -X POST http://localhost:3001/api/clients/onboard \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"email\":\"test@example.com\",\"company\":\"Test\",\"tier\":\"pro\"}'"
echo ""
echo "  3. View database GUI:"
echo "     npx prisma studio"
echo ""
echo "  4. Read the documentation:"
echo "     - QUICK_START_IMPLEMENTATION.md - Daily execution guide"
echo "     - ENV_SETUP_GUIDE.md - Complete configuration reference"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
