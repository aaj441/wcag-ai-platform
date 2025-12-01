# InfinitySoul Platform - Quick Start Guide

## 🎯 You're Ready to Launch!

All systems are verified and ready. Here's your quick start guide to get the platform running.

---

## ✅ What's Been Verified

### Frontend (`apps/web/`)
- ✅ Next.js 14 configuration
- ✅ Hero component with value proposition
- ✅ ScanForm component with validation
- ✅ Tailwind CSS setup
- ✅ TypeScript configuration
- ✅ All dependencies configured

### Backend (`apps/api/`)
- ✅ Express server with security middleware
- ✅ API routes for scan submission
- ✅ Authentication middleware
- ✅ Rate limiting with Redis
- ✅ Queue worker for scan processing
- ✅ Winston logging
- ✅ All dependencies configured

### Scanner (`packages/scanner/`)
- ✅ WCAG scanner engine (342 lines)
- ✅ AI analyzer with Gemini integration
- ✅ Confidence scoring engine
- ✅ Queue management with BullMQ
- ✅ Type definitions

### Database (`packages/db/`)
- ✅ Prisma schema (224 lines)
- ✅ Multi-tenant architecture
- ✅ User, Tenant, Scan, Violation models
- ✅ Audit logging
- ✅ Seed data ready

### Deployment
- ✅ Vercel configuration
- ✅ Deployment scripts
- ✅ Comprehensive documentation
- ✅ Environment templates

---

## 🚀 Launch Instructions

### Option 1: Local Development (Recommended First)

```bash
# 1. Set up environment variables
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your credentials

# 2. Install dependencies
pnpm install

# 3. Set up database
pnpm db:generate
pnpm db:push
pnpm db:seed

# 4. Run both frontend and backend (separate terminals)
# Terminal 1 - Backend API
pnpm dev:infinitysoul-api

# Terminal 2 - Frontend
pnpm dev:infinitysoul

# 5. Visit http://localhost:3000
```

### Option 2: Deploy to Production

```bash
# 1. Make sure you have:
# - Neon PostgreSQL database URL
# - Upstash Redis URL
# - Google Gemini API key
# - Vercel account connected

# 2. Run deployment script
pnpm deploy:prod

# Or use the manual script:
./deployment/scripts/deploy.sh production
```

---

## 🔑 Required Environment Variables

Create `apps/api/.env` with:

```env
# Database (from Neon)
DATABASE_URL="postgresql://user:pass@host.neon.tech/infinitysoul?sslmode=require"

# Redis (from Upstash)
REDIS_URL="redis://default:pass@host.upstash.io:6379"

# AI (from Google)
GEMINI_API_KEY="AIza..."

# App Config
NEXT_PUBLIC_APP_URL="http://localhost:3000"
PORT=3001
NODE_ENV=development

# Optional
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
QUEUE_CONCURRENCY=5
```

---

## 📊 Platform Architecture

```
┌─────────────────────────────────────────────┐
│         Next.js 14 Frontend                 │
│    http://localhost:3000                    │
│  • Hero landing page                        │
│  • Scan submission form                     │
│  • Real-time status updates                 │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Express API Server                  │
│    http://localhost:3001                    │
│  • POST /api/scans (submit)                 │
│  • GET /api/scans/:id (status)              │
│  • GET /api/scans/:id/results               │
│  • GET /health (health check)               │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│  PostgreSQL  │    │   Redis/BullMQ   │
│  (Database)  │    │  (Queue/Cache)   │
│  • Users     │    │  • Scan jobs     │
│  • Tenants   │    │  • Rate limits   │
│  • Scans     │    │  • Sessions      │
│  • Violations│    └──────────────────┘
└──────────────┘
```

---

## 🧪 Testing the Platform

### 1. Health Check
```bash
curl http://localhost:3001/health

# Expected:
{
  "status": "ok",
  "timestamp": "2024-12-01T14:00:00.000Z",
  "uptime": 123,
  "environment": "development"
}
```

