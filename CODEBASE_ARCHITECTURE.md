# WCAG AI Platform - Architecture Summary & Implementation Guide

## Executive Overview

The WCAG AI Platform is a **monorepo-based web application** that combines:
- AI-powered WCAG-compliant website generation
- Nationwide demographic targeting system for lead discovery
- Accessibility auditing and compliance scoring
- Consultant dashboard for review and approval
- Multi-tenant client management with billing

**Current State:** Production-ready backend with extensive schema and service layer. Demographic targeting system partially implemented.

---

## 1. CURRENT PRISMA SCHEMA LOCATION & STRUCTURE

**Location:** `/home/user/wcag-ai-platform/packages/api/prisma/schema.prisma`

**Database:** PostgreSQL

### Core Data Models:

#### Scan & Compliance Management
- `Scan` - Main accessibility scan results with confidence scoring
- `Violation` - Individual WCAG violations with severity levels
- `ReviewLog` - Audit trail for consultant reviews
- `Fix` - AI-generated code fixes with approval workflows
- `FixApplication` - Tracking fix implementations
- `FixTemplate` - Pre-built fix templates for common violations

#### Lead Generation (Original System)
- `Lead` - Prospects from keyword searches
- `Company` - Global company database
- `KeywordSearch` - Search history and analytics
- `Consultant` - Consultant profiles and performance metrics

#### Multi-Tenant & Billing
- `Client` - Paying customers with subscription tiers
- `Industry` - Target industry categories with risk profiles
- `TargetBusiness` - Individual businesses for targeting
- `TargetBusinessViolation` - Violation data per business

#### **Demographic Targeting System** (NEW)
- `Metro` - 350+ US metropolitan areas with lawsuit trends
- `IndustryProfile` - Industry verticals per metro with risk levels
- `Prospect` - Target companies discovered per metro/industry
- `AccessibilityAudit` - Accessibility audit results for prospects
- `OutreachEmail` - Email tracking for outreach campaigns

**Key Characteristics:**
- Multi-tenant support with `clientId` and `tenantId` fields
- Confidence scoring for AI-generated content (0.0-1.0 scale)
- Extensive indexing on frequently queried fields
- JSON fields for flexible metadata storage
- Cascade deletes for data integrity
- Unique constraints to prevent duplicates

---

## 2. EXISTING API STRUCTURE & PATTERNS

**Location:** `/home/user/wcag-ai-platform/packages/api/src/routes/`

### API Architecture
- **Framework:** Express.js 4.18.2
- **Port:** 3001 (configurable via `PORT` env var)
- **Authentication:** Clerk SDK integration with JWT support
- **Error Handling:** Global error handlers with Sentry integration

### Current Route Endpoints (14 routers):

```
/api/drafts               - WCAG website drafts
/api/violations           - Violation management
/api/leads                - Lead tracking and management
/api/consultant           - Consultant operations
/api/fixes                - Code fix generation and approval
/api/screenshot           - Screenshot capture (Puppeteer)
/api/demographics         - Metro/industry selection, prospect discovery
/api/target-demographics  - Target business filtering and management
/api/clients              - Multi-tenant client management
/api/sla                  - SLA monitoring
/api/reports              - Report generation
/api/proposals            - Proposal management
/api/billing              - Stripe billing integration
/api/health               - Health check endpoint
```

### Middleware Stack:
- **CORS** - Cross-origin resource sharing
- **Express.json()** - JSON body parser
- **Custom logging middleware** - Request logging
- **Auth middleware** - JWT/Clerk authentication
- **RBAC middleware** - Role-based access control
- **Tenant middleware** - Multi-tenant isolation
- **Security middleware** - Helmet, rate limiting

### Service Layer Pattern:
Classes with static methods for business logic:
```typescript
export class ProspectDiscoveryService {
  static async discoverProspects(options: DiscoveryOptions): Promise<DiscoveredProspect[]>
  static async batchDiscover(metros: string[], industries: string[]): Promise<Map>
  private static async enrichProspect(prospect: DiscoveredProspect): Promise<DiscoveredProspect>
}
```

