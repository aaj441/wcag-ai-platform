# 50 Fixes to Make WCAG AI Platform 100% Deployable to Railway

**Date**: November 18, 2025  
**Target Platform**: Railway.app  
**Current Status**: Not Working  
**Goal**: 100% Production-Ready Deployment  

---

## 🚨 Critical Issues (Must Fix First)

### 1. **Add Railway-Specific Configuration Files**

Railway needs specific configuration to understand your monorepo structure.

**Create `railway.toml`**:
```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm run start:api"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 10
```

### 2. **Create Separate Railway Services**

Railway works best with separate services for API and webapp.

**Create `railway.api.toml`**:
```toml
[build]
builder = "nixpacks"
buildCommand = "cd packages/api && npm install && npm run build"

[deploy]
startCommand = "cd packages/api && npm run start"
healthcheckPath = "/health"
healthcheckTimeout = 300
```

**Create `railway.webapp.toml`**:
```toml
[build]
builder = "nixpacks"
buildCommand = "cd packages/webapp && npm install && npm run build"

[deploy]
startCommand = "cd packages/webapp && npm run start"
healthcheckPath = "/"
healthcheckTimeout = 300
```

### 3. **Fix Prisma Database Connection**

Railway provides DATABASE_URL automatically, but Prisma needs proper initialization.

**Update `packages/api/package.json`**:
```json
{
  "scripts": {
    "build": "prisma generate && tsc",
    "start": "prisma migrate deploy && node dist/server.js",
    "postinstall": "prisma generate"
  }
}
```

### 4. **Add Database Migration Script**

**Create `packages/api/scripts/migrate.sh`**:
```bash
#!/bin/bash
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Checking database connection..."
npx prisma db push --accept-data-loss

echo "Database ready!"
```

### 5. **Fix Port Binding**

Railway assigns a random PORT. Your app must use `process.env.PORT`.

**Update `packages/api/src/server.ts`**:
```typescript
const PORT = process.env.PORT || 3001;

// Add 0.0.0.0 binding for Railway
app.listen(PORT, '0.0.0.0', () => {
  log.info(`🚀 API Server running on port ${PORT}`);
  log.info(`Environment: ${process.env.NODE_ENV}`);
});
```

### 6. **Add Health Check Endpoint**

Railway needs a health check to know when your service is ready.

**Verify `packages/api/src/routes/health.ts` exists and returns 200**:
```typescript
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

export default router;
```

### 7. **Fix Puppeteer for Railway**

Railway doesn't support Puppeteer by default. Use Browserless or disable it.

**Option 1: Use Browserless (Recommended)**:
```typescript
// packages/api/src/services/orchestration/PuppeteerService.ts
const browser = await puppeteer.connect({
  browserWSEndpoint: process.env.BROWSERLESS_URL || 'wss://chrome.browserless.io'
});
```

**Option 2: Disable Puppeteer for Railway**:
```typescript
if (process.env.RAILWAY_ENVIRONMENT) {
  console.warn('Puppeteer disabled on Railway');
  return null;
}
```

### 8. **Add Nixpacks Configuration**

Railway uses Nixpacks. Create a config file.

**Create `nixpacks.toml`**:
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "python3"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start:api"
```

### 9. **Fix Redis Connection**

Railway provides Redis as a separate service.

**Update Redis connection in `packages/api/src/services/caching/RedisCacheService.ts`**:
```typescript
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL,
  socket: {
    tls: process.env.REDIS_TLS === 'true',
    rejectUnauthorized: false
  }
});
```

### 10. **Add Environment Variable Validation**

**Create `packages/api/src/config/env.ts`**:
```typescript
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'NODE_ENV'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

---

## 🔧 Build & Deployment Fixes

### 11. **Fix TypeScript Build**

Ensure TypeScript compiles correctly for production.

**Update `packages/api/tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 12. **Add Build Verification Script**

**Create `packages/api/scripts/verify-build.sh`**:
```bash
#!/bin/bash
set -e

echo "Verifying build..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
  echo "❌ dist directory not found"
  exit 1
fi

# Check if server.js exists
if [ ! -f "dist/server.js" ]; then
  echo "❌ dist/server.js not found"
  exit 1
fi

echo "✅ Build verified successfully"
```

### 13. **Fix Workspace Dependencies**

Railway might have issues with npm workspaces.

**Option 1: Use npm workspaces properly**:
```json
// Root package.json
{
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "postinstall": "npm run build:api",
    "build:api": "cd packages/api && npm run build"
  }
}
```

**Option 2: Deploy API separately** (Recommended):
- Create separate Railway service for `packages/api`
- Set root directory to `packages/api` in Railway settings

### 14. **Add Production Dependencies Check**

**Create `packages/api/scripts/check-deps.js`**:
```javascript
const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

