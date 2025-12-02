# 🚀 WCAG AI Platform - Vercel Deployment Guide

## Quick Deploy (One-Click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aaj441/wcag-ai-platform&branch=feature/mobile-first-complete-implementation)

---

## 📋 Prerequisites

- [x] GitHub account
- [x] Vercel account (free tier works)
- [x] Code pushed to feature branch

---

## 🚀 Step 1: Deploy to Vercel

### Option A: One-Click Deploy (Easiest)

1. Click the deploy button above
2. Connect your GitHub account
3. Select repository: `aaj441/wcag-ai-platform`
4. Branch: `feature/mobile-first-complete-implementation`
5. Click **Deploy**
6. Wait 2-3 minutes for build
7. Done! Your site is live at `https://your-project.vercel.app`

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from project root
cd wcag-ai-platform
vercel

# Follow prompts:
# - Setup and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name? wcag-ai-platform
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

---

## 🔐 Step 2: Configure Environment Variables

### In Vercel Dashboard:

1. Go to your project
2. Settings → Environment Variables
3. Add these variables:

#### Required

```
NODE_ENV=production
CORS_ORIGIN=https://your-project.vercel.app
```

#### Optional (for future features)

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

4. Click **Save**
5. **Important:** Redeploy after adding variables

---

## ✅ Step 3: Verify Deployment

### Test Your Live Site

```bash
# Replace with your Vercel URL
PROD_URL="https://your-project.vercel.app"

# Test landing page
curl -I $PROD_URL
# Expected: 200 OK

# Test API health
curl $PROD_URL/api/health
# Expected: {"success":true,"status":"healthy",...}

# Test scanner page
curl -I $PROD_URL/app/scanner.html
# Expected: 200 OK
```

### Test Scanner Functionality

1. Visit `https://your-project.vercel.app/app/scanner.html`
2. Enter URL: `https://www.w3.org`
3. Click **Start Free Scan**
4. Wait for results (30-60 seconds)
5. Verify violations are displayed

---

## 📊 Step 4: Monitor Your Deployment

### Vercel Analytics (Built-in)

1. Go to your project dashboard
2. Click **Analytics** tab
3. View:
   - Page views
   - Unique visitors
   - Performance metrics
   - Error rates

### View Logs

```bash
# Via CLI
vercel logs --follow

# Or in dashboard:
# Deployments → Click deployment → View Function Logs
```

---

## 🌐 Step 5: Custom Domain (Optional)

### Add Your Domain

1. Go to Settings → Domains
2. Enter your domain: `wcag-scanner.com`
3. Click **Add**

### Configure DNS

**Option A: Use Vercel Nameservers (Recommended)**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Option B: Add DNS Records**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
```

4. Wait for DNS propagation (5-60 minutes)
5. SSL automatically provisioned by Vercel

### Update CORS

```bash
# In Vercel Dashboard → Environment Variables
CORS_ORIGIN=https://your-custom-domain.com
```

Redeploy after updating.

---

## 🔧 Troubleshooting

### Issue: API Routes Return 404

**Solution:**
```bash
# Check vercel.json routing
# Ensure this section exists:
{
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/server.js" }
  ]
}

# Redeploy
vercel --prod
```

### Issue: Scanner Timeout

**Problem:** Puppeteer timeouts on serverless

**Solution:** Use chrome-aws-lambda

```bash
# Add to backend/package.json
npm install chrome-aws-lambda puppeteer-core

# Update scanner.js to use chrome-aws-lambda
# See: https://github.com/alixaxel/chrome-aws-lambda
```

### Issue: CORS Errors

**Solution:**
```bash
# Verify CORS_ORIGIN matches exactly
# No trailing slash!
# ✅ https://your-domain.com
# ❌ https://your-domain.com/

# Update in Vercel dashboard
# Redeploy
```

### Issue: Environment Variables Not Working

**Solution:**
1. Check variables in Vercel Dashboard
2. **Must redeploy** after adding new variables
3. Variables take effect on next deployment

```bash
vercel --prod  # Force redeploy
```

---

## 📈 Performance Optimization

### Edge Functions (Already Configured)

- API routes run on Vercel Edge Network
- ~50ms global response times
- Auto-scaling

### Cache Control

```javascript
// backend/server.js
app.use('/consultant', express.static(path.join(__dirname, '../consultant-site'), {
  maxAge: '1d',
  etag: true
}));
```

### Analyze Bundle Size

```bash
# Check deployment size
vercel inspect <deployment-url>
```

---

## 🚨 Security Checklist

- [x] HTTPS enabled (automatic)
- [x] CORS configured
- [x] Rate limiting (express-rate-limit)
- [x] Helmet security headers
- [x] Input validation (express-validator)
- [ ] Add authentication (Phase 8)
- [ ] Add API keys (Phase 8)

---

## 💰 Cost Estimate

### Vercel Hobby Plan (FREE)
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Custom domains (100 max)
- ⚠️ Serverless execution: 100 hours/month

### When to Upgrade to Pro ($20/month)
- Need >100GB bandwidth
- Commercial use
- Team collaboration
- Advanced analytics
- Password protection

---

## 🔄 Rollback Procedure

### Via Dashboard
1. Deployments tab
2. Find previous working deployment
3. Click **...** → **Promote to Production**

### Via CLI
```bash
vercel ls                    # List deployments
vercel promote <url>         # Promote specific one
```

---

## 📋 Post-Deployment Checklist

- [ ] Site deployed successfully
- [ ] Landing page loads (`/`)
- [ ] Scanner page loads (`/app/scanner.html`)
- [ ] API health check works (`/api/health`)
- [ ] Scan functionality works
- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled
- [ ] Monitoring set up

---

## 🎯 Your Live URLs

After deployment:

```
Landing Page: https://your-project.vercel.app/
Scanner UI:   https://your-project.vercel.app/app/scanner.html
API Health:   https://your-project.vercel.app/api/health
API Scan:     POST https://your-project.vercel.app/api/scan
```

---

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Community**: https://github.com/vercel/vercel/discussions
- **Status**: https://vercel-status.com
- **Issues**: https://github.com/aaj441/wcag-ai-platform/issues

---

## Quick Commands

```bash
vercel              # Deploy preview
vercel --prod       # Deploy production
vercel logs         # View logs
vercel ls           # List deployments
vercel env pull     # Download env vars
vercel inspect <url> # Analyze deployment
```

---

**🎉 Congratulations! Your WCAG AI Platform is now live on Vercel!**

Next steps:
- Test the scanner with real websites
- Share the URL with users
- Monitor analytics and performance
- Iterate based on feedback
