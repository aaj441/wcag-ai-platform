# Production Readiness Implementation

This document describes the production-ready features implemented for the WCAG AI Platform.

## Overview

The platform has been upgraded with enterprise-grade features for production deployment:

- ✅ **Database Integration**: Prisma ORM with PostgreSQL
- ✅ **Authentication**: Clerk-based user authentication
- ✅ **Multi-Tenancy**: Tenant isolation and API key validation
- ✅ **Payment Processing**: Stripe webhook integration
- ✅ **Email Service**: SendGrid transactional emails
- ✅ **Error Tracking**: Sentry integration
- ✅ **CI/CD**: Automated testing and deployment

## Architecture

### Database Layer (Prisma + PostgreSQL)

The platform uses Prisma ORM for type-safe database access with PostgreSQL.

**Key Models:**
- `Client` - Multi-tenant client accounts with subscription tiers
- `Scan` - WCAG accessibility scans with AI confidence scoring
- `Violation` - Individual WCAG violations detected in scans
- `ReviewLog` - Audit trail for consultant reviews
- `Consultant` - Consultant profiles and performance metrics

**Setup:**
```bash
# Install dependencies
cd packages/api
npm install

# Set up database
export DATABASE_URL="postgresql://user:password@localhost:5432/wcag_ai"
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### Authentication & Authorization

**Clerk Integration:**
- User authentication via Clerk
- Session management
- Organization-based multi-tenancy

**API Key Authentication:**
- Each client receives a unique API key on onboarding
- API key format: `wcag_<64_hex_characters>`
- Keys are validated via middleware for tenant isolation

**Usage:**
```typescript
// Clerk authentication (for dashboard/UI)
import { requireAuth } from './middleware/auth';
app.use('/api/protected', requireAuth);

// API key authentication (for programmatic access)
import { apiKeyAuth } from './middleware/tenant';
app.use('/api/scans', apiKeyAuth);
```

### Multi-Tenancy

All database queries are automatically scoped to the authenticated tenant:

```typescript
// Tenant ID is extracted from API key or Clerk session
req.tenantId // e.g., "client_abc123"

// All queries filter by clientId
const scans = await prisma.scan.findMany({
  where: { clientId: req.tenantId }
});
```

### Payment Processing (Stripe)

Stripe webhook integration handles subscription lifecycle:

**Supported Events:**
- `customer.subscription.created` - New subscription activated
- `customer.subscription.updated` - Subscription tier changed
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Payment successful, reset scan quota
- `invoice.payment_failed` - Payment failed, suspend account

**Webhook Endpoint:**
```
POST /api/webhooks/stripe
```

**Configuration:**
```bash
export STRIPE_SECRET_KEY="sk_live_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
export STRIPE_PRICE_ID_STARTER="price_..."
export STRIPE_PRICE_ID_PRO="price_..."
export STRIPE_PRICE_ID_ENTERPRISE="price_..."
```

### Email Service (SendGrid)

Transactional emails with retry logic:

**Email Templates:**
1. **Onboarding Confirmation** - Welcome email with API key
2. **SLA Alerts** - Notify consultants of pending reviews
3. **Report Notifications** - Client reports ready for download

**Features:**
- Automatic retry with exponential backoff (3 attempts)
- HTML and plain text versions
- Professional branded templates

**Configuration:**
```bash
export SENDGRID_API_KEY="SG...."
export SENDER_EMAIL="noreply@wcag-ai.com"
```

**Usage:**
```typescript
import { sendOnboardingEmail } from './services/emailService';

await sendOnboardingEmail(
  email: 'client@example.com',
  company: 'Acme Corp',
  apiKey: 'wcag_abc123...',
  tier: 'pro'
);
```

### Error Tracking (Sentry)

Production error monitoring and performance tracking:

**Features:**
- Automatic error capture
- Performance monitoring
- Request tracing
- User context

**Configuration:**
```bash
export SENTRY_DSN="https://...@sentry.io/..."
```

**Server Integration:**
```typescript
import { initSentry, addSentryErrorHandler } from './services/sentry';

// Initialize (must be first)
initSentry(app);

// ... routes ...

