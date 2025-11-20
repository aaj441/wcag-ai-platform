# 🔒 Security Maintenance Guide

Ongoing security maintenance procedures for the WCAG AI Platform.

---

## 📅 Maintenance Schedule

### Daily (Automated)
- [x] Monitor health endpoint
- [x] Check error rates in Sentry
- [x] Review authentication failures
- [x] Monitor rate limit hits

### Weekly (Manual Review)
- [ ] Review security event logs
- [ ] Check for failed authentication attempts
- [ ] Monitor API abuse patterns
- [ ] Review and triage security alerts

### Monthly (Required)
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review and update dependencies
- [ ] Run full security test suite against production
- [ ] Review CORS allowed origins
- [ ] Check SSL certificate expiration
- [ ] Review rate limit thresholds

### Quarterly (Recommended)
- [ ] Rotate JWT_SECRET (optional but recommended)
- [ ] Security audit (internal or external)
- [ ] Penetration testing with OWASP ZAP
- [ ] Review and update security policies
- [ ] Access control audit
- [ ] Disaster recovery drill

---

## 🔄 Weekly Security Review

### Monday: Log Review

```bash
# Check for security events (last 7 days)
railway logs | grep -E "rate_limit|invalid_jwt|validation_failed|ssrf_attempt"

# Look for patterns:
# - Multiple failed auth attempts from same IP
# - Unusual spike in rate limit hits
# - SSRF attempt patterns
# - Validation errors (possible attack attempts)
```

**Action Items:**
- Block IPs with >50 failed auth attempts
- Investigate unusual patterns
- Update rate limits if needed

### Wednesday: Dependency Check

```bash
cd packages/api

# Check for vulnerabilities
npm audit

# Review critical and high severity
npm audit --audit-level=high

# Update packages (carefully)
npm update
npm audit fix
```

**Action Items:**
- Fix critical and high vulnerabilities immediately
- Test after updates
- Create PR for dependency updates

### Friday: Security Test

```bash
# Run security test suite
cd packages/api
API_URL=https://your-production-api.com \
JWT_SECRET=$PRODUCTION_JWT_SECRET \
./scripts/test-security.sh
```

**Expected:** 80%+ pass rate

---

## 📊 Monthly Security Tasks

### 1. Dependency Audit & Updates

```bash
# Full audit
cd packages/api
npm audit

# Update all non-major dependencies
npm update

# Check for major updates
npm outdated

# Update specific packages
npm install package@latest

# Test thoroughly
npm test
npm run build
```

### 2. Security Test Suite

```bash
# Run against production
./scripts/test-security.sh

# Review results
# - All critical tests should pass
# - Document any failures
# - Create issues for failures
```

### 3. SSL Certificate Check

```bash
# Check expiration
openssl s_client -servername your-api.com -connect your-api.com:443 </dev/null 2>/dev/null | openssl x509 -noout -dates

# Should show:
# notBefore=...
# notAfter=... (should be >30 days in future)
```

**Action:** If <30 days, plan renewal

### 4. Access Review

- Review Railway access list
- Remove ex-employees
- Audit API keys in use
- Check database user permissions

### 5. Monitoring Review

```bash
# Run production monitoring
./scripts/monitor-production.sh

# Check:
# - All health checks passing
# - Response times <1s
# - No security header issues
# - Rate limiting working
```

---

## 🔄 Rotating Secrets (Quarterly)

### JWT Secret Rotation

**Important:** This will invalidate all existing tokens!

```bash
# 1. Generate new secret
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "New JWT_SECRET: $NEW_SECRET"

# 2. Notify users (24 hour notice)
# Send email: "Scheduled maintenance - re-authentication required"

# 3. Update Railway environment variable
# Railway Dashboard → Variables → JWT_SECRET → Update

# 4. Wait for deployment

# 5. Verify new secret works
# Test with newly generated token

# 6. Securely delete old secret
# Update password manager
```

### Webhook Secret Rotation

```bash
# 1. Generate new secret
NEW_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Update in webhook provider (Stripe, etc.)

# 3. Update Railway environment variable
# Railway Dashboard → Variables → WEBHOOK_SECRET → Update

# 4. Test webhook delivery
curl -X POST https://your-api.com/api/webhooks/stripe \
  -H "x-webhook-signature: $(echo -n '{}' | openssl dgst -sha256 -hmac "$NEW_WEBHOOK_SECRET")" \
  -d '{}'
```

---

## 🐛 Vulnerability Response

### When a Vulnerability is Discovered

#### 1. Assess Severity

**Critical:** Remote code execution, authentication bypass, SQL injection
**High:** XSS, SSRF, sensitive data exposure
**Medium:** DoS, information disclosure
**Low:** Minor information leaks

