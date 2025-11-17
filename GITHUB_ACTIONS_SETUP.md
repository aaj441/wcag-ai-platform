# GitHub Actions CI/CD Setup Guide

This guide walks you through setting up automated Railway deployments via GitHub Actions.

## Overview

The workflow (`.github/workflows/railway-deploy.yml`) provides:

- ✅ **Automated deployment** on push to `main`
- ✅ **Pre-deploy validation** (TypeScript compilation, tests)
- ✅ **Stress testing** (optional, for manual deployments)
- ✅ **Database migrations** (Prisma + performance indexes)
- ✅ **Health checks** (basic + detailed)
- ✅ **Automatic rollback** on failure

---

## Step 1: Configure GitHub Secrets

### Required Secrets

Navigate to your GitHub repository:
```
https://github.com/aaj441/wcag-ai-platform/settings/secrets/actions
```

Click **"New repository secret"** and add the following:

#### 1. `RAILWAY_TOKEN`

**What it is:** Railway API token for CLI authentication

**How to get it:**
```bash
# Option A: Via Railway CLI (if installed locally)
railway login
railway tokens

# Option B: Via Railway Dashboard
1. Go to https://railway.app/account/tokens
2. Click "Create New Token"
3. Name: "GitHub Actions Deploy"
4. Copy the token
```

**Add to GitHub:**
- **Name:** `RAILWAY_TOKEN`
- **Value:** `your-railway-token-here`

---

#### 2. `RAILWAY_SERVICE_ID`

**What it is:** Unique identifier for your Railway service

**How to get it:**

```bash
# Option A: Via Railway CLI
railway status --json | jq -r '.serviceId'

# Option B: Via Railway Dashboard
1. Go to https://railway.app
2. Open your project
3. Click on your service (wcag-ai-platform)
4. The URL will look like: https://railway.app/project/[PROJECT_ID]/service/[SERVICE_ID]
5. Copy the SERVICE_ID from the URL
```

**Add to GitHub:**
- **Name:** `RAILWAY_SERVICE_ID`
- **Value:** `your-service-id-here`

---

### Verify Secrets Configuration

After adding both secrets, you should see:

```
RAILWAY_TOKEN          ••••••••••••••••
RAILWAY_SERVICE_ID     ••••••••••••••••
```

---

## Step 2: Set Up Railway Environment

### Ensure Railway Project is Configured

Your Railway project should have:

1. **PostgreSQL database** (plugin)
   - Automatically provides `DATABASE_URL`

2. **Redis database** (plugin)
   - Automatically provides `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

3. **Environment variables** (from `RAILWAY_ENV_TEMPLATE.txt`)
   - See `API_KEYS_SETUP_GUIDE.md` for all required keys

### Verify Railway Service

```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Check service status
railway status

# Verify environment variables
railway variables
```

---

## Step 3: Test the Workflow

### Option A: Automatic Deploy (Push to Main)

```bash
# Merge your production-hardening PR
git checkout main
git pull origin main

