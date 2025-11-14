# WCAG AI Platform - Visual Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WCAG AI PLATFORM SYSTEM                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER (React)                               │
│  packages/webapp/ (Vite, React 18, TypeScript, Tailwind)                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Components/                                                             │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │ ├─ ConsultantApprovalDashboard.tsx   - Review & approve fixes         │ │
│  │ ├─ ReviewDashboard.tsx               - Violation triage               │ │
│  │ ├─ ViolationCard.tsx                 - Individual violation display   │ │
│  │ ├─ LeadDiscovery.tsx                 - Lead generation UI             │ │
│  │ ├─ FixPreview.tsx                    - Code fix preview               │ │
│  │ │                                                                      │ │
│  │ ├─ demographics/MetroSelector.tsx    - Prospect discovery workflow    │ │
│  │ │  ├─ Metro selection grid                                            │ │
│  │ │  ├─ Industry filtering                                              │ │
│  │ │  ├─ Campaign summary sidebar                                        │ │
│  │ │  └─ Batch audit trigger                                             │ │
│  │ │                                                                      │ │
│  │ └─ transformation/BeforeAfterDemo.tsx - Visual demos                   │ │
│  │                                                                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Services/ → API client logic                                              │
│  Types/    → TypeScript interfaces                                         │
│  Utils/    → Helper functions                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                          │
                          │ Axios HTTP Requests
                          │ /api/demographics
                          │ /api/batch-audit
                          │ /api/leads
                          │ /api/fixes
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Express.js)                               │
│  packages/api/src/ (Node 20, Express 4.18, TypeScript, Prisma 5)           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Port: 3001  │  Health Check: GET /health                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Middleware Stack                                                        │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │ • CORS                 - Cross-origin requests                          │ │
│  │ • Express.json()       - JSON body parser                               │ │
│  │ • Request Logging      - Custom logging middleware                     │ │
│  │ • Auth (Clerk + JWT)   - User authentication                           │ │
│  │ • RBAC                 - Role-based access control                      │ │
│  │ • Tenant Isolation     - Multi-tenant middleware                        │ │
│  │ • Security (Helmet)    - HTTP security headers                          │ │
│  │ • Rate Limiting        - express-rate-limit                            │ │
│  │ • Sentry Error Handler - Error tracking                                 │ │
│  │                                                                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Routes/ (14 endpoint groups)                                            │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │ ┌─ demographics.ts                                                   │ │
│  │ │  ├─ GET  /api/demographics/metros                                  │ │
│  │ │  ├─ GET  /api/demographics/metros/:id                             │ │
│  │ │  ├─ GET  /api/demographics/industries                             │ │
│  │ │  ├─ POST /api/demographics/discover                               │ │
│  │ │  ├─ POST /api/demographics/discover-batch                         │ │
│  │ │  ├─ POST /api/demographics/score-risk                             │ │
│  │ │  ├─ POST /api/demographics/batch-audit                            │ │
│  │ │  ├─ GET  /api/demographics/batch-audit/:jobId                     │ │
│  │ │  ├─ GET  /api/demographics/batch-audit/:jobId/results             │ │
│  │ │  └─ GET  /api/demographics/analytics/*                            │ │
│  │ │                                                                    │ │
│  │ ├─ targetDemographics.ts                                             │ │
│  │ │  ├─ GET  /api/target-demographics/industries                      │ │
│  │ │  ├─ POST /api/target-demographics/industries                      │ │
│  │ │  ├─ GET  /api/target-demographics/businesses                      │ │
│  │ │  ├─ POST /api/target-demographics/businesses                      │ │
│  │ │  └─ More CRUD operations...                                        │ │
│  │ │                                                                    │ │
│  │ ├─ leads.ts, fixes.ts, consultant.ts, clients.ts, etc.             │ │
│  │ │                                                                    │ │
│  │ └─ ...13 more route files                                           │ │
│  │                                                                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Services/ (21 service classes - static methods)                         │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │ DEMOGRAPHIC TARGETING:                                                │ │
│  │ • ProspectDiscoveryService      - Discover leads from multiple sources│ │
│  │ • RiskScoringService           - Calculate lawsuit probability        │ │
│  │ • BatchAuditService            - Parallel WCAG audits (in-memory job) │ │
│  │                                                                        │ │
│  │ ACCESSIBILITY & FIXES:                                                │ │
│  │ • RemediationEngine            - Generate & apply code fixes         │ │
│  │ • ConfidenceScorer             - Score AI-generated content          │ │
│  │ • PDFGenerator                 - Generate compliance reports         │ │
│  │                                                                        │ │
│  │ BUSINESS OPERATIONS:                                                  │ │
│  │ • CompanyDiscoveryService      - Multi-source company enrichment     │ │
│  │ • EmailService                 - SendGrid integration               │ │
│  │ • ReportGenerator              - Detailed audit reports              │ │
│  │                                                                        │ │
│  │ MONITORING & CONTROL:                                                 │ │
│  │ • MonitoringService            - Sentry error tracking              │ │
│  │ • CostController               - API usage & cost tracking          │ │
│  │ • SLAMonitor                   - SLA compliance tracking            │ │
│  │ • AuditLog                     - Audit trail management             │ │
│  │                                                                        │ │
│  │ OTHER SERVICES:                                                       │ │
│  │ • AIRouter, KeywordExtractor, ReplayEngine, FeedbackLoop,           │ │
│  │ • WorkerAttestation, KeywordAlerting, ProposalGenerator             │ │
│  │                                                                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Data/                                                                   │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │ • nationalMetros.ts      - 350+ US metros with lawsuit trends         │ │
│  │ • fintechTestData.ts     - Test data for FinTech industry            │ │
│  │ • store.ts               - In-memory data store                       │ │
│  │                                                                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Utilities & Helpers                                                     │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │ • logger.ts (Winston)  - Structured logging                           │ │
│  │ • metrics.ts           - Prometheus metrics                           │ │
│  │ • types.ts             - Shared TypeScript types                      │ │
│  │                                                                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                          │
                          │ Prisma Client
                          │ SQL Queries
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER (Prisma + PostgreSQL)                        │
│  packages/api/prisma/schema.prisma                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Database: PostgreSQL (local: :5432, production: RDS/Railway)               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ DEMOGRAPHIC TARGETING MODELS                                            │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │ ┌─ Metro                                                              │ │
│  │ │  • metroId (unique)      - Denver, CO                             │ │
│  │ │  • name, state           - Display info                          │ │
│  │ │  • population            - For ranking                           │ │
│  │ │  • businessCount         - Total businesses estimate            │ │
│  │ │  • adaLawsuitTrend       - "increasing"|"stable"|"decreasing"   │ │
│  │ │  • regionalHooks[]       - Messaging hooks                       │ │
│  │ │  • dataSourcesAvailable[]                                        │ │
│  │ │  • @@index([state], [population], [adaLawsuitTrend])           │ │
│  │ │  └─ 1:M─> IndustryProfile, Prospect                            │ │
│  │ │                                                                 │ │
│  │ ├─ IndustryProfile                                                 │ │
│  │ │  • metroId (FK)          - Which metro                         │ │
│  │ │  • verticalId (unique with metroId)                            │ │
│  │ │  • name, subCategories[]  - Industry info                      │ │
│  │ │  • estimatedProspectsInMetro                                    │ │
│  │ │  • adaRiskLevel          - "critical"|"high"|"medium"|"low"   │ │
│  │ │  • typicalRevenue, typicalEmployeeCount                       │ │
│  │ │  • recentLawsuitCount    - 24-month count                      │ │
│  │ │  • searchQueries[]       - Google search patterns               │ │
│  │ │  • keyDirectories[]      - ZocDoc, HealthGrades, etc           │ │
│  │ │  • @@index([metroId], [adaRiskLevel])                          │ │
│  │ │  └─ 1:M─> Prospect                                             │ │
│  │ │                                                                 │ │
│  │ ├─ Prospect                                                        │ │
│  │ │  • metroId, industryId (FKs)                                   │ │
│  │ │  • businessName, website (unique)                              │ │
│  │ │  • ownerName, email, phone, address                           │ │
│  │ │  • revenue, employeeCount, foundedYear                        │ │
│  │ │  • complianceScore (0-100)  - WCAG audit result               │ │
│  │ │  • violationCount           - WCAG violations found           │ │
│  │ │  • redFlags[]               - non-responsive, no-alt-text    │ │
│  │ │  • riskScore (1-100)        - Lawsuit probability             │ │
│  │ │  • priority (1-3)           - Outreach priority               │ │
│  │ │  • suggestedHook            - Messaging strategy              │ │
│  │ │  • emailsSent, lastContacted                                   │ │
│  │ │  • responseStatus           - Engagement status                │ │
│  │ │  • @@index([metroId], [priority], [riskScore], [responseStatus])
│  │ │  ├─ 1:1─> AccessibilityAudit                                  │ │
│  │ │  └─ 1:M─> OutreachEmail                                       │ │
│  │ │                                                                 │ │
│  │ ├─ AccessibilityAudit                                             │ │
│  │ │  • prospectId (FK, unique)                                      │ │
│  │ │  • violations (JSON)        - axe-core results                  │ │
│  │ │  • redFlags[]               - Visual issues                     │ │
│  │ │  • accessibilityScore (0-100)                                   │ │
│  │ │  • wcagLevel                - "A"|"AA"|"AAA"                    │ │
│  │ │  • mobileResponsive, viewportMeta, hasHttps                     │ │
│  │ │  • pageLoadTime, lighthouseScore                                │ │
│  │ │  • beforeScreenshot, afterScreenshot (S3 URLs)                  │ │
│  │ │  • scanStatus, scanError                                        │ │
│  │ │  └─ @@index([prospectId], [scannedAt])                         │ │
│  │ │                                                                 │ │
│  │ └─ OutreachEmail                                                  │ │
│  │    • prospectId (FK)                                             │ │
│  │    • subject, body                                               │ │
│  │    • hook                  - "lawsuit-risk"|"peer-pressure"      │ │
│  │    • localReferences[]      - Regional messaging                 │ │
│  │    • status                - "draft"|"sent"|"opened"|"clicked"   │ │
│  │    • openCount, clickCount                                       │ │
│  │    • trackingId            - Email tracking pixel                │ │
│  │    • emailProvider         - "sendgrid"|"mailgun"                │ │
│  │    └─ @@index([prospectId], [status], [sentAt])                 │ │
│  │                                                                   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ OTHER DATA MODELS                                                       │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │ Scan, Violation, ReviewLog (WCAG compliance)                            │ │
│  │ Fix, FixApplication, FixTemplate (Code generation)                      │ │
│  │ Lead, Company, KeywordSearch (Lead generation)                          │ │
│  │ Consultant (Consultant management)                                      │ │
│  │ Client (Multi-tenant billing)                                           │ │
│  │ Industry, TargetBusiness, TargetBusinessViolation (Legacy targeting)   │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL INTEGRATIONS                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  AUTHENTICATION & USER MANAGEMENT:                                          │
│  └─ Clerk SDK (clerk.com) - User management, JWT tokens                    │
│                                                                              │
│  EMAIL & OUTREACH:                                                          │
│  └─ SendGrid API (@sendgrid/mail) - Email delivery and tracking            │
│                                                                              │
│  PAYMENTS & BILLING:                                                        │
│  └─ Stripe API - Customer subscriptions, invoicing                          │
│                                                                              │
│  MONITORING & LOGGING:                                                      │
│  ├─ Sentry (@sentry/node) - Error tracking and performance monitoring      │
│  ├─ Prometheus (prom-client) - Metrics collection                           │
│  ├─ OpenTelemetry - Distributed tracing                                     │
│  └─ Winston - Structured logging                                            │
│                                                                              │
│  FEATURE FLAGS:                                                             │
│  └─ LaunchDarkly SDK - Feature flag management                             │
│                                                                              │
│  WEB SCRAPING & SCREENSHOTS:                                               │
│  └─ Puppeteer - Headless browser automation for audits & screenshots       │
│                                                                              │
│  CLOUD STORAGE:                                                             │
│  └─ AWS S3 (@aws-sdk/client-s3) - Screenshots, reports, PDFs              │
│                                                                              │
│  AI/LLM SERVICES:                                                           │
│  ├─ OpenAI API - GPT models for content generation                         │
│  └─ Anthropic Claude - Alternative AI provider                             │
│                                                                              │
│  DATA SERVICES (OPTIONAL):                                                 │
│  ├─ Apollo.io - B2B company data and contact enrichment                    │
│  └─ Hunter.io - Email verification and discovery                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

```

---

## Data Flow Diagram: Demographic Targeting

```
USER WORKFLOW:

1. Metro & Industry Selection
   ┌─────────────────────────────┐
   │ MetroSelector.tsx (Frontend)│
   │ ├─ Select Metro             │
   │ └─ Select Industries        │
   └──────────────┬──────────────┘
                  │
                  │ POST /api/demographics/discover
                  │ { metro: "denver-co", industries: ["medical", "legal"] }
                  │
                  ▼
   ┌────────────────────────────────────┐
   │ demographics.ts Route Handler      │
   │ POST /api/demographics/discover    │
   └────────────┬───────────────────────┘
                │
                │ Call ProspectDiscoveryService
                │
                ▼
   ┌──────────────────────────────────────────┐
   │ ProspectDiscoveryService                 │
   │ ├─ Search via Google Search patterns     │
   │ ├─ Query industry directories            │
   │ ├─ Enrich company data                   │
   │ └─ Save Prospect records to DB           │
   └────────────┬─────────────────────────────┘
                │
                │ Prisma INSERT
                │
                ▼
   ┌────────────────────────┐
   │ PostgreSQL Database    │
   │ • Prospect            │
   │ • BusinessName        │
   │ • Email, Phone        │
   │ • Revenue, Employees  │
   └────────────┬───────────┘
                │
                │ Return discovered prospects
                │
                ▼
   ┌──────────────────────────┐
   │ MetroSelector.tsx        │
   │ Display: {               │
   │   discovered: 145,       │
   │   auditable: 123,        │
   │   ready: 102             │
   │ }                        │
   └──────────────┬───────────┘
                  │
                  │ User clicks "Audit All"
                  │
                  ▼
   ┌──────────────────────────────────┐
   │ BatchAuditService                │
   │ POST /api/demographics/batch-audit│
   │ { websites: [url1, url2, ...] }  │
   └────────────┬─────────────────────┘
                │
                │ Create AuditJob
                │ Return jobId immediately
                │
                ▼
   ┌────────────────────────────┐
   │ AuditJob (In-Memory)       │
   │ • jobId                    │
   │ • websites: []             │
   │ • status: in_progress      │
   │ • results: Map<>           │
   │ • progress: { ... }        │
   └────────────┬───────────────┘
                │
                │ Fire-and-forget async processing
                │
                ├─ Puppeteer browser (parallel x4)
                ├─ Extract page info
                ├─ Check accessibility
                └─ Calculate compliance score
                │
                ▼
   ┌────────────────────────────────────┐
   │ Frontend Polling Loop               │
   │ GET /api/demographics/batch-audit  │
   │ /:jobId                             │
   │ (every 2 seconds)                  │
   └────────────┬───────────────────────┘
                │
                │ When completed, fetch results
                │
                ▼
   ┌────────────────────────────────────────┐
   │ GET /api/demographics/batch-audit      │
   │ /:jobId/results                        │
   │ Returns: [                             │
   │   {                                    │
   │     website: "...",                    │
   │     complianceScore: 42,               │
   │     violationCount: 25,                │
   │     redFlags: [...],                   │
   │     technicalMetrics: {...}            │
   │   },                                   │
   │   ...                                  │
   │ ]                                      │
   └────────────┬─────────────────────────┘
                │
                │ User clicks "Score Risk"
                │
                ▼
   ┌────────────────────────────────────────┐
   │ RiskScoringService                     │
   │ POST /api/demographics/score-risk      │
   │ calculateRiskProfile({                 │
   │   complianceScore: 42,                 │
   │   violationCount: 25,                  │
   │   industry: "medical",                 │
   │   employeeCount: 45,                   │
   │   revenue: "$2M-$5M",                  │
   │   ...                                  │
   │ })                                     │
   └────────────┬─────────────────────────┘
                │
                │ Calculate weighted risk:
                │ • industryRisk (35%)
                │ • complianceRisk (35%)
                │ • technicalRisk (20%)
                │ • businessRisk (10%)
                │
                ▼
   ┌────────────────────────────┐
   │ RiskProfile Result         │
   │ {                          │
   │   riskScore: 78,           │
   │   priority: 1,             │
   │   suggestedHook:           │
   │     "lawsuit-risk",        │
   │   reasoning: [...]         │
   │ }                          │
   └────────────┬───────────────┘
                │
                │ Frontend displays results
                │ User decides to outreach
                │
                ▼
   ┌──────────────────────────────────────┐
   │ Trigger Email Campaign               │
   │ EmailService.sendOutreach({          │
   │   prospect: {...},                   │
   │   hook: "lawsuit-risk",              │
   │   template: "initial_contact"        │
   │ })                                   │
   └────────────┬─────────────────────────┘
                │
                │ SendGrid API call
                │ Save OutreachEmail record
                │
                ▼
   ┌────────────────────────────┐
   │ PostgreSQL OutreachEmail   │
   │ • prospectId               │
   │ • subject, body            │
   │ • sentAt, status           │
   │ • trackingId               │
   │ • openCount, clickCount    │
   └────────────────────────────┘
```

---

## Data Model Relationships

```
Metro (350+ metros)
  ├─ 1:M → IndustryProfile (20+ industries per metro)
  │        └─ Risk level: critical/high/medium/low
  │
  └─ 1:M → Prospect (target companies discovered)
           ├─ 1:1 → AccessibilityAudit
           │        └─ WCAG violations, compliance score
           │
           └─ 1:M → OutreachEmail
                    └─ Tracking: opens, clicks, responses

Prospect
  ├─ Status progression: "new" → "contacted" → "interested" → "won"
  ├─ Risk factors:
  │  ├─ riskScore (1-100)
  │  ├─ complianceScore (0-100)
  │  ├─ violationCount (0+)
  │  └─ redFlags []
  │
  ├─ Engagement tracking:
  │  ├─ emailsSent (count)
  │  ├─ lastContacted (DateTime)
  │  └─ responseStatus
  │
  └─ Enriched data:
     ├─ businessName, website
     ├─ revenue, employeeCount
     ├─ ownerName, email, phone
     └─ foundedYear, city

OutreachEmail
  ├─ Subject: Generated from template + personalization
  ├─ Hook strategy: "lawsuit-risk" | "peer-pressure" | "trust" | "compliance"
  ├─ localReferences: Regional-specific messaging
  │
  ├─ Delivery tracking:
  │  ├─ status: "draft" | "sent" | "bounced" | "opened" | "clicked"
  │  ├─ sentAt (DateTime)
  │  └─ trackingId (SendGrid tracking pixel)
  │
  └─ Engagement metrics:
     ├─ openCount (how many times opened)
     ├─ clickCount (links clicked)
     └─ responseReceived (Boolean)
```