### Core Services (21 total):
1. **ProspectDiscoveryService** - Automated lead generation
2. **RiskScoringService** - Lawsuit probability calculation
3. **BatchAuditService** - Parallel WCAG scanning (in-memory job queue)
4. **CompanyDiscoveryService** - Company data enrichment
5. **RemediationEngine** - Fix generation and application
6. **PDFGenerator** - Report PDF creation
7. **ConfidenceScorer** - AI confidence scoring
8. **ReplayEngine** - Session replay for QA
9. **AIRouter** - AI request routing
10. **EmailService** - SendGrid email handling
11. **MonitoringService** - Sentry integration
12. **KeywordExtractor** - NLP keyword extraction
13. **CostController** - API cost tracking
14. **FeedbackLoop** - Consultant feedback handling
15. **SLAMonitor** - SLA compliance tracking
16. **WorkerAttestation** - Worker verification
17. **AuditLog** - Audit trail management
18. **ReportGenerator** - Report creation
19. **KeywordAlerting** - Alert management
20. **ProposalGenerator** - Proposal automation
21. **ScreenshotService** - Website screenshots

---

## 3. REACT/FRONTEND STRUCTURE

**Location:** `/home/user/wcag-ai-platform/packages/webapp/`

### Technology Stack:
- **Framework:** React 18.2.0
- **Build Tool:** Vite 5.4.21
- **Language:** TypeScript 5.0.0
- **API Client:** Axios 1.13.2
- **Server:** Express 5.1.0 (SSR capable)
- **Styling:** Tailwind CSS (via adhd config)

### Directory Structure:
```
packages/webapp/src/
├── components/          # Reusable React components
│   ├── ConsultantApprovalDashboard.tsx
│   ├── ReviewDashboard.tsx
│   ├── ViolationCard.tsx
│   ├── ViolationReviewCard.tsx
│   ├── LeadDiscovery.tsx
│   ├── FixPreview.tsx
│   ├── demographics/
│   │   └── MetroSelector.tsx      # Main demographic targeting UI
│   └── transformation/
│       └── BeforeAfterDemo.tsx
├── services/            # Frontend API client logic
├── types/               # TypeScript interfaces
├── utils/               # Helper functions
├── config/              # Configuration files
├── App.tsx              # Root component
└── main.tsx             # Entry point
```

### Key Components:

#### MetroSelector.tsx (Demographic Targeting UI)
- Metro area selection from 350+ metros
- Industry vertical filtering
- Prospect discovery trigger
- Batch audit initiation
- Campaign summary display
- Responsive grid layout with Tailwind

**Features:**
- Dynamic metro list with population metrics
- Industry risk level visualization
- Campaign summary sidebar
- Loading states and error handling
- Multi-select industry filtering

---

## 4. EXISTING SERVICES & BACKGROUND JOB PROCESSING

### Job Processing Architecture:
**Status:** In-memory job queue (NO external job queues like Bull/RabbitMQ)

### BatchAuditService (In-Memory Job Queue)
- **Pattern:** Async processing with in-memory Map storage
- **Concurrency:** 4 parallel browser instances
- **Technology:** Puppeteer for headless browser automation
- **Job Structure:**
  ```typescript
  interface AuditJob {
    jobId: string                    // Unique identifier
    websites: string[]               // URLs to audit
    status: 'pending'|'in_progress'|'completed'|'failed'
    results: Map<string, AuditResult>
    progress: { total, completed, failed }
  }
  ```

- **Flow:**
  1. `createAuditJob()` - Returns immediately with jobId
  2. `processBatchAsync()` - Runs in background via fire-and-forget Promise
  3. Client polls `/batch-audit/:jobId` for status
  4. Results stored in memory until server restart

### Async Service Patterns:
- Services use static methods with `async/await`
- Promise.allSettled() for fault tolerance
- No persistent queue storage (jobs lost on restart)
- No event-driven architecture

### Email Service (SendGrid)
- Async email sending via `@sendgrid/mail`
- Integrated into OutreachEmail tracking
- Optional via `ENABLE_EMAIL_OUTREACH` flag

### Data Enrichment Services
- ProspectDiscoveryService - Enriches prospects with business data
- CompanyDiscoveryService - Multi-source data fusion

---

## 5. DATABASE CONFIGURATION

### PostgreSQL Connection:
```
Location: /home/user/wcag-ai-platform/packages/api/src/lib/prisma.ts

// Singleton pattern with global caching
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});
```

### Environment Variables:
```
DATABASE_URL=postgresql://user:password@localhost:5432/wcag_ai_platform
NODE_ENV=development
PORT=3001
CORS_ORIGIN=*
```

### Prisma Features Used:
- **Migrations:** `prisma migrate dev` command available
- **Seeding:** `prisma/seed.ts` for initial data
- **Relations:** 1-to-many, many-to-many relationships
- **Indexes:** Strategic indexes on frequently queried fields
- **Cascade deletes:** Foreign key constraint enforcement

