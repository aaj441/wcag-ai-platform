# WCAGAI → Riff Enterprise Rebuild Strategy

## Quick Summary

**Current State:** WCAGAI is a solid MVP (48% enterprise-ready)
**Goal:** Use Riff to build enterprise features, then integrate back
**Timeline:** 10 weeks total (1 week hardening + 4-6 weeks Riff build + 2-3 weeks integration)
**Outcome:** "Enterprise WCAGAI" with healthcare focus

---

## What is Riff?

Riff is a **modern app development platform** designed for enterprise teams. Key strengths:

### **Riff Provides (Out of the Box)**
- ✅ Built-in compliance frameworks (SOC2, GDPR, HIPAA templates)
- ✅ Team/RBAC management (no custom code needed)
- ✅ SSO integration (Okta, Google Workspace, Azure AD)
- ✅ Event-driven architecture (webhooks, queues)
- ✅ HubSpot/Salesforce sync
- ✅ APM & observability dashboards
- ✅ Database migrations + schema management
- ✅ Deployment automation (1-click deploy)
- ✅ Multi-tenant by default
- ✅ Stripe/payment integrations

### **Riff vs Your Current Stack**

| Feature | Current (Node/Express) | Riff |
|---------|------------------------|------|
| **Auth/SSO** | Clerk only | 5+ providers built-in |
| **RBAC** | Custom middleware | Built-in role engine |
| **Team Management** | Doesn't exist | Native with permissions |
| **Compliance** | Manual | 70% scaffolding done |
| **CRM Integration** | Custom build | HubSpot native sync |
| **APM** | Sentry + manual | Full observability |
| **Deployment** | Manual Docker | One-click deploy |
| **Time to MVP** | 2-3 months | 2-3 weeks |
| **Code to Compliance** | 6-8 weeks | 2-3 weeks |

---

## Strategy: Leverage Riff for Enterprise, Keep Current for MVP

### **Phase 1: Harden Current Stack (Week 1)** ✅
**What:** Run the 1-week enterprise sprint (ENTERPRISE_SPRINT_1WEEK.md)
- Connection pooling + caching
- API versioning + OpenAPI
- Rate limiting + audit logging
- Data encryption + health dashboard
- Webhooks + CLI (POC)

**Outcome:** 48% → 76% enterprise-ready (still 24% gap for compliance/scaling)

---

### **Phase 2: Build Enterprise Features in Riff (Weeks 2-5)**

#### **What to Build in Riff:**

```
Riff Module 1: Team & Organization Management
├── Multi-level teams (Company → Department → Team)
├── RBAC role engine (Admin, Manager, Analyst, Viewer)
├── Permission matrix (who can do what)
├── Audit trail of team changes
└── Onboarding workflows

Riff Module 2: Compliance & Legal
├── SOC2 compliance dashboard
├── HIPAA readiness checklist
├── GDPR data request handling
├── Encryption at rest (built-in)
├── Data residency controls (US/EU)
└── Automated backup schedules

Riff Module 3: CRM Integration
├── HubSpot sync (prospects ↔ contacts)
├── Deal pipeline management
├── Activity timeline (emails, audits, etc)
├── Engagement scoring
└── Automated follow-up workflows

Riff Module 4: Customer Success
├── Health score calculation
├── Usage analytics
├── Success dashboards
├── CSM assignment workflow
└── Churn prediction alerts

Riff Module 5: Advanced Analytics
├── Usage-based billing calculations
├── Revenue attribution
├── Customer lifetime value (CLV)
├── Cohort analysis
└── Predictive analytics
```

#### **Architecture in Riff:**

```
┌──────────────────────────────────────┐
│     Riff Enterprise Platform         │
├──────────────────────────────────────┤
│ • Teams & RBAC (OAuth/Okta)         │
│ • Compliance framework               │
│ • CRM integrations                   │
│ • Analytics & BI                     │
│ • Customer success tools             │
│ • Stripe billing                     │
└──────────────────────────────────────┘
           ↓ (API)
┌──────────────────────────────────────┐
│   WCAGAI Core Services (Current)     │
├──────────────────────────────────────┤
│ • Prospect discovery                 │
│ • Accessibility auditing             │
│ • Risk scoring                       │
│ • Scan orchestration                 │
│ • Report generation                  │
└──────────────────────────────────────┘
```

#### **Why Build THIS in Riff (not everything)**

