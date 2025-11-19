# Complete Setup & Run Guide - WCAG AI Platform

**Goal**: Get the entire platform running locally from scratch  
**Time**: 30-45 minutes  
**Difficulty**: Medium  

---

## 📋 Prerequisites

### Required Software
- **Node.js**: v18+ (v20 recommended)
- **npm**: v9+
- **PostgreSQL**: v14+
- **Redis**: v7+ (optional but recommended)
- **Git**: Latest version

### Optional Tools
- **Docker & Docker Compose**: For containerized setup
- **Railway CLI**: For cloud deployment
- **Postman/Insomnia**: For API testing

---

## 🚀 Quick Start (5 Steps)

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install API dependencies
cd packages/api
npm install

# Install webapp dependencies
cd ../webapp
npm install

# Return to root
cd ../..
```

### Step 2: Set Up Database

**Option A: Using Docker (Recommended)**
```bash
# Start PostgreSQL and Redis
docker-compose up -d db redis

# Wait for services to be ready (30 seconds)
sleep 30

# Verify services are running
docker-compose ps
```

**Option B: Local PostgreSQL**
```bash
# Create database
createdb wcag_platform

# Or using psql
psql -U postgres -c "CREATE DATABASE wcag_platform;"
```

### Step 3: Configure Environment Variables

```bash
# Copy example env files
cp config/.env.example packages/api/.env
cp packages/webapp/.env.example packages/webapp/.env

# Edit packages/api/.env with your values
nano packages/api/.env
```

**Minimum Required Variables**:
```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/wcag_platform"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Node Environment
NODE_ENV="development"
PORT=3001

# API Keys (get free tier keys)
OPENAI_API_KEY="sk-..."  # Optional for AI features
```

### Step 4: Initialize Database

```bash
cd packages/api

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npm run seed
```

### Step 5: Start the Application

**Terminal 1 - API Server**:
```bash
npm run dev:api
```

**Terminal 2 - Web App**:
```bash
npm run dev:webapp
```

**Access the application**:
- API: http://localhost:3001
- Web App: http://localhost:3000
- Health Check: http://localhost:3001/health

---

## 🔧 Detailed Setup Instructions

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/aaj441/wcag-ai-platform.git
cd wcag-ai-platform

# Install all dependencies
npm install

# This will install:
# - Root workspace dependencies
# - packages/api dependencies
# - packages/webapp dependencies
```

### 2. Database Setup (PostgreSQL)

**Using Docker Compose** (Easiest):
```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f db

# Access PostgreSQL
docker-compose exec db psql -U wcag_user -d wcag_prod
```

**Manual PostgreSQL Setup**:
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql

# Create user and database
sudo -u postgres psql << EOF
CREATE USER wcag_user WITH PASSWORD 'your_password';
CREATE DATABASE wcag_platform OWNER wcag_user;
GRANT ALL PRIVILEGES ON DATABASE wcag_platform TO wcag_user;
EOF
```

### 3. Redis Setup (Optional)

**Using Docker**:
```bash
docker-compose up -d redis
```

**Manual Redis Setup**:
```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis

# Test connection
redis-cli ping  # Should return PONG
```

### 4. Environment Configuration

**Create API Environment File**:
```bash
cat > packages/api/.env << 'EOF'
# Database
DATABASE_URL="postgresql://wcag_user:your_password@localhost:5432/wcag_platform"

# Redis
REDIS_URL="redis://localhost:6379"

# Server
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:3000"

# API Keys (Optional - get from respective services)
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

# Monitoring (Optional)
SENTRY_DSN=""
DATADOG_API_KEY=""
EOF
```

**Create WebApp Environment File**:
```bash
cat > packages/webapp/.env << 'EOF'
VITE_API_URL="http://localhost:3001"
VITE_APP_NAME="WCAG AI Platform"
EOF
```

### 5. Database Initialization

```bash
cd packages/api

# Generate Prisma Client
npx prisma generate

# Create database schema
npx prisma migrate dev --name init

# Seed with sample data
npm run seed

# Verify database
npx prisma studio  # Opens GUI at http://localhost:5555
```

### 6. Build & Start

**Development Mode** (with hot reload):
```bash
# Terminal 1 - API
npm run dev:api

# Terminal 2 - WebApp
npm run dev:webapp
```

**Production Mode**:
```bash
# Build everything
npm run build

# Start API
npm run start:api

