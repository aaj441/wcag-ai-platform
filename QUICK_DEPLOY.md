# ⚡ WCAGAI Quick Deploy Guide

**TL;DR:** 4 commands to production

---

## 🚀 Deploy Now (15 Minutes)

### 1. Pre-Flight (5 min)

```bash
# Install dependencies
cd packages/api && npm install

# Build
npm run build

# Apply database indexes
npx prisma db execute --file prisma/migrations/performance_indexes.sql

# Verify
curl http://localhost:8080/health
```

---

### 2. Deploy to Staging (5 min)

```bash
# Railway
railway up --environment staging

# Vercel (webapp)
cd packages/webapp && vercel --prod --env staging

# Test
curl https://staging.wcagai.com/health/detailed | jq
```

---

### 3. Run Stress Test (5 min)

```bash
cd packages/api

# Quick test
tsx stress-tests/memory-leak-detector.ts

# Expected: ✅ PASSED
```

---

### 4. Deploy to Production (2 min)

```bash
# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Deploy
railway up --environment production

# Verify
curl https://api.wcagai.com/health
```

---

## 🎯 Success = All Green

```bash
curl https://api.wcagai.com/health/detailed | jq

# Expected:
{
  "status": "healthy",           ✅
  "circuitBreakers": {
    "healthy": true              ✅
  },
  "queue": {
    "capacity": "healthy"        ✅
  }
}
```

---

## 🔄 Rollback (if needed)

```bash
railway rollback
```

---

## 📊 Monitor

- **Logs:** `railway logs --follow`
- **Sentry:** https://sentry.io
- **Metrics:** `/health/detailed`

---

**That's it! You're live.** 🎉
