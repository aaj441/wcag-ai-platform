# GitHub Actions Workflows

## Overview

This directory contains 6 core CI/CD workflows that ensure code quality, security, and reliable deployments for the WCAG AI Platform.

**Last Updated:** November 17, 2025  
**Workflow Count:** 6

---

## 📋 Workflows Summary

| Workflow | Trigger | Purpose | Duration | Status |
|----------|---------|---------|----------|--------|
| **[Code Quality Checks](#1-code-quality-checks)** | PR, Push to main | TypeScript, API compatibility, complexity | ~5 min | [![Code Quality](https://github.com/aaj441/wcag-ai-platform/actions/workflows/code-quality-checks.yml/badge.svg)](https://github.com/aaj441/wcag-ai-platform/actions/workflows/code-quality-checks.yml) |
| **[Production Monitoring](#2-production-monitoring)** | Every 5 min (business hours) | Health checks, auto-remediation | ~3 min | [![Production Monitoring](https://github.com/aaj441/wcag-ai-platform/actions/workflows/production-monitoring.yml/badge.svg)](https://github.com/aaj441/wcag-ai-platform/actions/workflows/production-monitoring.yml) |
| **[Railway Deploy](#3-railway-deploy)** | Push to main | Deploy API to Railway with validation | ~10 min | [![Railway Deploy](https://github.com/aaj441/wcag-ai-platform/actions/workflows/railway-deploy.yml/badge.svg)](https://github.com/aaj441/wcag-ai-platform/actions/workflows/railway-deploy.yml) |
| **[Accessibility Scan](#4-accessibility-scan)** | PR to main/develop | WCAG compliance validation | ~5 min | [![Accessibility](https://github.com/aaj441/wcag-ai-platform/actions/workflows/accessibility.yml/badge.svg)](https://github.com/aaj441/wcag-ai-platform/actions/workflows/accessibility.yml) |
| **[Secret Rotation](#5-secret-rotation)** | 1st of month (2 AM UTC) | Rotate production secrets | ~15 min | [![Secret Rotation](https://github.com/aaj441/wcag-ai-platform/actions/workflows/rotate-secrets.yml/badge.svg)](https://github.com/aaj441/wcag-ai-platform/actions/workflows/rotate-secrets.yml) |
| **[Quarterly Deprecation](#6-quarterly-deprecation)** | Quarterly (Jan/Apr/Jul/Oct) | Report deprecated code | ~5 min | [![Quarterly Deprecation](https://github.com/aaj441/wcag-ai-platform/actions/workflows/quarterly-deprecation.yml/badge.svg)](https://github.com/aaj441/wcag-ai-platform/actions/workflows/quarterly-deprecation.yml) |

---

## 1. Code Quality Checks

**File:** `code-quality-checks.yml`  
**Triggers:** 
- Pull requests to `main` or `develop`
- Push to `main` branch

### Purpose

Consolidated workflow that enforces code quality standards and detects breaking changes. Replaced 3 previous workflows:
- ~~semantic-enforcement.yml~~
- ~~semantic-debt-prevention.yml~~
- ~~enhanced-semantic-analysis.yml~~

### Jobs

1. **TypeScript Compilation** - Ensures zero TypeScript errors
2. **API Breaking Changes Detection** - Compares exported API surface between branches
3. **Code Complexity Analysis** - Identifies files with high cyclomatic complexity
4. **PR Size Validation** - Warns on PRs > 1000 lines or 50 files
5. **Deprecation Enforcement** - Fails if deprecated code past deadline
6. **Quality Summary** - Aggregates all check results

### Success Criteria

- ✅ TypeScript compiles with zero errors
- ✅ No breaking API changes (unless documented)
- ✅ No files with complexity > 50
- ✅ No overdue deprecations

### Failure Actions

- ❌ Blocks PR merge
- 📝 Comments on PR with specific issues
- 📊 Generates detailed report

### Manual Trigger

```bash
gh workflow run code-quality-checks.yml
```

---

## 2. Production Monitoring

**File:** `production-monitoring.yml`  
**Triggers:**
- Every 5 minutes (9 AM - 6 PM UTC, Monday-Friday)
- Manual dispatch
- Push to workflow file

### Purpose

Monitors production health and performs auto-remediation. Replaced 2 previous workflows:
- ~~health-monitor.yml~~
- ~~alerting.yml~~

### Jobs

1. **Health Monitoring** - Collects metrics from `/health/detailed`
   - System status (healthy/degraded/unhealthy)
   - Database connectivity
   - Redis connectivity
   - Queue depth
   - Response times

2. **Auto-Remediation** (conditional) - Runs if health issues detected
   - Restarts Railway service
   - Verifies recovery (3 attempts, 20s intervals)
   - Escalates to alerts if restart fails

3. **Alert Notifications** (on failure)
   - Sends Slack notification
   - Creates GitHub issue with "production" label
   - Includes detailed health report

4. **Monitoring Summary** - Logs summary to workflow output

### Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Queue Depth | > 100 jobs | Auto-remediate |
| Database | Unhealthy | Auto-remediate |
| System Status | Unhealthy | Auto-remediate + Alert |
| Auto-Remediation | Failed | Create GitHub issue |

### Manual Trigger

```bash
gh workflow run production-monitoring.yml
```

### Artifacts

- `health-report` - JSON health check details (7 day retention)

---

## 3. Railway Deploy

**File:** `railway-deploy.yml`  
**Triggers:**
- Push to `main` branch
- Manual dispatch (with environment selection)

### Purpose

Complete deployment pipeline for Railway with validation, stress testing, and rollback.

### Stages

1. **Pre-Deploy Validation** (~2 min)
   - Checkout code
   - Install dependencies
   - TypeScript compilation check
   - Run unit tests (continue-on-error)
   - Validate Prisma migration files

2. **Stress Testing** (~20 min, manual only)
   - Spin up PostgreSQL + Redis services
   - Memory leak detection test (1000 cycles)
   - k6 load test (100 concurrent users)
   - Upload stress test results as artifact

3. **Deploy to Railway** (~3 min)
   - Install Railway CLI
   - Verify Railway credentials
   - Deploy with `railway up`
   - Wait 30s for stabilization

4. **Database Migrations** (~2 min)
   - Run Prisma migrations
   - Apply performance indexes (SQL)
   - Verify database schema

5. **Post-Deploy Health Checks** (~2 min)
   - Basic health check (`/health`)
   - Detailed health check (`/health/detailed`)
   - Circuit breaker status
   - Database connectivity
   - Redis connectivity
   - Queue capacity
   - Deployment summary

6. **Rollback on Failure** (conditional)
   - Automatic rollback if health checks fail
   - Verify rollback health
   - Notify team of failure

### Environment Variables Required

| Variable | Purpose | Source |
|----------|---------|--------|
| `RAILWAY_TOKEN` | Railway API authentication | GitHub Secrets |
| `RAILWAY_SERVICE_ID` | Target Railway service | GitHub Secrets |

### Manual Trigger

```bash
# Production deployment
gh workflow run railway-deploy.yml

# Staging deployment with stress tests
gh workflow run railway-deploy.yml -f environment=staging
```

### Artifacts

- `stress-test-results` - k6 load test JSON (30 day retention)

---

## 4. Accessibility Scan

**File:** `accessibility.yml`  
**Triggers:**
- Pull requests to `main` or `develop`
- Push to `main` branch
- Manual dispatch

### Purpose

Validates WCAG 2.1 AA compliance using axe-core automated scanning.

### Steps

1. Checkout code
2. Install dependencies (API + Webapp)
3. Build applications
4. Start background servers (API on :3001, Webapp on :3000)
5. Run axe-core accessibility scan (`scripts/accessibility-scan.js`)
6. Update evidence vault (`scripts/update-evidence-vault.js`)
7. Upload scan report as artifact

### Thresholds

| Severity | Max Allowed | Action |
|----------|-------------|--------|
| Critical | 0 | ❌ Fail workflow |
| Serious | 3 | ❌ Fail workflow |
| Moderate | 10 | ❌ Fail workflow |
| Minor | Unlimited | ⚠️  Warning only |

### Scripts Used

- `scripts/accessibility-scan.js` - Runs Puppeteer + axe-core scan
- `scripts/update-evidence-vault.js` - Stores results for compliance

### Manual Trigger

```bash
gh workflow run accessibility.yml
```

### Artifacts

- `accessibility-report` - JSON scan results (30 day retention)

---

## 5. Secret Rotation

**File:** `rotate-secrets.yml`  
**Triggers:**
- Scheduled: 1st of every month at 2 AM UTC
- Manual dispatch (can specify individual secret)

### Purpose

Monthly automated rotation of production secrets for security compliance.

### Secrets Rotated

1. **OpenAI API Key** 
   - Generates new key (currently placeholder)
   - Updates GitHub secret
   - Updates Railway environment variable

2. **Database Password**
   - Generates strong random password (32 chars)
   - Updates Railway DATABASE_URL
   - Verifies connection

3. **Admin API Key**
   - Generates new API key
   - Updates Railway environment variable

4. **JWT Secret**
   - Generates new secret
   - Updates Railway environment variable
   - Forces all user sessions to re-authenticate

### Process

1. **Audit Log Initialization** - Logs rotation start
2. **Secret Generation** - Creates new secure values
3. **GitHub Secret Update** - Uses `gh` CLI to update
4. **Railway Variable Update** - Uses Railway CLI
5. **Health Check** - Verifies service still healthy
6. **Audit Commit** - Commits audit log to repo

### Manual Trigger

```bash
# Rotate all secrets
gh workflow run rotate-secrets.yml

# Rotate specific secret
gh workflow run rotate-secrets.yml -f secret_name=OPENAI_API_KEY
```

### Audit Trail

Audit logs stored in `secret-rotation-audit.log` (committed to repo).

---

## 6. Quarterly Deprecation

**File:** `quarterly-deprecation.yml`  
**Triggers:**
- Scheduled: 1st of Jan/Apr/Jul/Oct at 9 AM UTC
- Manual dispatch

### Purpose

Quarterly scan for deprecated code to maintain code hygiene.

### Process

1. **Scan Codebase** - Finds all `@deprecated` tags
2. **Parse Deadlines** - Extracts `deadline: YYYY-MM-DD` from comments
3. **Generate Report** - Creates markdown report with:
   - Overdue deprecations
   - Upcoming deprecations (next 90 days)
   - Total deprecated items
4. **Commit Report** - Saves to `reports/deprecation-YYYY-MM-DD.md`
5. **Create GitHub Issues** - One issue per overdue deprecation
6. **Send Notifications** - Slack notification with summary

### Report Format

```markdown
# Deprecation Report - 2025-01-01

## ⚠️ Overdue Deprecations (Action Required)
- [ ] `/path/to/file.ts:123` - Function `oldMethod()` (deadline: 2024-12-01)

## ⏰ Upcoming Deprecations (Next 90 Days)
- [ ] `/path/to/file.ts:456` - Class `LegacyService` (deadline: 2025-03-01)

## 📊 Statistics
- Total deprecated items: 15
- Overdue: 1
- Upcoming (90 days): 3
```

### Manual Trigger

```bash
gh workflow run quarterly-deprecation.yml
```

---

## 🔧 Workflow Consolidation History

**November 17, 2025:** Reduced from 11 workflows to 6 core workflows

### Deleted Workflows

| Workflow | Reason | Replaced By |
|----------|--------|-------------|
| `semantic-enforcement.yml` | Redundant | `code-quality-checks.yml` |
| `semantic-debt-prevention.yml` | Redundant | `code-quality-checks.yml` |
| `enhanced-semantic-analysis.yml` | Incomplete | `code-quality-checks.yml` |
| `health-monitor.yml` | Redundant | `production-monitoring.yml` |
| `alerting.yml` | Redundant | `production-monitoring.yml` |
| `deployment-harmony.yml` | Broken scripts | Validation moved to `deployment/scripts/` |
| `production-deploy.yml` | Broken actions | `railway-deploy.yml` |
| `secret-rotation.yml` | Duplicate | `rotate-secrets.yml` (kept the better one) |
| `summary.yml` | Broken action | Removed (used non-existent `actions/ai-inference@v1`) |

### Benefits of Consolidation

- ✅ **Reduced CI/CD overhead** - Fewer parallel runs
- ✅ **Eliminated duplicates** - No redundant checks
- ✅ **Unified reporting** - Single source of truth per category
- ✅ **Easier maintenance** - 6 workflows vs 11
- ✅ **Clearer organization** - Each workflow has distinct purpose

---

## 📁 Related Scripts

Workflows depend on these deployment scripts:

| Script | Purpose | Used By |
|--------|---------|---------|
| `deployment/scripts/verify-deployment-harmony.sh` | Pre-deployment validation | Manual deployment |
| `deployment/scripts/deploy-unified.sh` | Coordinated Railway + Vercel deploy | Manual deployment |
| `deployment/scripts/validate-railway.sh` | Railway environment check | `deploy-unified.sh` |
| `deployment/scripts/validate-vercel.sh` | Vercel environment check | `deploy-unified.sh` |
| `deployment/scripts/smoke-test.sh` | Post-deployment validation | `deploy-unified.sh` |
| `deployment/scripts/load-test.js` | Production load testing | Manual testing |
| `stress-tests/memory-leak-detector.ts` | Memory leak detection | `railway-deploy.yml` |
| `stress-tests/100-concurrent-scans.js` | k6 load test | `railway-deploy.yml` |
| `scripts/accessibility-scan.js` | axe-core WCAG scan | `accessibility.yml` |
| `scripts/update-evidence-vault.js` | Compliance evidence storage | `accessibility.yml` |

---

## 🚨 Troubleshooting

### Workflow Failing?

1. **Check workflow logs** in GitHub Actions tab
2. **Review related documentation:**
   - [SECURITY.md](../../SECURITY.md) - Security policies
   - [INCIDENT_RESPONSE.md](../../INCIDENT_RESPONSE.md) - Incident procedures
   - [COMPLIANCE.md](../../COMPLIANCE.md) - Compliance requirements
3. **Common issues:**
   - Missing GitHub secrets (RAILWAY_TOKEN, RAILWAY_SERVICE_ID)
   - TypeScript compilation errors (run `npm run build` locally)
   - Missing dependencies (run `npm install`)
   - Railway service down (check Railway dashboard)

### Re-running Workflows

```bash
# List recent workflow runs
gh run list --workflow=code-quality-checks.yml

# Re-run failed workflow
gh run rerun <run-id>

# Manually trigger workflow
gh workflow run code-quality-checks.yml
```

### Disabling a Workflow

Edit the workflow file and add at the top:

```yaml
name: Workflow Name
on:
  workflow_dispatch:  # Manual only
# Disable scheduled/automatic triggers
```

---

## 📞 Support

**For workflow issues:**
- Create an issue: [GitHub Issues](https://github.com/aaj441/wcag-ai-platform/issues)
- Contact: engineering@wcagai.com
- Security issues: security@wcagai.com

**Documentation:**
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Railway CLI Docs](https://docs.railway.app/develop/cli)
- [Vercel CLI Docs](https://vercel.com/docs/cli)
