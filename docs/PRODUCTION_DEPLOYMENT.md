# WCAG AI Platform - Production Deployment Guide

## Table of Contents
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Setup](#environment-setup)
- [Railway Deployment](#railway-deployment)
- [GitHub Pages Demo](#github-pages-demo)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Monitoring & Alerts](#monitoring--alerts)
- [Security Hardening](#security-hardening)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, ensure all items are complete:

### Critical (Must Complete)
- [ ] All CI/CD workflows passing (fix-pipeline.yml, accessibility.yml)
- [ ] SECURITY.md file added and reviewed
- [ ] GitHub Security Advisories enabled
- [ ] All environment variables configured in Railway/deployment platform
- [ ] Database migrations tested in staging
- [ ] API keys rotated and securely stored
- [ ] SSL/TLS certificates configured
- [ ] Rate limiting configured
- [ ] Error monitoring (Sentry/DataDog) configured

### Important (Recommended)
- [ ] Load testing completed (minimum 100 concurrent users)
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Monitoring dashboards configured
- [ ] Uptime monitoring enabled (e.g., UptimeRobot)
- [ ] CDN configured for static assets
- [ ] CORS policies reviewed and configured
- [ ] API documentation published

### Optional (Nice to Have)
- [ ] Demo site deployed to GitHub Pages
- [ ] White-label customization tested
- [ ] Multi-region deployment configured
- [ ] Auto-scaling policies tested

---

## Environment Setup

### Required Accounts
1. **Railway** (API & Backend Hosting)
   - Sign up: https://railway.app
   - Install CLI: `npm install -g @railway/cli`

2. **Vercel** (Optional - Webapp Hosting)
   - Sign up: https://vercel.com
   - Install CLI: `npm install -g vercel`

3. **GitHub** (CI/CD & Version Control)
   - Repository: https://github.com/aaj441/wcag-ai-platform
   - Enable GitHub Actions

4. **Monitoring Services**
   - Sentry: https://sentry.io (Error tracking)
   - DataDog: https://datadoghq.com (Metrics & logs)
   - UptimeRobot: https://uptimerobot.com (Uptime monitoring)

---

## Railway Deployment

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Link Project

```bash
# Navigate to project root
cd wcag-ai-platform

# Link to Railway project
railway link
```

### Step 3: Configure Environment Variables

```bash
# Set production environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL="postgresql://user:password@host:5432/wcagai_prod"
railway variables set OPENAI_API_KEY="sk-proj-..."
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
railway variables set API_BASE_URL="https://api.wcagai.com"

# Email configuration
railway variables set SMTP_HOST="smtp.sendgrid.net"
railway variables set SMTP_PORT=587
railway variables set SMTP_USER="apikey"
railway variables set SMTP_PASSWORD="SG...."

# HubSpot integration
railway variables set HUBSPOT_API_KEY="pat-..."

# Monitoring
railway variables set SENTRY_DSN="https://...@sentry.io/..."
railway variables set DATADOG_API_KEY="..."
```

### Step 4: Deploy API

```bash
# Deploy API service
cd packages/api
railway up --environment production --service wcagai-api

# Monitor deployment
railway logs --service wcagai-api --environment production
```

### Step 5: Deploy Webapp

```bash
# Deploy webapp service
cd packages/webapp
railway up --environment production --service wcagai-webapp

# Monitor deployment
railway logs --service wcagai-webapp --environment production
```

### Step 6: Verify Deployment

```bash
# Check API health
curl https://api.wcagai.com/health

# Expected response:
# {
#   "status": "ok",
#   "uptime": 3600,
#   "database": "connected",
#   "version": "2.0.0"
# }
```

---

## GitHub Pages Demo

### Enable GitHub Pages

1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: Select `gh-pages` or configure GitHub Actions deployment
4. Save

### Deploy Demo Manually

```bash
# Trigger deploy-demo workflow
gh workflow run deploy-demo.yml
```

### Verify Demo Deployment

Visit: `https://aaj441.github.io/wcag-ai-platform/`

---

## Environment Variables

### Required Variables

| Variable | Description | Example | Service |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment name | `production` | Both |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` | API |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` | API |
| `NEXTAUTH_SECRET` | NextAuth secret | `$(openssl rand -base64 32)` | API |
| `API_BASE_URL` | API base URL | `https://api.wcagai.com` | Both |
| `ALLOWED_ORIGINS` | CORS origins | `https://wcagai.com,https://app.wcagai.com` | API |
| `JWT_SECRET` | JWT signing secret | `$(openssl rand -base64 64)` | API |

### Optional Variables

| Variable | Description | Default | Service |
|----------|-------------|---------|---------|
| `PORT` | Server port | `3001` (API), `3000` (webapp) | Both |
| `LOG_LEVEL` | Logging level | `info` | Both |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | `900000` (15 min) | API |
| `RATE_LIMIT_MAX` | Max requests per window | `100` | API |
| `SCAN_TIMEOUT` | Max scan duration (ms) | `60000` | API |
| `MAX_CONCURRENT_SCANS` | Max parallel scans | `5` | API |

### Email Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server | `smtp.sendgrid.net` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `apikey` |
| `SMTP_PASSWORD` | SMTP password | `SG...` |
| `FROM_EMAIL` | Sender email | `noreply@wcagai.com` |
| `FROM_NAME` | Sender name | `WCAG AI Platform` |

### Monitoring Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `SENTRY_DSN` | Sentry DSN | `https://...@sentry.io/...` |
| `DATADOG_API_KEY` | DataDog API key | `...` |
| `DATADOG_APP_KEY` | DataDog app key | `...` |

---

## Database Setup

### Create Production Database

```bash
# Option 1: Railway PostgreSQL addon
railway add postgresql

# Option 2: External PostgreSQL (e.g., Supabase, AWS RDS)
# Use DATABASE_URL environment variable
```

### Run Migrations

```bash
# Navigate to API package
cd packages/api

# Run Prisma migrations
npx prisma migrate deploy

# Verify database schema
npx prisma db pull
```

### Seed Initial Data (Optional)

```bash
# Run seed script
npm run seed

# Or manually:
npx prisma db seed
```

### Database Backups

```bash
# Enable automatic backups in Railway
railway database backup enable --frequency daily --retention 30

# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup-20251115.sql
```

---

## Monitoring & Alerts

### Sentry Error Tracking

```bash
# Install Sentry SDK
cd packages/api
npm install @sentry/node

# Configure in packages/api/src/instrumentation.ts
# (Already implemented - just set SENTRY_DSN env var)
```

### DataDog Metrics

```bash
# Install DataDog agent
cd packages/api
npm install dd-trace

# Configure in packages/api/src/server.ts
# Set DATADOG_API_KEY environment variable
```

### Uptime Monitoring

1. Sign up at https://uptimerobot.com
2. Add monitors for:
   - API Health: `https://api.wcagai.com/health`
   - Webapp: `https://wcagai.com`
   - Demo: `https://aaj441.github.io/wcag-ai-platform/`
3. Configure alerts via email/SMS/Slack

### Custom Alerts

```javascript
// packages/api/src/services/monitoring.ts
import { alertOnHighErrorRate } from './alerting';

// Alert if error rate > 5%
if (errorRate > 0.05) {
  alertOnHighErrorRate(errorRate);
}
```

---

## Security Hardening

### 1. Enable Rate Limiting

```javascript
// packages/api/src/middleware/security.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### 2. Configure CORS

```javascript
// packages/api/src/server.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

### 3. Enable Helmet.js

```javascript
// packages/api/src/server.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));
```

### 4. Rotate Secrets Monthly

```bash
# Manual secret rotation
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
railway variables set JWT_SECRET="$(openssl rand -base64 64)"

# Automated rotation via GitHub Actions
# Workflow already configured in .github/workflows/rotate-secrets.yml
```

### 5. Enable HTTPS Only

```javascript
// packages/api/src/server.ts
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

## Post-Deployment Verification

### Automated Tests

```bash
# Run E2E tests against production
npm run test:e2e -- --baseUrl=https://api.wcagai.com

# Run accessibility tests
npm run test:a11y -- https://wcagai.com
```

### Manual Verification Checklist

- [ ] API health endpoint responds: `curl https://api.wcagai.com/health`
- [ ] Create scan: `POST /v1/scans` returns 201
- [ ] Get scan results: `GET /v1/scans/{id}` returns results
- [ ] Email sending works: Test consultant draft approval
- [ ] VPAT generation works: Generate sample report
- [ ] Webapp loads: Visit https://wcagai.com
- [ ] Demo site loads: Visit GitHub Pages URL
- [ ] Error tracking: Trigger test error, verify in Sentry
- [ ] Metrics: Check DataDog dashboard
- [ ] Uptime monitoring: Verify UptimeRobot is green

### Performance Benchmarks

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 https://api.wcagai.com/health

# Expected results:
# - Requests per second: > 100
# - Time per request: < 100ms
# - Failed requests: 0
```

### Security Scan

```bash
# Run OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.wcagai.com

# Run npm audit
cd packages/api && npm audit --production
cd packages/webapp && npm audit --production
```

---

## Rollback Procedures

### Quick Rollback (Railway)

```bash
# Rollback to previous deployment
railway rollback --service wcagai-api

# Or redeploy specific version
railway up --service wcagai-api --version v1.9.0
```

### Database Rollback

```bash
# Rollback last migration
npx prisma migrate reset --skip-seed

# Restore from backup
psql $DATABASE_URL < backup-20251115.sql
```

### Emergency Shutdown

```bash
# Stop all services
railway down --service wcagai-api --environment production
railway down --service wcagai-webapp --environment production

# Enable maintenance mode
railway variables set MAINTENANCE_MODE=true
```

---

## Troubleshooting

### API Not Responding

```bash
# Check Railway logs
railway logs --service wcagai-api --tail

# Check database connection
railway run --service wcagai-api "node -e 'require(\"./dist/lib/db\").testConnection()'"

# Restart service
railway restart --service wcagai-api
```

### High Error Rate

```bash
# Check Sentry for recent errors
open https://sentry.io/organizations/wcagai/issues/

# Check DataDog metrics
open https://app.datadoghq.com/dashboard/

# Review recent deployments
railway deployments --service wcagai-api
```

### Database Connection Issues

```bash
# Verify DATABASE_URL
railway variables get DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
railway run "node -e 'require(\"./dist/lib/db\").getPoolStats()'"
```

### Slow Performance

```bash
# Check database query performance
railway run "npx prisma studio"

# Review slow query log
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10"

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.wcagai.com/health
```

---

## Success Metrics

Track these KPIs post-deployment:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Uptime | > 99.9% | - | 🟡 Measuring |
| API Response Time | < 200ms (p95) | - | 🟡 Measuring |
| Error Rate | < 0.1% | - | 🟡 Measuring |
| Scan Success Rate | > 95% | - | 🟡 Measuring |
| WCAG Compliance | 100% AA | - | 🟡 Testing |
| Security Score | 10/10 | 8/10 | 🟡 In Progress |

---

## Production Deployment Flow

```
Local Development
    ↓
Feature Branch (claude/*)
    ↓
Pull Request + CI/CD Tests
    ↓
Code Review + Approval
    ↓
Merge to Main
    ↓
Automated Deployment to Staging
    ↓
Staging Verification (Manual)
    ↓
Manual Promotion to Production
    ↓
Production Verification
    ↓
Monitor for 24 hours
    ↓
Success! 🎉
```

---

## Next Steps After Deployment

1. **Week 1**: Monitor metrics, fix any production issues
2. **Week 2**: Optimize performance based on real user data
3. **Week 3**: Enable additional features (webhooks, batch scanning)
4. **Month 1**: Complete SOC 2 Type II audit
5. **Month 2**: Scale infrastructure based on load
6. **Month 3**: Launch marketing campaign

---

## Support

- **On-Call:** Use PagerDuty for critical alerts
- **Documentation:** https://docs.wcagai.com
- **Runbook:** This document + internal wiki
- **Team Chat:** Slack #wcagai-production channel

---

**Last Updated:** November 15, 2025
**Version:** 2.0.0
**Owner:** Platform Engineering Team