| Component | Build in Riff? | Why |
|-----------|----------------|-----|
| **Team Management** | ✅ YES | Riff's RBAC is better than custom |
| **Compliance Frameworks** | ✅ YES | Riff provides 70% scaffolding |
| **CRM Integration** | ✅ YES | HubSpot native sync is complex |
| **Customer Analytics** | ✅ YES | Riff BI is production-ready |
| **Prospect Discovery** | ❌ NO | WCAGAI's algorithm is better |
| **Accessibility Scanning** | ❌ NO | Puppeteer/axe-core already optimized |
| **Risk Scoring** | ❌ NO | Your ML model works well |
| **Reporting** | ✅ MAYBE | Could use Riff's PDF generation |

---

### **Phase 3: Integration & Code Migration (Weeks 6-8)**

#### **Step 1: Export from Riff**
```
Riff provides:
- TypeScript/React component library
- Database schema (migrations)
- API stubs
- Authentication flows
- Compliance modules
```

#### **Step 2: Merge Back into WCAGAI**

```typescript
// packages/enterprise/ - NEW folder with Riff exports
├── teams/             # Team management services
├── rbac/              # Role-based access control
├── compliance/        # SOC2/HIPAA/GDPR frameworks
├── crm/               # HubSpot sync services
├── analytics/         # Customer success analytics
└── billing/           # Enhanced billing (Riff's usage model)

// packages/api/ - Keep existing code, add Riff integration
├── src/
│   ├── routes/
│   │   └── enterprise/    # New routes powered by Riff
│   ├── services/
│   │   ├── orchestration/ # Existing (PuppeteerService, etc)
│   │   └── enterprise/    # NEW (from Riff)
│   └── middleware/
│       ├── auth/          # Update to use Riff auth
│       └── rbac/          # Add Riff RBAC
```

#### **Step 3: Update API to Support Both**

```typescript
// packages/api/src/middleware/auth.ts - Enhanced
import { getRiffAuth } from '@riff/auth';
import { getRiffRBAC } from '@riff/rbac';

export async function authMiddleware(req, res, next) {
  // Support both old Clerk auth AND new Riff auth
  const auth = req.headers.authorization ?
    await verifyClerkToken(req.headers.authorization) :
    await getRiffAuth().verify(req);

  req.user = auth.user;
  req.tenantId = auth.tenantId;
  req.roles = await getRiffRBAC().getRoles(auth.user.id);

  next();
}

// Same API endpoints, now with Riff RBAC
```

#### **Step 4: Feature Flag Gradual Rollout**

```typescript
// Use LaunchDarkly for gradual Riff rollout
const useRiffTeams = launchDarkly.variation(
  'use-riff-teams',
  req.user.id,
  false // Default to old system
);

if (useRiffTeams) {
  // Use Riff team service
  const teams = await riffTeamService.getUserTeams(userId);
} else {
  // Use old multi-tenant logic
  const teams = await prisma.client.findMany({...});
}
```

---

## Detailed Timeline: 10 Weeks to Enterprise WCAGAI

### **Week 1: Hardening (40 hours)**
- Performance: Connection pooling + Redis caching
- API: Versioning + OpenAPI docs
- Security: Rate limiting + audit logs + encryption
- Observability: Health dashboard + status page
- Integration: Webhooks + CLI (POC)

**Result:** 48% → 76% enterprise-ready

### **Weeks 2-3: Riff Architecture (60 hours)**
- Set up Riff development environment
- Design enterprise data models (teams, RBAC, compliance)
- Implement team management in Riff
- Build RBAC permission engine
- Create SOC2/HIPAA compliance checklists

**Result:** Riff handles all "boring" enterprise stuff

### **Week 4: CRM & Customer Success (40 hours)**
- HubSpot integration (bidirectional sync)
- Customer health score calculation
- Usage analytics
- CSM dashboard
- Churn prediction alerts

**Result:** Sales/CS team can operate independently

### **Week 5: Analytics & Billing (40 hours)**
- Usage-based billing calculations
- Revenue attribution
- Customer lifetime value (CLV)
- Cohort analysis
- Predictive revenue forecasting

**Result:** Financial/ops team have visibility

### **Week 6: Code Export & Merging (30 hours)**
- Export from Riff as TypeScript
- Merge into `packages/enterprise/`
- Update middleware for Riff auth
- Set up feature flags for gradual rollout
- Database migrations

**Result:** Both systems coexist peacefully

### **Week 7: Integration Testing (30 hours)**
- Test Riff + Current system together
- Verify WCAGAI scanning still works
- Test auth migration path (Clerk → Riff)
- Load testing with both systems
- Security audit

**Result:** Production-ready hybrid system

