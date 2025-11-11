# Railway + Vercel Deployment Quickstart

**🚀 One-command deployment to production in under 10 minutes**

This guide covers the new Railway (backend) + Vercel (frontend) deployment workflow with comprehensive validation.

---

## Prerequisites (5 minutes)

```bash
# Install required CLIs
npm install -g @railway/cli vercel

# Authenticate
railway login
vercel login

# Install dependencies (if not already done)
npm install -g jq  # JSON parser
```

---

## 1. Dry Run Validation (2 minutes)

**Test everything without deploying:**

```bash
./deployment/scripts/deploy-dry-run.sh
```

**What it checks:**
- ✅ Node.js, npm, git, jq installed
- ✅ Railway/Vercel CLI authenticated
- ✅ Configuration files (railway.json, vercel.json)
- ✅ Package.json scripts
- ✅ Build process (API + webapp)
- ✅ All validator tests
- ✅ Git status

**Expected output:**
```
Success Rate: 95%+
✅ Ready for production deployment!
```

---

## 2. Full Production Deploy (6-8 minutes)

**One-command deployment:**

```bash
./deployment/scripts/deploy-production.sh
```

**12-Step Process:**
1. Prerequisites check
2. Git status validation
3. Configuration validation
4. Install dependencies
5. Run tests
6. Build API (TypeScript)
7. Build webapp (Vite)
8. Pre-deployment validation
9. 🚂 Deploy to Railway
10. ▲ Deploy to Vercel
11. Post-deployment validation
12. Generate deployment report

**Output:**
```
🎉 Deployment Complete!

🚂 Railway Backend:  https://wcagaii-production.up.railway.app
▲  Vercel Frontend: https://wcagaii.vercel.app

📊 Deployment Report: /tmp/wcagai-deployment-report-20241111-180000.md
```

---

## 3. Validate Deployment (2 minutes)

**Test Railway backend (50+ checks):**

```bash
./deployment/scripts/validate-railway.sh https://your-app.railway.app
```

**Checks:**
- Health endpoint (200 OK)
- Database connectivity
- Redis connectivity
- Performance (<1s)
- Security headers
- Error handling
- Prometheus metrics

**Target Score: 95%+**

---

**Test Vercel frontend (45+ checks):**

```bash
./deployment/scripts/validate-vercel.sh https://your-app.vercel.app
```

**Checks:**
- Frontend availability
- Security headers (4 minimum)
- Performance (<1s load)
- Asset optimization
- CDN/Edge network
- Accessibility
- SPA routing

**Target Score: 98%+**

---

## 4. Industry-Wide Testing (15-30 minutes)

**Test 20 sites across 10 industries:**

```bash
./deployment/tests/test-industry-sites.sh https://your-app.railway.app
```

**Industries:**
1. E-Commerce (Amazon, Shopify)
2. Financial Services (Chase, Stripe)
3. Healthcare (Mayo Clinic, CVS)
4. Education (Khan Academy, Coursera)
5. Government (USA.gov, IRS)
6. Media & News (NY Times, BBC)
7. SaaS Platforms (Salesforce, Slack)
8. Social Media (Twitter, LinkedIn)
9. Travel & Hospitality (Booking.com, Airbnb)
10. Entertainment (Netflix, YouTube)

**Output:**
- Beautiful HTML report with pass/fail/warning scores
- Per-industry breakdown
- Violation details
- Compliance scores

**View report:**
```bash
open /tmp/industry-wcag-results/industry-report.html
```

---

## Quick Reference

### All Scripts

```bash
# Validation (no deployment)
./deployment/scripts/deploy-dry-run.sh
./deployment/scripts/test-validators.sh

# Deployment
./deployment/scripts/deploy-production.sh

# Post-deployment validation
./deployment/scripts/validate-railway.sh https://your-app.railway.app
./deployment/scripts/validate-vercel.sh https://your-app.vercel.app

# Industry testing
./deployment/tests/test-industry-sites.sh https://your-app.railway.app

# Advanced
./deployment/scripts/migrate-safe.sh migration-name
./deployment/scripts/export-compliance.sh CLIENT_ID 2024-01-01 2024-12-31
./deployment/scripts/onboarding-simulator.sh
```

---

### Configuration Files

**Railway:** `packages/api/railway.json`
```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "sleepApplication": false
  },
  "healthcheck": {
    "path": "/health",
    "intervalSeconds": 30
  }
}
```

**Vercel:** `packages/webapp/vercel.json`
```json
{
  "framework": "vite",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {"key": "X-Content-Type-Options", "value": "nosniff"},
        {"key": "X-Frame-Options", "value": "DENY"},
        {"key": "X-XSS-Protection", "value": "1; mode=block"},
        {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"}
      ]
    }
  ]
}
```

---

### Environment Variables

**Railway (Backend):**
```bash
# Required
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
OPENAI_API_KEY=...

# Optional (Advanced Features)
DAILY_BUDGET_USD=100
MONTHLY_BUDGET_USD=3000
LAUNCHDARKLY_SDK_KEY=...
SENTRY_DSN=...
```

**Vercel (Frontend):**
```bash
VITE_API_URL=https://your-app.railway.app
VITE_ENVIRONMENT=production
```

---

### Troubleshooting

**Deployment fails:**
```bash
# Check logs
railway logs --service=wcagaii-backend
vercel logs

# Re-run validation
./deployment/scripts/validate-railway.sh https://your-app.railway.app
```

**Build fails:**
```bash
# Clean rebuild
rm -rf packages/*/node_modules packages/*/dist
npm install
cd packages/api && npm run build
cd packages/webapp && npm run build
```

**Tests fail:**
```bash
# Run validators locally
./deployment/scripts/test-validators.sh

# Check specific validator
bash -x ./deployment/scripts/validate-railway.sh http://localhost:8080
```

---

### Production Checklist

**Before deploying:**
- [ ] Run `./deployment/scripts/deploy-dry-run.sh`
- [ ] All tests passing
- [ ] Railway CLI authenticated
- [ ] Vercel CLI authenticated
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Team notified

**After deploying:**
- [ ] Run `./deployment/scripts/validate-railway.sh`
- [ ] Run `./deployment/scripts/validate-vercel.sh`
- [ ] Run `./deployment/tests/test-industry-sites.sh`
- [ ] Monitor error rates (1 hour)
- [ ] Check performance metrics
- [ ] Test critical user flows

---

## Next Steps

1. **Set up monitoring:** Configure PagerDuty alerts (see main README.md)
2. **Enable CI/CD:** GitHub Actions workflows already configured
3. **Configure autoscaling:** Adjust Railway replica settings
4. **Set up backups:** Database backups via Railway
5. **Review audit:** See `DEPLOYMENT_AUDIT_RAILWAY_VERCEL.md`

---

**Questions?** See full deployment guide: `deployment/README.md`

**Platform:** WCAG AI Platform v2.0
**Updated:** 2025-11-11
