# WCAGAI Consultant Site Setup Guide

This directory contains instructions and templates for setting up your white-label WCAG consulting marketing site.

## Quick Start (30 minutes)

### 1. Clone Marketing Template

```bash
# Clone Next.js marketing template
git clone https://github.com/shadcn-ui/nextjs-marketing-template wcagaii-consultant-site
cd wcagaii-consultant-site

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Create `.env.local`:

```bash
cat > .env.local <<EOF
# API Configuration
NEXT_PUBLIC_WCAGAI_API_URL=https://wcagaii-backend.railway.app
NEXT_PUBLIC_API_URL=http://localhost:3001

# Stripe Configuration (get from https://dashboard.stripe.com/)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Clerk Authentication (get from https://dashboard.clerk.com/)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# PagerDuty (optional, for SLA monitoring)
PAGERDUTY_ROUTING_KEY=...

# Deployment
VERCEL_URL=wcagaii-consultant-site.vercel.app
EOF
```

### 3. Customize Content

Edit `app/page.tsx` to customize the homepage:

```typescript
export default function Home() {
  return (
    <main>
      <Hero
        title="AI-Powered WCAG Compliance Audits"
        subtitle="Protect your business from ADA lawsuits and reach 20% more users"
        cta={{
          primary: "Start Free Audit",
          secondary: "Book a Call"
        }}
      />
      
      <PricingSection tiers={[
        {
          name: "Basic Scan",
          price: 299,
          features: [
            "Single site audit (up to 100 pages)",
            "Detailed WCAG 2.2 AA compliance report",
            "AI-generated remediation plan"
          ]
        },
        {
          name: "Professional",
          price: 499,
          features: [
            "Up to 10 scans per month",
            "Continuous monitoring",
            "Priority support",
            "Monthly reports"
          ]
        },
        {
          name: "Enterprise",
          price: 999,
          features: [
            "Unlimited scans",
            "API access",
            "Dedicated account manager",
            "White-glove service"
          ]
        }
      ]} />
    </main>
  );
}
```

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (first time)
vercel --prod

# Future deployments (automatic on git push)
git push origin main
```

Your site will be live at: `https://your-project.vercel.app`

## Stripe Integration Setup

### 1. Create Stripe Account
- Sign up at https://dashboard.stripe.com/register
- Complete business verification
- Get API keys from Developers > API Keys

### 2. Create Products

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Create products
stripe products create \
  --name "WCAGAI Basic Scan" \
  --description "Single site audit (up to 100 pages)"

stripe prices create \
  --product prod_... \
  --currency usd \
  --unit-amount 29900

# Repeat for Pro and Enterprise tiers
```

### 3. Set Up Webhooks

In Stripe Dashboard:
1. Go to Developers > Webhooks
2. Add endpoint: `https://your-site.vercel.app/api/webhooks/stripe`
3. Select events: `customer.subscription.created`, `customer.subscription.deleted`
4. Copy webhook secret to `.env.local`

## Clerk Authentication Setup

### 1. Create Clerk Application
- Sign up at https://dashboard.clerk.com/
- Create new application
- Choose authentication methods (Email, Google, etc.)

### 2. Configure Multi-Tenancy

In Clerk Dashboard > Settings:
- Enable Organizations
- Set default role: "org:member"
- Configure metadata schema:
  ```json
  {
    "tier": "string",
    "scansRemaining": "number",
    "companyName": "string"
  }
  ```

### 3. Add Middleware

Create `middleware.ts`:

```typescript
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/", "/pricing", "/api/webhooks/(.*)"],
  ignoredRoutes: ["/api/public/(.*)"]
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

## Client Onboarding Flow

The onboarding API endpoint (`/api/clients/onboard`) handles:

1. **Clerk User Creation** - Creates authenticated user account
2. **Stripe Subscription** - Sets up billing based on tier
3. **Database Schema** - Creates isolated client workspace
4. **Welcome Email** - Sends magic link for first login
5. **PagerDuty Service** - Sets up monitoring alerts

### Example API Call

```bash
curl -X POST http://localhost:3001/api/clients/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "company": "Acme Corp",
    "tier": "pro"
  }'
```

## Testing the Setup

```bash
# 1. Start API server
cd packages/api
npm run dev

# 2. Start marketing site
cd wcagaii-consultant-site
npm run dev

# 3. Test onboarding
curl -X POST http://localhost:3001/api/clients/onboard \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","company":"Test Co","tier":"basic"}'

# 4. Run readiness check
cd ../..
./scripts/consultant-readiness-check.sh
```

## Marketing & Sales

### Recording Demo Video

Use Loom (https://loom.com) to record a 1-minute demo:

1. Show the dashboard with real violations
2. Demonstrate report generation
3. Explain the value proposition
4. End with clear CTA

### LinkedIn Outreach Template

```
🎯 I'm offering 5 FREE WCAG accessibility audits this week

Is your website accessible to people with disabilities?

• 1 in 4 adults has a disability
• ADA lawsuits cost $50k-$200k on average
• Accessible sites get 15% more traffic

I'll scan your site and provide:
✅ Detailed compliance report
✅ Prioritized fix recommendations
✅ Implementation guidance

DM me your URL to get started!

#Accessibility #WCAG #WebDevelopment
```

### First Week Action Plan

**Days 1-2:** Setup & Testing
- Deploy marketing site
- Configure Stripe & Clerk
- Test complete onboarding flow

**Days 3-4:** Content & Demo
- Record demo video
- Write case study
- Prepare proposal templates

**Days 5-7:** Outreach
- LinkedIn posts (daily)
- Email 20 prospects
- Book 5-10 discovery calls

**Goal:** Sign 3-5 clients at $299-$999 each

## Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Clerk Documentation:** https://clerk.com/docs
- **Vercel Documentation:** https://vercel.com/docs
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG22/quickref/
- **ADA Website Requirements:** https://www.ada.gov/resources/web-guidance/

## Support

For technical issues with the platform:
- GitHub Issues: https://github.com/aaj441/wcag-ai-platform/issues
- Email: support@wcagai.com (set this up!)

## License

This consultant site setup is provided as part of the WCAGAI platform.
Customize it to match your brand and business needs.
