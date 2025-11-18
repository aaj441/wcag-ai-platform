# 🔑 API Keys Setup Guide

**Complete guide to getting all API keys for WCAGAI deployment.**

---

## 📋 Quick Checklist

- [ ] OpenAI API Key (Required)
- [ ] Sentry DSN (Required)
- [ ] Clerk Keys (Recommended)
- [ ] Stripe Keys (Recommended)
- [ ] SendGrid Key (Recommended)
- [ ] AWS Keys (Recommended)
- [ ] Slack Webhook (Optional)
- [ ] HubSpot Key (Optional)

---

## 🔑 REQUIRED KEYS

### 1. OpenAI API Key

**Why:** Powers AI-generated accessibility fixes

**Get it:**
1. Go to: https://platform.openai.com/api-keys
2. Sign in / Sign up
3. Click **"Create new secret key"**
4. Name it: `WCAGAI Production`
5. Copy key: `sk-proj-...`

**Cost:** Pay-per-use
- ~$0.03 per scan (using GPT-4)
- ~$0.006 per scan (using GPT-3.5)

**Set usage limits:**
1. Go to: https://platform.openai.com/account/billing/limits
2. Set hard limit: $100/month (adjust as needed)

**Test key:**
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR-KEY-HERE" \
  | jq '.data[0].id'
```

**Alternative:** Anthropic Claude
- Get key: https://console.anthropic.com/
- Similar pricing
- Set `ANTHROPIC_API_KEY` instead

---

### 2. Sentry DSN

**Why:** Error tracking and performance monitoring

**Get it:**
1. Go to: https://sentry.io
2. Sign up (free tier: 5K errors/month)
3. Create new project: **"WCAGAI API"**
4. Platform: **Node.js / Express**
5. Copy DSN: `https://...@sentry.io/...`

**Configure:**
1. Go to: **Settings** → **Alerts**
2. Create alert: "Error rate > 1%"
3. Set up email notifications

**Cost:** Free tier sufficient for starting

---

## 💳 RECOMMENDED KEYS (For Full Functionality)

### 3. Clerk Authentication Keys

**Why:** User authentication and management

**Get it:**
1. Go to: https://clerk.com
2. Sign up (free tier: 5K MAU)
3. Create application: **"WCAGAI"**
4. Copy keys:
   - `CLERK_SECRET_KEY=sk_live_...`
   - `CLERK_PUBLISHABLE_KEY=pk_live_...`

**Configure:**
1. Go to: **User & Authentication**
2. Enable: Email + Password
3. Customize: Sign-up fields (optional)

**Cost:** Free up to 5,000 monthly active users

---

### 4. Stripe Billing Keys

**Why:** Payment processing and subscriptions

**Get it:**
1. Go to: https://stripe.com
2. Sign up
3. Activate account (requires business info)
4. Get keys:
   - Test: https://dashboard.stripe.com/test/apikeys
   - Live: https://dashboard.stripe.com/apikeys (after activation)

**Copy:**
- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_PUBLISHABLE_KEY=pk_live_...`

**Set up products:**
1. Go to: **Products**
2. Create: Pricing tiers
   - Basic: $99/month
   - Pro: $299/month
   - Enterprise: Custom

**Cost:** 2.9% + $0.30 per transaction

**Start with test mode** (use test keys first)

---

### 5. SendGrid Email Key

**Why:** Transactional emails (reports, notifications)

**Get it:**
1. Go to: https://sendgrid.com
2. Sign up (free tier: 100 emails/day)
3. Verify domain (optional)
4. Create API key:
   - Settings → API Keys
   - Click **"Create API Key"**
   - Name: `WCAGAI Production`
   - Permissions: **Full Access**

**Copy:** `SENDGRID_API_KEY=SG...`

**Configure sender:**
1. Go to: **Settings** → **Sender Authentication**
2. Verify email: noreply@wcagai.com

**Cost:** Free tier: 100/day, Paid: $15/month for 40K

---

### 6. AWS S3 Keys

**Why:** Store generated reports (PDF/HTML)

**Get it:**
1. Go to: https://aws.amazon.com
2. Sign in / Create account
3. Go to: **IAM** → **Users**
4. Create user: `wcagai-s3-access`
5. Attach policy: `AmazonS3FullAccess`
6. Create access key:
   - `AWS_ACCESS_KEY_ID=AKIA...`
   - `AWS_SECRET_ACCESS_KEY=...`

**Create S3 bucket:**
```bash
# Install AWS CLI
brew install awscli  # or apt-get install awscli

