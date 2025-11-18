# Production Deployment Runbook

**WCAGAI Platform - Complete Deployment Guide**

---

## Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] All tests passing locally (`npm test`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Code reviewed and PR approved
- [ ] No critical Sentry errors in past 24 hours
- [ ] Railway environment variables up to date
- [ ] Database migrations tested in staging
- [ ] Feature flags configured (if using)
- [ ] Rollback plan ready

---

## Deployment Methods

### Method 1: Automated (Recommended)

**Trigger:** Merge PR to `main` branch

**What happens automatically:**
1. GitHub Actions workflow (`railway-deploy.yml`) triggered
2. Pre-deployment validation (TypeScript, tests, migration checks)
3. Deployment to Railway
4. Database migrations executed
5. Health checks performed
6. Auto-rollback if health checks fail

**Monitor:** https://github.com/aaj441/wcag-ai-platform/actions

### Method 2: Manual Deploy

**Use when:** Hotfix needed, automated deploy failed

```bash
# 1. Ensure you're on main branch
git checkout main
git pull origin main

# 2. Run pre-deployment checks
./deployment/scripts/verify-deployment-harmony.sh

# 3. Deploy to Railway
railway up --service wcagaii-backend --environment production

# 4. Run migrations
railway run --service wcagaii-backend npx prisma migrate deploy

# 5. Verify deployment
./deployment/scripts/smoke-test.sh https://api.wcagai.com
```

### Method 3: Emergency Hotfix

**Use when:** Critical production bug, needs immediate fix

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug-fix main

# 2. Make minimal changes (fix only)
# ... edit files ...

# 3. Test locally
npm run build
npm test

# 4. Commit and push
git add .
git commit -m "hotfix: Fix critical bug XYZ"
git push origin hotfix/critical-bug-fix

# 5. Deploy directly (bypass PR)
railway up --service wcagaii-backend --environment production

# 6. Verify fix
curl https://api.wcagai.com/health/detailed

# 7. Create PR for review (post-deployment)
gh pr create --title "Hotfix: Critical bug XYZ" --body "Emergency hotfix deployed to production"

# 8. Merge PR to main
```

---

## Deployment Steps (Detailed)

### Stage 1: Pre-Deployment Validation (3-5 min)

**Automated checks:**
- ✅ Checkout code with full git history
- ✅ Install dependencies (`npm ci`)
- ✅ Compile TypeScript (`npm run build`)
- ✅ Run unit tests (`npm test`)
- ✅ Validate Prisma schema
- ✅ Check migration files exist

**Manual checks (if deploying manually):**
```bash
# Run verification script
cd /path/to/wcag-ai-platform
./deployment/scripts/verify-deployment-harmony.sh

# Expected output:
# ✅ Passed: X
# ⚠️  Warnings: Y
# ❌ Failed: Z
```

**Pass criteria:** 0 failures, < 3 warnings

### Stage 2: Build & Deploy (2-3 min)

**What happens:**
1. Railway CLI uploads code
2. Railway builds Docker image
3. Railway deploys new container
4. Old container kept running (zero-downtime)
5. Health check performed
6. Traffic switched to new container
7. Old container terminated

**Monitoring:**
- Railway dashboard: https://railway.app/dashboard
- Deployment logs: `railway logs --service wcagaii-backend`

### Stage 3: Database Migrations (1-2 min)

**Automated:**
```yaml
# Runs in GitHub Actions
railway run --service wcagaii-backend npx prisma migrate deploy
```

**Manual:**
```bash
# If deploying manually
railway run --service wcagaii-backend npx prisma migrate deploy

# Apply performance indexes (if new)
railway run --service wcagaii-backend -- bash -c "
  psql \$DATABASE_URL -f packages/api/prisma/migrations/performance_indexes.sql
"
```

**Validation:**
```bash
# Verify schema matches Prisma
railway run --service wcagaii-backend npx prisma db pull
```

### Stage 4: Post-Deployment Health Checks (2-3 min)

**Automated checks:**
1. **Basic health:** `GET /health` → Expect HTTP 200
2. **Detailed health:** `GET /health/detailed` → Parse JSON, check status
3. **Database connectivity:** Check `checks.database.healthy === true`
4. **Redis connectivity:** Check `checks.redis.healthy === true`
5. **Queue capacity:** Check `checks.queue.capacity !== "critical"`
6. **Circuit breakers:** Verify all closed (not open)

**Manual verification:**
```bash
# Run smoke test script
./deployment/scripts/smoke-test.sh https://api.wcagai.com