### Data Source Configuration:
```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 6. DEPLOYMENT SETUP

### Container Deployment:
**Location:** `/home/user/wcag-ai-platform/packages/api/Dockerfile`

```dockerfile
# Multi-stage build:
# Stage 1: Builder (node:20-alpine)
# - Install dependencies
# - Compile TypeScript

# Stage 2: Production (node:20-alpine)
# - Non-root user (nodejs:nodejs)
# - Health check endpoint
# - Expose port 8080
```

### Health Check:
```
Endpoint: GET /health (port 8080)
Returns: 200 OK if service is healthy
Interval: 30 seconds
Timeout: 10 seconds
```

### Deployment Infrastructure:
```
/deployment/
├── config/               # Environment templates
├── terraform/            # IaC for cloud infrastructure
├── scripts/              # Deployment automation
├── dashboard/            # Monitoring dashboards
└── tests/                # Deployment validation
```

### Environment Configuration:
- **Development:** `.env.development`
- **Production:** `.env.production` (Railway, Vercel, etc.)
- **Template:** `/packages/api/.env.example`

### Key Deployment Variables:
```
DATABASE_URL              - PostgreSQL connection
OPENAI_API_KEY           - AI model access
ANTHROPIC_API_KEY        - Claude API access
CLERK_PUBLISHABLE_KEY    - Authentication
SENDGRID_API_KEY         - Email service
STRIPE_SECRET_KEY        - Billing integration
AWS_S3_BUCKET            - Screenshot/report storage
SENTRY_DSN               - Error tracking
LAUNCHDARKLY_SDK_KEY     - Feature flags
```

### Supported Platforms:
- **Railway** - Primary deployment (containers)
- **Vercel** - Frontend deployment
- **AWS** - S3 for file storage, RDS for database
- **Docker** - Docker Compose for local development

---

## 7. CURRENT DEMOGRAPHIC TARGETING SYSTEM

### Implemented Components:

#### Data Layer
- **National Metro Database:** 350+ US metros pre-configured in `/data/nationalMetros.ts`
- **Industry Verticals:** 20+ industry categories with risk profiles
- **Lawsuit Tracking:** Recent lawsuit counts and trends per industry

#### Services
- **ProspectDiscoveryService** - Multi-source discovery (Google Search, directories)
- **RiskScoringService** - Lawsuit probability calculation
  - Industry risk (35% weight)
  - Compliance risk (35% weight)
  - Technical risk (20% weight)
  - Business risk (10% weight)

#### API Routes
```
GET    /api/demographics/metros                    - List all metros
GET    /api/demographics/metros/:metroId           - Metro details
GET    /api/demographics/industries                - Industry list
POST   /api/demographics/discover                  - Discover prospects
POST   /api/demographics/discover-batch            - Batch discovery
POST   /api/demographics/score-risk                - Risk calculation
POST   /api/demographics/recommendations           - Recommendations
POST   /api/demographics/batch-audit               - Start audits
GET    /api/demographics/batch-audit/:jobId        - Audit status
GET    /api/demographics/batch-audit/:jobId/results - Audit results
GET    /api/demographics/analytics/top-metros      - Top metros analysis
GET    /api/demographics/analytics/high-risk-industries - Risk analysis
```

#### Frontend
- **MetroSelector.tsx** - Complete UI for prospect discovery workflow
  - Metro selection grid
  - Industry filtering
  - Campaign summary
  - Real-time discovery integration

---

## 8. KEY ARCHITECTURAL PATTERNS

### Service-Oriented Architecture:
```
API Route Handler
    ↓
Service Layer (static methods)
    ↓
Prisma Client
    ↓
