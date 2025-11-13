# WCAG AI Platform - Environment Configuration Guide

## Overview

This guide covers setting up all required environment variables for production deployment of WCAG AI Platform with PostgreSQL, Clerk auth, Stripe billing, and email services.

## 1. PostgreSQL Database Configuration

### Local Development
```bash
# Using local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/wcag_ai_dev"
```

### Production (Heroku PostgreSQL)
```bash
# Auto-provided by Heroku, but format is:
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
```

### Production (AWS RDS)
```bash
# AWS RDS PostgreSQL
DATABASE_URL="postgresql://admin:SecurePassword123@wcag-db.cgfhjk.us-east-1.rds.amazonaws.com:5432/wcag_ai_prod?sslmode=require"
```

### Production (Railway.app)
```bash
# Railway auto-generates this when you add PostgreSQL
DATABASE_URL="postgresql://..." # Retrieved from Railway dashboard
```

**Prisma Configuration:**
```
# prisma/.env (generated from main .env)
DATABASE_URL="postgresql://..."
```

## 2. Clerk Authentication Configuration

### Setup Steps
1. Create account at https://clerk.com
2. Create new application
3. Copy credentials to .env

### Environment Variables
```bash
# Clerk Frontend API (public, safe to expose)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxxxx"

# Clerk Secret Key (KEEP SECRET - server-side only)
CLERK_SECRET_KEY="sk_live_xxxxx"

# Clerk JWT template name (optional, for API authentication)
CLERK_JWT_KEY="default"
```

### Clerk Setup Checklist
- [ ] Create Clerk account at https://clerk.com
- [ ] Create new application (select "Express" if deploying standalone API)
- [ ] Configure JWT session token (Settings → Sessions → JWT Claims)
- [ ] Add JWT custom claims:
  ```json
  {
    "tenantId": "{{user.primary_email_address}}",
    "role": "{{user.public_metadata.role}}"
  }
  ```
- [ ] Configure allowed origins (Settings → API Keys):
  - Local: `http://localhost:3000`, `http://localhost:3001`
  - Production: `https://yourdomain.com`
- [ ] Set up user roles in Clerk dashboard (Settings → User & Organization → Roles):
  - `admin` - Full access
  - `client` - Limited to own scans
  - `viewer` - Read-only access

### Integrating Clerk in Your App

```typescript
// packages/api/src/middleware/auth.ts
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';

export const requireAuth = ClerkExpressRequireAuth();

// Use in routes:
// router.post('/scans', requireAuth, (req, res) => { ... });
```

## 3. Stripe Billing Configuration

### Setup Steps
1. Create account at https://stripe.com
2. Create products and prices
3. Set up webhook endpoint

### Environment Variables
```bash
# Stripe Test Mode (for development)
STRIPE_PUBLISHABLE_KEY="pk_test_xxxxx"
STRIPE_SECRET_KEY="sk_test_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_test_xxxxx"

# Stripe Live Mode (for production - only after testing)
STRIPE_PUBLISHABLE_KEY="pk_live_xxxxx"
STRIPE_SECRET_KEY="sk_live_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_live_xxxxx"
```

### Stripe Product & Price Setup

```bash
# Create products via Stripe Dashboard or CLI

# Product 1: WCAG Audit - Basic
Name: "WCAG Audit - Basic"
Description: "Automated accessibility audit for 1-5 pages"
Price: $5,000 USD
Billing Cycle: One-time (not recurring for MVP)
Price ID: price_basic_1234567890

# Product 2: WCAG Audit - Enhanced
Name: "WCAG Audit - Enhanced"
Description: "Comprehensive audit + remediation roadmap for 6-15 pages"
Price: $7,500 USD
Billing Cycle: One-time
Price ID: price_enhanced_1234567890

# Product 3: WCAG Audit - Enterprise
Name: "WCAG Audit - Enterprise"
Description: "Full accessibility strategy + implementation support"
Price: $15,000 USD (or custom quote)
Billing Cycle: One-time
Price ID: price_enterprise_1234567890
```

### Webhook Configuration

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint:
   - URL: `https://yourdomain.com/api/billing/webhook`
   - Version: Latest API version (2024-11-29 or later)
   - Events to send:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. Copy Webhook Secret to `STRIPE_WEBHOOK_SECRET`

