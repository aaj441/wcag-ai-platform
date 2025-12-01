# InfinitySoul Platform Deployment Guide

Complete deployment guide for the InfinitySoul WCAG compliance platform.

## Architecture Overview

```
┌─────────────────┐
│   Vercel Edge   │  ← Next.js 14 Frontend
│   (Frontend)    │     apps/web/
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vercel Functions│  ← Serverless API
│   (API Routes)   │     apps/api/
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────┐
│ Neon   │ │Upstash│
│Postgres│ │ Redis │
└────────┘ └──────┘
```

## Prerequisites

- [ ] GitHub account with repository access
- [ ] Vercel account (free tier works for MVP)
- [ ] Neon PostgreSQL database (free tier)
- [ ] Upstash Redis (free tier)
- [ ] Google Gemini API key

## Step 1: Database Setup (Neon PostgreSQL)

### 1.1 Create Database

1. Go to [neon.tech](https://neon.tech)
2. Sign up or log in
3. Create new project: "infinitysoul-production"
4. Select region closest to your users
5. Copy the connection string

### 1.2 Configure Database

```bash
# Set DATABASE_URL in your .env
DATABASE_URL="postgresql://user:password@host.neon.tech/infinitysoul?sslmode=require"

# Run migrations
cd packages/db
pnpm db:generate
pnpm db:migrate:deploy

# Optional: Seed database with demo data
pnpm db:seed
```

## Step 2: Redis Setup (Upstash)

### 2.1 Create Redis Instance

1. Go to [upstash.com](https://upstash.com)
2. Sign up or log in
3. Create new Redis database
4. Name: "infinitysoul-queue"
5. Select region closest to your Vercel deployment
6. Copy the Redis URL

### 2.2 Configure Redis

```bash
# Set REDIS_URL in your .env
REDIS_URL="redis://default:password@host.upstash.io:6379"
```

## Step 3: AI Integration (Google Gemini)

### 3.1 Get API Key

1. Go to [ai.google.dev](https://ai.google.dev)
2. Sign in with Google account
3. Create API key for Gemini
4. Copy the API key

### 3.2 Configure Gemini

```bash
# Set GEMINI_API_KEY in your .env
GEMINI_API_KEY="AIza..."
```

## Step 4: Vercel Deployment

### 4.1 Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository: `aaj441/WCAGAI`
3. Select branch: `claude/add-comprehensive-tests-01R21Hx316ruFHUGu8fWdYT9`
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm build:infinitysoul`
   - **Install Command**: `pnpm install`

### 4.2 Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# Required
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GEMINI_API_KEY=AIza...
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Optional
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
QUEUE_CONCURRENCY=5
NODE_ENV=production
```

### 4.3 Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit your deployment URL

## Step 5: Post-Deployment Verification

### 5.1 Health Check

```bash
# Check API health
curl https://your-domain.vercel.app/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-12-01T13:00:00.000Z",
  "uptime": 123,
  "environment": "production"
}
```

### 5.2 Test Scan Submission

```bash
# Submit a test scan
curl -X POST https://your-domain.vercel.app/api/scans \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "wcagLevel": "AA",
    "scanType": "FULL"
  }'

# Expected response:
{
  "success": true,
  "data": {
    "scanId": "...",
    "status": "QUEUED",
    "url": "https://example.com",
    "wcagLevel": "AA"
  }
}
```

## Step 6: Custom Domain (Optional)

### 6.1 Add Domain in Vercel

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain: `infinitysoul.com`
3. Configure DNS records as instructed

### 6.2 SSL Certificate

Vercel automatically provisions SSL certificates via Let's Encrypt.

## Step 7: Monitoring & Logging

### 7.1 Vercel Analytics

1. Enable Analytics in Vercel Dashboard
2. Monitor page views, performance, and Web Vitals

### 7.2 Error Tracking (Optional)

Consider integrating:
- **Sentry**: Error tracking and performance monitoring
- **LogTail**: Centralized logging
- **Uptime Robot**: Uptime monitoring

## Step 8: CI/CD Pipeline

### 8.1 Automatic Deployments

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

### 8.2 Pre-Deployment Checks

Add GitHub Actions workflow:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm type-check
      - run: pnpm test
```

## Troubleshooting

### Build Failures

**Issue**: "Module not found" errors
**Solution**: Ensure all dependencies are in package.json and run `pnpm install`

**Issue**: TypeScript errors
**Solution**: Run `pnpm type-check` locally to identify issues

### Runtime Errors

**Issue**: Database connection fails
**Solution**: Verify DATABASE_URL is correct and includes `?sslmode=require`

**Issue**: Redis connection timeout
**Solution**: Check REDIS_URL format and Upstash instance is running

### Performance Issues

**Issue**: Slow API responses
**Solution**:
- Check Redis connection
- Increase Vercel function timeout
- Review database query performance

## Production Checklist

- [ ] Database migrations deployed
- [ ] All environment variables set in Vercel
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Health check endpoint responding
- [ ] Test scan submission working
- [ ] Error tracking configured
- [ ] Monitoring enabled
- [ ] Backup strategy in place
- [ ] Security headers configured

## Scaling Considerations

### Current Setup (Free Tier)
- **Neon**: 10 GB storage, 100 hours compute/month
- **Upstash**: 10K commands/day
- **Vercel**: 100 GB bandwidth, 100 GB-hours compute

### Upgrade Triggers
- > 5K scans/month → Upgrade Neon to Pro ($19/mo)
- > 100K queue jobs/month → Upgrade Upstash to Pro ($10/mo)
- > 100 GB bandwidth → Upgrade Vercel to Pro ($20/mo)

## Cost Estimate

| Service | Free Tier | Pro Tier | Enterprise |
|---------|-----------|----------|------------|
| Vercel  | $0        | $20/mo   | Custom     |
| Neon    | $0        | $19/mo   | $69/mo     |
| Upstash | $0        | $10/mo   | $30/mo     |
| **Total** | **$0**  | **$49/mo** | **$100+/mo** |

## Support

For deployment assistance:
- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Upstash Documentation](https://upstash.com/docs)

---

**Last Updated**: December 2024
**Version**: 2.0.0