### 2. Submit a Scan
```bash
curl -X POST http://localhost:3001/api/scans \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "wcagLevel": "AA",
    "scanType": "FULL"
  }'

# Expected:
{
  "success": true,
  "data": {
    "scanId": "clx...",
    "status": "QUEUED",
    "url": "https://example.com",
    "wcagLevel": "AA",
    "estimatedCompletionTime": "2024-12-01T14:05:00.000Z"
  }
}
```

### 3. Check Scan Status
```bash
curl http://localhost:3001/api/scans/{scanId}

# Expected:
{
  "success": true,
  "data": {
    "scanId": "clx...",
    "status": "PROCESSING",
    "progress": 45
  }
}
```

---

## 📦 Available Scripts

### Development
```bash
pnpm dev                      # Run all packages in dev mode
pnpm dev:infinitysoul         # Run frontend only
pnpm dev:infinitysoul-api     # Run API only
```

### Building
```bash
pnpm build:infinitysoul       # Build everything
pnpm build:scanner            # Build scanner package
pnpm build:web                # Build frontend
pnpm build:infinitysoul-api   # Build API
```

### Database
```bash
pnpm db:generate              # Generate Prisma client
pnpm db:migrate               # Run migrations
pnpm db:push                  # Push schema to DB
pnpm db:studio                # Open Prisma Studio
pnpm db:seed                  # Seed demo data
```

### Deployment
```bash
pnpm deploy                   # Deploy to preview
pnpm deploy:prod              # Deploy to production
```

---

## 🎯 Key Features Ready to Use

### For End Users
- ✅ Submit WCAG scans via beautiful UI
- ✅ Real-time scan progress tracking
- ✅ AI-powered violation analysis
- ✅ Confidence scoring
- ✅ Executive summaries

### For Developers
- ✅ Full TypeScript type safety
- ✅ Hot reload in development
- ✅ Structured logging
- ✅ Database migrations
- ✅ Queue-based processing

### For Operations
- ✅ Health check endpoints
- ✅ Rate limiting (100 req/15min)
- ✅ Multi-tenant isolation
- ✅ Audit logging
- ✅ Scalable architecture

### For Business
- ✅ Subscription plans (FREE, BASIC, PRO, ENTERPRISE)
- ✅ Usage tracking
- ✅ Stripe integration ready
- ✅ Industry targeting (Fintech, Healthcare, Debt Collection)

---

## 📚 Documentation

- **Deployment Guide**: `deployment/DEPLOYMENT.md`
- **Platform Overview**: `README-INFINITYSOUL.md`
- **Prisma Schema**: `packages/db/prisma/schema.prisma`
- **API Routes**: `apps/api/src/routes/scans.ts`

---

## 🆘 Troubleshooting

### "Cannot find module '@infinitysoul/scanner'"
```bash
# Generate Prisma client and rebuild
pnpm db:generate
pnpm build:scanner
```

### "Connection refused" on Redis
```bash
# Make sure Redis URL is correct in .env
# For local development, start Redis:
docker run -d -p 6379:6379 redis:7-alpine
```

### "Database connection failed"
```bash
# Verify DATABASE_URL in .env
# Ensure it includes ?sslmode=require for Neon
# Push schema:
pnpm db:push
```

### "Rate limit exceeded"
```bash
# This is expected - rate limiting is working!
# Wait 15 minutes or adjust RATE_LIMIT_MAX_REQUESTS in .env
```

---

## 🎉 You're Ready!

The InfinitySoul platform is fully configured and ready to launch.

**Next Steps:**
1. Set up your environment variables
2. Run `pnpm install`
3. Set up your database with `pnpm db:generate && pnpm db:push`
4. Start both servers: `pnpm dev:infinitysoul-api` and `pnpm dev:infinitysoul`
5. Visit `http://localhost:3000` and submit your first scan!

**Need help?** Check `deployment/DEPLOYMENT.md` for comprehensive setup instructions.

---

**Built with ❤️ for accessibility compliance at scale**
