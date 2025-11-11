# Production Features Quick Reference

## 🚀 One-Liner Commands

### Health & Monitoring
```bash
# Check system health
curl https://api.example.com/health

# View cost status
curl https://api.example.com/api/cost/report

# Check worker status
curl https://api.example.com/api/workers/stats

# View model drift
curl https://api.example.com/api/feedback/stats
```

### Emergency Actions
```bash
# Deactivate cost kill-switch (admin)
curl -X POST https://api.example.com/api/cost/deactivate -H "Authorization: Bearer $ADMIN_API_KEY"

# Revoke compromised worker
curl -X POST https://api.example.com/api/workers/revoke -H "Authorization: Bearer $ADMIN_API_KEY" -d '{"workerId":"worker-001","reason":"Security incident"}'

# Rollback AI model
curl -X POST https://api.example.com/admin/model/rollback -H "Authorization: Bearer $ADMIN_API_KEY"
```

### Operations
```bash
# Run onboarding
./docs/onboarding-simulator.sh "Developer Name"

# Export compliance package
./scripts/export-compliance.sh AUDIT-2025-001

# Safe database migration
./scripts/migrate-safe.sh migration-name

# Rotate secrets manually
gh workflow run rotate-secrets.yml -f secret_name=OPENAI_API_KEY

# Trigger health check
gh workflow run alerting.yml

# Generate deprecation report
gh workflow run quarterly-deprecation.yml
```

## 📊 Key Metrics

| Metric | Target | Location |
|--------|--------|----------|
| Deployment Frequency | 10+ per day | GitHub Actions |
| Lead Time | < 1 hour | Git → Production |
| MTTR | < 15 minutes | Incident → Resolution |
| Change Failure Rate | < 5% | Failed/Total Deploys |
| Availability | 99.9% | Uptime Monitoring |
| Daily AI Budget | $100 | Cost Controller |
| Model Drift Threshold | 15% | Feedback Loop |
| Queue Depth Alert | 100 | Alerting Workflow |

## 🔧 Configuration Files

| Feature | Location | Purpose |
|---------|----------|---------|
| Health Monitoring | `.github/workflows/alerting.yml` | Continuous health checks |
| Secret Rotation | `.github/workflows/rotate-secrets.yml` | Monthly secret updates |
| API Enforcement | `.github/workflows/semantic-enforcement.yml` | Breaking change detection |
| Deprecation Reports | `.github/workflows/quarterly-deprecation.yml` | Quarterly tech debt review |
| Worker Identity | `backend/src/services/workerIdentity.js` | Worker attestation |
| Cost Controller | `backend/src/services/costController.js` | Cost tracking & kill-switch |
| Replay Engine | `backend/src/services/replayEngine.js` | State replay for debugging |
| Feedback Loop | `backend/src/services/feedbackLoop.js` | Model drift detection |
| Safe Migrations | `scripts/migrate-safe.sh` | Zero-downtime DB migrations |
| Compliance Export | `scripts/export-compliance.sh` | Compliance package generation |
| Onboarding | `docs/onboarding-simulator.sh` | Developer onboarding |
| Agentic Playbook | `wcagaii-production-deploy-v10.json` | Complete CI/CD definition |

## 🚨 Alert Thresholds

```javascript
// Cost Controller
DAILY_BUDGET: $100
MONTHLY_BUDGET: $2,500
PER_USER_DAILY_LIMIT: $10
KILL_SWITCH_THRESHOLD: 95%
WARNING_THRESHOLD: 80%

// Model Drift
DRIFT_THRESHOLD: 15% dismissal rate
CONFIDENCE_WINDOW: 100 samples
AB_TEST_SAMPLE_SIZE: 1000
AUTO_PROMOTE_THRESHOLD: 10% improvement

// System Health
QUEUE_DEPTH_ALERT: 100
ERROR_RATE_ALERT: 5%
MODEL_DRIFT_ALERT: 15%
```

## 🔑 Required Secrets

### GitHub Secrets
```
PAGERDUTY_INTEGRATION_KEY
PAGERDUTY_ROUTING_KEY
GH_PAT_SECRET_MANAGEMENT
RAILWAY_TOKEN
SLACK_WEBHOOK_URL
ADMIN_API_KEY
GITGUARDIAN_API_KEY
SNYK_TOKEN
SENTRY_AUTH_TOKEN
```