### **Week 8: Launch Riff Features (20 hours)**
- Enable Riff features for beta customers
- Migrate 5% of customers to Riff
- Monitor and fix issues
- Gather feedback

**Result:** 5% of customers on enterprise features

### **Weeks 9-10: Healthcare Vertical (40 hours)**
- Build HIPAA-specific compliance checklist
- Add telemedicine accessibility templates
- Create "Medical Practices" vertical in discovery
- Marketing site for healthcare
- Healthcare-specific pricing tier

**Result:** "WCAGAI Healthcare" as product line

---

## Healthcare Vertical Opportunity

### **Why Healthcare is a Big Win**

```
Market Size:
├─ 400,000+ medical/dental practices in US
├─ Average 5-50 employees (your sweet spot)
├─ HIGH compliance pressure (HIPAA)
├─ HIGH lawsuit risk (patient data = sensitive)
└─ WILLING TO PAY for compliance

Revenue Potential:
├─ Per-practice: $5,000-$15,000 per year
├─ If you capture 0.5% = 2,000 practices
├─ At $10K average = $20M annual revenue
└─ Your consulting margin = 60-70%
```

### **What Makes Healthcare Different**

```
Standard WCAGAI
├─ Target: 20-400 employee companies
├─ Focus: WCAG compliance
├─ Pain: "Website doesn't work for disabled people"
└─ Price: $2,999 per site

WCAGAI Healthcare Edition
├─ Target: Medical practices, clinics, hospitals
├─ Focus: WCAG + HIPAA + ADA (Americans with Disabilities Act)
├─ Pain: "Patient data at risk" + "Legal liability"
└─ Price: $5,000-$15,000 per year
```

### **Healthcare Features to Build**

```
Vertical-Specific Modules:
├─ HIPAA Compliance Dashboard
│  ├─ Data residency checks
│  ├─ Encryption validation
│  ├─ Access logs
│  └─ Business associate agreement (BAA) template
│
├─ Medical Form Accessibility
│  ├─ Patient intake forms
│  ├─ Insurance claim forms
│  ├─ Prescription forms
│  └─ Consent forms
│
├─ Telemedicine Platform Audit
│  ├─ Video captioning
│  ├─ Screen reader testing
│  ├─ Keyboard navigation
│  └─ Patient portal accessibility
│
├─ Integration with EHR Systems
│  ├─ Epic integration
│  ├─ Athena Practice Management
│  ├─ FHIR API compliance
│  └─ HL7 standards
│
└─ Medical Device Accessibility (FDA)
   ├─ FDA accessibility requirements
   ├─ Device-specific templates
   ├─ Regulatory checklist
   └─ Documentation for submissions
```

### **Healthcare Go-to-Market**

```
Phase 1: Partner with Healthcare Consultants
├─ Dental network associations
├─ Medical practice management groups
├─ Healthcare compliance firms
└─ Result: 200-500 warm leads

Phase 2: Content Marketing
├─ "HIPAA Accessibility Audit Checklist"
├─ "Telemedicine ADA Compliance Guide"
├─ "Patient Portal Best Practices"
└─ Result: SEO traffic + thought leadership

Phase 3: Vertical-Specific Pricing
├─ Basic: $99/month (accessibility only)
├─ Professional: $299/month (HIPAA + accessibility)
├─ Enterprise: $999/month (full compliance + support)
└─ Result: $250K+ monthly recurring revenue

Phase 4: Partner Integrations
├─ Epic practice management system
├─ Google Health/Apple Health
├─ Stripe for healthcare billing
└─ Result: Sticky, hard to leave
```

---

## Key Decision: What NOT to Do in Riff

### **Don't Rebuild These (Already Good)**

❌ **Prospect Discovery Engine**
- You've built solid ML models for risk scoring
- Geographic/industry data is accurate
- No benefit to rewriting in Riff

❌ **Accessibility Scanning**
- Puppeteer + axe-core is production-proven
- Your confidence scoring works
- Riff doesn't help here

❌ **Report Generation**
- Your PDF templates are good
- VPAT reports are correct
- Riff's generic PDF is worse

❌ **Scanning Queue System**
- Your Bull + Redis setup is solid
- Production reliability layer is done
- Riff's async isn't better for your use case

### **DO Rebuild These (Riff Shines)**

✅ **Team Management**
- Riff's RBAC is industry-standard
- Permission matrix is easier than custom
- Organization hierarchy is built-in

✅ **Compliance Frameworks**
- Riff has SOC2/HIPAA/GDPR templates
- Regulatory checklists pre-built
- Audit trail automatic