# Expected output:
# ✅ All smoke tests PASSED
# Deployment is healthy
```

**If health checks fail:** Automatic rollback triggered

### Stage 5: Verification & Monitoring (10-15 min)

**Immediate checks (0-5 min):**
- [ ] Health endpoint responds: https://api.wcagai.com/health
- [ ] No new Sentry errors
- [ ] Railway logs show no errors
- [ ] Key user flows work (trigger test scan)

**Short-term monitoring (5-15 min):**
- [ ] Error rate remains < 1%
- [ ] Response times within normal range
- [ ] Queue processing normally
- [ ] No alerts fired

**Extended monitoring (1-24 hours):**
- [ ] Monitor Sentry for new error patterns
- [ ] Check metrics trends (requests, errors, response times)
- [ ] Review customer support tickets for issues
- [ ] Performance metrics stable

---

## Rollback Procedures

### When to Rollback

Rollback immediately if:
- ❌ Health checks failing after deployment
- ❌ Error rate > 5%
- ❌ Critical feature broken
- ❌ Data corruption detected
- ❌ Security vulnerability introduced

### Automated Rollback

**Triggered automatically if:**
- Health checks fail (3 attempts)
- Database connection fails
- Critical error rate threshold exceeded

**What happens:**
1. Railway reverts to previous deployment
2. Rollback health check performed
3. Notification sent to team
4. GitHub issue created

### Manual Rollback

**Method 1: Railway Dashboard**
1. Go to https://railway.app/dashboard
2. Select service: `wcagaii-backend`
3. Click "Deployments" tab
4. Find previous successful deployment
5. Click "Redeploy"
6. Confirm rollback

**Method 2: Railway CLI**
```bash
# Rollback to previous deployment
railway rollback --service wcagaii-backend --environment production

# Wait for rollback to complete
sleep 30

# Verify rollback health
curl https://api.wcagai.com/health
```

**Method 3: Git Revert + Redeploy**
```bash
# If issue is in code
git revert HEAD  # Revert last commit
git push origin main  # Trigger automated deploy

# Wait for automated deployment
# Monitor: https://github.com/aaj441/wcag-ai-platform/actions
```

### Post-Rollback

After rollback:
1. ✅ Verify service health restored
2. ✅ Check error rate normalized
3. ✅ Notify team of rollback
4. ✅ Create incident report
5. ✅ Fix issue in separate branch
6. ✅ Test fix thoroughly before re-deploying

---

## Zero-Downtime Deployment

Railway provides zero-downtime deployments by default:

**How it works:**
1. New container starts while old container runs
2. Health check performed on new container
3. Only after health check passes, traffic switches
4. Old container gracefully shutdown (30s grace period)

**Requirements for zero-downtime:**
- Health endpoint must respond quickly (< 5s)
- Database migrations must be backward compatible
- No breaking API changes

**Backward-Compatible Migrations:**
```sql
-- ✅ GOOD: Add new column (nullable or with default)
ALTER TABLE scans ADD COLUMN new_field VARCHAR(255);

-- ✅ GOOD: Add new index
CREATE INDEX idx_scans_created_at ON scans(created_at);

-- ❌ BAD: Rename column (breaks old code)
ALTER TABLE scans RENAME COLUMN old_name TO new_name;

-- ❌ BAD: Remove column (breaks old code)
ALTER TABLE scans DROP COLUMN old_field;
```

**For breaking changes:**
1. Deploy code that works with both old and new schema
2. Run migration
3. Deploy code that uses only new schema
4. Clean up old schema

---

## Environment Variables

### Required Secrets

**Railway Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://...       # Auto-provided by Railway

# Redis
REDIS_URL=redis://...              # Auto-provided by Railway

# Authentication
CLERK_SECRET_KEY=sk_...            # From Clerk dashboard
CLERK_PUBLISHABLE_KEY=pk_...       # From Clerk dashboard

# Payment
STRIPE_SECRET_KEY=sk_live_...      # From Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_...    # From Stripe webhooks

# AI
OPENAI_API_KEY=sk-proj-...         # From OpenAI dashboard

# Monitoring
SENTRY_DSN=https://...@sentry.io/... # From Sentry project settings

# App Config
NODE_ENV=production
PORT=3001
```