const devDeps = Object.keys(packageJson.devDependencies || {});
const deps = Object.keys(packageJson.dependencies || {});

console.log('Production dependencies:', deps.length);
console.log('Dev dependencies:', devDeps.length);

// Check for common issues
const issues = [];

if (deps.includes('tsx')) {
  issues.push('tsx should be in devDependencies');
}

if (!deps.includes('express')) {
  issues.push('express missing from dependencies');
}

if (issues.length > 0) {
  console.error('❌ Dependency issues found:');
  issues.forEach(issue => console.error(`  - ${issue}`));
  process.exit(1);
}

console.log('✅ Dependencies look good');
```

### 15. **Fix Start Command**

Railway needs a clear start command.

**Update `packages/api/package.json`**:
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "start:prod": "NODE_ENV=production node dist/server.js"
  }
}
```

### 16. **Add Graceful Shutdown**

**Update `packages/api/src/server.ts`**:
```typescript
const server = app.listen(PORT, '0.0.0.0', () => {
  log.info(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    log.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    log.info('Server closed');
    process.exit(0);
  });
});
```

### 17. **Fix Static File Serving**

**Update `packages/webapp/server.js`**:
```javascript
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WebApp running on port ${PORT}`);
});
```

### 18. **Add Build Cache Optimization**

**Create `.npmrc` in root**:
```
# Speed up installs
prefer-offline=true
audit=false
fund=false
```

### 19. **Fix Prisma Client Generation**

**Update `packages/api/package.json`**:
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "prebuild": "prisma generate",
    "build": "tsc"
  }
}
```

### 20. **Add Railway-Specific Environment Detection**

**Create `packages/api/src/config/railway.ts`**:
```typescript
export const isRailway = () => {
  return !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID
  );
};

export const getRailwayConfig = () => {
  if (!isRailway()) return null;

  return {
    environment: process.env.RAILWAY_ENVIRONMENT,
    projectId: process.env.RAILWAY_PROJECT_ID,
    serviceId: process.env.RAILWAY_SERVICE_ID,
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID
  };
};
```

---

## 🗄️ Database & Prisma Fixes

### 21. **Add Database Connection Retry Logic**

**Create `packages/api/src/config/database.ts`**:
```typescript
import { PrismaClient } from '@prisma/client';

export async function connectDatabase(retries = 5): Promise<PrismaClient> {
  const prisma = new PrismaClient();

  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log('✅ Database connected');
      return prisma;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  throw new Error('Failed to connect to database');
}
```

### 22. **Fix Prisma Migration Strategy**

**Create `packages/api/scripts/migrate-railway.sh`**:
```bash
#!/bin/bash
set -e

echo "🔄 Running Prisma migrations for Railway..."

# Generate Prisma Client
npx prisma generate

# Run migrations
if [ "$NODE_ENV" = "production" ]; then
  echo "📦 Production mode: Running migrate deploy"
  npx prisma migrate deploy
else
  echo "🔧 Development mode: Running migrate dev"
  npx prisma migrate dev
fi

echo "✅ Migrations complete"
```

### 23. **Add Database Seeding for Railway**

**Update `packages/api/prisma/seed.ts`**:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Only seed if database is empty
  const count = await prisma.scan.count();
  if (count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  // Add your seed data here
  console.log('✅ Seeding complete');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 24. **Fix DATABASE_URL Format**

Railway provides DATABASE_URL, but ensure it's in the correct format.

**Add to `packages/api/src/server.ts`**:
```typescript
// Validate DATABASE_URL format
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  if (!url.protocol.startsWith('postgres')) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string');
  }
}
```

### 25. **Add Connection Pool Configuration**

**Update `packages/api/prisma/schema.prisma`**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl"]
}
```

---

## 🔐 Environment & Security Fixes

### 26. **Create Railway Environment Template**

**Create `railway.env.template`**:
```bash
# Database (Provided by Railway)
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis (Provided by Railway)
REDIS_URL=redis://default:password@host:6379

# Application
NODE_ENV=production
PORT=3001

# API Keys (Set in Railway dashboard)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
CLERK_SECRET_KEY=
STRIPE_SECRET_KEY=

# Optional Services
BROWSERLESS_URL=wss://chrome.browserless.io
SENTRY_DSN=
```

### 27. **Add Environment Validation Middleware**

**Create `packages/api/src/middleware/validateEnv.ts`**:
```typescript
import { Request, Response, NextFunction } from 'express';

export function validateEnvironment(req: Request, res: Response, next: NextFunction) {
  const required = ['DATABASE_URL', 'NODE_ENV'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Missing required environment variables'
    });
  }

  next();
}
```

### 28. **Fix CORS for Railway Domains**

**Update `packages/api/src/server.ts`**:
```typescript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN,
  'https://*.railway.app',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowed => 
      origin.match(new RegExp(allowed.replace('*', '.*')))
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### 29. **Add Security Headers**

