# WCAG AI Platform - Deployment Guide

> **Production-grade deployment infrastructure for the WCAG AI Platform**

This directory contains the complete deployment infrastructure, including Terraform configurations, CI/CD pipelines, monitoring setup, and deployment scripts.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Infrastructure](#infrastructure)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment](#deployment)
- [Monitoring & Observability](#monitoring--observability)
- [Security](#security)
- [Disaster Recovery](#disaster-recovery)
- [Cost Optimization](#cost-optimization)

---

## Overview

The WCAG AI Platform deployment is built with:

- **Infrastructure as Code**: Terraform for reproducible infrastructure
- **Container Orchestration**: Railway for managed deployment
- **Observability**: OpenTelemetry + Prometheus + Jaeger
- **Feature Flags**: LaunchDarkly for progressive rollouts
- **Security**: SSRF protection, rate limiting, audit logging
- **Compliance**: SOC2-ready audit logs with 7-year retention

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Railway                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Frontend   │  │   Backend    │  │  PostgreSQL  │     │
│  │   (Vite)     │  │   (Express)  │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                   │             │
│         └─────────────────┴───────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
┌─────────────────────────────────────────────────────────────┐
│                         AWS                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ S3 Audit Logs│  │ S3 Scan Data │  │  CloudWatch  │     │
│  │ (Encrypted)  │  │              │  │   Logs       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
┌─────────────────────────────────────────────────────────────┐
│                   Third-Party Services                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  OpenAI      │  │ LaunchDarkly │  │   Sentry     │     │
│  │  (GPT-4)     │  │  (Flags)     │  │  (Errors)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Tools

```bash
# Node.js 20+
node --version

# Railway CLI
npm install -g @railway/cli

# Terraform (optional, for infrastructure management)
terraform --version

# k6 (for load testing)
brew install k6  # macOS
# or see https://k6.io/docs/getting-started/installation/

# AWS CLI (for S3 access)
aws --version
```

### Required Credentials

Create a `.env.production` file from the template:

```bash
cp config/.env.template config/.env.production
# Edit and fill in all required values
```

Required secrets:
- `RAILWAY_TOKEN` - Railway API token
- `OPENAI_API_KEY` - OpenAI API key
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `SENTRY_DSN` - Sentry error tracking DSN
- `LAUNCHDARKLY_SDK_KEY` - LaunchDarkly SDK key

### GitHub Secrets

Configure these secrets in your GitHub repository:

```
Settings → Secrets and variables → Actions → New repository secret
```

Required secrets:
- `RAILWAY_TOKEN`
- `OPENAI_API_KEY`
- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `LAUNCHDARKLY_SDK_KEY`
- `GITGUARDIAN_API_KEY` (optional)
- `SNYK_TOKEN` (optional)
- `PAGERDUTY_INTEGRATION_KEY` (optional)

---

## Quick Start

### 1. Local Development

```bash
# Install dependencies
cd packages/api && npm install
cd packages/webapp && npm install

# Run locally
cd packages/api && npm run dev
cd packages/webapp && npm run dev
```

### 2. Deploy to Staging

```bash
# One-command deployment
./deployment/scripts/deploy.sh staging
```

### 3. Deploy to Production

```bash
# Automated via GitHub Actions (on push to main)
git push origin main

# Or manual deployment
./deployment/scripts/deploy.sh production
```

---

## Infrastructure

### Terraform Setup

Initialize and apply infrastructure:

```bash
cd deployment/terraform

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize Terraform
terraform init

# Preview changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan
```

### Infrastructure Components

**Railway Services:**
- PostgreSQL 16 (primary database)
- Redis 7 (caching & job queue)
- Backend API (Express + Node.js)
- Frontend (Vite + React)

**AWS Resources:**
- S3 bucket for audit logs (encrypted, 7-year retention)
- S3 bucket for scan results (90-day retention)
- KMS key for encryption
- CloudWatch log groups
- IAM roles and policies

### Autoscaling

Backend autoscaling is configured in Terraform:

```terraform
autoscaling = {
  enabled      = true
  min_replicas = 1
  max_replicas = 5
  target_cpu   = 70
}
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The production pipeline includes:

1. **Security Scanning**
   - GitGuardian secrets detection
   - Trivy vulnerability scanning
   - Snyk dependency analysis

2. **Testing**
   - Linting (ESLint)
   - Type checking (TypeScript)
   - Unit tests
   - Build verification

3. **Deployment Stages**
   - Build Docker images
   - Deploy to staging
   - Run smoke tests
   - Deploy to production (with approval)
   - Automated rollback on failure

4. **Post-Deployment**
   - Health checks
   - Load testing
   - Metrics verification
   - Sentry release tracking

### Manual Deployment

```bash
# Deploy a specific branch
git checkout feature-branch
./deployment/scripts/deploy.sh staging

# Deploy with custom Railway environment
railway environment select my-environment
railway up
```

---

## Monitoring & Observability

### Metrics (Prometheus)

Access metrics at: `https://your-api-url/metrics`

Key metrics:
- `wcagai_scan_duration_seconds` - Scan performance
- `wcagai_browser_pool_utilization` - Resource usage
- `wcagai_ai_tokens_total` - AI token consumption
- `wcagai_ai_cost_usd_total` - Estimated costs
- `wcagai_violations_total` - WCAG violations detected

### Distributed Tracing (Jaeger)

OpenTelemetry traces are exported to Jaeger:

```bash
# Set Jaeger endpoint
export JAEGER_ENDPOINT=http://jaeger:14268/api/traces
```

### Logs

Structured JSON logging with Winston:

```bash
# View Railway logs
railway logs --service=wcagaii-backend

# Filter by level
railway logs --service=wcagaii-backend | grep ERROR
```

### Alerts

Configure PagerDuty integration in GitHub Actions workflow:

```yaml
env:
  PAGERDUTY_INTEGRATION_KEY: ${{ secrets.PAGERDUTY_INTEGRATION_KEY }}
```

---

## Security

### SSRF Protection

Blocks scanning of private IPs and metadata endpoints:
- `localhost`, `127.0.0.1`
- Private ranges: `10.0.0.0/8`, `192.168.0.0/16`, etc.
- Cloud metadata: `169.254.169.254`, `metadata.google.internal`

### Rate Limiting

- **API endpoints**: 100 requests / 15 minutes per IP
- **Scan endpoint**: 10 scans / hour per IP

### Input Validation

- URL validation (max 2048 chars)
- WCAG level validation (A, AA, AAA)
- XSS protection via Helmet

### Audit Logging

All scans are logged to S3 with:
- Cryptographic signatures
- SHA256 hashes
- 7-year retention
- KMS encryption

---

## Deployment Verification

### Run Verification Script

```bash
./deployment/scripts/verify-production.sh https://your-production-url
```

This validates all 10 critical production requirements:

1. ✅ Health check verifies database connectivity
2. ✅ Rollback capability (< 60 seconds)
3. ✅ Environment parity (IaC)
4. ✅ Load testing & autoscaling
5. ✅ Observability (metrics, tracing, logs)
6. ✅ Data backup & restoration
7. ✅ Dependency resilience
8. ✅ Security audit (no secrets, SSRF protection)
9. ✅ Build reproducibility
10. ✅ Business continuity (runbooks)

### Smoke Tests

```bash
./deployment/scripts/smoke-test.sh https://your-production-url
```

### Load Testing

```bash
k6 run --vus 10 --duration 60s deployment/scripts/load-test.js
```

---

## Disaster Recovery

### Rollback Procedure

**Automated (GitHub Actions):**
- Failures automatically trigger rollback

**Manual:**
```bash
# Rollback Railway deployment
railway rollback --service=wcagaii-backend
railway rollback --service=wcagaii-frontend

# Rollback Terraform
cd deployment/terraform
terraform apply -target=previous_version
```

### Database Backup

Railway provides automatic PostgreSQL backups.

**Manual backup:**
```bash
railway run pg_dump > backup-$(date +%Y%m%d).sql
```

**Restore:**
```bash
railway run psql < backup-20240101.sql
```

### S3 Data Recovery

S3 versioning is enabled for audit logs:

```bash
# List versions
aws s3api list-object-versions --bucket wcagai-audit-logs

# Restore specific version
aws s3api get-object --bucket wcagai-audit-logs \
  --key scans/2024/01/01/scan-123/audit.json \
  --version-id VERSION_ID \
  restore.json
```

---

## Cost Optimization

### Estimated Monthly Costs

| Service | Cost | Notes |
|---------|------|-------|
| Railway (Backend) | $20-50 | Scales with usage |
| Railway (Database) | $10-20 | 10GB storage |
| Railway (Redis) | $5-10 | 256MB memory |
| AWS S3 (Audit Logs) | $5-10 | Glacier storage |
| OpenAI API | $100-500 | Token-based |
| Sentry | $0-26 | Free tier available |
| LaunchDarkly | $0-8 | Free tier available |
| **Total** | **$150-624** | Based on moderate usage |

### Cost Reduction Tips

1. **AI Usage**
   - Use GPT-4-Turbo instead of GPT-4 (10x cheaper)
   - Implement token limits
   - Cache common results

2. **Storage**
   - Enable S3 lifecycle policies (already configured)
   - Use Glacier for old audit logs
   - Compress scan results

3. **Compute**
   - Set appropriate autoscaling limits
   - Use Railway's hibernation for non-production environments

4. **Monitoring**
   - Use metric sampling for high-traffic endpoints
   - Limit trace sampling to 10-20%

### Budget Alerts

Set up CloudWatch billing alerts:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name wcagai-monthly-cost \
  --alarm-description "Alert when monthly cost exceeds $500" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold
```

---

## Troubleshooting

### Common Issues

**1. Deployment fails with "Health check timeout"**
```bash
# Check backend logs
railway logs --service=wcagaii-backend

# Verify database connection
railway run env | grep DATABASE_URL
```

**2. High AI costs**
```bash
# Check token usage metrics
curl https://your-api-url/metrics | grep wcagai_ai_tokens
```

**3. Scan timeouts**
```bash
# Increase timeout in environment variables
railway variables set SCAN_TIMEOUT=60000
```

**4. Rate limiting issues**
```bash
# Adjust rate limit
railway variables set API_RATE_LIMIT=200
```

---

## Support & Documentation

- **Main README**: `/README.md`
- **API Documentation**: `/packages/api/README.md`
- **Production Readiness**: `/PRODUCTION_READINESS_AUDIT.md`
- **WCAG Conformance**: `/WCAG_CONFORMANCE_REPORT.md`

### Getting Help

1. Check Railway logs: `railway logs`
2. Review metrics: `https://your-api-url/metrics`
3. Check Sentry errors: https://sentry.io
4. Review GitHub Actions: `.github/workflows/production-deploy.yml`

---

## License

MIT - See LICENSE file for details