# The workflow will automatically trigger
```

### Option B: Manual Deploy (Workflow Dispatch)

1. Go to GitHub Actions tab:
   ```
   https://github.com/aaj441/wcag-ai-platform/actions/workflows/railway-deploy.yml
   ```

2. Click **"Run workflow"**

3. Select environment:
   - **staging** - Deploy to staging (with stress tests)
   - **production** - Deploy to production (with stress tests)

4. Click **"Run workflow"**

---

## Step 4: Monitor Deployment

### Watch the Workflow

1. Navigate to **Actions** tab in GitHub
2. Click on the running workflow
3. Monitor each stage:
   - ✅ Pre-Deploy Validation (2-3 min)
   - ✅ Stress Testing (optional, 15-20 min)
   - ✅ Deploy to Railway (3-5 min)
   - ✅ Database Migrations (2-5 min)
   - ✅ Post-Deploy Health Check (1-2 min)

### Expected Timeline

**Without stress tests** (auto-deploy on push to main):
- Total time: ~10-15 minutes

**With stress tests** (manual workflow dispatch):
- Total time: ~30-40 minutes

---

## Workflow Stages Explained

### Stage 1: Pre-Deploy Validation

**Purpose:** Ensure code quality before deployment

**Checks:**
- ✅ TypeScript compilation
- ✅ Unit tests pass
- ✅ Migration files are valid

**Failure behavior:** Stops deployment

---

### Stage 2: Stress Testing (Optional)

**Purpose:** Validate performance under load

**When it runs:**
- Only for manual `workflow_dispatch` events
- Skipped for automatic push to main

**Tests:**
- 🧪 Memory leak detection (1000 cycles)
- 🧪 Load testing (100 concurrent users)

**Success criteria:**
- Heap growth <50MB
- P95 response time <30s
- Error rate <10%

**Failure behavior:** Stops deployment

---

### Stage 3: Deploy to Railway

**Purpose:** Deploy new code to Railway

**Process:**
1. Verifies Railway credentials
2. Runs `railway up`
3. Waits 30 seconds for stabilization

**Failure behavior:** Triggers automatic rollback

---

### Stage 4: Database Migrations

**Purpose:** Apply schema changes and performance optimizations

**Process:**
1. Runs `prisma migrate deploy`
2. Applies performance indexes from `performance_indexes.sql`
3. Verifies database schema

**Important:** Index application may take 2-5 minutes for large datasets

**Failure behavior:** Triggers automatic rollback

---

### Stage 5: Post-Deploy Health Checks

**Purpose:** Verify deployment is healthy

**Checks:**
- 🏥 Basic health endpoint (HTTP 200)
- 🔍 Detailed health status
- 🔌 Circuit breakers healthy
- 🗄️ Database connectivity
- ⚡ Redis connectivity
- 📋 Queue capacity

**Failure behavior:** Triggers automatic rollback

---

### Stage 6: Rollback on Failure

**Purpose:** Automatically recover from failed deployments

**When it runs:**
- If any stage fails (deploy, migrate, health-check)

**Process:**
1. Runs `railway rollback`
2. Waits for rollback to stabilize
3. Verifies rollback health

**Recovery time:** <2 minutes

---

## Health Check Endpoints

After deployment, monitor these endpoints:

### Basic Health
```bash
curl https://your-app.railway.app/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T12:00:00Z"
}
```

### Detailed Health
```bash
curl https://your-app.railway.app/health/detailed | jq
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T12:00:00Z",
  "uptime": 3600,
  "checks": {
    "database": { "healthy": true },
    "redis": { "healthy": true },
    "circuitBreakers": {
      "healthy": true,
      "services": {
        "openai": "closed",
        "stripe": "closed"
      }
    },
    "queue": {
      "capacity": "healthy",
      "waiting": 5,
      "active": 2,
      "utilization": 15
    }
  }
}
```

---

## Troubleshooting

### Error: "RAILWAY_TOKEN secret not set"

**Cause:** GitHub secret not configured

**Fix:**
1. Go to repository Settings → Secrets → Actions
2. Add `RAILWAY_TOKEN` secret
3. Re-run workflow

---

### Error: "Railway deployment failed"

**Possible causes:**
- Build errors in Railway
- Missing environment variables
- Database connection issues

**Fix:**
1. Check Railway logs: `railway logs`
2. Verify environment variables: `railway variables`
3. Check Railway dashboard for error details

---

### Error: "Database connection failed"

**Cause:** PostgreSQL plugin not configured or down

**Fix:**
```bash
# Verify database is running
railway run psql $DATABASE_URL -c "SELECT 1;"

