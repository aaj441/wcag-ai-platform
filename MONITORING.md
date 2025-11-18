# Production Monitoring Guide

**WCAGAI Platform - Comprehensive Monitoring Strategy**

---

## Overview

Production monitoring ensures system reliability through:
- Real-time error tracking (Sentry)
- Performance metrics collection
- Health check automation
- Automated alerting and remediation

---

## 1. Sentry Configuration

### Setup

**Environment Variables:**
```bash
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
RAILWAY_GIT_COMMIT_SHA=auto  # Provided by Railway
```

**Initialization:**
```typescript
import { initializeSentry } from './config/sentry';

// In your app.ts
initializeSentry(app);

// Must add middleware
app.use(sentryRequestHandler);
app.use(sentryTracingHandler);
// ... routes ...
app.use(sentryErrorHandler);
```

### Release Tracking

Every deployment automatically tracked with:
- Git commit SHA as release ID
- Source maps for stack traces
- Release notes from git commit message

**View releases:** https://sentry.io/organizations/wcagai/releases/

### Error Context

Capture errors with context:
```typescript
import { captureException, addSentryContext } from './config/sentry';

try {
  await processPayment(userId, amount);
} catch (error) {
  captureException(error, {
    payment: { userId, amount },
    user: { id: userId },
  });
}
```

---

## 2. Metrics Collection

### Available Metrics

**Request Metrics:**
- Total requests
- Requests per minute
- Success/failure rates
- Response times (avg, p95, p99)

**Error Metrics:**
- Total errors
- Errors by type
- Error rate percentage

**Queue Metrics:**
- Jobs waiting/active/completed/failed
- Average processing time

### Accessing Metrics

**Health endpoint:**
```bash
curl https://api.wcagai.com/health/detailed
```

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": { "healthy": true },
    "redis": { "healthy": true },
    "queue": {
      "healthy": true,
      "waiting": 5,
      "active": 2,
      "capacity": "healthy"
    }
  },
  "metrics": {
    "requests": {
      "total": 10523,
      "successRate": 99.2,
      "avgResponseTime": 145
    },
    "errors": {
      "total": 8,
      "rate": 0.08
    }
  }
}
```

---

## 3. Automated Health Monitoring

### GitHub Actions Workflow

**File:** `.github/workflows/production-monitoring.yml`

**Schedule:** Every 5 minutes (business hours: 9 AM - 6 PM UTC, Monday-Friday)

**What it does:**
1. Checks `/health/detailed` endpoint
2. Evaluates metrics against thresholds
3. Auto-remediates if issues detected (restarts service)
4. Creates alerts on failure

### Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Queue Depth | > 100 jobs | Auto-remediate |
| Error Rate | > 10% | Alert + Auto-remediate |
| Database | Unhealthy | Auto-remediate |
| Response Time | > 5s (p95) | Alert only |

---

## 4. Alerting

### Alert Channels

**Slack Integration:**
```bash
# Set in GitHub repository secrets
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Alerts sent to `#production-alerts` channel.

**GitHub Issues:**
Auto-creates issues with `production` + `urgent` labels for critical failures.

**PagerDuty (Optional):**
```bash
PAGERDUTY_INTEGRATION_KEY=...
```

### Alert Types

**P0 - Critical (24/7 alerts):**
- Production service down
- Database connection lost
- Data breach detected

**P1 - High (Business hours):**
- High error rate (>10%)
- Queue overload (>100 jobs)
- Auto-remediation failed

**P2 - Medium:**
- Performance degradation
- External API failures
- Elevated error rates (5-10%)

---

## 5. Dashboards

### Sentry Dashboard

**URL:** https://sentry.io/organizations/wcagai/

**Key Views:**
- **Issues:** Real-time errors grouped by type
- **Performance:** Transaction times, slow queries
- **Releases:** Deployment tracking, error spikes
- **Alerts:** Configured alert rules

### Metrics Endpoint

**Custom Dashboard** (Future):
Build with Grafana or similar:
- Query `/health/detailed` every minute
- Store time-series data
- Visualize trends

**Recommended Metrics:**
- Request rate over time
- Error rate trend
- Response time percentiles
- Queue depth trend

---

## 6. On-Call Procedures

### When Alert Fires

**Step 1: Acknowledge**
- Check Slack/PagerDuty notification
- Acknowledge within 15 minutes (P0) or 1 hour (P1)

