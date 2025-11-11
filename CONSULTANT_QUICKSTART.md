# Consultant Readiness Layer - Quick Start

## 🚀 What's New

The WCAG AI Platform now includes a complete **business wrapper layer** that transforms the technical platform into a revenue-generating consulting service.

## ✅ New Features

### 1. Client Onboarding API
Automatically onboard clients with tier-based pricing:

```bash
curl -X POST http://localhost:3001/api/clients/onboard \
  -H "Content-Type: application/json" \
  -d '{"email":"client@corp.com","company":"Corp Inc","tier":"pro"}'
```

**Tiers:**
- **Basic ($299)**: 1 scan, one-time audit
- **Pro ($499/mo)**: 10 scans/month, ongoing monitoring
- **Enterprise ($999/mo)**: Unlimited scans, dedicated support

### 2. SLA Monitoring
Track scan performance and ensure SLA compliance:

```bash
# Get SLA statistics
curl http://localhost:3001/api/sla/statistics

# Get SLA report for last hour
curl http://localhost:3001/api/sla/report?hours=1
```

**SLA Thresholds:**
- Basic: 30 minutes
- Pro: 5 minutes
- Enterprise: 2 minutes

### 3. Report Generation
Generate professional white-labeled reports:

```bash
# Generate HTML report
curl -X POST http://localhost:3001/api/reports/generate \
  -d '{"scanId":"scan-123","format":"html","clientBrand":{"companyName":"Client Corp"}}'

# Generate markdown report
curl -X POST http://localhost:3001/api/reports/generate \
  -d '{"scanId":"scan-123","format":"markdown"}'
```

### 4. Proposal Generator
Automatically create consulting proposals:

```bash
curl -X POST http://localhost:3001/api/proposals/generate \
  -d '{
    "clientName": "Acme Corp",
    "url": "https://acme.com",
    "violationCount": 23,
    "criticalViolations": 5,
    "userImpact": 50000
  }'
```

## 🎯 Quick Start

### 1. Install Dependencies
```bash
cd packages/api
npm install
```

### 2. Start the API Server
```bash
npm run dev
```

### 3. Run Readiness Check
```bash
./scripts/consultant-readiness-check.sh
```

Expected output: `✨ STATUS: CONSULTANT READY ✅`

### 4. Try the Demo Workflow
```bash
./scripts/demo-client-workflow.sh
```

This demonstrates the complete client lifecycle:
1. Client onboarding
2. Scan registration and tracking
3. Proposal generation
4. SLA monitoring
5. Client management

## 📚 Documentation

- **[Consultant Business Guide](CONSULTANT_BUSINESS_GUIDE.md)** - Complete playbook to $10K MRR
- **[Marketing Site Setup](consultant-site/README.md)** - Deploy your consulting website
- **[API Documentation](packages/api/README.md)** - Full API reference

## 🏗️ New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients/onboard` | POST | Onboard new client |
| `/api/clients` | GET | List all clients |
| `/api/clients/:id` | GET | Get client details |
| `/api/clients/:id/scans` | PATCH | Update scan count |
| `/api/sla/report` | GET | Get SLA compliance report |
| `/api/sla/statistics` | GET | Get SLA statistics |
| `/api/sla/scan/register` | POST | Register scan for tracking |
| `/api/sla/scan/:id/complete` | POST | Mark scan complete |
| `/api/reports/generate` | POST | Generate compliance report |
| `/api/reports/draft/:id` | POST | Generate report from draft |
| `/api/proposals/generate` | POST | Generate consulting proposal |
| `/api/proposals/recommend-tier` | POST | Recommend pricing tier |

## 💼 Business Ready

The platform is now **100% consultant ready** with:

✅ Automated client onboarding  
✅ White-labeled professional reports  
✅ SLA monitoring and compliance  
✅ Automated proposal generation  
✅ Three-tier pricing structure  
✅ Complete business documentation  

## 🚀 Next Steps

1. **Set up Stripe** - Get API keys from https://dashboard.stripe.com/
2. **Configure Clerk** - Set up authentication at https://dashboard.clerk.com/
3. **Deploy Marketing Site** - Follow instructions in `consultant-site/README.md`
4. **Record Demo** - Create 1-minute Loom video showcasing the platform
5. **Start Outreach** - Use templates in `CONSULTANT_BUSINESS_GUIDE.md`

## 💰 Revenue Target

Following the business guide:
- **Week 1**: $1,000-$3,000 (3-10 clients)
- **Month 1**: $7,000-$10,000 MRR
- **Month 3**: $15,000+ MRR

## 🆘 Support

For questions or issues:
- GitHub Issues: https://github.com/aaj441/wcag-ai-platform/issues
- Email: support@wcagai.com (set this up!)

---

**Ready to start signing clients?** Run `./scripts/consultant-readiness-check.sh` to verify!
