# WCAG AI Platform - Quick Reference Guide

## Key Facts at a Glance

### Project Structure
- **Monorepo:** Managed with npm workspaces
- **Backend:** `/packages/api` - Express.js + TypeScript + Prisma
- **Frontend:** `/packages/webapp` - React 18 + Vite + TypeScript
- **Database:** PostgreSQL (Prisma ORM)
- **Deployment:** Docker containers, Railway/Vercel

### Database Schema Location
```
/home/user/wcag-ai-platform/packages/api/prisma/schema.prisma
```
**Models:** 19 total (4 for demographic targeting, 6 for WCAG compliance, 9 other)

### API Server
```
Location:    /home/user/wcag-ai-platform/packages/api/src/server.ts
Port:        3001 (configurable)
Framework:   Express.js 4.18.2
TypeScript:  5.3.3
```

### Frontend App
```
Location:    /home/user/wcag-ai-platform/packages/webapp/src/
Framework:   React 18.2.0
Build Tool:  Vite 5.4.21
Styling:     Tailwind CSS
```

### Current Demographic Targeting System

#### Routes (11 endpoints)
```
GET  /api/demographics/metros                    ← List 350+ metros
GET  /api/demographics/metros/:metroId
GET  /api/demographics/industries
POST /api/demographics/discover                  ← Discover prospects
POST /api/demographics/discover-batch
POST /api/demographics/score-risk                ← Risk calculation
POST /api/demographics/recommendations
POST /api/demographics/batch-audit               ← Start WCAG audits
GET  /api/demographics/batch-audit/:jobId        ← Check status
GET  /api/demographics/batch-audit/:jobId/results
GET  /api/demographics/analytics/*
```

#### Services (3 main)
1. **ProspectDiscoveryService** - Find leads via Google + directories
2. **RiskScoringService** - Calculate lawsuit probability (35/35/20/10 weights)
3. **BatchAuditService** - Parallel Puppeteer WCAG audits (in-memory queue, 4 concurrent)

#### Database Models (5 related)
1. **Metro** - 350+ US metros with lawsuit trends
2. **IndustryProfile** - Industry verticals per metro with risk levels
3. **Prospect** - Target companies discovered
4. **AccessibilityAudit** - WCAG scan results
5. **OutreachEmail** - Email tracking and engagement

#### Frontend Component
```
/packages/webapp/src/components/demographics/MetroSelector.tsx
```
- Metro selection grid
- Industry filtering
- Campaign summary
- Batch audit/recommendation triggers

### Job Processing
**Status:** In-memory (no external queue)
- BatchAuditService stores jobs in Map<string, AuditJob>
- Async processing with Promise-based concurrency
- Jobs lost on server restart
- Good for MVP, needs persistence for production

### Important Directories

#### API Backend
```
/packages/api/src/
├── routes/              ← Add new API endpoints here
├── services/            ← Add business logic (21 services)
├── middleware/          ← Auth, RBAC, logging
├── lib/                 ← Database connection (Prisma singleton)
├── data/                ← Static data (350+ metros)
├── utils/               ← Logging, metrics
└── server.ts            ← Express app setup
```

#### Frontend
```
/packages/webapp/src/
├── components/          ← React components
├── services/            ← API client logic
├── types/               ← TypeScript interfaces
├── utils/               ← Helpers
├── App.tsx              ← Root component
└── main.tsx             ← Entry point
```

#### Database
```
/packages/api/
├── prisma/
│   └── schema.prisma    ← All data models
├── Dockerfile           ← Container config
└── .env.example         ← Environment template
```

### Tech Stack Summary

| Layer | Tech | Version |
|-------|------|---------|
| Runtime | Node.js | 20.x |
| API Framework | Express | 4.18.2 |
| Frontend Framework | React | 18.2.0 |
| Build Tool | Vite | 5.4.21 |
| ORM | Prisma | 5.7.1 |
| Database | PostgreSQL | 14+ |
| Language | TypeScript | 5.3.3 |
| Auth | Clerk | 4.13.23 |
| Email | SendGrid | 8.1.6 |
| Payments | Stripe | 19.3.1 |
| Web Scraping | Puppeteer | 24.29.1 |
| Error Tracking | Sentry | 10.25.0 |
| Logging | Winston | 3.11.0 |
| Monitoring | OpenTelemetry | 1.19.0 |

### Environment Variables (Required)
```
DATABASE_URL              # PostgreSQL connection
NODE_ENV                  # development|production
PORT                      # API port (default 3001)
CLERK_PUBLISHABLE_KEY     # Auth
CLERK_SECRET_KEY          # Auth
SENDGRID_API_KEY          # Email
STRIPE_SECRET_KEY         # Billing
AWS_S3_BUCKET             # File storage
SENTRY_DSN                # Error tracking
OPENAI_API_KEY            # AI/LLM
```

### How to Add New Demographic Components

1. **Extend Database**
   ```
   vi /packages/api/prisma/schema.prisma
   npx prisma migrate dev --name description
   ```

2. **Add Service Logic**
   ```
   vi /packages/api/src/services/NewService.ts
   
   export class NewService {
     static async methodName(params): Promise<Result> {
       // Use prisma for DB access
       // Use log.info/error from '../utils/logger'
     }
   }
   ```

3. **Create API Route**
   ```
   vi /packages/api/src/routes/new.ts
   
   router.post('/endpoint', async (req, res) => {
     const result = await NewService.methodName(req.body);
     res.json({ success: true, data: result });
   });
   ```

4. **Register in Server**
   ```
   vi /packages/api/src/server.ts
   import newRouter from './routes/new';
   app.use('/api/new', newRouter);
   ```

5. **Create Frontend Component**
   ```
   vi /packages/webapp/src/components/NewComponent.tsx
   
   export function NewComponent() {
     const [data, setData] = useState([]);
     useEffect(() => {
       axios.get('/api/new').then(r => setData(r.data.data));
     }, []);
     return <div>{/* UI */}</div>;
   }
   ```

### Key Files for Implementation

- **Schema:** `/packages/api/prisma/schema.prisma` (673 lines)
- **Demographics Route:** `/packages/api/src/routes/demographics.ts` (457 lines)
- **Target Demographics Route:** `/packages/api/src/routes/targetDemographics.ts` (300+ lines)
- **Prospect Discovery:** `/packages/api/src/services/ProspectDiscoveryService.ts` (150+ lines)
- **Risk Scoring:** `/packages/api/src/services/RiskScoringService.ts` (250+ lines)
- **Batch Audit:** `/packages/api/src/services/BatchAuditService.ts` (250+ lines)
- **Metro Selector UI:** `/packages/webapp/src/components/demographics/MetroSelector.tsx` (314 lines)

### Next Steps for Development

1. **Job Queue** - Add Redis/Bull for persistent background jobs
2. **Real-time Updates** - Add WebSockets for live audit progress
3. **Search** - Add Elasticsearch for prospect search
4. **Webhooks** - Event-driven updates for prospect discovery
5. **Caching** - Redis cache for metros/industries data
6. **Monitoring** - Custom dashboards for demographic campaigns

### Reference Documents

Created in repo root:
1. **CODEBASE_ARCHITECTURE.md** (19KB) - Complete architecture guide
2. **ARCHITECTURE_DIAGRAMS.md** (38KB) - Visual diagrams and data flows