**Step 2: Assess**
- Check Sentry for recent errors
- Review `/health/detailed` endpoint
- Check Railway deployment logs

**Step 3: Triage**
- Is this a known issue?
- Is auto-remediation working?
- Does this require immediate action?

**Step 4: Remediate**
- For service down: Check Railway dashboard, review logs
- For high errors: Review Sentry issues, identify pattern
- For queue overload: Check job processing, scale workers

**Step 5: Document**
- Create incident report (see INCIDENT_RESPONSE.md)
- Update on-call log
- Follow up with post-mortem if P0/P1

### Escalation Path

1. **On-call engineer** (first responder)
2. **Engineering manager** (if unresolved after 30 min)
3. **CTO** (if P0 and unresolved after 1 hour)

---

## 7. Common Issues

### High Error Rate

**Symptoms:** Error rate > 10%, Sentry flooded with errors

**Common Causes:**
- External API down (OpenAI, Stripe, etc.)
- Database connection pool exhausted
- Bad deployment with bugs

**Resolution:**
1. Check Sentry grouped issues
2. Identify error pattern (same stack trace?)
3. If external API: Enable circuit breaker
4. If deployment bug: Rollback deployment
5. If DB: Scale up connection pool

### Queue Overload

**Symptoms:** Queue depth > 100, jobs timing out

**Common Causes:**
- Spike in scan requests
- Slow job processing (Puppeteer issues)
- Worker crash/not processing

**Resolution:**
1. Check job details: `GET /api/queue/stats`
2. Scale workers: Railway dashboard → Scale service
3. Clear stuck jobs: Use admin endpoint
4. Investigate slow jobs: Review processing times

### Slow Response Times

**Symptoms:** p95 response time > 5s

**Common Causes:**
- Slow database queries (missing indexes)
- Unoptimized code paths
- External API latency

**Resolution:**
1. Check Sentry performance tab
2. Identify slow transactions
3. Review database query performance
4. Add database indexes if needed
5. Implement caching for repeated queries

---

## 8. Maintenance Tasks

### Daily
- ✅ Review Sentry error summary
- ✅ Check for new high-priority issues
- ✅ Verify auto-remediation working

### Weekly
- ✅ Review performance trends
- ✅ Check disk space and resource usage
- ✅ Review alert configuration effectiveness

### Monthly
- ✅ Analyze error trends (improving/degrading?)
- ✅ Review and update alert thresholds
- ✅ Update monitoring documentation
- ✅ Test incident response procedures

---

## 9. Metrics Reference

### Request Metrics

```typescript
interface RequestMetrics {
  totalRequests: number;        // All HTTP requests
  successfulRequests: number;   // Status 2xx, 3xx
  failedRequests: number;       // Status 4xx, 5xx
  avgResponseTime: number;      // Average in ms
  p95ResponseTime: number;      // 95th percentile
  p99ResponseTime: number;      // 99th percentile
  requestsPerMinute: number;    // Throughput
}
```

**Targets:**
- Success rate: > 99%
- Avg response time: < 500ms
- p95 response time: < 2s
- p99 response time: < 5s

### Error Metrics

```typescript
interface ErrorMetrics {
  totalErrors: number;                        // Count
  errorsByType: Record<string, number>;      // Grouped
  errorRate: number;                          // Percentage
}
```

**Targets:**
- Error rate: < 1%
- No unhandled exceptions
- All errors logged to Sentry

---

## 10. Troubleshooting

### "Sentry not capturing errors"

**Check:**
1. `SENTRY_DSN` environment variable set?
2. Sentry initialized before app starts?
3. Error handler middleware added after routes?
4. Error actually thrown or returned?

**Test:**
```typescript
import Sentry from './config/sentry';
Sentry.captureMessage('Test message');
```

### "Metrics endpoint returning stale data"

**Check:**
1. MetricsCollector singleton being used?
2. Middleware recording requests?
3. Time zone issues (use UTC)?

### "Alerts not firing"

**Check:**
1. GitHub Actions workflow enabled?
2. Secrets configured (SLACK_WEBHOOK_URL)?
3. Threshold logic correct?
4. Alert channels working (test webhook)?

---

## Support

**Monitoring Issues:**
- Email: engineering@wcagai.com
- Sentry Support: https://sentry.io/support
- Review: [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)

---

**Last Updated:** November 17, 2025
**Next Review:** February 17, 2026