#### 2. Immediate Actions (Critical/High)

```bash
# 1. Document the vulnerability
# Create private GitHub security advisory

# 2. Develop fix
git checkout -b security-fix/CVE-YYYY-XXXX

# 3. Test fix thoroughly
npm test
./scripts/test-security.sh

# 4. Deploy emergency hotfix
git commit -m "Security: Fix CVE-YYYY-XXXX"
git push origin security-fix/CVE-YYYY-XXXX

# 5. Deploy to production ASAP
railway up
```

#### 3. Post-Incident Review

- Document root cause
- Update security tests to catch similar issues
- Review code for similar patterns
- Consider security training if needed

---

## 📈 Security Metrics to Track

### Key Performance Indicators

```bash
# 1. Authentication Success Rate
# Target: >99%
# Alert if: <95%

# 2. Rate Limit Hit Rate
# Target: <5% of requests
# Alert if: >10%

# 3. Security Test Pass Rate
# Target: >95%
# Alert if: <80%

# 4. Mean Time to Patch (Critical Vuln)
# Target: <24 hours
# Alert if: >48 hours

# 5. Failed Authentication Attempts
# Target: <100/day
# Alert if: >500/day
```

### Monthly Report Template

```markdown
# Security Report - [Month Year]

## Summary
- Vulnerabilities Fixed: X
- Security Tests Pass Rate: XX%
- Authentication Success Rate: XX%
- Incidents: X

## Vulnerabilities
1. [CVE/Issue] - Severity - Status - Resolution Time

## Security Events
- Failed Auth Attempts: XXXX
- Rate Limit Hits: XXXX
- Blocked IPs: X

## Actions Taken
- Dependency updates: XX packages
- Security patches: X
- Policy updates: X

## Recommendations
1. [Action item]
2. [Action item]
```

---

## 🚨 Incident Response Plan

### Security Incident Detected

#### Phase 1: Detection (0-15 minutes)

```bash
# 1. Verify incident
./scripts/monitor-production.sh

# 2. Check logs
railway logs | grep ERROR | tail -100

# 3. Assess scope
# - What data is affected?
# - How many users impacted?
# - Is attack ongoing?
```

#### Phase 2: Containment (15-60 minutes)

```bash
# If attack is ongoing:

# 1. Block malicious IPs (if identified)
# Update Railway firewall rules

# 2. Disable affected features
# Set maintenance mode if needed

# 3. Rotate compromised credentials
# See "Rotating Secrets" section above

# 4. Notify stakeholders
# Send status page update
```

#### Phase 3: Investigation (1-4 hours)

- Review logs for attack vector
- Identify root cause
- Document timeline
- Assess data exposure

#### Phase 4: Remediation (4-24 hours)

- Develop and test fix
- Deploy to production
- Verify fix works
- Monitor for recurrence

#### Phase 5: Recovery (24-72 hours)

- Full security scan
- User notification (if required)
- Update security documentation
- Post-incident review meeting

---

## 📞 Emergency Contacts

```
Security Lead: [Name] - [Email] - [Phone]
DevOps Lead: [Name] - [Email] - [Phone]
CTO: [Name] - [Email] - [Phone]

On-Call Rotation:
Week 1: [Name]
Week 2: [Name]
Week 3: [Name]
Week 4: [Name]

External Resources:
Security Consultant: [Company] - [Email]
Legal Counsel: [Name] - [Email]
```

---

## ✅ Security Maintenance Checklist

### Weekly
- [ ] Review security logs
- [ ] Check authentication failures
- [ ] Monitor rate limit hits
- [ ] Review error rates

### Monthly
- [ ] Run `npm audit` and fix issues
- [ ] Update dependencies
- [ ] Run security test suite
- [ ] Review SSL certificates
- [ ] Check CORS configuration
- [ ] Review rate limits

### Quarterly
- [ ] Rotate JWT_SECRET (optional)
- [ ] Security audit
- [ ] Penetration testing
- [ ] Access control review
- [ ] Disaster recovery test
- [ ] Update security policies

### Annually
- [ ] External security audit
- [ ] SOC 2 compliance review
- [ ] Update incident response plan
- [ ] Security training for team
- [ ] Review and update documentation

---

## 📚 Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Node.js Security Best Practices:** https://nodejs.org/en/docs/guides/security/
- **Railway Security:** https://docs.railway.app/deploy/security
- **JWT Best Practices:** https://tools.ietf.org/html/rfc8725

---

**Last Updated:** 2024-01-20
**Review Frequency:** Quarterly
**Next Review:** 2024-04-20