✅ **CRM Integration**
- HubSpot sync is complex
- Riff handles bi-directional sync
- Deal pipeline automation included

✅ **Customer Analytics**
- Usage dashboards save months
- Cohort analysis built-in
- Churn prediction included

✅ **Multi-Tenant Billing**
- Riff's usage-based billing is production-ready
- Stripe integration is baked in
- Invoice generation automatic

---

## Final Architecture: WCAGAI Enterprise

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Dashboard (React)                    │
│  • Consultant UI (approve violations)                       │
│  • Admin UI (Riff teams, settings)                          │
│  • Client Portal (view scans)                               │
│  • Analytics (via Riff)                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
       ┌───────────────────┴────────────────────┐
       │                                        │
┌──────▼──────────────────────┐      ┌────────▼────────────────────┐
│   WCAGAI Core API           │      │  Riff Enterprise API        │
│  (Node.js/Express)          │      │  (Team, RBAC, Compliance)   │
├─────────────────────────────┤      ├─────────────────────────────┤
│ • Prospect Discovery        │      │ • Team Management           │
│ • Accessibility Scanning    │      │ • Role-Based Access Control │
│ • Risk Scoring              │      │ • Compliance Dashboard      │
│ • Report Generation         │      │ • CRM Integration           │
│ • Scan Orchestration        │      │ • Customer Analytics        │
│ • Webhook Support           │      │ • Usage-Based Billing       │
└──────┬──────────────────────┘      └────────┬────────────────────┘
       │                                      │
       └──────────────┬───────────────────────┘
                      │
       ┌──────────────┼──────────────┐
       │              │              │
    ┌──▼──┐       ┌──▼──┐       ┌──▼──┐
    │  DB │       │Cache│       │HubSp│
    │(PG)│       │(RDS)│       │  CRM│
    └─────┘       └─────┘       └─────┘
```

---

## Budget & Cost Estimates

### **Time Investment**
```
Week 1 (Hardening):        40 hours  ($2,000-4,000)
Weeks 2-5 (Riff):         160 hours  ($8,000-16,000)
Weeks 6-8 (Integration):  80 hours   ($4,000-8,000)
Weeks 9-10 (Healthcare):  40 hours   ($2,000-4,000)
────────────────────────────────────────────────────
TOTAL:                    320 hours  ($16,000-32,000)

If solo developer: 8 weeks full-time
If team of 2: 4-5 weeks
```

### **Infrastructure Costs (Monthly)**
```
Current Stack:
├─ Railway (backend): $50-100
├─ Vercel (frontend): $10-20
├─ PostgreSQL: $30-50
├─ Redis: $10-20
├─ Sentry: $30
└─ AWS S3: $5-10
────────────────────────
Current Total: ~$135-230/month

With Riff:
├─ Riff (team + compliance): $500-2,000
├─ HubSpot integration: $100-300
├─ Enhanced analytics: +$200
├─ Railway + Vercel: $50-100
├─ Database/cache: $40-70
└─ Monitoring: $50
────────────────────────
New Total: ~$1,000-2,500/month

ROI: Justifies at 3-5 enterprise customers
     (at $5K/customer/year = $15K/year ≈ $1,250/month)
```

---

## Success Metrics: Post-Launch

### **Technical Metrics**
- API uptime: 99.5%+ (SLA tracking)
- P95 response time: <200ms
- Queue success rate: >99%
- Audit logs: 100% coverage

### **Business Metrics**
- Enterprise customers: 10+ (willing to pay for RBAC/compliance)
- Healthcare practices: 50+ (new vertical)
- Monthly recurring revenue: $25K+ (from enterprise tiers)
- Customer NPS: 70+

### **Product Metrics**
- Compliance readiness: 95%+ (SOC2 audit-ready)
- Team adoption: 80%+ (using RBAC)
- CRM integration: 100% data sync success
- Healthcare features: Used by >70% of healthcare customers

---

## Next Steps to Execute

### **Immediately (This Week)**
1. ✅ Run 1-week enterprise hardening sprint (ENTERPRISE_SPRINT_1WEEK.md)
2. Deploy to production
3. Monitor for 1 week

### **Week 2**
4. Set up Riff development environment
5. Design enterprise data models
6. Start Riff prototype for team management

### **Weeks 3-5**
7. Build enterprise features in Riff
8. Test integrations

### **Weeks 6-8**
9. Export and merge code
10. Migration planning for existing customers

### **Weeks 9-10**
11. Launch healthcare vertical
12. Go-to-market for healthcare

---

**You're positioned to own the accessibility consulting space. Let's build it.** 🚀