// Error handler (must be last)
addSentryErrorHandler(app);
```

### Health Checks

Enhanced health check with database connectivity:

**Endpoint:**
```
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "WCAG AI Platform API is running",
  "timestamp": "2025-11-12T13:00:00.000Z",
  "environment": "production",
  "database": "connected"
}
```

## Environment Variables

Complete `.env` configuration:

```bash
# Server
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@host:5432/wcag_ai

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_ENTERPRISE=price_...

# SendGrid Email Service
SENDGRID_API_KEY=SG....
SENDER_EMAIL=noreply@wcag-ai.com

# Sentry Error Tracking
SENTRY_DSN=https://...@sentry.io/...

# CORS
CORS_ORIGIN=https://app.wcag-ai.com

# Logging
LOG_LEVEL=info
```

## API Routes

### Client Management

```
POST   /api/clients/onboard    - Create new client account
GET    /api/clients            - List all clients (admin)
GET    /api/clients/:id        - Get client details
PATCH  /api/clients/:id/scans  - Update scan quota
```

### Scans & Violations

```
GET    /api/violations         - List violations (filtered by tenant)
GET    /api/violations/stats   - Violation statistics
```

### Reports

```
POST   /api/reports/generate   - Generate compliance report
POST   /api/reports/draft/:id  - Generate report from draft
```

### Webhooks

```
POST   /api/webhooks/stripe    - Stripe subscription events
```

## Client Onboarding Flow

1. **Client Registration:**
   ```bash
   POST /api/clients/onboard
   {
     "email": "client@example.com",
     "company": "Acme Corp",
     "tier": "pro"
   }
   ```

2. **System Actions:**
   - Generate unique API key
   - Create database record
   - Send welcome email with API key
   - Initialize scan quota based on tier

3. **Client Receives:**
   - Welcome email with API key
   - Access to API documentation
   - Initial scan quota

## Subscription Tiers

| Tier | Scans/Month | Price | Features |
|------|-------------|-------|----------|
| Free | 5 | $0 | Basic scanning |
| Starter | 20 | TBD | Email support |
| Pro | 100 | TBD | Priority support, SLA |
| Enterprise | Unlimited | TBD | Dedicated consultant, custom SLA |

## Monitoring & Observability

### Sentry Integration
- Real-time error tracking
- Performance monitoring
- Release tracking
- User feedback

### Health Monitoring
- Database connectivity checks
- API availability monitoring
- Response time tracking

### Logging
- Structured logging with Winston
- Request/response logging
- Error logging with stack traces

## CI/CD Pipeline

### Pull Request Checks (`.github/workflows/pr-checks.yml`)
- TypeScript type checking
- Build verification
- Linter checks
- Security audits

### Production Deployment (`.github/workflows/production-deploy.yml`)
- Security scanning (GitGuardian, Trivy, Snyk)
- Full test suite
- Docker image builds
- Railway deployment

**Branch Protection:**
- PR checks must pass before merge
- Type errors block deployment
- Build failures prevent merge

## Security Considerations

1. **API Keys**: Never expose API keys in client-side code
2. **Webhook Validation**: All webhooks verify signatures
3. **Database**: Use connection pooling and prepared statements
4. **CORS**: Restrict to known origins in production
5. **Rate Limiting**: Implement rate limiting on public endpoints
6. **Input Validation**: Validate all user inputs
7. **Secret Management**: Use environment variables, never commit secrets

## Deployment Checklist

- [ ] Set all required environment variables
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Configure Stripe webhook URL
- [ ] Set up Sentry project
- [ ] Configure SendGrid sender verification
- [ ] Set up Clerk application
- [ ] Configure CORS allowed origins
- [ ] Enable database connection pooling
- [ ] Set up monitoring alerts
- [ ] Test webhook endpoints
- [ ] Verify email delivery

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# Check Prisma client generation
npx prisma generate
```

### Email Not Sending
```bash
# Verify SendGrid API key
curl -X "GET" "https://api.sendgrid.com/v3/user/profile" \
  -H "Authorization: Bearer $SENDGRID_API_KEY"
```

### Webhook Not Working
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

## Support

For issues or questions:
- Documentation: https://docs.wcag-ai.com
- Support: support@wcag-ai.com
- GitHub Issues: https://github.com/aaj441/wcag-ai-platform/issues
