# Production Deployment Checklist

> **Complete this checklist before deploying to production**

## Pre-Deployment (1 week before)

### Infrastructure
- [ ] Terraform configuration reviewed and tested
- [ ] AWS credentials configured with minimal permissions
- [ ] Railway project created with staging and production environments
- [ ] Database backup strategy tested
- [ ] S3 buckets created with encryption and versioning
- [ ] KMS keys rotated and documented

### Security
- [ ] All secrets removed from git history
- [ ] Environment variables documented in `.env.template`
- [ ] SSRF protection tested against OWASP test cases
- [ ] Rate limiting configured and tested
- [ ] Security headers verified (CSP, HSTS, etc.)
- [ ] Input validation implemented for all endpoints
- [ ] Authentication middleware implemented
- [ ] API key rotation procedure documented

### Observability
- [ ] Prometheus metrics endpoint tested
- [ ] OpenTelemetry tracing configured
- [ ] Structured logging implemented with trace IDs
- [ ] Error tracking configured (Sentry)
- [ ] PagerDuty alerts configured
- [ ] CloudWatch dashboards created
- [ ] Log retention policies set

### AI & Feature Flags
- [ ] LaunchDarkly project configured
- [ ] Feature flags created for:
  - [ ] AI model selection
  - [ ] Shadow deployment
  - [ ] New features
- [ ] Model versioning strategy documented
- [ ] Token usage tracking implemented
- [ ] Cost alerts configured ($500/month threshold)

### Testing
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Smoke tests passing
- [ ] Load tests passing (10 VUs, 60s)
- [ ] SSRF protection verified
- [ ] Rate limiting verified
- [ ] Error handling tested

### Documentation
- [ ] README.md updated
- [ ] API documentation complete
- [ ] Runbook created
- [ ] Architecture diagrams updated
- [ ] Disaster recovery procedures documented
- [ ] On-call rotation documented

---

## Deployment Day

### T-60 minutes
- [ ] Notify team of deployment window
- [ ] Create deployment ticket/issue
- [ ] Take database backup
- [ ] Tag current production release
- [ ] Review rollback procedures

### T-30 minutes
- [ ] Run `verify-production.sh` on staging
- [ ] Verify all tests pass
- [ ] Check for breaking changes
- [ ] Review recent production logs for anomalies
- [ ] Confirm all team members available

### T-15 minutes
- [ ] Merge deployment PR to main
- [ ] Monitor GitHub Actions workflow
- [ ] Watch deployment logs in real-time

### T-0 (Deployment)
- [ ] GitHub Actions completes successfully
- [ ] Staging health checks pass
- [ ] Staging smoke tests pass
- [ ] Production deployment initiates

### T+5 minutes
- [ ] Production health checks pass
- [ ] Metrics endpoint responding
- [ ] Error rate < 1%
- [ ] Response time p95 < 2s
- [ ] Database connections healthy

### T+15 minutes
- [ ] Run production smoke tests
- [ ] Run production verification script
- [ ] Check Sentry for new errors
- [ ] Review CloudWatch metrics
- [ ] Test critical user flows

### T+30 minutes
- [ ] Run load test (5 VUs, 5 minutes)
- [ ] Monitor CPU and memory usage
- [ ] Check autoscaling behavior
- [ ] Verify audit logs being written
- [ ] Check AI token usage

### T+60 minutes
- [ ] Monitor for 1 hour with no issues
- [ ] Review all metrics dashboards
- [ ] Check for any user-reported issues
- [ ] Verify backup jobs running
- [ ] Update deployment documentation

---

## Post-Deployment

### Same Day
- [ ] Send deployment summary to team
- [ ] Update changelog
- [ ] Close deployment ticket
- [ ] Tag successful deployment in git
- [ ] Update status page
- [ ] Monitor overnight (on-call)

### Week 1
- [ ] Review error rates daily
- [ ] Monitor AI costs
- [ ] Check for performance regressions
- [ ] Gather user feedback
- [ ] Review audit logs

### Week 2
- [ ] Generate weekly metrics report
- [ ] Review security alerts
- [ ] Test backup restoration
- [ ] Update cost projections
- [ ] Plan next deployment

---

## Rollback Triggers

Initiate rollback immediately if:
- [ ] Error rate > 5%
- [ ] Response time p95 > 5s
- [ ] Health check failing
- [ ] Database connection errors
- [ ] Critical security vulnerability discovered
- [ ] Data corruption detected
- [ ] AI costs spiking unexpectedly

### Rollback Procedure
```bash
# Automated (GitHub Actions will trigger on failure)
# Manual if needed:
railway rollback --service=wcagaii-backend
railway rollback --service=wcagaii-frontend

# Verify rollback
./deployment/scripts/verify-production.sh <production_url>
```

---

## Sign-off

**Deployment Lead:** _________________ Date: _______

**Technical Review:** _________________ Date: _______

**Security Review:** _________________ Date: _______

**Operations Approval:** _________________ Date: _______

---

## Emergency Contacts

| Role | Contact | Phone |
|------|---------|-------|
| On-Call Engineer | | |
| DevOps Lead | | |
| Security Team | | |
| Engineering Manager | | |

## Runbook Links

- Health Check: `<production_url>/health`
- Metrics: `<production_url>/metrics`
- Railway Dashboard: https://railway.app
- Sentry: https://sentry.io
- AWS Console: https://console.aws.amazon.com
- LaunchDarkly: https://app.launchdarkly.com

---

**Last Updated:** 2024-01-11
**Next Review:** Before next production deployment
