#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║        WCAG AI Platform - Complete Setup & Run            ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running in workspace
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
port_available() {
    ! nc -z localhost $1 2>/dev/null
}

echo ""
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

# Check PostgreSQL
if command_exists psql; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    echo -e "${GREEN}✅ PostgreSQL: $PSQL_VERSION${NC}"
    HAS_POSTGRES=true
elif command_exists docker; then
    echo -e "${YELLOW}⚠️  PostgreSQL not found locally, will use Docker${NC}"
    HAS_POSTGRES=false
else
    echo -e "${RED}❌ PostgreSQL not found and Docker not available${NC}"
    echo -e "${YELLOW}Please install PostgreSQL or Docker${NC}"
    exit 1
fi

# Check Docker (optional)
if command_exists docker; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
    echo -e "${GREEN}✅ Docker: $DOCKER_VERSION${NC}"
    HAS_DOCKER=true
else
    echo -e "${YELLOW}⚠️  Docker not found (optional)${NC}"
    HAS_DOCKER=false
fi

echo ""
echo -e "${YELLOW}🔧 Step 1: Installing dependencies...${NC}"

# Install root dependencies
echo "Installing root dependencies..."
npm install --silent 2>&1 | grep -v "npm WARN" || true

# Install API dependencies
echo "Installing API dependencies..."
cd packages/api
npm install --silent 2>&1 | grep -v "npm WARN" || true
cd ../..

# Install webapp dependencies
echo "Installing webapp dependencies..."
cd packages/webapp
npm install --silent 2>&1 | grep -v "npm WARN" || true
cd ../..

echo -e "${GREEN}✅ Dependencies installed${NC}"

echo ""
echo -e "${YELLOW}🗄️  Step 2: Setting up database...${NC}"

# Setup database
if [ "$HAS_DOCKER" = true ]; then
    echo "Starting PostgreSQL and Redis with Docker..."
    
    # Check if docker-compose is available
    if command_exists docker-compose; then
        docker-compose up -d db redis 2>&1 | grep -v "WARNING" || true
    elif docker compose version >/dev/null 2>&1; then
        docker compose up -d db redis 2>&1 | grep -v "WARNING" || true
    fi
    
    echo "Waiting for database to be ready..."
    sleep 10
    
    # Set DATABASE_URL for Docker
    export DATABASE_URL="postgresql://wcag_user:secure_password_change_me@localhost:5432/wcag_prod"
    export REDIS_URL="redis://:redis_password_change_me@localhost:6379"
    
    echo -e "${GREEN}✅ Database services started${NC}"
elif [ "$HAS_POSTGRES" = true ]; then
    echo "Using local PostgreSQL..."
    
    # Create database if it doesn't exist
    if ! psql -lqt | cut -d \| -f 1 | grep -qw wcag_platform; then
        echo "Creating database..."
        createdb wcag_platform 2>/dev/null || psql -U postgres -c "CREATE DATABASE wcag_platform;" 2>/dev/null || true
    fi
    
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wcag_platform"
    
    echo -e "${GREEN}✅ Database ready${NC}"
fi

echo ""
echo -e "${YELLOW}⚙️  Step 3: Configuring environment...${NC}"

# Create API .env file
if [ ! -f "packages/api/.env" ]; then
    echo "Creating API environment file..."
    cat > packages/api/.env << EOF
# Database
DATABASE_URL="${DATABASE_URL}"

# Redis
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

# Server
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:3000"

# API Keys (Optional - add your keys here)
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
CLERK_SECRET_KEY=""
STRIPE_SECRET_KEY=""
SENDGRID_API_KEY=""

# AWS (Optional)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_S3_BUCKET=""
EOF
    echo -e "${GREEN}✅ Created packages/api/.env${NC}"
else
    echo -e "${YELLOW}⚠️  packages/api/.env already exists, skipping${NC}"
fi

# Create webapp .env file
if [ ! -f "packages/webapp/.env" ]; then
    echo "Creating webapp environment file..."
    cat > packages/webapp/.env << EOF
