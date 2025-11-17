# 🚀 WCAGAI Production Deployment Checklist

**Status:** Ready to Ship
**Code Quality:** 7,827 lines production-hardened
**Breaking Changes:** Zero
**Target:** Staging → Production

---

## ⏱️ Quick Deploy Timeline

| Phase | Duration | What Happens |
|-------|----------|--------------|
| **Pre-Flight** | 15 min | Environment validation, dependency check |
| **Staging Deploy** | 10 min | Deploy to staging, run smoke tests |
| **Validation** | 30 min | Stress tests, integration tests |
| **Production Deploy** | 10 min | Deploy to production, monitor |
| **Post-Deploy** | 15 min | Verify metrics, confirm alerts |

**Total Time:** ~80 minutes (1.5 hours)

---

## ✅ PRE-FLIGHT CHECKLIST

### 1. Environment Variables

**Required Variables:**
```bash
# Core
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=***

# External Services
OPENAI_API_KEY=***          # or ANTHROPIC_API_KEY
APOLLO_API_KEY=***
SENDGRID_API_KEY=***
CLERK_SECRET_KEY=***
STRIPE_SECRET_KEY=***

# AWS S3 (for reports)
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***
AWS_REGION=us-east-1
S3_BUCKET_NAME=wcagai-reports

# Monitoring
SENTRY_DSN=***
LOG_LEVEL=info             # info for production, debug for staging

# Optional (but recommended)
SLACK_WEBHOOK_URL=***      # For alerts
HUBSPOT_API_KEY=***
```

**Verify:**
```bash
# Check .env file exists
[ -f .env ] && echo "✅ .env found" || echo "❌ .env missing"

# Validate required vars
node -e "
const required = ['DATABASE_URL', 'REDIS_HOST', 'OPENAI_API_KEY', 'SENTRY_DSN'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.log('❌ Missing:', missing.join(', '));
  process.exit(1);
} else {
  console.log('✅ All required env vars present');
}
"
```

---

### 2. Dependencies & Build

```bash
# Install dependencies
cd packages/api
npm install

# Build TypeScript
npm run build

# Expected output:
# ✅ TypeScript compilation successful
# ✅ dist/ directory created

# Verify build
[ -d "dist" ] && echo "✅ Build successful" || echo "❌ Build failed"
```

---

### 3. Database Setup

```bash
# Run migrations (includes performance indexes)
npx prisma migrate deploy

# Apply performance indexes
npx prisma db execute --file prisma/migrations/performance_indexes.sql

# Verify indexes created
psql $DATABASE_URL -c "
  SELECT COUNT(*) as index_count
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public';
"
# Expected: 50+ indexes

# Seed initial data (if needed)
npx prisma db seed  # Optional
```

---

### 4. Redis Connection

```bash
# Test Redis connection
node -e "
const redis = require('redis');
const client = redis.createClient({
  socket: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT },
  password: process.env.REDIS_PASSWORD
});
client.connect()
  .then(() => console.log('✅ Redis connected'))
  .catch(err => console.log('❌ Redis error:', err))
  .finally(() => client.quit());
"
```

---

### 5. External Service Health

```bash
# Test OpenAI API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[0].id'
# Expected: "gpt-4" or similar

# Test Sentry DSN
node -e "
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
Sentry.captureMessage('Test deployment');
console.log('✅ Sentry test sent');
"

# Test S3 Access
aws s3 ls s3://$S3_BUCKET_NAME --region $AWS_REGION
# Expected: Bucket listing (or error if empty)
```

---

## 🧪 STAGING DEPLOYMENT

### Step 1: Deploy to Staging

**Railway:**
```bash
# Login to Railway
railway login

# Link to project
railway link

# Deploy to staging environment
railway up --environment staging

# Wait for deployment
railway status
```

**Vercel (for webapp):**
```bash
cd packages/webapp
vercel --prod --env staging
```

**Docker (manual):**
```bash
# Build image
docker build -t wcagai:staging .

# Run container
docker run -d \
  --name wcagai-staging \
  --env-file .env.staging \
  -p 8080:8080 \
  wcagai:staging

# Check logs
docker logs -f wcagai-staging
```

---

### Step 2: Smoke Tests (Staging)

