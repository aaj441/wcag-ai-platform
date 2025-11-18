# GTM Execution System - Complete Implementation Guide

This guide covers the complete go-to-market (GTM) execution system with all three phases: Automated Outbound, Content Marketing, and Sales Scaling.

## Overview

The GTM system is structured around three integrated phases that work together to drive customer acquisition:

- **Phase 1: Automated Outbound** - Prospect discovery, email automation, lead tracking
- **Phase 2: Content Marketing** - Blog posts, case studies, SEO landing pages
- **Phase 3: Sales Scaling** - CRM integration, sales playbooks, deal management

## System Architecture

### Core Services

1. **EmailService** (`packages/api/src/services/emailService.ts`)
   - Multi-provider support (Resend, SendGrid, Mailgun)
   - Email tracking (sent, delivered, opened, clicked, bounced)
   - Bulk email capability
   - Webhook handling for tracking events

2. **LeadTrackingService** (`packages/api/src/services/leadTrackingService.ts`)
   - Prospect lifecycle management
   - Status flow: discovered → contacted → engaged → audited → negotiating → customer
   - Email event tracking
   - MRR projections and funnel metrics
   - Deal progression tracking

3. **ContentService** (`packages/api/src/services/contentService.ts`)
   - Template-based content generation
   - Blog posts with industry-specific content
   - Case study templates
   - SEO landing page creation
   - Content calendar planning
   - Performance metrics tracking

4. **CrmService** (`packages/api/src/services/crmService.ts`)
   - HubSpot API integration foundation
   - Contact syncing
   - Deal creation and management
   - Sales playbooks per industry
   - Objection handlers
   - Closing techniques

5. **ProspectScoringService** (`packages/api/src/services/prospectScoringService.ts`)
   - ICP fit scoring (0-30 points)
   - Website quality assessment (0-20 points)
   - Company signals evaluation (0-20 points)
   - Urgency indicators scoring (0-20 points)
   - Tech adoption assessment (0-10 points)
   - Overall scoring and prioritization

### API Routes

All endpoints are accessible via `/api/gtm`:

#### Phase 1: Automated Outbound

- `POST /api/gtm/phase1/send-campaign` - Execute email campaign
  - Request: `{ prospectIds, icpId, personaRole, dryRun }`
  - Response: Campaign results with metrics

- `GET /api/gtm/phase1/metrics` - Get Phase 1 performance metrics
  - Response: Funnel stats, email performance, MRR projection

#### Phase 2: Content Marketing

- `POST /api/gtm/phase2/create-content` - Create content assets
  - Request: `{ contentType, industry, template, data }`
  - Response: Generated content with performance estimates

- `GET /api/gtm/phase2/calendar` - Get content calendar
  - Response: 3-month calendar with performance metrics

#### Phase 3: Sales Scaling

- `GET /api/gtm/phase3/playbooks` - Get available playbooks
  - Response: List of industry-specific sales playbooks

- `POST /api/gtm/phase3/move-prospect` - Advance prospect in pipeline
  - Request: `{ prospectId, newStatus, dealSize, expectedClose }`
  - Response: Updated prospect status and MRR projection

#### Unified Dashboard

- `GET /api/gtm/dashboard` - Get unified GTM dashboard
  - Response: Metrics from all three phases, KPIs, top opportunities

- `POST /api/gtm/execute-month` - Get monthly execution plan
  - Response: Month-based execution plan with weekly breakdown

## Phase Details

### Phase 1: Automated Outbound

**Goal:** Get 100 qualified leads/month through targeted email campaigns

**Key Metrics:**
- Prospects discovered: 1000/week
- Email open rate: 25%
- Click-through rate: 5%
- Conversion to audit request: 5%
- Expected conversions: 15-20/month

**Email Sequences:**
- Industry-specific sequences with proven templates
- Multi-step sequences (follow-ups over 7-14 days)
- Template variables for personalization
- Tracking of engagement metrics

**Lead Tracking:**
```typescript
// Add a prospect
leadTracking.addProspect({
  id: 'prospect-001',
  companyName: 'Dental Plus Practice',
  email: 'contact@dentalplus.com',
  industry: 'Dental',
  status: 'discovered'
});

// Track email events
leadTracking.trackEmailEvent('prospect-001', 'sent');
leadTracking.trackEmailEvent('prospect-001', 'opened');
leadTracking.trackEmailEvent('prospect-001', 'clicked');

// Get metrics
const metrics = leadTracking.getFunnelStats();
const emailMetrics = leadTracking.getEmailMetrics();
const mrrProjection = leadTracking.getMRRProjection();
```