**Update `packages/api/src/server.ts`**:
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false
}));
```

### 30. **Fix API Key Management**

**Create `packages/api/src/config/secrets.ts`**:
```typescript
export const secrets = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  clerk: process.env.CLERK_SECRET_KEY,
  stripe: process.env.STRIPE_SECRET_KEY
};

export function validateSecrets() {
  const missing = Object.entries(secrets)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.warn(`⚠️  Missing optional secrets: ${missing.join(', ')}`);
  }
}
```

---

## 📦 Dependency & Package Fixes

### 31. **Remove Puppeteer from Production**

Puppeteer is heavy and doesn't work well on Railway.

**Update `packages/api/package.json`**:
```json
{
  "dependencies": {
    "puppeteer": "^24.29.1"
  },
  "optionalDependencies": {
    "puppeteer": "^24.29.1"
  }
}
```

Or use Puppeteer Core with Browserless:
```json
{
  "dependencies": {
    "puppeteer-core": "^24.29.1"
  }
}
```

### 32. **Fix Bull Queue Dependencies**

**Update `packages/api/package.json`**:
```json
{
  "dependencies": {
    "bull": "^4.16.5",
    "redis": "^5.9.0"
  }
}
```

### 33. **Add Missing Production Dependencies**

Check if all runtime dependencies are in `dependencies`, not `devDependencies`.

**Run this check**:
```bash
cd packages/api
npm ls --production
```

### 34. **Fix Prisma Binary Targets**

**Update `packages/api/prisma/schema.prisma`**:
```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl", "debian-openssl-3.0.x"]
}
```

### 35. **Remove Unused Dependencies**

**Run**:
```bash
cd packages/api
npx depcheck
```

Remove any unused dependencies to speed up builds.

---

## 🚀 Performance & Optimization Fixes

### 36. **Add Build Caching**

**Create `.dockerignore`**:
```
node_modules
dist
.git
.env
*.log
coverage
.DS_Store
```

### 37. **Optimize TypeScript Compilation**

**Update `packages/api/tsconfig.json`**:
```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

### 38. **Add Production Logging**

**Create `packages/api/src/utils/logger.ts`**:
```typescript
import winston from 'winston';

export const log = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### 39. **Fix Memory Limits**

**Add to `railway.toml`**:
```toml
[deploy]
memoryLimit = 2048
```

### 40. **Add Request Timeout**

**Update `packages/api/src/server.ts`**:
```typescript
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});
```

---

## 🧪 Testing & Monitoring Fixes

### 41. **Add Deployment Verification Script**

**Create `scripts/verify-deployment.sh`**:
```bash
#!/bin/bash

RAILWAY_URL=$1

if [ -z "$RAILWAY_URL" ]; then
  echo "Usage: ./verify-deployment.sh <railway-url>"
  exit 1
fi

echo "🔍 Verifying deployment at $RAILWAY_URL"

# Check health endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/health")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed (HTTP $HTTP_CODE)"
  exit 1
fi

echo "✅ Deployment verified successfully"
```

### 42. **Add Startup Logging**

**Update `packages/api/src/server.ts`**:
```typescript
console.log('🚀 Starting WCAG AI Platform API...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', PORT);
console.log('Database:', process.env.DATABASE_URL ? '✅ Connected' : '❌ Not configured');
console.log('Redis:', process.env.REDIS_URL ? '✅ Connected' : '⚠️  Optional');
```

### 43. **Add Error Tracking**

**Update `packages/api/src/server.ts`**:
```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### 44. **Add Deployment Metrics**

**Create `packages/api/src/routes/metrics.ts`**:
```typescript
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: process.version,
    environment: process.env.NODE_ENV
  });
});

export default router;
```

### 45. **Add Railway-Specific Logging**

**Create `packages/api/src/utils/railway-logger.ts`**:
```typescript
export function logRailwayInfo() {
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('🚂 Railway Environment Detected');
    console.log('  Project:', process.env.RAILWAY_PROJECT_ID);
    console.log('  Service:', process.env.RAILWAY_SERVICE_ID);
    console.log('  Environment:', process.env.RAILWAY_ENVIRONMENT);
  }
}
```

---

## 📝 Documentation & Configuration Fixes

### 46. **Create Railway Deployment Guide**