### Stripe Testing

```bash
# Test card numbers (use with any future expiry date)
Successful payment: 4242 4242 4242 4242
Requires authentication: 4000 0025 0000 3155
Insufficient funds: 4000 0000 0000 0002
```

## 4. Email Service Configuration (SendGrid)

### Setup Steps
1. Create account at https://sendgrid.com
2. Create API key
3. Verify sender domain

### Environment Variables
```bash
# SendGrid API Key (KEEP SECRET)
SENDGRID_API_KEY="SG.xxxxx"

# Sender email address (must be verified in SendGrid)
SENDER_EMAIL="noreply@wcag-ai.com"

# Optional: Email verification for alerts
ALERT_EMAIL="alerts@yourdomain.com"
```

### Email Templates to Create in SendGrid

1. **Welcome Email** (for new clients)
   - Template ID: `d-xxxxx`
   - Variables: `{{firstName}}`, `{{apiKey}}`, `{{tier}}`

2. **Daily Report Email**
   - Template ID: `d-xxxxx`
   - Variables: `{{clientName}}`, `{{scannedWebsites}}`, `{{violations}}`, `{{reportUrl}}`

3. **Payment Confirmation**
   - Template ID: `d-xxxxx`
   - Variables: `{{amount}}`, `{{invoiceId}}`, `{{dueDate}}`

4. **Payment Failed Alert**
   - Template ID: `d-xxxxx`
   - Variables: `{{clientName}}`, `{{amount}}`, `{{retryDate}}`

### Environment Variables for Templates
```bash
# SendGrid Template IDs
SENDGRID_WELCOME_TEMPLATE_ID="d-xxxxx"
SENDGRID_DAILY_REPORT_TEMPLATE_ID="d-xxxxx"
SENDGRID_PAYMENT_CONFIRMATION_TEMPLATE_ID="d-xxxxx"
SENDGRID_PAYMENT_FAILED_TEMPLATE_ID="d-xxxxx"
```

## 5. Accessibility Testing Tools Configuration

### Optional: External Service APIs

```bash
# Axe DevTools API (for advanced automated scanning)
AXE_API_KEY="xxxxx"

# WebAIM API (for accessibility insights)
WEBAIM_API_KEY="xxxxx"

# Optional: GitHub for PR integration
GITHUB_TOKEN="ghp_xxxxx"
GITHUB_WEBHOOK_SECRET="xxxxx"
```

## 6. Monitoring & Logging Configuration

```bash
# Sentry Error Tracking
SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
SENTRY_ENVIRONMENT="production"

# Application Logging
LOG_LEVEL="info"  # debug, info, warn, error
LOG_FORMAT="json"  # json, text

# Datadog (optional)
DATADOG_API_KEY="xxxxx"
DATADOG_ENABLED="false"
```

## 7. Application Configuration

```bash
# Server
NODE_ENV="production"
PORT="3001"
CORS_ORIGIN="https://yourdomain.com,https://dashboard.yourdomain.com"

# API Configuration
API_BASE_URL="https://api.yourdomain.com"
DASHBOARD_URL="https://dashboard.yourdomain.com"
WEBSITE_URL="https://yourdomain.com"

# Scan Scheduler Configuration
SCAN_SCHEDULER_ENABLED="true"
SCAN_SCHEDULER_CRON="0 2 * * *"  # 2 AM daily UTC
MAX_SCANS_PER_DAY="500"

# Redis Cache (for scan queue and caching)
REDIS_URL="redis://localhost:6379"  # Local
# OR for production:
REDIS_URL="redis://:password@host:port"

# Session Configuration
SESSION_SECRET="your-secure-random-secret-32-chars-min"
SESSION_TIMEOUT="86400"  # 24 hours in seconds
```

## 8. Environment Files Setup

### Development (.env)
```bash
# Copy from template and customize for local development
cp packages/api/.env.example packages/api/.env

# Edit with:
DATABASE_URL="postgresql://postgres:password@localhost:5432/wcag_ai_dev"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxx"
CLERK_SECRET_KEY="sk_test_xxxxx"
STRIPE_SECRET_KEY="sk_test_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_test_xxxxx"
SENDGRID_API_KEY="SG.test_xxxxx"
NODE_ENV="development"
```

