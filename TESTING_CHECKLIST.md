# WCAG AI Platform - Testing & Verification Checklist

## Pre-Launch Verification (Do This After Setup)

### Phase 1: Database & Credentials (10 minutes)

**✅ Database Connection**
```bash
# Test database connection from .env
source packages/api/.env
psql "$DATABASE_URL" -c "SELECT 1"
# Expected: (1 row)
```

**✅ View Database Schema**
```bash
cd packages/api
npx prisma studio
# Opens GUI at http://localhost:5555
# Should show 23 tables: Client, Scan, Prospect, etc.
```

**✅ Verify Environment Variables**
```bash
# Check critical variables are set
grep -E "DATABASE_URL|CLERK_SECRET|STRIPE_SECRET|SENDGRID" packages/api/.env
# Should show all values (not xxx placeholders)
```

---

### Phase 2: Start Application (5 minutes)

**✅ Install Dependencies**
```bash
cd packages/api
npm install
# Should complete without errors
```

**✅ Start Development Server**
```bash
npm run dev
# Expected output:
# [Nodemon] restarting due to changes
# Server running on port 3001
# No error messages
```

**✅ Test Health Endpoint**
```bash
curl http://localhost:3001/health
# Expected response:
# {"status":"ok","timestamp":"2024-11-13T..."}
```

---

### Phase 3: Authentication (10 minutes)

**✅ Clerk Auth Middleware Working**
```bash
# This verifies Clerk is configured
curl -X GET http://localhost:3001/api/clients \
  -H "Authorization: Bearer test"
# Should return response (may be 401 if no valid token, that's OK)
# Error should NOT be "CLERK_SECRET_KEY not configured"
```

---

### Phase 4: Client Onboarding (10 minutes)

**✅ Create Test Client**
```bash
curl -X POST http://localhost:3001/api/clients/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-client@example.com",
    "company": "Test Corp",
    "tier": "pro",
    "website": "https://example.com",
    "contactName": "John Test"
  }'

# Expected response:
# {
#   "success": true,
#   "clientId": "cljk9f2p90000...",
#   "apiKey": "wcag_abc123...",
#   "complianceDashboardUrl": "https://...",
#   "initialScanScheduled": true,
#   "nextSteps": [...]
# }
```

**✅ Verify Client in Database**
```bash
# Open Prisma Studio (from above)
# Navigate to Client table
# Should see new client with:
# - email: test-client@example.com
# - company: Test Corp
# - tier: pro
# - apiKey: wcag_... (not empty)
# - status: active
```

**✅ Test API Key Authentication**
```bash
# Extract the apiKey from previous response
curl -X POST http://localhost:3001/api/scans \
  -H "x-api-key: wcag_xxx" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Should return scan data (may be in queue, that's OK)
```

---

### Phase 5: Email Service (10 minutes)

**✅ Check SendGrid Integration**
```bash
# Verify SendGrid key is configured
grep "SENDGRID_API_KEY" packages/api/.env
# Should show actual API key (not blank or SG.xxxxx placeholder)
```

**✅ Monitor SendGrid Activity**
```bash
# Go to https://app.sendgrid.com/email_activity
# Should show:
# - Welcome email sent to test-client@example.com
# Status: Processed, Opened, or Delivered
```

**✅ Check Email Logs**
```bash
# In API console output (npm run dev), should see:
# Email sent successfully to test-client@example.com
```

---

### Phase 6: Stripe Billing (10 minutes)

**✅ Verify Stripe Configuration**
```bash
# Check Stripe keys
grep "STRIPE" packages/api/.env
# Should show:
# STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_test_...
```

**✅ Test Stripe Webhook Setup (For Local Development)**
```bash
# Install Stripe CLI if not already done
brew install stripe/stripe-cli/stripe

# Start webhook forwarding in a NEW terminal window
stripe listen --forward-to localhost:3001/api/billing/webhook

# Keep this terminal open (needed for webhook testing)
# Should show:
# > Ready! Your webhook signing secret is: whsec_test_xxxxx
```

**✅ Create Test Payment**
```bash
# Go to Stripe Dashboard → Payments → Create payment
# Use test card: 4242 4242 4242 4242
# Set amount: 750 (for $7.50, or any amount)
# Complete the payment

# Check API console output
# Should see: Payment succeeded for client xxx
# Check database - client.stripeCustomerId should be populated
```

---

### Phase 7: Scan Scheduler (10 minutes)

**✅ Verify Scheduler Configuration**
```bash
# Check scheduler settings
grep "SCAN_SCHEDULER" packages/api/.env
# Should show:
# SCAN_SCHEDULER_ENABLED=true
# SCAN_SCHEDULER_CRON=0 2 * * *
```

