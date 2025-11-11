# Production Activation Checklist

Use this checklist to activate production-grade agentic deployment features.

## ⚙️ Prerequisites

### Required GitHub Secrets

- [ ] `PAGERDUTY_INTEGRATION_KEY` - PagerDuty integration key for alerts
- [ ] `PAGERDUTY_ROUTING_KEY` - PagerDuty routing key for incidents
- [ ] `GH_PAT_SECRET_MANAGEMENT` - GitHub PAT with secrets write permission
- [ ] `RAILWAY_TOKEN` - Railway API token for deployments
- [ ] `SLACK_WEBHOOK_URL` - Slack webhook for notifications
- [ ] `ADMIN_API_KEY` - Admin API key for system operations
- [ ] `GITGUARDIAN_API_KEY` - GitGuardian for secret scanning
- [ ] `SNYK_TOKEN` - Snyk for dependency scanning
- [ ] `SENTRY_AUTH_TOKEN` - Sentry for error tracking
- [ ] `SENTRY_ORG` - Sentry organization name

### Required GitHub Variables

- [ ] `PRODUCTION_API_URL` - Production API endpoint
- [ ] `PRODUCTION_FRONTEND_URL` - Production frontend URL
- [ ] `STAGING_API_URL` - Staging API endpoint

### Environment Variables (Railway)

- [ ] `DAILY_AI_BUDGET=100.00`
- [ ] `MONTHLY_AI_BUDGET=2500.00`
- [ ] `PER_USER_DAILY_LIMIT=10.00`
- [ ] `WORKER_KEYSTORE_PATH=./data/worker-keys`
- [ ] `WORKER_KEY_PASSPHRASE=<secure-passphrase>`
- [ ] `REPLAY_RECORDINGS_PATH=./data/replay-recordings`
- [ ] `DB_HOST=<production-db-host>`
- [ ] `DB_PORT=5432`
- [ ] `DB_NAME=wcag_ai_platform`
- [ ] `DB_USER=<db-user>`
- [ ] `DB_PASSWORD=<secure-password>`
- [ ] `COMPLIANCE_SIGNING_KEY=./keys/compliance-signing-key.pem`

## 🔧 Feature Activation

### 1. Health Monitoring & Alerting

- [ ] Configure PagerDuty integration
- [ ] Test PagerDuty alert delivery
- [ ] Enable `.github/workflows/alerting.yml`
- [ ] Verify health check endpoints respond
- [ ] Test automated runbook execution (dry run)
- [ ] Verify model rollback logic

**Test Command:**
```bash
gh workflow run alerting.yml
```

**Verify:**
```bash
curl https://${PRODUCTION_API_URL}/health
curl https://${PRODUCTION_API_URL}/metrics
```

---

### 2. Worker Identity System

- [ ] Create worker keystore directory
- [ ] Set secure passphrase for worker keys
- [ ] Initialize worker identity manager
- [ ] Register initial workers
- [ ] Test worker attestation
- [ ] Verify signature validation

**Initialization:**
```javascript
const { workerIdentityManager } = require('./backend/src/services/workerIdentity');
await workerIdentityManager.initialize();
```

**Test:**
```javascript
// Register test worker
const worker = await workerIdentityManager.registerWorker('test-worker-001', {
  hostname: 'test-host',
  region: 'us-east-1'
});

// Test signing
const signedResult = workerIdentityManager.signScanResult('test-worker-001', {
  scanId: 'test-scan',
  findings: []
});

// Verify signature
const isValid = workerIdentityManager.verifyScanResult(signedResult);
console.log('Signature valid:', isValid);
```

---

### 3. Cost Control System

- [ ] Set budget limits in environment variables
- [ ] Initialize cost controller
- [ ] Configure Grafana dashboards
- [ ] Test kill-switch activation
- [ ] Test kill-switch deactivation
- [ ] Verify Prometheus metrics export

**Initialization:**
```javascript
const { costController } = require('./backend/src/services/costController');
await costController.initialize();
```