# Configure
aws configure
# Enter: Access Key ID, Secret Key, Region (us-east-1), Format (json)

# Create bucket
aws s3 mb s3://wcagai-reports --region us-east-1

# Set public read access (for CDN)
aws s3api put-bucket-policy --bucket wcagai-reports --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicRead",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::wcagai-reports/*"
  }]
}'
```

**Cost:** ~$0.023 per GB/month + $0.0004 per request

---

## 🔔 OPTIONAL KEYS (For Alerts & Integrations)

### 7. Slack Webhook

**Why:** Real-time alerts for critical events

**Get it:**
1. Go to: https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name: `WCAGAI Alerts`
4. Workspace: Your workspace
5. Go to: **Incoming Webhooks**
6. Activate: **On**
7. Click **"Add New Webhook to Workspace"**
8. Select channel: `#alerts` or `#monitoring`
9. Copy webhook URL: `https://hooks.slack.com/services/...`

**Set:** `SLACK_WEBHOOK_URL=https://hooks.slack.com/...`

**Test:**
```bash
curl -X POST YOUR-WEBHOOK-URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"🚀 WCAGAI deployed successfully!"}'
```

**Cost:** Free

---

### 8. HubSpot CRM Key

**Why:** CRM integration for lead management

**Get it:**
1. Go to: https://app.hubspot.com
2. Sign up (free CRM)
3. Go to: **Settings** → **Integrations** → **API Key**
4. Click **"Generate API Key"**
5. Copy: `HUBSPOT_API_KEY=...`

**Cost:** Free CRM tier available

---

### 9. Apollo.io Key

**Why:** Company discovery and enrichment

**Get it:**
1. Go to: https://app.apollo.io
2. Sign up (free tier: 60 searches/month)
3. Go to: **Settings** → **API**
4. Copy API key

**Set:** `APOLLO_API_KEY=...`

**Cost:** Free tier, Paid: $49/month

---

## 💾 Secure Storage

**Store keys securely:**

```bash
# Create secure file (local only, never commit!)
touch ~/wcagai-production-keys.txt
chmod 600 ~/wcagai-production-keys.txt
```

**Template:**
```bash
# WCAGAI Production API Keys
# Created: 2024-01-15
# NEVER COMMIT THIS FILE TO GIT

# Required
OPENAI_API_KEY=sk-proj-...
SENTRY_DSN=https://...@sentry.io/...

# Recommended
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
SENDGRID_API_KEY=SG...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=wcagai-reports

# Optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
HUBSPOT_API_KEY=...
APOLLO_API_KEY=...
PAGERDUTY_API_KEY=...
PAGERDUTY_ROUTING_KEY=...
```

---

## 🔒 Security Best Practices

1. **Rotate keys quarterly**
2. **Use separate keys for staging/production**
3. **Set spending limits on all services**
4. **Enable 2FA on all accounts**
5. **Never commit keys to git**
6. **Use Railway's secret variables** (not plain text)

---

## 💰 Cost Estimate

| Service | Free Tier | Paid (Starter) | Estimated Monthly |
|---------|-----------|----------------|-------------------|
| OpenAI | $5 credit | Pay-per-use | $50-200 |
| Sentry | 5K errors | $26/month | $0 (free tier OK) |
| Clerk | 5K MAU | $25/month | $0 (free tier OK) |
| Stripe | Always free | 2.9% + $0.30 | $0 (just fees) |
| SendGrid | 100/day | $15/month | $0 (free tier OK) |
| AWS S3 | 5GB free | $0.023/GB | $5-10 |
| Slack | Free | $7.25/user | $0 (free tier OK) |

**Total estimated:** $55-215/month (scales with usage)

**Start with free tiers** and upgrade as needed.

---

## ✅ Verification Checklist

Once you have all keys:

```bash
# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq

# Test Sentry (will show up in dashboard)
node -e "
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
Sentry.captureMessage('Test from API keys setup');
console.log('✅ Sentry test sent');
"

# Test Clerk
curl https://api.clerk.com/v1/users \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" | jq

# Test Stripe
curl https://api.stripe.com/v1/customers \
  -u $STRIPE_SECRET_KEY: | jq

# Test SendGrid
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@wcagai.com"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'

# Test AWS S3
aws s3 ls s3://wcagai-reports

# Test Slack
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"✅ All API keys validated!"}'
```

All working? **You're ready to deploy!** 🚀