**GitHub Secrets (for CI/CD):**
```bash
RAILWAY_TOKEN=...           # Railway API token
RAILWAY_SERVICE_ID=...      # Service ID for deployment
SLACK_WEBHOOK_URL=...       # For deployment notifications (optional)
```

### Updating Environment Variables

**Via Railway Dashboard:**
1. Go to https://railway.app/dashboard
2. Select service
3. Click "Variables" tab
4. Add/update variable
5. Click "Redeploy" if needed

**Via Railway CLI:**
```bash
railway variables set KEY=value --service wcagaii-backend --environment production
```

**Important:** Changing environment variables triggers redeployment.

---

## Common Deployment Issues

### Issue 1: TypeScript Compilation Fails

**Error:** `npm run build` fails with type errors

**Fix:**
```bash
# Check TypeScript errors
npx tsc --noEmit

# Fix errors in code
# Then rebuild
npm run build
```

**Prevention:** Enable pre-commit hooks

### Issue 2: Database Migration Fails

**Error:** `prisma migrate deploy` fails

**Fix:**
```bash
# Check migration status
railway run --service wcagaii-backend npx prisma migrate status

# If migration is partially applied, resolve manually
railway run --service wcagaii-backend npx prisma migrate resolve --applied <migration-name>

# Then retry
railway run --service wcagaii-backend npx prisma migrate deploy
```

**Prevention:** Test migrations in staging first

### Issue 3: Health Check Timeout

**Error:** Deployment succeeds but health checks timeout

**Fix:**
```bash
# Check Railway logs
railway logs --service wcagaii-backend

# Common causes:
# - App not listening on correct port (should be $PORT)
# - Startup taking too long (increase timeout)
# - Dependencies not installed (check package.json)
```

### Issue 4: High Memory Usage

**Error:** Service crashes with "Out of memory"

**Fix:**
```bash
# Increase memory in Railway
# Dashboard → Service → Settings → Memory Limit

# Or optimize code:
# - Check for memory leaks
# - Reduce concurrent operations
# - Implement pagination
```

---

## Deployment Notifications

### Slack Integration

**Setup:**
```yaml
# .github/workflows/railway-deploy.yml
- name: Notify Slack
  if: always()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "🚀 Deployment complete",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Deployment Status:* ${{ job.status }}\n*Environment:* production\n*Deployed by:* ${{ github.actor }}"
            }
          }
        ]
      }'
```

**Channels:**
- `#deployments` - All deployments
- `#production-alerts` - Deployment failures only

### Email Notifications

GitHub Actions will email:
- Workflow failures
- Manual approval requests (if configured)

Configure in: GitHub Settings → Notifications

---

## Deployment Schedule

### Recommended Windows

**Normal Deployments:**
- Tuesday-Thursday, 10 AM - 4 PM PST
- Avoid Mondays (weekend issues to resolve)
- Avoid Fridays (no weekend coverage)

**Emergency Hotfixes:**
- Anytime (with on-call engineer available)

**Maintenance Windows:**
- Sundays, 2 AM - 6 AM PST (lowest traffic)

### Deployment Frequency

**Target:** 2-3 deployments per week

**Best practices:**
- Small, incremental changes
- Feature flags for large features
- Automated testing required
- No Friday deployments (unless critical)

---

## Post-Deployment Checklist

Within 15 minutes of deployment:
- [ ] Health checks passing
- [ ] No new Sentry errors
- [ ] Smoke tests passing
- [ ] Key user flows tested

Within 1 hour:
- [ ] Error rate < 1%
- [ ] Response times normal
- [ ] No customer reports of issues
- [ ] Metrics trending normally

Within 24 hours:
- [ ] Review all Sentry issues
- [ ] Check for performance regressions
- [ ] Monitor customer feedback
- [ ] Update deployment log

---

## Support

**Deployment Issues:**
- On-call engineer: Use PagerDuty escalation
- Engineering team: Slack `#engineering`
- Railway support: https://railway.app/support

**Documentation:**
- [INCIDENT_RESPONSE.md](../../INCIDENT_RESPONSE.md)
- [MONITORING.md](../../MONITORING.md)
- [SECURITY.md](../../SECURITY.md)

---

**Last Updated:** November 17, 2025
**Next Review:** Monthly
**Owner:** Engineering Team