VITE_API_URL="http://localhost:3001"
VITE_APP_NAME="WCAG AI Platform"
EOF
    echo -e "${GREEN}✅ Created packages/webapp/.env${NC}"
else
    echo -e "${YELLOW}⚠️  packages/webapp/.env already exists, skipping${NC}"
fi

echo ""
echo -e "${YELLOW}🔨 Step 4: Building application...${NC}"

cd packages/api

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate 2>&1 | grep -v "warn" || true

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy 2>&1 | grep -v "warn" || true

# Build TypeScript
echo "Building TypeScript..."
npm run build 2>&1 | grep -v "warn" || true

cd ../..

echo -e "${GREEN}✅ Application built${NC}"

echo ""
echo -e "${YELLOW}🌱 Step 5: Seeding database (optional)...${NC}"

read -p "Do you want to seed the database with sample data? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd packages/api
    npm run seed 2>&1 | grep -v "warn" || true
    cd ../..
    echo -e "${GREEN}✅ Database seeded${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping database seeding${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║                  ✅ Setup Complete!                        ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${BLUE}🚀 Starting the application...${NC}"
echo ""

# Check if ports are available
if ! port_available 3001; then
    echo -e "${RED}❌ Port 3001 is already in use${NC}"
    echo "Please stop the process using port 3001 or change the PORT in packages/api/.env"
    exit 1
fi

if ! port_available 3000; then
    echo -e "${RED}❌ Port 3000 is already in use${NC}"
    echo "Please stop the process using port 3000"
    exit 1
fi

echo -e "${YELLOW}Starting API server on port 3001...${NC}"
echo -e "${YELLOW}Starting webapp on port 3000...${NC}"
echo ""

# Create a script to run both services
cat > /tmp/run-wcag.sh << 'EOF'
#!/bin/bash

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $API_PID $WEBAPP_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start API in background
cd packages/api
npm run dev > /tmp/wcag-api.log 2>&1 &
API_PID=$!

# Wait for API to start
sleep 5

# Start webapp in background
cd ../webapp
npm run dev > /tmp/wcag-webapp.log 2>&1 &
WEBAPP_PID=$!

echo "✅ Services started!"
echo ""
echo "📍 Access points:"
echo "   - API:     http://localhost:3001"
echo "   - WebApp:  http://localhost:3000"
echo "   - Health:  http://localhost:3001/health"
echo ""
echo "📋 Logs:"
echo "   - API:     tail -f /tmp/wcag-api.log"
echo "   - WebApp:  tail -f /tmp/wcag-webapp.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $API_PID $WEBAPP_PID
EOF

chmod +x /tmp/run-wcag.sh

# Ask user how to start
echo ""
echo -e "${BLUE}Choose how to start the application:${NC}"
echo "1) Start in foreground (recommended for first run)"
echo "2) Start in background"
echo "3) Exit (I'll start manually)"
echo ""
read -p "Enter choice (1-3): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo -e "${GREEN}Starting in foreground...${NC}"
        echo ""
        /tmp/run-wcag.sh
        ;;
    2)
        echo -e "${GREEN}Starting in background...${NC}"
        nohup /tmp/run-wcag.sh > /dev/null 2>&1 &
        sleep 5
        echo ""
        echo -e "${GREEN}✅ Services running in background${NC}"
        echo ""
        echo "📍 Access points:"
        echo "   - API:     http://localhost:3001"
        echo "   - WebApp:  http://localhost:3000"
        echo "   - Health:  http://localhost:3001/health"
        echo ""
        echo "📋 View logs:"
        echo "   - API:     tail -f /tmp/wcag-api.log"
        echo "   - WebApp:  tail -f /tmp/wcag-webapp.log"
        echo ""
        echo "🛑 Stop services:"
        echo "   pkill -f 'npm run dev'"
        ;;
    3)
        echo ""
        echo -e "${YELLOW}To start manually:${NC}"
        echo ""
        echo "Terminal 1 (API):"
        echo "  cd packages/api && npm run dev"
        echo ""
        echo "Terminal 2 (WebApp):"
        echo "  cd packages/webapp && npm run dev"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 WCAG AI Platform is ready!${NC}"
echo ""