**Prospect Scoring:**
```typescript
const score = scoreProspect({
  prospectId: 'prospect-001',
  companyName: 'Dental Plus Practice',
  industry: 'Dental',
  employeeCount: 15,
  revenue: 2500000,
  website: {
    wcagScore: 30,
    mobileScore: 45,
    performanceScore: 55,
    lastUpdated: new Date('2023-01-01')
  },
  signals: {
    hasRecentFunding: true,
    hasNewHire: true,
    isHiring: false,
    hasNewWebsiteProject: true,
    hasMultipleLocations: false,
    hasEcommerce: false
  },
  urgency: {
    hasADADemandLetter: false,
    hasRecentLawsuit: false,
    hasHighTrafficLoss: false,
    competeHasNewSite: false,
    industryLitigationTrend: true
  },
  tech: {
    hasCloudServices: true,
    hasAnalytics: true,
    hasMarketingAutomation: false,
    hasAPI: false
  }
});

console.log(`Score: ${score.overallScore}/100`);
console.log(`Recommendation: ${score.recommendation}`);
console.log(`Deal Size: $${score.estimatedDealSize}`);
console.log(`Flags: ${score.hotFlags.join(', ')}`);
```

### Phase 2: Content Marketing

**Goal:** Get 500 inbound leads/month through content marketing

**Key Metrics:**
- Blog posts per month: 5
- Case studies per month: 2
- Landing pages per month: 3
- Expected views: 50,000/month
- Expected leads: 2,500/month

**Content Types:**

1. **Blog Posts**
   - WCAG Basics (industry-specific)
   - ADA Lawsuit trends
   - SEO + Accessibility benefits
   - Implementation guides

2. **Case Studies**
   - Before/after compliance metrics
   - Customer testimonials
   - ROI calculations
   - Implementation timelines

3. **SEO Landing Pages**
   - Industry-specific compliance guides
   - Keyword-targeted content
   - Lead capture forms
   - FAQ sections

**Usage:**
```typescript
const contentService = new ContentService();

// Create blog post
const blog = contentService.createBlogPost('wcag-basics', {
  industry: 'Dental'
});
// Output: WCAG 2.2 Basics: What Every Dental Business Needs to Know

// Create case study
const caseStudy = contentService.createCaseStudy(
  'Dental Plus Practice',
  'Dental',
  { violationsFixed: 125, complianceScore: 95, implementationTime: 72 }
);
// Output: Case study with metrics and customer results

// Create landing page
const lp = contentService.createLandingPage(
  'Dental',
  'WCAG compliance for dental practices',
  'Dental Practice Accessibility Guide'
);
// Output: SEO-optimized landing page

// Get calendar
const calendar = contentService.getContentCalendar(3); // 3 months
// Returns: 3-month content plan with scheduled pieces

// Get performance
const performance = contentService.getContentPerformance();
// Returns: views, engagement, top posts
```

### Phase 3: Sales Scaling

**Goal:** Reach $50K MRR by Q2 2026

**Key Metrics:**
- Sales playbooks: 2 (Medical/Dental, Law Firms)
- Sales team: 1 founder + 2 SDRs initially
- Average deal size: $6,000 - $10,000/month
- Sales cycle: 30-45 days
- Closing rate: 15%

**Sales Playbooks:**

1. **Medical & Dental Practices Playbook**
   - Persona: Practice owner/manager
   - Pain points: Patient experience, compliance risk, legal exposure
   - Decision timeline: 2-3 weeks
   - Objection handlers: "Website works fine", "Can't afford it", "Too complicated"
   - Closing techniques: Trial close, urgency close, alternative close, assumptive close

2. **Law Firms Playbook**
   - Persona: Managing partner/firm founder
   - Pain points: Client perception, ADA risk, competitive disadvantage
   - Decision timeline: 3-4 weeks
   - Objection handlers: Same as dental
   - Closing techniques: Same as dental

**Sales Pipeline Stages:**
1. Prospecting (0-3 days) - Initial outreach, qualification
2. Awareness (3-7 days) - Product education, problem validation
3. Evaluation (7-21 days) - Demo, proposal, discussion
4. Negotiation (21-45 days) - Pricing, implementation planning, contract

**Usage:**
```typescript
const salesPlaybook = new SalesPlaybookService();

// Get all playbooks
const playbooks = salesPlaybook.getAllPlaybooks();

// Move prospect through pipeline
leadTracking.updateProspectStatus('prospect-001', 'engaged');
leadTracking.updateProspectStatus('prospect-001', 'audited');
leadTracking.startNegotiation(
  'prospect-001',
  6000, // deal size
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // expected close
);

// Get sales metrics
const metrics = leadTracking.getMRRProjection();
console.log(`Current MRR: $${metrics.currentMRR}`);
console.log(`Projected MRR: $${metrics.projectedMRR}`);
console.log(`Customers: ${metrics.customers}`);
console.log(`In Negotiation: ${metrics.negotiating}`);
```

## Execution Timeline

### Month 1 - Foundation
**Phase 1:** Discover 1000 prospects, execute first email campaign
**Phase 2:** Create 5 blog posts, 1 case study, design landing pages
**Phase 3:** Document playbooks, set up CRM integration plan