### Staging (.env.staging)
```bash
# Similar to production but with test credentials
NODE_ENV="staging"
DATABASE_URL="postgresql://staging_user:password@staging-host:5432/wcag_ai_staging"
STRIPE_SECRET_KEY="sk_test_xxxxx"  # Use test keys
SENDGRID_API_KEY="SG.test_xxxxx"  # Use sandbox
```

### Production (.env.production)
```bash
# NEVER commit this file - set via environment variables in deployment
NODE_ENV="production"
DATABASE_URL="postgresql://prod_user:secure_password@prod-host:5432/wcag_ai_prod"
STRIPE_SECRET_KEY="sk_live_xxxxx"  # Live Stripe keys only
STRIPE_WEBHOOK_SECRET="whsec_live_xxxxx"
SENDGRID_API_KEY="SG.prod_xxxxx"
CLERK_SECRET_KEY="sk_live_xxxxx"
# ... all other live keys
```

## 9. Deployment Environment Setup

### Heroku
```bash
# Set environment variables via Heroku CLI or dashboard
heroku config:set DATABASE_URL="postgresql://..."
heroku config:set STRIPE_SECRET_KEY="sk_live_xxxxx"
heroku config:set CLERK_SECRET_KEY="sk_live_xxxxx"
heroku config:set SENDGRID_API_KEY="SG.xxxxx"
```

### Railway.app
```bash
# Environment variables set in project dashboard
# Variables → Add Variable → Name/Value
# PostgreSQL plugin auto-provides DATABASE_URL
```

### AWS Lambda / Render
```bash
# Similar to Heroku - set via environment settings in dashboard
```

### Docker
```dockerfile
# Dockerfile uses ARG for build-time and ENV for runtime
ARG DATABASE_URL
ARG STRIPE_SECRET_KEY
ENV DATABASE_URL=$DATABASE_URL
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
```

## 10. Secrets Management Best Practices

### DO
- [ ] Use `.env.example` to document all required variables (without secrets)
- [ ] Store sensitive keys in secure vaults (HashiCorp Vault, AWS Secrets Manager)
- [ ] Rotate API keys every 90 days
- [ ] Use separate keys for dev/staging/production
- [ ] Enable 2FA on all external service accounts (Stripe, SendGrid, Clerk)
- [ ] Log environment variable loading (without showing values)
- [ ] Audit access to `.env` files

### DON'T
- [ ] Commit `.env` files to git (use `.gitignore`)
- [ ] Hardcode secrets in code
- [ ] Share production secrets via Slack/email
- [ ] Use same credentials across environments
- [ ] Leave development secrets in production

## 11. Verification Checklist

After setting up all environment variables:

```bash
# Verify database connection
npm run db:verify

# Verify Clerk auth
curl -H "Authorization: Bearer $CLERK_JWT" https://yourdomain.com/api/health

# Verify Stripe
npm run stripe:test

# Verify SendGrid
npm run email:test

# Run health check endpoint
curl https://yourdomain.com/health
```

## 12. Troubleshooting

### Database Connection Fails
- [ ] Check DATABASE_URL syntax: `postgresql://user:password@host:port/db`
- [ ] Verify PostgreSQL is running and accessible
- [ ] Check firewall rules for port 5432
- [ ] Verify credentials in database

### Clerk Authentication Fails
- [ ] Verify CLERK_SECRET_KEY is correct (not publishable key)
- [ ] Check allowed origins in Clerk dashboard
- [ ] Clear browser cookies and cache
- [ ] Check JWT token expiration

### Stripe Webhooks Not Firing
- [ ] Verify webhook URL is publicly accessible (not localhost)
- [ ] Check STRIPE_WEBHOOK_SECRET matches dashboard
- [ ] Monitor webhook logs in Stripe dashboard
- [ ] Verify event types are enabled

### SendGrid Emails Not Sending
- [ ] Verify SENDGRID_API_KEY is correct
- [ ] Check sender email is verified in SendGrid
- [ ] Monitor email logs in SendGrid dashboard
- [ ] Check for template ID mismatches

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [SendGrid Documentation](https://docs.sendgrid.com)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
