# WCAG AI Platform

## 🚀 **AI-Powered WCAG-Compliant Website Development**

**Transform your web development business into an accessibility-first powerhouse.** Build fully WCAG-compliant websites from scratch using AI-powered code generation, automated accessibility testing, and turnkey deployment.

**💰** [Consultant Quick Start Guide](CONSULTANT_QUICKSTART.md) | [Business Playbook](CONSULTANT_BUSINESS_GUIDE.md)

### 🔒 **Enterprise Security & Compliance**

[![SOC 2](https://img.shields.io/badge/SOC%202-In%20Progress-yellow)](./COMPLIANCE.md)
[![GDPR Compliant](https://img.shields.io/badge/GDPR-Compliant-green)](./COMPLIANCE.md#gdpr-compliance)
[![WCAG 2.1 AA](https://img.shields.io/badge/WCAG%202.1-AA%20Compliant-green)](./COMPLIANCE.md#wcag-21-aa-compliance)
[![Security](https://img.shields.io/badge/Security-Hardened-blue)](./SECURITY.md)

**📋 Documentation:** [Security Policy](./SECURITY.md) | [Vulnerability Disclosure](./VULNERABILITY_DISCLOSURE.md) | [Compliance](./COMPLIANCE.md) | [Incident Response](./INCIDENT_RESPONSE.md)

---

## **🎯 What Is This?**

The WCAG AI Platform is a **complete AI-powered website development system** that generates WCAG 2.1 AA/AAA compliant websites on-demand for SMB clients. Instead of scanning existing sites for violations, we **build accessible sites from the ground up** using AI code generation.

**Think:** "AI Website Builder" + "Built-in WCAG Compliance" + "Consulting Business in a Box"

### **The New Business Model:**

```
┌──────────────────────────────────────────────────────────────┐
│  1. CLIENT ORDERS WCAG-COMPLIANT WEBSITE                     │
│     - SMB client needs: restaurant, law firm, retail, etc.   │
│     - Tier selection: Basic ($2,999), Pro ($4,999), Ent ($9,999) │
│     - Provides: business info, branding, content             │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  2. AI GENERATES COMPLIANT WEBSITE CODE                      │
│     - Claude/GPT generates semantic HTML, ARIA, CSS          │
│     - Automated WCAG validation during generation            │
│     - Responsive design with accessibility features          │
│     - You review & approve before delivery                   │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  3. DEPLOY & DELIVER                                         │
│     - One-click deploy to Vercel/Netlify                     │
│     - Client receives: compliant site + VPAT report          │
│     - Optional: $299-$999/mo maintenance packages            │
└──────────────────────────────────────────────────────────────┘
```

---

## **⚙️ How It Works**

### **The 3-Part System:**

```
packages/
├── api/                  # Backend - AI generation engine
│   ├── AI code generation (Claude, GPT-4)
│   ├── WCAG validation engine
│   ├── Client onboarding & billing
│   └── Runs on: http://localhost:3001
│
├── webapp/               # Frontend - Consultant dashboard
│   ├── Project request interface
│   ├── Code review & approval UI
│   ├── Client portal
│   └── Runs on: http://localhost:3000
│
└── generated-sites/      # Output - Client websites
    ├── Fully compliant HTML/CSS/JS
    ├── VPAT documentation
    └── Ready for deployment
```

### **Development Workflow:**

1. **Client submits project request** → Business type, industry, content needs
2. **AI generates site architecture** → Semantic HTML, ARIA labels, accessible forms
3. **Auto-validation** → WCAG 2.1 AA compliance verified
4. **Consultant reviews** → Approve/edit generated code
5. **Deploy** → Push to production, deliver to client
6. **Billing** → Charge $2,999-$9,999 per project + optional maintenance

---

## **🚀 Quick Start**

### **For Consultants (Start Earning):**

```bash
# 1. Verify you're ready
./scripts/consultant-readiness-check.sh

# 2. Verify your environment
node --version  # Should be v18+
npm install

# 3. Set up AI API keys (required for site transformation)
cd packages/api
cp .env.example .env
# Add your OPENAI_API_KEY or ANTHROPIC_API_KEY

# 4. Initialize database (for fix templates)
npx prisma generate
npx prisma db push

# 5. Start the platform
# Terminal 1 (Backend):
cd packages/api && npm run dev

# Terminal 2 (Frontend):
cd packages/webapp && npm run dev

# 6. Open http://localhost:3000 - Start building sites!
```

### **For Developers (Technical Setup):**

```bash
# Install dependencies
npm install
cd packages/api && npm install
cd ../webapp && npm install

# Set up database
cd packages/api
npx prisma generate
npx prisma db push

# Configure AI services (required for transformation)
echo "OPENAI_API_KEY=your_key_here" >> packages/api/.env
# OR
echo "ANTHROPIC_API_KEY=your_key_here" >> packages/api/.env
echo "AI_MODEL=gpt-4" >> packages/api/.env

# Optional: Configure GitHub integration (for PR deployment)
echo "GITHUB_TOKEN=your_token_here" >> packages/api/.env

# Run validation suite
npm run test:wcag
```

---

## **🏆 Consultant Features (NEW!)**

### **AI Website Generation**
Generate complete, WCAG-compliant websites from simple business requirements:
- **Input:** Business type, industry, content needs
- **Output:** Full HTML/CSS/JS site with WCAG 2.1 AA compliance
- **Time:** 5-15 minutes per site generation

### **Tiered Pricing Model**
- **Basic ($2,999):** Single-page site, WCAG AA, basic VPAT
- **Pro ($4,999):** Multi-page site, WCAG AAA, full VPAT, SEO optimization  
- **Enterprise ($9,999):** Complex site, custom features, ongoing support

### **Maintenance Packages (Recurring Revenue)**
- **Basic Maintenance ($299/mo):** Content updates, hosting, monthly audits
- **Pro Maintenance ($499/mo):** Priority support, quarterly redesigns
- **Enterprise ($999/mo):** Dedicated support, unlimited changes

### **White-Label Reports**
Generate professional VPAT (Voluntary Product Accessibility Template) reports:
- Client-branded compliance documentation
- Section 508 conformance validation
- ADA Title III legal compliance checklist

### **Automated Proposals**
AI generates custom proposals for prospects:
- Industry-specific value propositions
- Compliance risk analysis
- ROI projections for accessibility investment

---

## **📊 Business Metrics Dashboard**

Track your consulting revenue in real-time:

```bash
# View your consultant stats
curl http://localhost:3001/api/consultant/metrics

# Output:
{
  "totalProjects": 12,
  "monthlyRevenue": 47988,
  "activeClients": 8,
  "avgProjectValue": 3999,
  "maintenanceRevenue": 3592
}
```

---

## **🎬 Demo Workflow**

Run the end-to-end demo to see the full client journey:

```bash
./scripts/demo-client-workflow.sh

# This will:
# 1. Create a demo client project ("Joe's Pizza Shop")
# 2. Generate WCAG-compliant site with AI
# 3. Validate compliance (WCAG 2.1 AA)
# 4. Generate VPAT report
# 5. Show deployment preview
# 6. Calculate project billing
```

---

## **📚 Documentation**

| Guide | Description |
|-------|-------------|
| [Consultant Quickstart](CONSULTANT_QUICKSTART.md) | Get your first client site built in 30 minutes |
| [Business Playbook](CONSULTANT_BUSINESS_GUIDE.md) | Complete sales & marketing strategy |
| [Site Transformation API](SITE_TRANSFORMATION_API.md) | **NEW:** AI-powered remediation API documentation |
| [Content Marketing](content/README.md) | LinkedIn AI Accessibility Teardown templates |
| [Architecture](WCAGAI_Architecture_Flow.md) | Technical platform architecture |
| [Deployment Harmony Guide](DEPLOYMENT_HARMONY_GUIDE.md) | **NEW:** Unified deployment verification system |
| [Deployment](DEPLOYMENT_AUDIT_RAILWAY_VERCEL.md) | Production deployment guide |
| [Testing](END_TO_END_TESTING_GUIDE.md) | Automated WCAG testing suite |
| [Accessibility Scripts](scripts/README.md) | CI/CD accessibility scanner automation |

---

## **🔍 Automated Accessibility Scanning**

The platform includes automated CI/CD accessibility scanning using axe-core and Pa11y:

### **Features:**
- ✅ **Automated scans on every PR** - Catch violations before they reach production
- 🚫 **Critical violation blocking** - PRs with critical issues are automatically blocked
- 📊 **Detailed reports** - Comprehensive violation details with severity levels
- 📂 **Evidence vault** - All scan results stored for 90 days
- 💬 **PR comments** - Automated feedback on every pull request

### **Quick Test:**
```bash
# Install dependencies
npm install

# Run accessibility scan (requires running app)
npm run accessibility:scan http://localhost:3000

# Or use Pa11y
npm run accessibility:pa11y http://localhost:3000

# Update evidence vault
npm run evidence:update
```

See [scripts/README.md](scripts/README.md) for detailed documentation.

---

## **🛠️ Technology Stack**

### **AI Generation:**
- **Anthropic Claude 3.5 Sonnet** - Primary code generation
- **OpenAI GPT-4** - Fallback & content generation
- **Prompt engineering** - Optimized for WCAG compliance

### **Validation:**
- **axe-core** - Automated accessibility testing
- **Pa11y** - CI/CD integration for ongoing validation
- **Lighthouse** - Performance + accessibility audits

### **Backend:**
- **Node.js + Express** - API server
- **Prisma ORM** - Database management
- **PostgreSQL** - Production database

### **Frontend:**
- **React + Next.js** - Consultant dashboard
- **Tailwind CSS** - Styling framework
- **Radix UI** - Accessible component library

### **Deployment:**
- **Railway** - Backend API hosting with auto-scaling
- **Vercel** - Frontend hosting with global CDN
- **GitHub Actions** - CI/CD pipelines with automated verification
- **Deployment Harmony System** - Unified deployment coordinator with pre/post validation

---

## **💰 Revenue Opportunities**

### **Per-Project Model:**
- **Avg Project Value:** $3,999
- **Projects/Month:** 5-10 (manageable solo)
- **Monthly Revenue:** $19,995-$39,990

### **Maintenance Model (Recurring):**
- **Avg Client:** $399/mo maintenance
- **Target:** 20 maintenance clients
- **Monthly Recurring:** $7,980

### **Combined Model:**
- **New Projects:** $29,993/mo
- **Maintenance:** $7,980/mo
- **Total Monthly:** **$37,973**

**Annual Revenue Potential:** **$455,676**

---

## **🚀 Deployment & Verification System**

### **Unified Deployment Harmony**

The platform includes a comprehensive deployment verification system that ensures all changes work together seamlessly:

#### **Verify Harmony Agent**
Custom GitHub Copilot agent that verifies:
- ✅ Type consistency between frontend and backend
- ✅ API contract alignment
- ✅ Configuration validity
- ✅ Security implementations
- ✅ Cross-platform integration

#### **Automated Verification**
```bash
# Pre-deployment check
./deployment/scripts/verify-deployment-harmony.sh --pre-deploy production

# Score: 95%+
# ✅ 35/37 checks passed
# Ready for deployment
```

#### **Unified Deployment Coordinator**
One command to deploy both Railway (backend) + Vercel (frontend):
```bash
# Deploy everything
./deployment/scripts/deploy-unified.sh production

# Includes:
# ✓ Pre-deployment validation
# ✓ Coordinated deployment
# ✓ Post-deployment verification
# ✓ Automatic rollback on failure
```

#### **CI/CD Integration**
GitHub Actions automatically:
- Verifies every PR for harmony
- Runs comprehensive validation
- Comments results on PRs
- Prevents broken deployments

**Learn more:** [Deployment Harmony Guide](DEPLOYMENT_HARMONY_GUIDE.md)

---

## **🎯 Next Steps**

### **Today:**
1. Run `./scripts/consultant-readiness-check.sh`
2. Configure AI API keys (Claude or GPT-4)
3. Generate your first demo site
4. Review the Business Playbook

### **This Week:**
1. Set up your consultant profile
2. Configure Stripe for billing
3. Verify deployment harmony: `./deployment/scripts/verify-deployment-harmony.sh --pre-deploy production`
4. Deploy to production: `./deployment/scripts/deploy-unified.sh production`
5. Run first real client project

### **This Month:**
1. Sign first 3 clients
2. Build project portfolio
3. Set up maintenance packages
4. Refine your sales process

---

## **📞 Support & Community**

- **Issues:** [GitHub Issues](https://github.com/aaj441/wcag-ai-platform/issues)
- **Discussions:** [GitHub Discussions](https://github.com/aaj441/wcag-ai-platform/discussions)
- **Documentation:** [Full Docs](docs/)

---

## **📄 License**

MIT License - See [LICENSE](LICENSE) for details.

---

**Built with ❤️ for accessibility consultants who want to scale their business with AI.**

**Ready to sign your first client?** → Start with [CONSULTANT_QUICKSTART.md](CONSULTANT_QUICKSTART.md)
