# WCAG AI Platform: 30-Day Launch - Quick Start Implementation

## ✅ Current Status (Day 3 of Sprint)

### Issue #35 Completed ✅ (Daily Scans + Legal Docs + Onboarding)
- `scanScheduler.ts`: Daily 2 AM scan service with tier-based limits
- `onboardingService.ts`: Automated client onboarding with legal docs
- Legal templates: SERVICE_AGREEMENT.md, LIABILITY_WAIVER.md, SLA_BY_TIER.md
- Enhanced `/api/clients/onboard` endpoint with full workflow
- **Status**: Deployed to branch, ready for database integration

### Issue #29 In Progress (Database + Auth + Billing)
- PostgreSQL migration script: `migrate-to-postgres.sh`
- Environment configuration guide: `ENV_SETUP_GUIDE.md`
- Clerk auth infrastructure: Already implemented in `auth.ts`
- Stripe billing: Already implemented in `billing.ts`
- **Status**: Configuration ready, needs credential setup

---

## 🚀 Your Next 7 Days - Critical Path

### Today (Day 1 of Week 1)
**Goal**: Database + Credentials Setup (2-3 hours)

```bash
# 1. Copy environment template
cp packages/api/.env.example packages/api/.env

# 2. Set up PostgreSQL (Choose ONE)
# Option A: Docker (Fastest)
docker pull postgres:15
docker run --name wcag-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15

# Option B: Homebrew (macOS)
brew install postgresql@15
brew services start postgresql@15

# Option C: Cloud (Heroku/Railway/AWS)
# - Sign up and create PostgreSQL database
# - Copy connection string to .env DATABASE_URL

# 3. Verify connection
psql postgresql://postgres:password@localhost:5432/wcag_ai_dev -c "SELECT 1"
```

**3. Create Clerk account & get credentials:**
- Go to https://clerk.com → Sign up
- Create new application
- Copy these to your `.env`:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
  CLERK_SECRET_KEY=sk_test_xxxxx
  ```

**4. Create Stripe account & get credentials:**
- Go to https://stripe.com → Sign up
- Copy to `.env`:
  ```
  STRIPE_SECRET_KEY=sk_test_xxxxx
  STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
  STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx
  ```

**5. Create SendGrid account:**
- Go to https://sendgrid.com → Sign up
- Create API key
- Copy to `.env`:
  ```
  SENDGRID_API_KEY=SG.xxxxx
  SENDER_EMAIL=noreply@yourdomain.com
  ```

**6. Verify all credentials are in `.env`:**
```bash
# Run verification script (to be created)
npm run verify:env

# Expected output:
# ✅ DATABASE_URL configured
# ✅ CLERK credentials valid
# ✅ STRIPE credentials valid
# ✅ SENDGRID credentials valid
```

**Checklist:**
- [ ] PostgreSQL running locally or configured for cloud
- [ ] `.env` file created from `.env.example`
- [ ] Clerk credentials added to `.env`
- [ ] Stripe test keys added to `.env`
- [ ] SendGrid API key added to `.env`
- [ ] Database connection verified: `psql $DATABASE_URL -c "SELECT 1"`

---

### Day 2 of Week 1
**Goal**: Database Migration (2-3 hours)

```bash
# 1. Run migration script
./migrate-to-postgres.sh development

# What happens:
# ✅ Backs up existing database
# ✅ Validates PostgreSQL connection
# ✅ Runs Prisma migrations
# ✅ Regenerates Prisma client
# ✅ Seeds database (optional)

# 2. Verify tables created:
npx prisma studio  # Opens graphical database explorer

# 3. Install dependencies:
npm install

# 4. Generate Prisma client:
npx prisma generate
```

**Checklist:**
- [ ] Migration script executed successfully
- [ ] Prisma studio shows tables (Client, Scan, Prospect, etc.)
- [ ] No errors in migration log
- [ ] Backup created in ./backups/

---

### Days 3-4 of Week 1
**Goal**: Auth & Billing Integration (4-5 hours)

```bash
# 1. Test Clerk auth
npm run dev
# Visit http://localhost:3001/api/health
# Should respond with success

# 2. Test Stripe webhook locally (for development)
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Start webhook forwarding
stripe listen --forward-to localhost:3001/api/billing/webhook

# Copy webhook signing secret to .env:
# STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx

# 3. Test client onboarding endpoint
curl -X POST http://localhost:3001/api/clients/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "company": "Test Corp",
    "tier": "pro",
    "websites": ["https://example.com"]
  }'

# Expected response:
# {
#   "success": true,
#   "clientId": "cljk9f2p90000...",
#   "apiKey": "wcag_abc123...",
#   "initialScanScheduled": true,
#   "nextSteps": [...]
# }

# 4. Verify database stored client:
npx prisma studio
# View Client table - should see new entry
```

**Checklist:**
- [ ] Clerk authentication working
- [ ] Stripe webhook forwarding active (local dev)
- [ ] POST /api/clients/onboard successful
- [ ] Client record visible in database
- [ ] Email sent to test client (check SendGrid logs)

---

### Days 5-7 of Week 1
**Goal**: End-to-End Testing (6-8 hours)

```bash
# 1. Complete client onboarding flow:
#    - POST /api/clients/onboard with test data
#    - Verify client email received
#    - Check dashboard access with generated API key
#    - Verify daily scan scheduled

# 2. Test scan execution:
curl -X POST http://localhost:3001/api/scans \
  -H "x-api-key: wcag_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }'

