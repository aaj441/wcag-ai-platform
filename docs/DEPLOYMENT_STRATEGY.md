# Zero-Downtime Deployment Strategy

## Table of Contents
- [Overview](#overview)
- [Blue-Green Deployment Architecture](#blue-green-deployment-architecture)
- [Database Migration Safety](#database-migration-safety)
- [Health Check System](#health-check-system)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring & Auto-Rollback](#monitoring--auto-rollback)
- [Deployment Runbook](#deployment-runbook)
- [Incident Response](#incident-response)

---

## Overview

This document defines the zero-downtime deployment strategy for the WCAG AI Platform, ensuring 99.99% uptime during deployments through blue-green deployments, safe database migrations, and automated rollback capabilities.

**Key Principles**:
- ✅ No user-facing downtime during deployments
- ✅ Instant rollback capability (< 30 seconds)
- ✅ Backward-compatible database migrations
- ✅ Automated health checks and smoke tests
- ✅ Real-time monitoring with auto-rollback triggers

---

## Blue-Green Deployment Architecture

### Concept

Blue-Green deployment maintains two identical production environments:
- **Blue**: Current production (live traffic)
- **Green**: New version (staged, tested, ready)

Traffic switches instantly from Blue to Green after validation.

### Railway Configuration

```bash
# 1. Create two services
railway service create wcagai-api-blue
railway service create wcagai-api-green

# 2. Deploy to Green (inactive)
railway up --service wcagai-api-green --environment production

# 3. Run health checks on Green
curl https://green.api.wcagai.com/health
curl https://green.api.wcagai.com/smoke-test

# 4. Switch traffic (instant cutover)
railway domain attach wcagai-api-green api.wcagai.com

# 5. Monitor for 15 minutes, rollback if needed
railway logs --service wcagai-api-green --tail

# 6. If stable, Green becomes new Blue
railway service rename wcagai-api-blue wcagai-api-old
railway service rename wcagai-api-green wcagai-api-blue
```

### Vercel Configuration (Webapp)

```bash
# Vercel handles blue-green automatically
vercel deploy --prod

# Preview deployment first
vercel deploy
# Test: https://wcagai-xyz123.vercel.app

# Promote to production after validation
vercel promote <deployment-url>
```

### Traffic Switching Strategy

| Method | Switch Time | Rollback Time | Use Case |
|--------|-------------|---------------|----------|
| **DNS** | 5-60 min | 5-60 min | Not recommended |
| **Load Balancer** | < 5 sec | < 5 sec | Railway/AWS ALB |
| **Service Mesh** | < 1 sec | < 1 sec | Kubernetes |
| **Railway Domain** | < 5 sec | < 5 sec | **Recommended** |

---

## Database Migration Safety

### Backward-Compatible Migrations

**Rule**: New code must work with old schema, old code must work with new schema.

#### ✅ Safe Migration Pattern

```prisma
// Step 1: Add new column (nullable)
model User {
  id        String   @id
  email     String
  firstName String?  // New field - NULLABLE
}

// Deploy code that uses firstName (optional)

// Step 2 (next deployment): Make required
model User {
  id        String   @id
  email     String
  firstName String   @default("")
}
```

#### ❌ Unsafe Migration Pattern

```prisma
// WRONG: Dropping column immediately
model User {
  id    String @id
  // email String  // REMOVED - breaks old code!
}
```

### Migration Workflow

```bash
# 1. Generate migration
cd packages/api
npx prisma migrate dev --name add_user_firstname

# 2. Review migration SQL
cat prisma/migrations/*/migration.sql

# 3. Test migration on staging
railway run --service wcagai-api --environment staging \
  "npx prisma migrate deploy"

# 4. Verify data integrity
railway run --service wcagai-api --environment staging \
  "npm run verify-data-integrity"

# 5. Deploy to production (BEFORE code deploy)
railway run --service wcagai-api --environment production \
  "npx prisma migrate deploy"

# 6. Monitor for errors
railway logs --service wcagai-api --tail | grep -i "prisma\|error"

# 7. Deploy code (after migration succeeds)
railway up --service wcagai-api-green
```

### Migration Rollback Strategy

**Option 1: Forward Fix** (Preferred)
```bash
# Create compensating migration
npx prisma migrate dev --name revert_user_firstname
```

**Option 2: Database Restore** (Emergency)
```bash
# Restore from backup
pg_restore -d $DATABASE_URL backup-pre-migration.dump

# Reset migration status
npx prisma migrate resolve --rolled-back <migration-name>
```

### Pre-Migration Checklist

- [ ] Migration is backward-compatible
- [ ] Tested on local database
- [ ] Tested on staging database
- [ ] Data backups completed (< 1 hour old)
- [ ] Rollback script prepared
- [ ] Migration time estimated (< 5 minutes for production)
- [ ] Off-peak deployment window scheduled

---

## Health Check System

### Endpoint Implementation

**File**: `packages/api/src/routes/health.ts`

```typescript
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import Redis from 'ioredis';

const router = Router();

// Basic health check (fast, no dependencies)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '2.0.0'
  });
});

// Readiness check (includes dependencies)
router.get('/health/ready', async (req, res) => {
  const checks = {
    api: 'ok',
    database: 'unknown',
    redis: 'unknown',
    openai: 'unknown'
  };

  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
  }

  try {
    // Redis check
    const redis = new Redis(process.env.REDIS_URL);
    await redis.ping();
    checks.redis = 'ok';
    redis.disconnect();
  } catch (error) {
    checks.redis = 'error';
  }

  try {
    // OpenAI check (quick models list)
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    checks.openai = response.ok ? 'ok' : 'error';
  } catch (error) {
    checks.openai = 'error';
  }

  const allHealthy = Object.values(checks).every(v => v === 'ok');
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString()
  });
});

// Liveness check (is process alive?)
router.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    pid: process.pid,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Smoke test (critical user flows)
router.get('/smoke-test', async (req, res) => {
  const tests = [];

  try {
    // Test 1: Create scan
    const scan = await prisma.scan.create({
      data: {
        url: 'https://example.com',
        status: 'queued',
        wcagLevel: 'AA'
      }
    });
    tests.push({ name: 'create_scan', status: 'pass' });

    // Test 2: Query scan
    const found = await prisma.scan.findUnique({
      where: { id: scan.id }
    });
    tests.push({ name: 'query_scan', status: found ? 'pass' : 'fail' });

    // Test 3: Delete test scan
    await prisma.scan.delete({ where: { id: scan.id } });
    tests.push({ name: 'delete_scan', status: 'pass' });

    // Test 4: Email service check
    // (Add actual email test if needed)
    tests.push({ name: 'email_service', status: 'pass' });

  } catch (error) {
    tests.push({ name: 'critical_error', status: 'fail', error: error.message });
  }

  const allPassed = tests.every(t => t.status === 'pass');

  res.status(allPassed ? 200 : 500).json({
    status: allPassed ? 'smoke_test_passed' : 'smoke_test_failed',
    tests,
    timestamp: new Date().toISOString()
  });
});

export default router;
```

### Health Check Configuration

**Railway Health Checks**:
```json
{
  "healthcheck": {
    "path": "/health/ready",
    "interval": 30,
    "timeout": 10,
    "retries": 3
  }
}
```

**Kubernetes Probes** (if applicable):
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

---

## Rollback Procedures

### One-Click Application Rollback

**Railway CLI**:
```bash
# View recent deployments
railway deployments --service wcagai-api --limit 10

# Rollback to previous deployment (instant)
railway rollback --service wcagai-api

# Rollback to specific deployment
railway rollback --service wcagai-api --deployment d-abc123xyz
```

**Vercel CLI**:
```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Database Rollback Script

**File**: `scripts/rollback/database-rollback.sh`

```bash
#!/bin/bash
set -e

MIGRATION_NAME=$1
BACKUP_FILE=$2

if [ -z "$MIGRATION_NAME" ] || [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./database-rollback.sh <migration-name> <backup-file>"
  exit 1
fi

echo "🔄 Starting database rollback..."

# 1. Create safety backup
echo "Creating safety backup..."
pg_dump $DATABASE_URL > "rollback-safety-$(date +%Y%m%d-%H%M%S).sql"

# 2. Mark migration as rolled back
echo "Marking migration as rolled back..."
npx prisma migrate resolve --rolled-back "$MIGRATION_NAME"

# 3. Restore from backup (if provided)
if [ -f "$BACKUP_FILE" ]; then
  echo "Restoring from backup: $BACKUP_FILE"
  psql $DATABASE_URL < "$BACKUP_FILE"
fi

# 4. Verify database state
echo "Verifying database state..."
npx prisma db pull

echo "✅ Database rollback complete"
```

### Feature Flag Instant Disable

**File**: `packages/api/src/lib/feature-flags.ts`

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class FeatureFlags {
  private static cache = new Map<string, boolean>();

  static async isEnabled(flag: string): Promise<boolean> {
    // Check cache first (1-minute TTL)
    if (this.cache.has(flag)) {
      return this.cache.get(flag)!;
    }

    // Check Redis
    const value = await redis.get(`feature:${flag}`);
    const enabled = value === 'true';

    this.cache.set(flag, enabled);
    setTimeout(() => this.cache.delete(flag), 60000); // 1 min cache

    return enabled;
  }

  static async enable(flag: string): Promise<void> {
    await redis.set(`feature:${flag}`, 'true');
    this.cache.delete(flag);
  }

  static async disable(flag: string): Promise<void> {
    await redis.set(`feature:${flag}`, 'false');
    this.cache.delete(flag);
  }
}

// Usage in routes
app.post('/api/scan', async (req, res) => {
  if (!(await FeatureFlags.isEnabled('scan_creation'))) {
    return res.status(503).json({
      error: 'Feature temporarily disabled',
      message: 'Scan creation is currently unavailable'
    });
  }
  // ... rest of handler
});
```

**Emergency Disable**:
```bash
# Disable feature instantly (no deployment needed)
redis-cli -u $REDIS_URL SET feature:scan_creation false
redis-cli -u $REDIS_URL SET feature:email_automation false

# Re-enable when fixed
redis-cli -u $REDIS_URL SET feature:scan_creation true
```

---

## Monitoring & Auto-Rollback

### Error Rate Tracking

**File**: `packages/api/src/middleware/error-tracking.ts`

```typescript
import Redis from 'ioredis';
import Sentry from '@sentry/node';

const redis = new Redis(process.env.REDIS_URL);

export async function trackError(error: Error, context: any) {
  // Send to Sentry
  Sentry.captureException(error, { extra: context });

  // Increment error counter
  const key = `errors:${new Date().toISOString().slice(0, 13)}`; // Hour bucket
  await redis.incr(key);
  await redis.expire(key, 7200); // 2 hour TTL

  // Check error rate
  const errorCount = await redis.get(key);
  const requestCount = await redis.get(`requests:${key.split(':')[1]}`);

  if (errorCount && requestCount) {
    const errorRate = parseInt(errorCount) / parseInt(requestCount);

    if (errorRate > 0.05) { // 5% error rate
      await triggerAutoRollback('High error rate detected', errorRate);
    }
  }
}

async function triggerAutoRollback(reason: string, errorRate: number) {
  console.error(`🚨 AUTO-ROLLBACK TRIGGERED: ${reason} (error rate: ${(errorRate * 100).toFixed(2)}%)`);

  // Notify team
  await notifySlack({
    text: '🚨 AUTO-ROLLBACK IN PROGRESS',
    fields: [
      { title: 'Reason', value: reason },
      { title: 'Error Rate', value: `${(errorRate * 100).toFixed(2)}%` },
      { title: 'Action', value: 'Rolling back to previous deployment' }
    ]
  });

  // Execute rollback
  // (This would call Railway/Vercel API or trigger webhook)
  const { execSync } = require('child_process');
  execSync('railway rollback --service wcagai-api');
}
```

### Performance Regression Detection

**File**: `packages/api/src/middleware/performance-monitor.ts`

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export function performanceMonitor(req, res, next) {
  const start = Date.now();

  res.on('finish', async () => {
    const duration = Date.now() - start;
    const endpoint = `${req.method}:${req.path}`;

    // Store in Redis sorted set (last 1000 requests)
    await redis.zadd(
      `perf:${endpoint}`,
      Date.now(),
      JSON.stringify({ duration, timestamp: Date.now() })
    );
    await redis.zremrangebyrank(`perf:${endpoint}`, 0, -1001); // Keep last 1000

    // Calculate p95
    const samples = await redis.zrange(`perf:${endpoint}`, 0, -1);
    const durations = samples.map(s => JSON.parse(s).duration).sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)];

    // Alert if p95 > 500ms
    if (p95 > 500) {
      console.warn(`⚠️  Performance regression on ${endpoint}: p95=${p95}ms`);
      // Could trigger auto-rollback here
    }
  });

  next();
}
```

### Monitoring Dashboard Configuration

**DataDog Dashboard JSON**:
```json
{
  "title": "WCAG AI Platform - Deployment Health",
  "widgets": [
    {
      "definition": {
        "type": "timeseries",
        "requests": [
          {
            "q": "sum:wcagai.requests.count{env:production}.as_count()",
            "display_type": "line"
          }
        ],
        "title": "Request Rate"
      }
    },
    {
      "definition": {
        "type": "timeseries",
        "requests": [
          {
            "q": "sum:wcagai.errors.count{env:production}.as_count() / sum:wcagai.requests.count{env:production}.as_count()",
            "display_type": "line"
          }
        ],
        "title": "Error Rate (%)",
        "markers": [
          { "value": "y = 5", "display_type": "error dashed" }
        ]
      }
    },
    {
      "definition": {
        "type": "timeseries",
        "requests": [
          {
            "q": "avg:wcagai.response_time.p95{env:production}",
            "display_type": "line"
          }
        ],
        "title": "Response Time (p95)",
        "markers": [
          { "value": "y = 500", "display_type": "warning dashed" }
        ]
      }
    }
  ]
}
```

---

## Deployment Runbook

### Pre-Deployment (T-24 hours)

- [ ] **Notify team**: Send deployment announcement
- [ ] **Create backup**: Full database backup
- [ ] **Review changes**: Final PR review
- [ ] **Test migrations**: Run on staging database
- [ ] **Prepare rollback**: Generate rollback scripts
- [ ] **Schedule window**: Off-peak hours (2-4 AM UTC)

### Deployment Execution (T-0)

#### Phase 1: Database Migration (T+0 min)
```bash
# 1. Final backup
pg_dump $DATABASE_URL > "backup-$(date +%Y%m%d-%H%M%S).sql"

# 2. Run migration
railway run --service wcagai-api \
  "npx prisma migrate deploy"

# 3. Verify migration
railway run "npx prisma db pull"
```

#### Phase 2: Deploy to Green (T+5 min)
```bash
# 1. Deploy to inactive environment
railway up --service wcagai-api-green --environment production

# 2. Wait for deployment
railway logs --service wcagai-api-green --tail
```

#### Phase 3: Health Checks (T+10 min)
```bash
# 1. Basic health
curl https://green.api.wcagai.com/health

# 2. Readiness check
curl https://green.api.wcagai.com/health/ready

# 3. Smoke test
curl https://green.api.wcagai.com/smoke-test

# 4. Manual testing
# - Create scan
# - Approve email draft
# - Generate VPAT report
```

#### Phase 4: Traffic Switch (T+20 min)
```bash
# 1. Switch 10% traffic (canary)
railway traffic split wcagai-api-blue:90 wcagai-api-green:10

# 2. Monitor for 5 minutes
railway logs --service wcagai-api-green --tail | grep -i error

# 3. Switch 50% traffic
railway traffic split wcagai-api-blue:50 wcagai-api-green:50

# 4. Monitor for 5 minutes

# 5. Full cutover
railway domain attach wcagai-api-green api.wcagai.com
```

#### Phase 5: Monitoring (T+30 min)
```bash
# Monitor for 15 minutes
- Error rate < 1%
- Response time p95 < 500ms
- No spike in Sentry errors
- User reports: None
```

#### Phase 6: Completion (T+45 min)
```bash
# 1. Swap service names
railway service rename wcagai-api-blue wcagai-api-old
railway service rename wcagai-api-green wcagai-api-blue

# 2. Keep old service for 24 hours
# 3. Send completion notification
# 4. Update deployment log
```

### Post-Deployment (T+24 hours)

- [ ] **Monitor metrics**: 24-hour review
- [ ] **Check error logs**: Any new error patterns?
- [ ] **User feedback**: Any complaints?
- [ ] **Performance**: Any degradation?
- [ ] **Delete old service**: `railway service delete wcagai-api-old`
- [ ] **Update docs**: Document any issues/learnings

---

## Incident Response

### Rollback Decision Matrix

| Condition | Action | Timeframe |
|-----------|--------|-----------|
| Error rate > 5% | **Immediate rollback** | < 2 min |
| p95 response time > 2x baseline | **Immediate rollback** | < 2 min |
| Database corruption | **Emergency rollback + restore** | < 5 min |
| Critical feature broken | **Immediate rollback** | < 2 min |
| Minor UI issue | **Forward fix** | Next deployment |
| Performance degradation < 20% | **Monitor, forward fix** | 24 hours |

### Emergency Rollback Procedure

```bash
# 1. Trigger rollback
railway rollback --service wcagai-api

# 2. Verify rollback
curl https://api.wcagai.com/health

# 3. Notify team
slack-notify "#incidents" "ROLLBACK COMPLETED"

# 4. Database rollback (if needed)
./scripts/rollback/database-rollback.sh <migration> <backup>

# 5. Disable broken features
redis-cli SET feature:new_feature false

# 6. Investigate root cause
railway logs --service wcagai-api --since 1h > incident.log

# 7. Create incident report
# - What happened?
# - Why did it happen?
# - How do we prevent it?
```

### Communication Template

**Slack Incident Notification**:
```
🚨 PRODUCTION INCIDENT

Status: Rollback in progress
Severity: P1 - Critical
Affected: All users
Impact: <describe impact>

Timeline:
T+0: Issue detected
T+2: Rollback initiated
T+5: Rollback complete
T+10: Verification complete

Next steps:
- Root cause analysis
- Forward fix preparation
- Post-mortem scheduled
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Deployment Frequency** | Daily | GitHub Actions |
| **Deployment Duration** | < 30 min | Automated tracking |
| **Rollback Time** | < 2 min | Manual timing |
| **Failed Deployments** | < 5% | Deployment logs |
| **Mean Time to Recovery (MTTR)** | < 15 min | Incident tracking |
| **Change Failure Rate** | < 10% | Incident count / deployments |

---

## Tools & Resources

- **Railway CLI**: https://docs.railway.app/develop/cli
- **Prisma Migrations**: https://www.prisma.io/docs/concepts/components/prisma-migrate
- **Feature Flags**: LaunchDarkly or custom Redis-based
- **Monitoring**: DataDog, Sentry, UptimeRobot
- **Communication**: Slack, PagerDuty

---

**Version**: 1.0.0
**Last Updated**: November 15, 2025
**Owner**: Platform Engineering Team
**Review Frequency**: Quarterly
