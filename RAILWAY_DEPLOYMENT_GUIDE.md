# Railway Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the WCAG AI Platform to Railway.app.

## Prerequisites

✅ **Verified Working:**
- Node.js 20+ installed
- npm installed
- Git repository configured
- All builds passing (22/22 tests)
- Health checks operational

## Deployment Status

🎉 **READY FOR PRODUCTION DEPLOYMENT**

- ✅ API Build: 0 TypeScript errors
- ✅ Webapp Build: All assets generated
- ✅ Server Tests: All passing
- ✅ Health Checks: Operational
- ✅ Configuration: Validated

## Quick Start

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

This will open your browser for authentication.

### 3. Deploy Backend (API)

```bash
cd packages/api
railway init  # First time only
railway up
```

### 4. Deploy Frontend (Webapp)

```bash
cd packages/webapp
railway init  # First time only
railway up
```

## Detailed Deployment Steps

### Backend API Deployment

#### Step 1: Navigate to API Directory

```bash
cd packages/api
```

#### Step 2: Initialize Railway Project (First Time)

```bash
railway init
```

Follow the prompts:
- Select "Create new project"
- Name: `wcag-ai-api` (or your preferred name)
- Environment: `production`

#### Step 3: Configure Environment Variables

```bash
# Required variables
railway variables set NODE_ENV=production
railway variables set PORT=8080

# Optional: Database (if using PostgreSQL)
railway variables set DATABASE_URL=<your_postgres_url>

# Optional: Redis (if using Redis)
railway variables set REDIS_URL=<your_redis_url>

# Optional: External APIs
railway variables set OPENAI_API_KEY=<your_key>
railway variables set LAUNCHDARKLY_SDK_KEY=<your_key>
```

#### Step 4: Deploy

```bash
railway up
```

Railway will:
1. Upload your code
2. Install dependencies (`npm install`)
3. Build your application (`npm run build`)
4. Start your server (`npm start`)

#### Step 5: Get Deployment URL

```bash
railway domain
```

Example output: `https://wcag-ai-api.up.railway.app`

#### Step 6: Verify Deployment

```bash
# Check health endpoint
curl https://your-api.up.railway.app/health

# Expected response:
{
  "success": true,
  "message": "WCAG AI Platform API is running",
  "timestamp": "2025-11-12T13:00:00.000Z",
  "environment": "production"
}
```

### Frontend Webapp Deployment

#### Step 1: Navigate to Webapp Directory

```bash
cd packages/webapp
```

#### Step 2: Initialize Railway Project

```bash
railway init
```

Follow the prompts:
- Select "Create new project"
- Name: `wcag-ai-webapp`
- Environment: `production`

#### Step 3: Configure Environment Variables

```bash
railway variables set NODE_ENV=production
railway variables set PORT=3000

# Point to your API
railway variables set VITE_API_BASE_URL=https://your-api.up.railway.app
```

#### Step 4: Deploy

```bash
railway up
```

#### Step 5: Get Deployment URL

```bash
railway domain
```

#### Step 6: Verify Deployment

Visit the URL in your browser. You should see the WCAG AI Platform dashboard.

## Configuration Files

### API Configuration (`packages/api/railway.json`)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build",
    "watchPatterns": ["src/**"]
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "healthcheck": {
    "path": "/health",
    "intervalSeconds": 30,
    "timeoutSeconds": 10
  },
  "regions": ["us-west1"]
}
```

**Key Features:**
- **Builder:** Nixpacks (Railway's universal builder)
- **Health Check:** Monitors `/health` every 30 seconds
- **Auto-Restart:** Restarts on failure (max 10 retries)
- **Always-On:** Sleep disabled for production availability

### Webapp Configuration (`packages/webapp/railway.json`)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "on-failure",
    "restartPolicyMaxRetries": 10
  }
}
```

## Environment Variables

### Required for API

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `8080` |

### Optional for API

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection | `redis://host:6379` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `LAUNCHDARKLY_SDK_KEY` | LaunchDarkly SDK key | `sdk-...` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `...` |
| `SENTRY_DSN` | Sentry error tracking | `https://...` |

### Required for Webapp

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3000` |
| `VITE_API_BASE_URL` | Backend API URL | `https://api.example.com` |

## Monitoring & Health Checks

### Health Endpoint

Railway automatically monitors the `/health` endpoint configured in `railway.json`.

**Endpoint:** `GET /health`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "WCAG AI Platform API is running",
  "timestamp": "2025-11-12T13:00:00.000Z",
  "environment": "production"
}
```

**Monitoring Frequency:** Every 30 seconds  
**Timeout:** 10 seconds  
**Action on Failure:** Restart (up to 10 times)

### Viewing Logs

```bash
# Real-time logs
railway logs

# Follow logs (tail -f style)
railway logs --tail

# Logs from specific deployment
railway logs --deployment <deployment-id>
```

### Metrics

```bash
# View deployment metrics
railway metrics