**Test:**
```javascript
// Test usage tracking
const result = costController.trackUsage({
  userId: 'test-user',
  model: 'gpt-4-turbo',
  inputTokens: 1000,
  outputTokens: 500
});
console.log('Cost tracked:', result);

// Get report
const report = costController.getCostReport();
console.log('Cost report:', report);
```

**Grafana:**
```bash
curl https://${PRODUCTION_API_URL}/metrics | grep ai_cost
```

---

### 4. State Replay Engine

- [ ] Create replay recordings directory
- [ ] Initialize replay engine
- [ ] Test recording a scan
- [ ] Test replaying a scan
- [ ] Test diff functionality
- [ ] Test export/import

**Initialization:**
```javascript
const { replayEngine } = require('./backend/src/services/replayEngine');
await replayEngine.initialize();
```

**Test:**
```javascript
// Start recording
const session = await replayEngine.startRecording('test-scan-001', {
  url: 'https://example.com',
  userId: 'test-user'
});

// Log events
replayEngine.logEvent('test-scan-001', 'scan_started', {});
replayEngine.updateState('test-scan-001', { violations: 0 });

// Stop recording
const recording = await replayEngine.stopRecording('test-scan-001', {
  violations: 5,
  status: 'completed'
});

// Replay
const replay = await replayEngine.replayScan('test-scan-001');
const comparison = await replayEngine.stopReplay(replay.replayId, {
  violations: 5,
  status: 'completed'
});
console.log('Diff:', comparison.comparison);
```

---

### 5. Database Migrations

- [ ] Create migrations directory structure
- [ ] Test migration script in dry-run mode
- [ ] Create first test migration
- [ ] Execute test migration on staging
- [ ] Verify rollback functionality
- [ ] Document migration process

**Directory Structure:**
```bash
mkdir -p migrations/test-migration
touch migrations/test-migration/{up.sql,down.sql,dual-write-trigger.sql,backfill.sql,validation.sql}
```

**Test:**
```bash
# Dry run
DRY_RUN=true ./scripts/migrate-safe.sh test-migration

# Execute on staging
DB_HOST=${STAGING_DB_HOST} ./scripts/migrate-safe.sh test-migration
```

---

### 6. Secret Rotation

- [ ] Configure secret rotation workflow
- [ ] Test manual rotation (dry run)
- [ ] Schedule monthly rotation
- [ ] Configure audit log storage
- [ ] Test rollback procedure
- [ ] Document rotation process

**Test:**
```bash
# Test rotation (without actual changes)
gh workflow run rotate-secrets.yml -f secret_name=TEST_SECRET
```

**Verify Audit Log:**
```bash
cat audit-logs/rotation-*.log
```

---

### 7. Developer Onboarding

- [ ] Test onboarding simulator
- [ ] Review MTTF metrics
- [ ] Customize challenges if needed
- [ ] Add to new hire checklist
- [ ] Document onboarding process

**Test:**
```bash
./docs/onboarding-simulator.sh "Test Developer"
```

**Review Metrics:**
```bash
cat /tmp/onboarding_metrics_*.json
```

---

### 8. Model Drift Detection

- [ ] Initialize feedback loop manager
- [ ] Register production models
- [ ] Configure drift thresholds
- [ ] Test feedback recording
- [ ] Test A/B test initiation
- [ ] Verify auto-promotion logic

**Initialization:**
```javascript
const { feedbackLoopManager } = require('./backend/src/services/feedbackLoop');
await feedbackLoopManager.initialize();
```

**Test:**
```javascript
// Register models
await feedbackLoopManager.registerModel('gpt-4-turbo', '1.0.0', 'active');
await feedbackLoopManager.registerModel('claude-3-opus', '1.0.0', 'candidate');

// Record feedback
feedbackLoopManager.recordFeedback({
  findingId: 'test-finding',
  modelId: 'gpt-4-turbo',
  modelVersion: '1.0.0',
  action: 'accept',
  userId: 'test-user'
});

// Check stats
const stats = feedbackLoopManager.getStatistics();
console.log('Feedback stats:', stats);
```

---

