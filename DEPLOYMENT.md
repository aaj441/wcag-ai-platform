# 🚀 Production Deployment Guide

Complete guide to deploy the WCAG AI Platform to production with all security features enabled.

## 📋 Prerequisites

- [x] All security fixes merged to main branch
- [x] Railway account created
- [x] PostgreSQL database provisioned
- [x] Domain name configured (for CORS)
- [x] Production secrets generated

---

## 🔐 Step 1: Generate Production Secrets

```bash
# Generate JWT Secret (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Webhook Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save these securely!** You'll need them in Step 3.

---

## 🔀 Step 2: Merge Security Fixes

```bash
# Ensure you're on main branch
git checkout main

# Merge the security fixes
git merge claude/fix-security-issues-01K3e2LwsNqMopDUDmGmr7vD

# Push to GitHub
git push origin main

# Tag the release
git tag -a v1.0.0-security-hardened -m "Production-ready with all security fixes"
git push origin v1.0.0-security-hardened
```

---

## 🚂 Step 3: Configure Railway

### A. Add Environment Variables

Go to Railway Dashboard → Your Project → Variables tab and add:

#### Required Variables

```bash
JWT_SECRET=<your-generated-secret-from-step-1>
CORS_ORIGIN=https://your-frontend-domain.com
NODE_ENV=production
DATABASE_URL=<provided-by-railway-postgres>
```

#### Optional but Recommended

```bash
WEBHOOK_SECRET=<your-webhook-secret-from-step-1>
API_RATE_LIMIT=100
LOG_LEVEL=info
OPENAI_API_KEY=<your-openai-key-if-using-ai-features>
SENTRY_DSN=<your-sentry-dsn-if-using-sentry>
```

### B. Deploy

Railway will automatically deploy when you push to main. Monitor the deployment:

```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login
railway login

# View logs
railway logs --tail
```

---

## ✅ Step 4: Verify Deployment

### A. Basic Health Check

```bash
# Replace with your Railway URL
PROD_URL="https://your-project.up.railway.app"

# Test health endpoint
curl $PROD_URL/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### B. Security Headers Check

```bash
curl -I $PROD_URL/health | grep -E "Strict-Transport|X-Frame|Content-Security"
```

Expected headers:
- ✅ `Strict-Transport-Security: max-age=31536000`
- ✅ `X-Frame-Options: DENY`
- ✅ `Content-Security-Policy: default-src 'self'`
- ✅ `X-Content-Type-Options: nosniff`

### C. Run Full Security Test Suite

```bash
cd packages/api

# Test against production
API_URL=$PROD_URL \
JWT_SECRET=<your-production-jwt-secret> \
./scripts/test-security.sh
```

Expected: **80%+ pass rate** ✅

### D. Test JWT Authentication

```bash
# Generate a test token
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 'test-user', email: 'test@example.com', role: 'admin' },
  '<your-production-jwt-secret>',
  { expiresIn: '1h' }
);
console.log('Test Token:', token);
"

# Test authenticated endpoint
curl -H "Authorization: Bearer <token-from-above>" \
  $PROD_URL/api/drafts
```

---

## 📊 Step 5: Set Up Monitoring

### A. Uptime Monitoring (UptimeRobot)

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Create free account
3. Add HTTP(s) monitor
4. URL: `https://your-project.up.railway.app/health`
5. Interval: 5 minutes
6. Add email/SMS alerts

### B. Error Tracking (Sentry)

If using Sentry:
```bash
# Add Sentry DSN to Railway variables
SENTRY_DSN=https://your-key@sentry.io/project
```

### C. Log Monitoring

```bash
# View production logs
railway logs --tail

# Look for security events:
# - "rate_limit_exceeded"
# - "invalid_jwt_token"
# - "validation_failed"
# - "ssrf_attempt_blocked"
```

---

## 🔒 Step 6: Security Verification Checklist

Run through this checklist:

```bash
# 1. Health check returns 200
curl -s -o /dev/null -w "%{http_code}" $PROD_URL/health
# Expected: 200

# 2. Rate limiting works (should get 429 after 100 requests)
for i in {1..105}; do
  curl -s -o /dev/null -w "%{http_code}\n" $PROD_URL/api/drafts
  sleep 0.1
done
# Expected: See 429 after ~100 requests

# 3. CORS blocks unauthorized origins
curl -H "Origin: https://evil.com" -I $PROD_URL/api/drafts
# Expected: No Access-Control-Allow-Origin header

# 4. JWT required for protected endpoints
curl -s $PROD_URL/api/drafts
# Expected: 401 or 200 (depending on if endpoint is protected)

# 5. Invalid JWT rejected
curl -H "Authorization: Bearer invalid.token.here" -s $PROD_URL/api/drafts
# Expected: 401 with error message

# 6. Input validation works
curl -X POST $PROD_URL/api/drafts \
  -H "Content-Type: application/json" \
  -d '{"recipient":"not-an-email","subject":"Test","body":"Test"}' \
  -s | jq .
# Expected: 400 with validation error
```

---

## 🎯 Step 7: Configure Domain (Optional)

### A. Custom Domain Setup

In Railway:
1. Go to Settings → Domains
2. Add custom domain: `api.yourdomain.com`
3. Add DNS records as shown
4. Wait for SSL certificate

### B. Update Environment Variables

```bash
# Update CORS_ORIGIN to match your frontend
CORS_ORIGIN=https://app.yourdomain.com
```

---

## 🚨 Troubleshooting

### Issue: 500 Internal Server Error

```bash
# Check Railway logs
railway logs

# Common causes:
# - JWT_SECRET not set
# - DATABASE_URL incorrect
# - CORS_ORIGIN misconfigured
```

### Issue: CORS Errors

```bash
# Verify CORS_ORIGIN matches frontend exactly
echo $CORS_ORIGIN
# Should be: https://your-frontend.com (no trailing slash)

# Update in Railway dashboard
CORS_ORIGIN=https://your-exact-frontend-domain.com
```

### Issue: JWT Authentication Failing

```bash
# Verify JWT_SECRET is set in Railway
# Generate test token with production secret
# Check token isn't expired
```

### Issue: Database Connection Fails

```bash
# Railway provides DATABASE_URL automatically
# Check it's set: railway variables

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

---

## 📈 Post-Deployment Tasks

### Immediate (Day 1)

- [ ] Verify all endpoints return correct status codes
- [ ] Test authentication flow end-to-end
- [ ] Verify rate limiting works
- [ ] Check logs for errors
- [ ] Set up uptime monitoring

### Week 1

- [ ] Monitor error rates in Sentry
- [ ] Check for authentication failures
- [ ] Review security event logs
- [ ] Verify backups are running
- [ ] Load test critical endpoints

### Ongoing

- [ ] Weekly: Review security logs
- [ ] Monthly: Run security test suite
- [ ] Monthly: Update dependencies (`npm audit`)
- [ ] Quarterly: Rotate JWT_SECRET (optional)
- [ ] Quarterly: Security audit

---

## 🔄 Rollback Procedure

If something goes wrong:

```bash
# 1. Check Railway logs for errors
railway logs --tail

# 2. Rollback to previous deployment
# Railway Dashboard → Deployments → Click previous deployment → "Redeploy"

# 3. Or rollback via CLI
railway rollback

# 4. Verify health
curl https://your-project.up.railway.app/health
```

---

## 📞 Support

- **Security Issues:** Open GitHub issue with `[SECURITY]` tag
- **Deployment Issues:** Check Railway docs or support
- **Bug Reports:** GitHub Issues

---

## ✅ Deployment Checklist

Before marking deployment complete:

- [ ] Security fixes merged to main
- [ ] Production secrets generated and saved
- [ ] Railway environment variables configured
- [ ] Deployed successfully (no errors in logs)
- [ ] Health endpoint returns 200
- [ ] Security headers present
- [ ] Rate limiting working
- [ ] JWT authentication enabled
- [ ] CORS properly configured
- [ ] Security test suite passing (80%+)
- [ ] Monitoring/alerts configured
- [ ] Documentation updated
- [ ] Team notified of production URL

---

**Congratulations! Your WCAG AI Platform is now production-ready with enterprise-grade security! 🎉**