# View service status
railway status
```

## Rollback Procedures

### Rollback to Previous Deployment

```bash
# List deployments
railway deployments

# Rollback to specific deployment
railway rollback --deployment <deployment-id>
```

### Manual Rollback

1. **Revert Git Commit:**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Redeploy:**
   ```bash
   railway up
   ```

## Troubleshooting

### Build Failures

**Symptom:** Deployment fails during build phase

**Solution:**
```bash
# Check logs
railway logs

# Test build locally
npm install
npm run build

# Verify build output
ls -la dist/
```

### Server Won't Start

**Symptom:** Deployment succeeds but health checks fail

**Solution:**
```bash
# Check start command
cat railway.json | jq '.deploy.startCommand'

# Test locally
PORT=8080 NODE_ENV=production node dist/server.js

# Check for missing environment variables
railway variables list
```

### Health Check Failures

**Symptom:** Health checks timeout or fail

**Solution:**
```bash
# Test health endpoint locally
curl http://localhost:8080/health

# Check health check configuration
cat railway.json | jq '.healthcheck'

# Increase timeout if needed
# Edit railway.json: "timeoutSeconds": 20
```

### Connection Issues

**Symptom:** Cannot connect to deployed service

**Solution:**
```bash
# Get current domain
railway domain

# Check service status
railway status

# Verify port configuration
railway variables list | grep PORT
```

## Best Practices

### 1. Environment-Specific Configuration

Keep development and production environments separate:

```bash
# Development
railway environment select development
railway up

# Production
railway environment select production
railway up
```

### 2. Secrets Management

Never commit secrets to Git. Always use Railway environment variables:

```bash
railway variables set SECRET_KEY=<value>
```

### 3. Health Checks

Ensure health endpoint is lightweight and fast:

```typescript
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});
```

### 4. Logging

Use structured logging for better debugging:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});
```

### 5. Graceful Shutdown

Handle shutdown signals properly:

```typescript
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

## Testing Deployment

### Pre-Deployment Test

Run the Railway simulation test:

```bash
./deployment/scripts/test-railway-simulation.sh
```

Expected output: `22/22 tests passed`

### Post-Deployment Verification

```bash
# 1. Check health
curl https://your-api.up.railway.app/health

# 2. Test API endpoints
curl https://your-api.up.railway.app/api/drafts
curl https://your-api.up.railway.app/api/violations

# 3. Open webapp in browser
open https://your-webapp.up.railway.app
```

### Load Testing (Optional)

```bash
# Install k6 (load testing tool)
brew install k6  # macOS
# or
sudo apt install k6  # Linux

# Run load test
k6 run deployment/scripts/load-test.js
```

## Continuous Deployment

### GitHub Actions Integration

Railway can automatically deploy on Git push:

1. **Link Repository:**
   ```bash
   railway link
   ```

2. **Enable Auto-Deploy:**
   - Go to Railway dashboard
   - Select your project
   - Settings → GitHub → Enable Auto-Deploy

3. **Configure Branch:**
   - Production: `main` branch
   - Staging: `develop` branch

### Manual Deployment

Prefer manual control? Use the CLI:

```bash
railway up
```

## Cost Optimization

### Development Environment

For non-critical environments, enable sleep mode:

```json
{
  "deploy": {
    "sleepApplication": true
  }
}
```

### Production Environment

Keep always-on for production:

```json
{
  "deploy": {
    "sleepApplication": false
  }
}
```

### Resource Limits

Monitor usage in Railway dashboard:
- View monthly usage
- Set spending limits
- Configure alerts

## Support & Resources

### Railway Documentation

- [Railway Docs](https://docs.railway.app)
- [Nixpacks](https://nixpacks.com)
- [Railway CLI](https://docs.railway.app/develop/cli)

### WCAG AI Platform

- [GitHub Repository](https://github.com/aaj441/wcag-ai-platform)
- [API Documentation](../docs/api/)
- [Issue Tracker](https://github.com/aaj441/wcag-ai-platform/issues)

### Community Support

- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- GitHub Discussions: Repository discussions tab

## Appendix

### Railway Commands Cheat Sheet

```bash
# Authentication
railway login
railway logout
railway whoami

# Project Management
railway init
railway link
railway unlink
railway status

# Deployment
railway up
railway down
railway restart

# Variables
railway variables
railway variables set KEY=value
railway variables delete KEY

# Logs & Monitoring
railway logs
railway logs --tail
railway metrics

# Domains
railway domain
railway domain add custom.example.com

# Rollback
railway deployments
railway rollback

# Environments
railway environment
railway environment select production
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Build timeout | Increase timeout in railway.json |
| Memory issues | Upgrade plan or optimize code |
| Port binding | Ensure PORT env var is used |
| CORS errors | Configure CORS in Express |
| Health check fails | Verify /health endpoint |

---

**Last Updated:** 2025-11-12  
**Version:** 1.0.0  
**Status:** Production Ready ✅