PostgreSQL Database
```

### Request/Response Pattern:
```typescript
{
  success: boolean,
  data: T,
  error?: string
}
```

### Error Handling:
- Global error middleware
- Sentry integration for tracking
- Graceful degradation
- Request logging

### Authentication:
- Clerk SDK for user management
- JWT tokens for API access
- RBAC middleware for authorization

### Data Validation:
- Request body validation in route handlers
- Type-safe database queries via Prisma
- Input sanitization for URLs

---

## 9. WHERE TO ADD DEMOGRAPHIC TARGETING COMPONENTS

### For New Features, Follow This Pattern:

#### 1. **Database Schema** (`prisma/schema.prisma`)
```typescript
model NewEntity {
  id              String   @id @default(cuid())
  
  // Add fields here
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  relatedEntity   RelatedEntity[]
  
  @@index([frequentlyQueried])
}
```

#### 2. **Service Layer** (`src/services/`)
```typescript
export class NewService {
  static async methodName(params: ParamType): Promise<ReturnType> {
    // Business logic here
    // Use Prisma for data access
    // Log via log.info/log.error
  }
}
```

#### 3. **API Route** (`src/routes/`)
```typescript
router.post('/endpoint', async (req: Request, res: Response) => {
  try {
    const result = await NewService.methodName(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    log.error('Error', error as Error);
    res.status(500).json({ error: 'Failed' });
  }
});
```

#### 4. **Frontend Component** (`webapp/src/components/`)
```typescript
export function NewComponent() {
  const [data, setData] = useState<DataType[]>([]);
  
  useEffect(() => {
    axios.get('/api/endpoint').then(r => setData(r.data.data));
  }, []);
  
  return <div>{/* UI here */}</div>;
}
```

#### 5. **Register Route** (`src/server.ts`)
```typescript
import newRouter from './routes/new';
app.use('/api/new', newRouter);
```

---

## 10. TECH STACK SUMMARY

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20.x |
| Framework | Express.js | 4.18.2 |
| Language | TypeScript | 5.3.3 |
| ORM | Prisma | 5.7.1 |
| Database | PostgreSQL | 14+ |
| Authentication | Clerk | 4.13.23 |
| Email | SendGrid | 8.1.6 |
| Payments | Stripe | 19.3.1 |
| Monitoring | Sentry | 10.25.0 |
| Web Scraping | Puppeteer | 24.29.1 |
| Logging | Winston | 3.11.0 |
| Telemetry | OpenTelemetry | 1.19.0 |
| Rate Limiting | express-rate-limit | 7.1.5 |

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18.2.0 |
| Build Tool | Vite | 5.4.21 |
| Language | TypeScript | 5.0.0 |
| HTTP Client | Axios | 1.13.2 |
| Styling | Tailwind CSS | 3.x |
| Server | Express | 5.1.0 |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Container | Docker (Alpine Linux) |
| Orchestration | Kubernetes (via Railway/Vercel) |
| Database | PostgreSQL (managed) |
| Storage | AWS S3 |
| CDN | Vercel Edge Network |
| Monitoring | Sentry + Custom |
| Feature Flags | LaunchDarkly |

---

## 11. FILE ORGANIZATION QUICK REFERENCE

```
/home/user/wcag-ai-platform/
├── packages/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/               ← Add new API endpoints here
│   │   │   ├── services/             ← Add business logic here
│   │   │   ├── middleware/           ← Auth, RBAC, logging
│   │   │   ├── lib/                  ← Database connection
│   │   │   ├── utils/                ← Helpers (logger, metrics)
│   │   │   ├── data/                 ← Static data (metros, industries)
│   │   │   ├── server.ts             ← Express app config
│   │   │   └── types.ts              ← Shared TypeScript types
│   │   ├── prisma/
│   │   │   └── schema.prisma         ← Database schema
│   │   ├── Dockerfile                ← Container config
│   │   └── package.json
│   │
│   └── webapp/
│       ├── src/
│       │   ├── components/           ← React components
│       │   ├── services/             ← API client logic
│       │   ├── types/                ← TypeScript interfaces
│       │   ├── utils/                ← Helpers
│       │   ├── App.tsx               ← Root component
│       │   └── main.tsx              ← Entry point
│       └── package.json
│
└── deployment/
    ├── config/                       ← Environment templates
    ├── terraform/                    ← Infrastructure as Code
    └── scripts/                      ← Deployment automation
```

---

## 12. NEXT STEPS FOR IMPLEMENTATION

### For Adding New Demographic Targeting Features:

1. **Update Prisma Schema** - Add new models/fields to `schema.prisma`
2. **Run Migration** - `prisma migrate dev`
3. **Create Service** - Add business logic in `services/`
4. **Add Route** - Create API endpoint in `routes/`
5. **Register Route** - Import and use in `server.ts`
6. **Add Component** - Create React component in `webapp/components/`
7. **Test End-to-End** - Verify data flow from DB → API → Frontend
8. **Deploy** - Push to Railway/Vercel using existing CI/CD

### Recommended Areas for Enhancement:

1. **Job Queue Integration** - Move from in-memory to Redis/Bull for persistence
2. **Webhook System** - Event-driven updates for prospect discovery
3. **Real-time Updates** - WebSockets for live audit progress
4. **Caching Layer** - Redis for metros/industries data
5. **Search Infrastructure** - Elasticsearch for prospect search
6. **Monitoring** - Enhanced dashboards for demographic targeting campaigns