```bash
export STAGING_URL=https://staging.wcagai.com

# 1. Health check
curl $STAGING_URL/health | jq
# Expected: {"status":"healthy"}

# 2. Detailed health check
curl $STAGING_URL/health/detailed | jq
# Expected: All services "healthy", circuit breakers "CLOSED"

# 3. Test scan endpoint
curl -X POST $STAGING_URL/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","wcagLevel":"AA"}' | jq
# Expected: scanId returned

# 4. Test cache (repeat same scan)
curl -X POST $STAGING_URL/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","wcagLevel":"AA"}' | jq '.cacheHit'
# Expected: true

# 5. Test compression
curl -H "Accept-Encoding: br" $STAGING_URL/api/status -v 2>&1 | grep "Content-Encoding"
# Expected: Content-Encoding: br

# 6. Test pagination
curl "$STAGING_URL/api/scans?page=1&limit=10" | jq '.pagination'
# Expected: {page:1,limit:10,hasNext:true/false}
```

---

### Step 3: Run Stress Tests (Staging)

```bash
cd packages/api

# Memory leak detector
node --expose-gc -r tsx/register stress-tests/memory-leak-detector.ts \
  --concurrent=50 --cycles=1000

# Expected output:
# ✅ Heap Growth: <50MB
# ✅ No Memory Leak Detected
# ✅ Error Rate: <10%
# 🎯 VERDICT: ✅ PASSED

# k6 load test (if k6 installed)
k6 run --env API_URL=$STAGING_URL stress-tests/100-concurrent-scans.js

# Expected:
# ✅ P95 Response Time: <30s
# ✅ Error Rate: <10%
# ✅ Success Rate: >90%
```

---

### Step 4: Integration Tests (Staging)

**Manual Test Checklist:**

- [ ] User can sign up / log in (Clerk auth)
- [ ] User can initiate scan from UI
- [ ] Scan completes and shows results
- [ ] Report generation works
- [ ] Report is viewable/downloadable
- [ ] Cache works (repeat scan is instant)
- [ ] Error handling works (invalid URL shows proper error)
- [ ] Alerts fire (check Slack/Sentry)

**Automated Test (if available):**
```bash
npm run test:e2e
```

---

## 🚀 PRODUCTION DEPLOYMENT

### Pre-Deploy Checklist

- [ ] All staging tests passed
- [ ] Stress tests passed (no memory leaks)
- [ ] Smoke tests passed
- [ ] Database migrations tested in staging
- [ ] Redis cache working in staging
- [ ] External APIs working (OpenAI, Stripe, etc.)
- [ ] Sentry receiving errors
- [ ] Monitoring dashboards ready
- [ ] Rollback plan documented (below)
- [ ] Team notified of deployment window

---

### Step 1: Create Database Backup

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Upload to S3 for safekeeping
aws s3 cp backup-*.sql s3://wcagai-backups/

# Verify backup
ls -lh backup-*.sql
# Expected: Non-zero file size
```

---

### Step 2: Deploy to Production

**Railway:**
```bash
# Switch to production environment
railway environment production

# Deploy
railway up

# Monitor deployment
railway logs --follow
```

**Vercel:**
```bash
cd packages/webapp
vercel --prod
```

**Docker:**
```bash
# Build production image
docker build -t wcagai:production .

# Run with production env
docker run -d \
  --name wcagai-prod \
  --env-file .env.production \
  -p 8080:8080 \
  --restart unless-stopped \
  wcagai:production
```

---

### Step 3: Post-Deploy Validation (Production)

**Immediate Checks (0-5 minutes):**

```bash
export PROD_URL=https://api.wcagai.com

# 1. Health check
curl $PROD_URL/health
# Expected: {"status":"healthy"}

# 2. Detailed health check
curl $PROD_URL/health/detailed | jq
# Verify:
# - database: healthy
# - redis: healthy
# - circuitBreakers.healthy: true
# - queue.capacity: healthy

# 3. Test scan (real production scan)
curl -X POST $PROD_URL/api/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PROD_API_TOKEN" \
  -d '{"url":"https://example.com","wcagLevel":"AA"}' | jq

# 4. Check cache stats
curl $PROD_URL/admin/cache/stats
# Expected: Redis connected, keys > 0 after first scans

# 5. Check error logs (should be empty)
railway logs --tail 100 | grep ERROR
# Expected: No critical errors

# 6. Check Sentry
# Visit: https://sentry.io/organizations/wcagai/issues/
# Expected: No new errors in last 5 minutes
```

**Monitoring (5-30 minutes):**

```bash
# Watch logs for errors
railway logs --follow