# Check database URL is set
railway variables | grep DATABASE_URL
```

---

### Error: "Performance indexes application failed"

**Cause:** Indexes may already exist (normal on re-runs)

**Behavior:** Workflow continues (non-fatal error)

**To verify indexes:**
```bash
railway run psql $DATABASE_URL -c "\d+ \"Scan\""
```

---

### Error: "Health check failed after 5 attempts"

**Possible causes:**
- Application not starting
- Database migrations failed
- Missing environment variables

**Fix:**
1. Check Railway logs: `railway logs --tail 100`
2. Verify application started: `railway status`
3. Check health endpoint manually:
   ```bash
   curl https://your-app.railway.app/health
   ```

---

### Rollback Was Triggered

**What happened:** Deployment failed health checks and automatically rolled back

**Next steps:**
1. Review workflow logs to identify failure
2. Fix the issue locally
3. Push fix to trigger new deployment
4. Monitor deployment closely

---

## Manual Deployment (Bypass CI/CD)

If you need to deploy without GitHub Actions:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link
railway login
railway link

# Deploy
railway up

# Run migrations
railway run npx prisma migrate deploy

# Apply indexes (from packages/api directory)
railway run psql $DATABASE_URL -f prisma/migrations/performance_indexes.sql

# Verify health
curl $(railway status --json | jq -r '.url')/health
```

---

## Advanced Configuration

### Add Slack Notifications

Edit `.github/workflows/railway-deploy.yml` and add to the end of `health-check` job:

```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "✅ Deployment succeeded: ${{ steps.get-url.outputs.url }}"
      }
```

Add GitHub secret:
- **Name:** `SLACK_WEBHOOK_URL`
- **Value:** Your Slack webhook URL

---

### Add Custom Environment per Branch

Create separate Railway services for staging and production:

```yaml
# In railway-deploy.yml
environment:
  name: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
```

Add secrets:
- `RAILWAY_SERVICE_ID_STAGING`
- `RAILWAY_SERVICE_ID_PRODUCTION`

---

### Enable Stress Tests on Every Deploy

Change in `.github/workflows/railway-deploy.yml`:

```yaml
stress-test:
  # Change this line:
  if: github.event_name == 'workflow_dispatch'
  # To this:
  if: always()
```

**Warning:** This will add 20-30 minutes to every deployment.

---

## Security Best Practices

### Rotate Railway Token Regularly

```bash
# Create new token
railway tokens create "GitHub Actions Deploy $(date +%Y%m%d)"

# Update GitHub secret
# Then revoke old token
railway tokens revoke <old-token-id>
```

### Use Environment Protection Rules

1. Go to repository Settings → Environments
2. Create `production` environment
3. Add protection rules:
   - Required reviewers (1+)
   - Wait timer (5 minutes)
   - Restrict to `main` branch

---

## Monitoring After Deployment

### Key Metrics to Watch

**First 24 hours:**
- 🏥 Health status (should stay "healthy")
- 📊 Cache hit rate (target >70%)
- ⚡ Response times (P95 <30s)
- 🔌 Circuit breaker status (all closed)
- 📋 Queue depth (utilization <80%)

**Ongoing:**
- Error rate (Sentry alerts)
- Memory usage (should stabilize)
- Database query performance
- Queue processing times

---

## Support

**Railway Issues:**
- Dashboard: https://railway.app
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway

**GitHub Actions Issues:**
- Workflow logs: Repository → Actions tab
- Docs: https://docs.github.com/actions

**Application Issues:**
- Review workflow logs
- Check Railway logs: `railway logs`
- Monitor health endpoint
- Check Sentry for errors

---

## Quick Reference

### Useful Commands

```bash
# Check workflow status
gh run list --workflow=railway-deploy.yml

# View latest workflow logs
gh run view --log

# Manually trigger deployment
gh workflow run railway-deploy.yml -f environment=staging

# Check Railway status
railway status

# View Railway logs
railway logs --tail 100

# Rollback manually
railway rollback
```

### Important URLs

- **GitHub Actions:** `https://github.com/aaj441/wcag-ai-platform/actions`
- **Railway Dashboard:** `https://railway.app`
- **Railway Tokens:** `https://railway.app/account/tokens`

---

**Total setup time:** ~15 minutes
**Deployment time:** ~10-15 minutes (without stress tests)
**Rollback time:** <2 minutes