### Environment Variables
```
DAILY_AI_BUDGET=100.00
MONTHLY_AI_BUDGET=2500.00
PER_USER_DAILY_LIMIT=10.00
WORKER_KEYSTORE_PATH=./data/worker-keys
WORKER_KEY_PASSPHRASE=secure-passphrase
REPLAY_RECORDINGS_PATH=./data/replay-recordings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wcag_ai_platform
DB_USER=postgres
DB_PASSWORD=secure-password
```

## 📅 Scheduled Tasks

| Task | Schedule | Workflow |
|------|----------|----------|
| Health Monitoring | Every 5 min (9AM-6PM) | alerting.yml |
| Secret Rotation | 1st of month, 2 AM | rotate-secrets.yml |
| Deprecation Report | Quarterly (Jan/Apr/Jul/Oct) | quarterly-deprecation.yml |

## 🎯 Service Initialization

```javascript
// Initialize all production services
const { workerIdentityManager } = require('./backend/src/services/workerIdentity');
const { costController } = require('./backend/src/services/costController');
const { replayEngine } = require('./backend/src/services/replayEngine');
const { feedbackLoopManager } = require('./backend/src/services/feedbackLoop');

async function initializeProductionServices() {
  await workerIdentityManager.initialize();
  await costController.initialize();
  await replayEngine.initialize();
  await feedbackLoopManager.initialize();
  console.log('✅ All production services initialized');
}
```

## 📱 Monitoring Endpoints

```bash
# Prometheus metrics
GET /metrics

# Health checks
GET /health
GET /api/cost/report
GET /api/workers/stats
GET /api/feedback/stats
GET /api/model/version

# Admin endpoints (require auth)
POST /admin/cache/clear
POST /admin/model/rollback
POST /api/cost/deactivate
POST /api/workers/revoke
POST /api/workers/invalidate
```

## 🐛 Debugging Commands

```bash
# View worker logs
curl https://api.example.com/api/workers/stats | jq

# Check cost details
curl https://api.example.com/api/cost/report | jq '.modelUsage'

# View feedback statistics
curl https://api.example.com/api/feedback/stats | jq

# List replay recordings
curl https://api.example.com/api/replay/recordings | jq

# Export specific recording
curl https://api.example.com/api/replay/recordings/scan-123/export > recording.json
```

## 🔄 Rollback Procedures

### Application Rollback
```bash
# Via Railway CLI
railway rollback --service=wcagaii-backend --environment=production
railway rollback --service=wcagaii-frontend --environment=production
```

### Database Rollback
```bash
# Execute down migration
./scripts/migrate-safe.sh migration-name rollback
```

### Model Rollback
```bash
# Via API
curl -X POST https://api.example.com/admin/model/rollback \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -d '{"reason":"High drift detected"}'
```

## 📊 Grafana Dashboards

### Cost Dashboard Queries
```promql
# Daily cost
ai_cost_daily_total

# Monthly cost
ai_cost_monthly_total

# Kill switch status
ai_cost_kill_switch_active

# Cost by model
sum by (model) (ai_model_cost_total)
```

### Health Dashboard Queries
```promql
# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Queue depth
queue_depth_total

# Model drift
model_drift_score

# Worker health
worker_attestation_total - worker_revoked_total
```

## 🎓 Training Resources

1. **Onboarding**: `./docs/onboarding-simulator.sh "YourName"`
2. **Production Features**: [PRODUCTION_FEATURES.md](PRODUCTION_FEATURES.md)
3. **Deployment Checklist**: [DEPLOYMENT_CHECKLIST.md](../deployment/DEPLOYMENT_CHECKLIST.md)
4. **Agentic Playbook**: [wcagaii-production-deploy-v10.json](../wcagaii-production-deploy-v10.json)

## 🆘 Emergency Contacts

- **PagerDuty**: Critical production alerts
- **GitHub Issues**: https://github.com/aaj441/wcag-ai-platform/issues
- **Team Slack**: #wcag-ai-platform
- **On-Call Engineer**: See PagerDuty schedule

---

**For detailed documentation, see [PRODUCTION_FEATURES.md](PRODUCTION_FEATURES.md)**