# Start WebApp
npm run start:webapp
```

---

## ✅ Verification Checklist

### API Server
- [ ] Server starts without errors
- [ ] Health check returns 200: `curl http://localhost:3001/health`
- [ ] Database connected: Check logs for "✅ Database connected"
- [ ] Redis connected (if enabled): Check logs
- [ ] API endpoints responding: `curl http://localhost:3001/api/health`

### Web Application
- [ ] Vite dev server starts
- [ ] Opens in browser at http://localhost:3000
- [ ] No console errors
- [ ] Can navigate pages
- [ ] API calls working

### Database
- [ ] PostgreSQL running: `pg_isready`
- [ ] Database exists: `psql -l | grep wcag`
- [ ] Tables created: `psql wcag_platform -c "\dt"`
- [ ] Can query data: `psql wcag_platform -c "SELECT COUNT(*) FROM &quot;Scan&quot;;"`

---

## 🐛 Troubleshooting

### Issue 1: Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev:api
```

### Issue 2: Database Connection Failed

**Error**: `Can't reach database server`

**Solution**:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Issue 3: Prisma Client Not Generated

**Error**: `@prisma/client did not initialize yet`

**Solution**:
```bash
cd packages/api

# Remove old client
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# Regenerate
npx prisma generate

# Reinstall if needed
npm install
```

### Issue 4: TypeScript Errors

**Error**: Various TypeScript compilation errors

**Solution**:
```bash
# Run the fix script
chmod +x fix-typescript-errors.sh
./fix-typescript-errors.sh

# Or manually update tsconfig
cd packages/api
npm run build
```

### Issue 5: Missing Dependencies

**Error**: `Cannot find module 'xyz'`

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json

# Reinstall
npm install
cd packages/api && npm install
cd ../webapp && npm install
```

---

## 🧪 Testing the Setup

### 1. Test API Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Detailed health check
curl http://localhost:3001/health/detailed

# Create a test scan (requires API key)
curl -X POST http://localhost:3001/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "wcagLevel": "AA"}'
```

### 2. Test Database

```bash
# Connect to database
psql $DATABASE_URL

# Check tables
\dt

# Query scans
SELECT * FROM "Scan" LIMIT 5;

# Exit
\q
```

### 3. Test Redis (if enabled)

```bash
# Connect to Redis
redis-cli

# Test commands
PING
SET test "hello"
GET test

# Exit
exit
```

---

## 📦 Docker Setup (Alternative)

### Full Docker Compose Setup

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Access Services

- **API**: http://localhost:3001
- **WebApp**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Prisma Studio**: http://localhost:5555

---

## 🚀 Production Deployment

### Railway Deployment

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add postgresql

# Add Redis
railway add redis

# Set environment variables
railway variables set NODE_ENV=production

# Deploy
railway up
```

### Manual Production Setup

```bash
# Build for production
npm run build

# Set environment
export NODE_ENV=production

# Run migrations
cd packages/api
npx prisma migrate deploy

# Start with PM2
npm install -g pm2
pm2 start packages/api/dist/server.js --name wcag-api
pm2 start packages/webapp/server.js --name wcag-webapp

# Save PM2 config
pm2 save
pm2 startup
```

---

## 📊 Monitoring & Logs

### View Logs

```bash
# API logs
tail -f packages/api/logs/app.log

# Docker logs
docker-compose logs -f api

# PM2 logs
pm2 logs wcag-api
```

### Monitor Performance

```bash
# Check API health
curl http://localhost:3001/health/detailed

# Check metrics
curl http://localhost:3001/health/metrics

# Monitor with PM2
pm2 monit
```

---

## 🎯 Next Steps

After successful setup:

1. **Configure API Keys**: Add your API keys for AI features
2. **Run Tests**: `npm test` in packages/api
3. **Explore API**: Use Postman with the OpenAPI spec
4. **Read Documentation**: Check the docs/ folder
5. **Deploy**: Follow Railway deployment guide

---

## 📞 Support

### Common Resources
- **Documentation**: `/docs` folder
- **API Reference**: `openapi.yaml`
- **Troubleshooting**: `TYPESCRIPT_FIXES.md`
- **Deployment**: `RAILWAY_QUICK_START.md`

### Get Help
- Check existing issues on GitHub
- Review documentation files
- Run health checks: `./5-verify.sh`

---

**Last Updated**: November 19, 2025  
**Version**: 1.0  
**Status**: Production Ready