**Create `RAILWAY_DEPLOYMENT_GUIDE.md`**:
```markdown
# Railway Deployment Guide

## Prerequisites
1. Railway account
2. GitHub repository connected
3. PostgreSQL database provisioned
4. Redis instance provisioned (optional)

## Deployment Steps

### 1. Create New Project
```bash
railway login
railway init
```

### 2. Add PostgreSQL
```bash
railway add postgresql
```

### 3. Add Redis (Optional)
```bash
railway add redis
```

### 4. Set Environment Variables
```bash
railway variables set NODE_ENV=production
railway variables set OPENAI_API_KEY=your-key
```

### 5. Deploy
```bash
railway up
```

## Troubleshooting
- Check logs: `railway logs`
- Check status: `railway status`
- Restart: `railway restart`
```

### 47. **Add Railway Service Configuration**

**Create `railway-services.json`**:
```json
{
  "services": {
    "api": {
      "name": "wcag-api",
      "root": "packages/api",
      "buildCommand": "npm install && npm run build",
      "startCommand": "npm run start",
      "healthcheckPath": "/health"
    },
    "webapp": {
      "name": "wcag-webapp",
      "root": "packages/webapp",
      "buildCommand": "npm install && npm run build",
      "startCommand": "npm run start",
      "healthcheckPath": "/"
    }
  }
}
```

### 48. **Create Deployment Checklist**

**Create `DEPLOYMENT_CHECKLIST.md`**:
```markdown
# Railway Deployment Checklist

## Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Build succeeds locally
- [ ] Health check endpoint working

## Deployment
- [ ] Railway project created
- [ ] PostgreSQL provisioned
- [ ] Redis provisioned (if needed)
- [ ] Environment variables set
- [ ] First deployment successful

## Post-Deployment
- [ ] Health check returns 200
- [ ] Database migrations ran
- [ ] API endpoints responding
- [ ] Logs show no errors
- [ ] Performance acceptable
```

### 49. **Add Railway CLI Commands**

**Create `railway-commands.sh`**:
```bash
#!/bin/bash

# Quick reference for Railway CLI commands

# Login
railway login

# Initialize project
railway init

# Link to existing project
railway link

# Add services
railway add postgresql
railway add redis

# Set environment variables
railway variables set KEY=value

# Deploy
railway up

# View logs
railway logs

# Check status
railway status

# Open in browser
railway open

# Run command in Railway environment
railway run npm run migrate
```

### 50. **Create Rollback Plan**

**Create `ROLLBACK_PLAN.md`**:
```markdown
# Railway Rollback Plan

## Quick Rollback
```bash
# View deployments
railway deployments

# Rollback to previous deployment
railway rollback <deployment-id>
```

## Manual Rollback
1. Go to Railway dashboard
2. Select project
3. Click "Deployments"
4. Find working deployment
5. Click "Redeploy"

## Database Rollback
```bash
# Rollback last migration
railway run npx prisma migrate resolve --rolled-back <migration-name>
```

## Emergency Contacts
- Railway Support: support@railway.app
- Team Lead: [your-email]
```

---

## 🎯 Summary & Next Steps

### Quick Win Checklist

**Immediate Actions** (Do these first):
1. ✅ Create `railway.toml` with proper configuration
2. ✅ Fix port binding to use `process.env.PORT`
3. ✅ Add health check endpoint
4. ✅ Fix Prisma migrations in build script
5. ✅ Set up environment variables in Railway dashboard

**Critical Fixes** (Week 1):
6. ✅ Fix Puppeteer (use Browserless or disable)
7. ✅ Configure Redis connection
8. ✅ Add database retry logic
9. ✅ Fix CORS for Railway domains
10. ✅ Add graceful shutdown

**Important Fixes** (Week 2):
11. ✅ Optimize build process
12. ✅ Add deployment verification
13. ✅ Configure logging
14. ✅ Add monitoring
15. ✅ Document deployment process

### Deployment Command Sequence

```bash
# 1. Create Railway project
railway init

# 2. Add PostgreSQL
railway add postgresql

# 3. Add Redis (optional)
railway add redis

# 4. Set environment variables
railway variables set NODE_ENV=production
railway variables set OPENAI_API_KEY=your-key

# 5. Deploy
railway up

# 6. Check logs
railway logs

# 7. Verify deployment
curl https://your-app.railway.app/health
```

### Common Railway Errors & Solutions

| Error | Solution |
|-------|----------|
| "Port already in use" | Use `process.env.PORT` |
| "Database connection failed" | Check DATABASE_URL format |
| "Build timeout" | Optimize build, remove heavy deps |
| "Health check failed" | Add `/health` endpoint |
| "Prisma client not generated" | Add `postinstall` script |

---

## 📞 Support

If you're still having issues after implementing these fixes:

1. **Check Railway Logs**: `railway logs`
2. **Verify Environment Variables**: `railway variables`
3. **Test Locally**: `npm run build && npm run start`
4. **Railway Discord**: https://discord.gg/railway
5. **Railway Docs**: https://docs.railway.app

---

**Last Updated**: November 18, 2025  
**Version**: 1.0  
**Status**: Ready for Implementation