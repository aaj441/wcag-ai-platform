# 🧪 WCAG AI Platform - Full-Stack Laboratory

## Overview

This laboratory is a complete, standalone version of the WCAG AI Platform for testing, development, and demonstrations. It includes all features from the main platform plus the keyword discovery workflow.

## 🚀 Quick Start

```bash
# From repository root
cd lab

# Install dependencies
npm run install:all

# Start development (both backend + frontend)
npm run dev

# Or start individually
npm run dev:backend  # Backend on :3001
npm run dev:frontend # Frontend on :5173
```

## 📦 What's Included

### Backend API
- ✅ Express + TypeScript
- ✅ All 17 production routes
- ✅ NEW: Keyword Discovery API
- ✅ Security middleware (Helmet, CORS, Rate Limiting)
- ✅ Health checks
- ✅ Error handling

### Frontend
- ✅ React + Vite + TypeScript
- ✅ 7 Major modules (Scanner, Discovery, Monitoring, Fixes, Demographics, Consultant, Billing)
- ✅ Professional UI with dark theme
- ✅ Real-time updates
- ✅ Export functionality

### Infrastructure
- ✅ Railway deployment ready
- ✅ Docker support
- ✅ Local development with hot reload
- ✅ Production builds

## 🎯 Key Features

### 1. Keyword Discovery Workflow (NEW)

Discover entire vertical markets:

```bash
POST /api/discovery/search
{
  "keywords": ["hospital", "healthcare"],
  "location": "Boston",
  "limit": 50
}
```

Returns:
- 50+ competitor websites
- TAM calculation
- Industry breakdown
- Estimated revenue

### 2. Bulk Scan Queue

Queue discovered sites for scanning:

```bash
POST /api/discovery/queue-batch
{
  "websites": [/* discovered sites */]
}
```

### 3. Complete API Coverage

- `/health` - Health checks
- `/api/scan` - WCAG scanning
- `/api/discovery` - Keyword-driven discovery
- `/api/violations` - Violation tracking
- `/api/fixes` - AI-generated fixes
- `/api/demographics` - Population analysis
- `/api/consultant` - Client management
- `/api/billing` - Subscription management

## 🚀 Railway Deployment

### From Lab Directory

```bash
cd lab

# Initialize Railway
railway init

# Add services
railway add --database postgres
railway add --database redis

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set FRONTEND_URL=https://your-lab.railway.app

# Deploy
railway up
```

### Environment Variables

Required:
- `NODE_ENV` - production
- `PORT` - 3001
- `FRONTEND_URL` - Your Railway URL

Optional:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `SERPAPI_KEY` - For real discovery
- `STRIPE_SECRET_KEY` - For billing features

## 🏗️ Architecture

```
lab/
├── backend/              # Express TypeScript API
│   ├── src/
│   │   ├── server.ts     # Main server
│   │   ├── routes/       # All API endpoints
│   │   │   ├── health.ts
│   │   │   ├── scan.ts
│   │   │   ├── discovery.ts  ← NEW
│   │   │   ├── violations.ts
│   │   │   ├── fixes.ts
│   │   │   ├── demographics.ts
│   │   │   ├── consultant.ts
│   │   │   └── billing.ts
│   │   └── types/
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── services/
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml    # Local dev stack
├── railway.json          # Railway config
└── package.json          # Root workspace
```

## 🔧 Development

### Prerequisites

- Node.js 20+
- npm 9+

### Local Development

```bash
# Terminal 1: Backend
cd lab/backend
npm run dev

# Terminal 2: Frontend
cd lab/frontend
npm run dev

# Or use concurrently from root
cd lab
npm run dev
```

### Build for Production

```bash
cd lab
npm run build:all

# Start production server
npm run start:prod
```

## 🧪 Testing

### Health Check

```bash
curl http://localhost:3001/health
```

### Discovery API

```bash
curl -X POST http://localhost:3001/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["healthcare"],
    "location": "New York",
    "limit": 10
  }'
```

## 📊 Comparison with Production

| Feature | Production (`/packages`) | Lab (`/lab`) |
|---------|-------------------------|---------------|
| Purpose | Production deployment | Testing/demos |
| Database | Required (Prisma) | Optional (mock data) |
| Auth | Clerk | Simulated |
| Monitoring | Sentry + Prom | Console logs |
| Complexity | Full enterprise stack | Simplified |
| Railway Ready | ✅ Yes | ✅ Yes |
| Keyword Discovery | ❌ Not implemented | ✅ Implemented |

## 🎯 Use Cases

1. **Local Development** - Test features without production setup
2. **Demos** - Show clients the full platform
3. **Training** - Onboard new developers
4. **Prototyping** - Try new features quickly
5. **CI/CD Testing** - Integration test environment

## 🔒 Security Notes

- Lab uses simplified security (no real auth)
- Don't use lab credentials in production
- Lab data is ephemeral (mock data only)
- API keys in `.env` are for lab only

## 📚 Additional Resources

- [Production Setup](../README.md)
- [Railway Deployment Guide](./RAILWAY_DEPLOY.md)
- [API Documentation](./API.md)
- [Architecture Decisions](./ARCHITECTURE.md)

---

**Questions?** Open an issue or check the main README.
