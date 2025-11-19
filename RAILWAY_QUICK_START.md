# Railway Quick Start Guide - WCAG AI Platform

**Goal**: Get your app deployed to Railway in under 30 minutes.

---

## 🚀 Prerequisites

1. **Railway Account**: Sign up at https://railway.app
2. **GitHub Repository**: Your code must be in GitHub
3. **Railway CLI** (optional but recommended):
   ```bash
   npm i -g @railway/cli
   railway login
   ```

---

## ⚡ Quick Deploy (5 Steps)

### Step 1: Create Railway Project

**Option A: Via Dashboard**
1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select `aaj441/wcag-ai-platform`
4. Click "Deploy Now"

**Option B: Via CLI**
```bash
cd wcag-ai-platform
railway init
railway link
```

### Step 2: Add PostgreSQL Database

**Via Dashboard**:
1. Click "+ New" in your project
2. Select "Database"
3. Choose "PostgreSQL"
4. Wait for provisioning (~30 seconds)

**Via CLI**:
```bash
railway add postgresql
```

### Step 3: Add Redis (Optional but Recommended)

**Via Dashboard**:
1. Click "+ New"
2. Select "Database"
3. Choose "Redis"

**Via CLI**:
```bash
railway add redis
```

### Step 4: Set Environment Variables

**Required Variables**:
```bash
railway variables set NODE_ENV=production
railway variables set PORT=3001
```

**Optional but Recommended**:
```bash
railway variables set OPENAI_API_KEY=your-key-here
railway variables set ANTHROPIC_API_KEY=your-key-here
railway variables set CLERK_SECRET_KEY=your-key-here
railway variables set STRIPE_SECRET_KEY=your-key-here
```

**Via Dashboard**:
1. Go to your service
2. Click "Variables"
3. Add each variable

### Step 5: Deploy!

**Via Dashboard**:
- Railway auto-deploys on push to main branch
- Or click "Deploy" button

**Via CLI**:
```bash
railway up
```

---

## ✅ Verify Deployment

### Check Health Endpoint
```bash
# Get your Railway URL
railway domain

# Test health endpoint
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### Check Logs
```bash
# Via CLI
railway logs

# Via Dashboard
# Click "Deployments" → "View Logs"
```

---

## 🔧 Common Issues & Fixes

### Issue 1: Build Fails

**Error**: `Cannot find module 'dist/server.js'`

**Fix**:
```bash
# Check if build script exists
cat packages/api/package.json | grep "build"

# Should see:
# "build": "prisma generate && tsc"
```

If missing, update `packages/api/package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && tsc",
    "start": "node dist/server.js"
  }
}
```

### Issue 2: Database Connection Failed

**Error**: `Can't reach database server`

**Fix**:
1. Check DATABASE_URL is set:
   ```bash
   railway variables
   ```
2. Verify PostgreSQL is running:
   ```bash
   railway status
   ```
3. Check Prisma schema:
   ```bash
   cat packages/api/prisma/schema.prisma
   ```

### Issue 3: Port Binding Error

**Error**: `EADDRINUSE: address already in use`

**Fix**: Update `packages/api/src/server.ts`:
```typescript
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Issue 4: Health Check Timeout

**Error**: `Health check failed after 300s`

**Fix**: Increase timeout in `railway.toml`:
```toml
[deploy]
healthcheckTimeout = 600
```

### Issue 5: Prisma Client Not Generated

**Error**: `@prisma/client did not initialize yet`

**Fix**: Add postinstall script to `packages/api/package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

---

## 🎉 Success!

If you see this in your logs:
```
✅ Database ready!
🚀 Starting server...
🚀 Server running on port 3001
```

**Congratulations! Your app is live on Railway! 🎊**

Access it at: `https://your-app.railway.app`

---

**Last Updated**: November 18, 2025  
**Deployment Time**: ~15-30 minutes  
**Difficulty**: Easy ⭐⭐☆☆☆