### 9. Compliance Export

- [ ] Generate signing key
- [ ] Test export script
- [ ] Verify signature validation
- [ ] Test encryption (optional)
- [ ] Document export process
- [ ] Schedule regular exports

**Generate Signing Key:**
```bash
mkdir -p keys
openssl genrsa -out keys/compliance-signing-key.pem 2048
openssl rsa -in keys/compliance-signing-key.pem -pubout -out keys/compliance-public-key.pem
```

**Test:**
```bash
./scripts/export-compliance.sh TEST-EXPORT-001
```

**Verify:**
```bash
cd /tmp/compliance-exports
sha256sum -c compliance_TEST-EXPORT-001_*.tar.gz.sha256
```

---

### 10. Technical Debt Prevention

- [ ] Enable semantic enforcement workflow
- [ ] Test breaking change detection
- [ ] Configure deprecation workflow
- [ ] Test deprecation scanning
- [ ] Review generated reports
- [ ] Add to PR checklist

**Test on PR:**
- Create a test PR with breaking changes
- Verify workflow detects changes
- Review migration guide generation
- Check PR comments

---

## 🧪 Integration Testing

### End-to-End Test Sequence

1. **Deploy to Staging:**
   ```bash
   gh workflow run production-deploy.yml
   ```

2. **Verify All Services:**
   ```bash
   curl https://${STAGING_API_URL}/health
   curl https://${STAGING_API_URL}/api/cost/report
   curl https://${STAGING_API_URL}/api/workers/stats
   curl https://${STAGING_API_URL}/api/feedback/stats
   ```

3. **Test Failure Scenarios:**
   - Trigger high queue depth
   - Exceed cost threshold
   - Simulate worker compromise
   - Trigger model drift

4. **Verify Automated Responses:**
   - Check PagerDuty alerts
   - Verify runbook execution
   - Confirm rollback procedures
   - Validate audit trails

---

## 📊 Monitoring Setup

### Grafana Dashboards

- [ ] Create Cost Monitoring dashboard
- [ ] Create Worker Health dashboard
- [ ] Create Model Drift dashboard
- [ ] Create System Health dashboard
- [ ] Configure alert thresholds
- [ ] Test alert delivery

**Dashboard Queries:**
```promql
# Daily cost
ai_cost_daily_total

# Kill switch status
ai_cost_kill_switch_active

# Model drift
model_drift_score

# Worker health
worker_attestation_total - worker_revoked_total
```

---

## ✅ Final Validation

- [ ] All secrets configured
- [ ] All environment variables set
- [ ] All workflows enabled
- [ ] All services initialized
- [ ] All tests passing
- [ ] All dashboards configured
- [ ] Team trained on new features
- [ ] Documentation reviewed
- [ ] Rollback procedures tested
- [ ] On-call rotation updated

---

## 🚀 Go-Live

### Pre-Launch

- [ ] Review all checklist items
- [ ] Execute integration tests
- [ ] Verify monitoring
- [ ] Brief team on new features
- [ ] Schedule maintenance window (if needed)

### Launch

- [ ] Merge PR to main
- [ ] Monitor deployment
- [ ] Verify all services start
- [ ] Check all health endpoints
- [ ] Review initial metrics
- [ ] Confirm alerts working

### Post-Launch

- [ ] Monitor for 24 hours
- [ ] Review alert history
- [ ] Check cost tracking
- [ ] Verify worker attestation
- [ ] Review feedback data
- [ ] Document any issues

---

## 📞 Support

If you encounter issues:

1. Check logs: `/tmp/*-*.log`
2. Review GitHub Actions: https://github.com/aaj441/wcag-ai-platform/actions
3. Check PagerDuty: Alert history
4. Consult documentation:
   - [PRODUCTION_FEATURES.md](PRODUCTION_FEATURES.md)
   - [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
   - [AGENTIC_DEPLOYMENT_SUMMARY.md](../AGENTIC_DEPLOYMENT_SUMMARY.md)

---

**Activation Date:** _______________

**Activated By:** _______________

**Sign-off:** _______________