**✅ Check Scheduler Service**
```bash
# Look for initialization in API logs
# Should see: Scan scheduler initialized
# With cron expression: 0 2 * * * (2 AM daily UTC)
```

**✅ Manual Scheduler Test**
```bash
# Optional: Manually trigger scheduler for testing
# Add this to a test script and run:
# const { getScanScheduler } = require('./src/services/scanScheduler');
# await getScanScheduler().runDailyScans();
```

---

### Phase 8: Full Integration Test (20 minutes)

**Complete End-to-End Flow**

```bash
# Step 1: Start fresh API server
npm run dev

# Step 2: Create second test client
curl -X POST http://localhost:3001/api/clients/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "email": "integration-test@example.com",
    "company": "Integration Test Corp",
    "tier": "enhanced",
    "website": "https://google.com"
  }'
# Note: Save the returned apiKey and clientId

# Step 3: Extract apiKey from response and use it
# curl -X GET http://localhost:3001/api/billing/usage/[CLIENT_ID] \
#   -H "x-api-key: [API_KEY]"

# Step 4: Check Prisma Studio for:
#   - New Client record
#   - New Prospect record (for website)
#   - API key in Client table

# Step 5: Check SendGrid for welcome email

# Step 6: Monitor Stripe webhook (if webhook window is open)
```

---

## Success Criteria Checklist

### All of these should be ✅ TRUE:

```
Database Setup
- [ ] PostgreSQL running (local or cloud)
- [ ] 23 tables created via migrations
- [ ] Database connection successful

Application
- [ ] npm install completed without errors
- [ ] npm run dev starts without errors
- [ ] Health endpoint responds

Authentication
- [ ] Clerk credentials in .env
- [ ] No auth errors in logs

Client Onboarding
- [ ] POST /api/clients/onboard creates client
- [ ] API key generated and returned
- [ ] Client visible in Prisma Studio

Email Service
- [ ] SendGrid API key configured
- [ ] Welcome email received
- [ ] No email errors in logs

Billing
- [ ] Stripe credentials configured
- [ ] Webhook forwarding active (local dev)
- [ ] Stripe test payment succeeds

Database Persistence
- [ ] All client data saved to database
- [ ] API key retrievable from database
- [ ] Client tier and status stored correctly
```

---

## Troubleshooting Common Issues

### "Cannot connect to PostgreSQL"
```bash
# Check if database is running
psql --version

# If using Docker:
docker ps | grep wcag-db  # Should show running container

# If not running:
docker start wcag-db
```

### "CLERK_SECRET_KEY not configured"
```bash
# Verify it's in .env
cat packages/api/.env | grep CLERK_SECRET_KEY

# Should show: CLERK_SECRET_KEY=sk_test_xxxxx (not blank)

# If blank, update:
# 1. Go to https://clerk.com → Dashboard
# 2. Copy Secret Key
# 3. Update in .env
```

### "SendGrid API key rejected"
```bash
# Verify API key format
grep SENDGRID_API_KEY packages/api/.env
# Should start with: SG.

# Test with curl:
curl -X GET https://api.sendgrid.com/v3/mail/validate \
  -H "Authorization: Bearer YOUR_API_KEY"

# Should return 200 OK
```

### "ECONNREFUSED - Stripe webhook"
```bash
# Stripe CLI webhook not running
# Open new terminal and run:
stripe listen --forward-to localhost:3001/api/billing/webhook

# Keep this terminal OPEN while testing
```

### "No tables in database"
```bash
# Migrations didn't run
cd packages/api
npx prisma migrate deploy

# Verify:
npx prisma studio  # Should show tables
```

---

## Performance Metrics (Expected)

After successful setup:

| Metric | Expected | Status |
|--------|----------|--------|
| API Response Time | <100ms | ✅ |
| Database Query | <50ms | ✅ |
| Email Send | <2s | ✅ |
| Client Onboarding | <5s end-to-end | ✅ |
| Stripe Webhook | <500ms | ✅ |

---

## Next Steps After Verification

**Once all checks pass:**

1. ✅ **Development**: Ready to build more features
2. ✅ **Testing**: Ready to onboard first client
3. ✅ **Deployment**: Ready to deploy to staging
4. ✅ **Revenue**: Can accept first paid engagements

**Your system is production-ready for MVP launch!**

---

## Support

If you encounter issues:
1. Check this checklist first
2. Review logs: `npm run dev` (watch console output)
3. Check Prisma Studio: `npx prisma studio`
4. Verify credentials in `.env`
5. Check external service dashboards:
   - Clerk: https://dashboard.clerk.com
   - Stripe: https://dashboard.stripe.com
   - SendGrid: https://app.sendgrid.com