# Monitor key metrics:
# - Response times (should be <100ms for most endpoints)
# - Error rate (should be <1%)
# - Cache hit rate (should climb to 70%+)
# - Memory usage (should be stable)
# - CPU usage (should be <50%)
```

---

## 📊 POST-DEPLOYMENT MONITORING

### 1. Set Up Monitoring Dashboards

**Railway Dashboard:**
- CPU usage: <50%
- Memory usage: <1GB
- Response time: p95 <500ms
- Error rate: <1%

**Sentry Dashboard:**
- Error count: 0 critical errors
- Performance: p95 <1s
- Release health: 100%

**Custom Dashboard (if using Grafana):**
```
Panels to add:
- Cache hit rate (target: >70%)
- Queue depth (target: <50)
- Circuit breaker status (all CLOSED)
- Database query times (p95 <100ms)
- Memory usage trend
```

---

### 2. Verify Production Features

**24-Hour Checklist:**

After 24 hours in production, verify:

- [ ] Cache hit rate stabilized (>70%)
- [ ] No memory leaks (heap stable)
- [ ] No circuit breakers OPEN
- [ ] Queue depth healthy (<50)
- [ ] Error rate <1%
- [ ] Response times p95 <500ms
- [ ] Database queries <100ms
- [ ] Reports generating successfully
- [ ] Alerts firing correctly
- [ ] No customer complaints

---

## 🔄 ROLLBACK PROCEDURE

### When to Rollback

Rollback immediately if:
- ❌ Error rate >10%
- ❌ Memory usage climbing continuously
- ❌ Circuit breakers stuck OPEN
- ❌ Database connection errors
- ❌ Critical feature broken
- ❌ Customer-facing issues

---

### Rollback Steps (< 2 minutes)

**Railway:**
```bash
# Option 1: Rollback to previous deployment
railway rollback

# Option 2: Redeploy specific version
railway deploy --from <commit-hash>

# Verify rollback
railway logs --tail 50
curl $PROD_URL/health
```

**Docker:**
```bash
# Stop current container
docker stop wcagai-prod

# Start previous version
docker run -d \
  --name wcagai-prod \
  --env-file .env.production \
  -p 8080:8080 \
  wcagai:previous-version

# Verify
docker logs wcagai-prod
curl localhost:8080/health
```

**Database Rollback (if needed):**
```bash
# Restore from backup
psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql

# Run reverse migrations
npx prisma migrate resolve --rolled-back <migration-name>
```

---

## 🎉 SUCCESS CRITERIA

Your deployment is successful when:

✅ **Health Checks**
- All services healthy
- Circuit breakers CLOSED
- Queue capacity <80%

✅ **Performance**
- Cache hit rate >70%
- Response times p95 <500ms
- Database queries <100ms

✅ **Stability**
- Memory usage stable
- No error spikes
- No customer complaints

✅ **Monitoring**
- Sentry receiving data
- Logs flowing
- Alerts configured

---

## 📞 SUPPORT CONTACTS

**During Deployment:**
- On-call engineer: [Your contact]
- Database admin: [Contact]
- DevOps: [Contact]

**Escalation:**
- Critical issues: [Emergency contact]

**Status Page:**
- Update: https://status.wcagai.com

---

## 📝 POST-DEPLOY TASKS

Within 1 week of deployment:

- [ ] Schedule load test (off-peak hours)
- [ ] Review error logs and patterns
- [ ] Optimize slow queries (if any found)
- [ ] Adjust alert thresholds based on real data
- [ ] Document any deployment issues encountered
- [ ] Update runbook with lessons learned
- [ ] Plan next optimization iteration

---

## 🎸 FINAL CHECKLIST

Before you click "Deploy to Production":

- [ ] All pre-flight checks passed
- [ ] Staging deployment successful
- [ ] Stress tests passed
- [ ] Database backup created
- [ ] Team notified
- [ ] Rollback procedure tested
- [ ] Monitoring dashboards ready
- [ ] Coffee/beer ready for celebration 🍺

**You're ready to ship Lucy to the world!** 🚀

---

## 🚨 EMERGENCY CONTACTS

**If something goes wrong:**
1. Check health endpoint: `/health/detailed`
2. Check logs: `railway logs --tail 100`
3. Check Sentry: Recent errors
4. Rollback if critical: `railway rollback`
5. Post in #incidents channel

**Remember:** Rollback is always an option. Better to rollback fast than debug in production.

---

**Now go ship it!** The record is mastered and ready for release. 🎚️✨