# 3. Check scan queue (Bull/Redis):
# Monitor scans in progress
npm run dev
# Should see scan logs in console

# 4. Test daily scheduler (simulate):
# Manually trigger scan scheduler
npm run scheduler:test

# 5. Test billing webhook:
# Create test payment in Stripe dashboard
# Verify webhook received and processed
# Check client status updated in database

# 6. Load testing (optional):
npm run test:load
```

**Checklist:**
- [ ] Full client onboarding flow works end-to-end
- [ ] Scans queue and process successfully
- [ ] Daily scheduler triggers at configured time
- [ ] Billing webhooks received and processed
- [ ] Email reports generated and sent
- [ ] All data persists in PostgreSQL
- [ ] No console errors

---

## 📋 File Reference Guide

### Critical Implementation Files
| File | Purpose | Status |
|------|---------|--------|
| `packages/api/src/services/scanScheduler.ts` | Daily scan orchestration | ✅ Done |
| `packages/api/src/services/onboardingService.ts` | Client onboarding automation | ✅ Done |
| `packages/api/src/routes/clients.ts` | Enhanced onboarding endpoint | ✅ Done |
| `packages/api/src/middleware/auth.ts` | Clerk authentication | ✅ In place |
| `packages/api/src/routes/billing.ts` | Stripe webhook handling | ✅ In place |
| `packages/api/src/lib/prisma.ts` | Prisma client | ✅ Ready |
| `packages/api/prisma/schema.prisma` | Database schema | ✅ Ready |
| `migrate-to-postgres.sh` | Migration script | ✅ Created |
| `ENV_SETUP_GUIDE.md` | Configuration guide | ✅ Created |
| `packages/api/.env.example` | Environment template | ✅ Updated |

### Legal Document Templates
| File | Purpose |
|------|---------|
| `legal-templates/SERVICE_AGREEMENT.md` | Client T&Cs |
| `legal-templates/LIABILITY_WAIVER.md` | Legal protection |
| `legal-templates/SLA_BY_TIER.md` | Service levels by tier |
| `legal-templates/ACCESSIBILITY_STATEMENT_TEMPLATE.md` | For client websites |

---

## 🛠️ Debugging Commands

```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Verify Prisma schema
npx prisma validate

# View database in GUI
npx prisma studio

# Check Stripe webhook logs
stripe logs tail

# View SendGrid activity
# https://app.sendgrid.com/email_activity

# Check Redis queue
npm run queue:status

# View scheduled jobs
npm run scheduler:list

# Monitor real-time logs
npm run dev  # All logs in console

# Test specific endpoint
curl -v http://localhost:3001/api/health
```

---

## ⚠️ Common Errors & Fixes

### "Cannot find module '@clerk/clerk-sdk-node'"
```bash
npm install @clerk/clerk-sdk-node
```

### "STRIPE_WEBHOOK_SECRET not configured"
- Run: `stripe listen --forward-to localhost:3001/api/billing/webhook`
- Copy secret from output to `.env`

### "ECONNREFUSED 127.0.0.1:5432"
- PostgreSQL not running
- Run: `docker start wcag-db` or `brew services start postgresql@15`

### "Prisma migrations pending"
```bash
./migrate-to-postgres.sh  # Runs all pending migrations
```

### "SendGrid emails not sending"
- Verify API key in `.env`
- Verify sender email is verified in SendGrid
- Check SendGrid activity logs

---

## 📊 Success Criteria (End of Week 1)

- [ ] PostgreSQL database live with 23 tables
- [ ] Client can onboard via POST /api/clients/onboard
- [ ] Stripe test payment succeeds
- [ ] Daily scan scheduled and executes
- [ ] Client receives welcome + daily report emails
- [ ] API key generation and validation working
- [ ] Database persists all client data
- [ ] Zero database errors in logs

---

## 🚢 Week 2 Preview (Pending)

Once Week 1 is complete, you'll immediately:
1. **Implement Issue #34** (AI-Powered Remediation) - 2-3 days
2. **Create Issue #23** (CI/CD Accessibility Scanner) - 2 days
3. **Build Issues #20/#24** (Evidence Vault + Reporting) - 3-4 days

By end of Week 2, you'll have a **complete, revenue-generating platform** ready for your first paying clients.

---

## 💰 Revenue Impact Timeline

| Phase | Deliverable | Revenue Unlock |
|-------|-------------|-----------------|
| **Week 1** (Current) | Database + Auth + Billing | Can accept first paid clients |
| **Week 2** | AI Fix Generation + CI/CD | Can charge $7.5K/engagement |
| **Week 3** | Evidence Vault + Reporting | Can upsell quarterly reports |
| **End Month 1** | **Full MVP** | **Ready for 4 clients/month** |
| **Month 2** | Contractor scaling | **Ready for 6-8 clients/month** |

---

## 📞 Support Resources

- **Clerk Docs**: https://clerk.com/docs
- **Stripe Docs**: https://stripe.com/docs/api
- **SendGrid Docs**: https://docs.sendgrid.com
- **Prisma Docs**: https://www.prisma.io/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs

---

## Next Immediate Action

**Right now (next 30 minutes):**
1. Read `ENV_SETUP_GUIDE.md` (15 min)
2. Create Clerk account and copy credentials (10 min)
3. Create Stripe account and copy credentials (5 min)
4. Update `.env` file (5 min)

**Today (next 2-3 hours):**
1. Set up PostgreSQL (Docker or cloud)
2. Verify database connection
3. Create `.env` file with all credentials
4. Run migration script

**You're on track for Week 2 launch.** 🚀