### Month 2 - Momentum
**Phase 1:** Scale email campaigns, track engagement, request audits
**Phase 2:** Publish 5 more blog posts, 2 case studies, optimize landing pages
**Phase 3:** Hire SDRs, begin sales pipeline management

### Month 3 - Growth
**Phase 1:** 100+ qualified leads in pipeline
**Phase 2:** 15+ content pieces live, organic traffic increasing
**Phase 3:** First customers closing, MRR reaching $5-10K

## Database Models (Prisma)

When moving from in-memory to database persistence:

```prisma
model Prospect {
  id        String    @id @default(cuid())
  companyName String
  email     String    @unique
  industry  String
  status    ProspectStatus

  // Lead tracking
  emailsSent    Int @default(0)
  emailsOpened  Int @default(0)
  emailsClicked Int @default(0)

  // Deal info
  estimatedDealSize    Int?
  closingProbability   Float?
  expectedCloseDate    DateTime?

  // Content
  contentAssets ContentAsset[]
  emailEvents   EmailEvent[]

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model EmailEvent {
  id         String @id @default(cuid())
  prospectId String
  prospect   Prospect @relation(fields: [prospectId], references: [id])

  eventType  EmailStatus
  timestamp  DateTime @default(now())
}

model ContentAsset {
  id        String @id @default(cuid())
  prospectId String
  prospect   Prospect @relation(fields: [prospectId], references: [id])

  type      String // blog, case-study, landing-page
  title     String
  content   String
  views     Int @default(0)

  createdAt  DateTime @default(now())
  publishedAt DateTime?
}
```

## Environment Configuration

```env
# Email Service
RESEND_API_KEY=your_resend_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain

# HubSpot
HUBSPOT_API_KEY=your_hubspot_api_key

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=*
```

## Testing

Run the comprehensive GTM demo:

```bash
npx tsx scripts/gtm-demo.ts
```

This demonstrates:
- Phase 1: Prospect discovery, scoring, email campaign execution
- Phase 2: Content creation and calendar planning
- Phase 3: Sales playbooks and pipeline management
- Unified dashboard aggregating all metrics

## Integration Points

### Email Providers
- Resend (preferred for startup)
- SendGrid (enterprise option)
- Mailgun (budget option)

### CRM
- HubSpot (primary integration)
- Custom API layer for abstraction

### Analytics
- Prospect scoring API
- Email tracking webhooks
- Content performance metrics

### Content Distribution
- Blog hosting (WordPress, Ghost, Webflow)
- Landing page builders (Leadpages, Instapage, custom HTML)
- Email delivery (via Email Service)

## Performance Targets

### Phase 1
- Email open rate: 25%
- Click-through rate: 5%
- Audit request rate: 5% of emails
- Conversion rate (audit to customer): 15%

### Phase 2
- Blog posts: 50,000+ views/month
- Case studies: 10,000+ views/month
- Landing pages: 50,000+ impressions/month
- Content lead generation: 2,500 leads/month

### Phase 3
- Sales cycle: 30-45 days
- Closing rate: 15%
- Average deal size: $6,000 - $10,000/month
- Revenue: $50K MRR by Q2 2026

## Troubleshooting

### Email Delivery Issues
1. Check API keys are correctly configured
2. Verify sender email is whitelisted
3. Check email templates are valid
4. Monitor delivery notifications

### Lead Scoring Problems
1. Ensure all required fields are provided
2. Check website scores are reasonable (0-100)
3. Verify urgency indicators are accurate
4. Review company signal detection

### Content Performance
1. Monitor SEO metrics via Google Search Console
2. Track conversion rates from content
3. A/B test landing page variations
4. Optimize based on engagement data

### Sales Pipeline
1. Ensure stages match playbook definitions
2. Verify deal size estimates
3. Track sales activity regularly
4. Update close dates based on progress

## Next Steps

1. **Database Migration**
   - Move from in-memory to Prisma ORM
   - Set up PostgreSQL or similar
   - Create initial data models

2. **API Enhancements**
   - Add authentication (API keys, OAuth)
   - Implement rate limiting
   - Add comprehensive error handling

3. **Real Integrations**
   - Connect to actual Resend API
   - Integrate with HubSpot CRM
   - Set up webhook handlers

4. **User Interface**
   - Build GTM dashboard UI
   - Create prospect management dashboard
   - Add content creation interface

5. **Automation**
   - Scheduled email campaigns
   - Content publishing automation
   - Lead scoring batch jobs

## Support

For questions or issues with the GTM system:
1. Check this documentation
2. Review example code in `/scripts/gtm-demo.ts`
3. Check service implementations in `/packages/api/src/services/`
4. Review API endpoints in `/packages/api/src/routes/gtmExecution.ts`
