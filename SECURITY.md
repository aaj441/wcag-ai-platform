# Security Policy

**WCAGAI Platform - Security & Compliance Documentation**

**Last Updated:** November 17, 2025
**Platform Version:** 1.0.0
**Security Contact:** security@wcagai.com

---

## Table of Contents

1. [Supported Versions](#supported-versions)
2. [Reporting a Vulnerability](#reporting-a-vulnerability)
3. [Security Measures](#security-measures)
4. [Data Handling & Privacy](#data-handling--privacy)
5. [Incident Response](#incident-response)
6. [Compliance & Certifications](#compliance--certifications)
7. [Security Best Practices](#security-best-practices)
8. [Third-Party Dependencies](#third-party-dependencies)

---

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          | End of Support |
| ------- | ------------------ | -------------- |
| 1.0.x   | ✅ Yes             | TBD            |
| < 1.0   | ❌ No (Beta)       | November 2025  |

**Security Update Policy:**
- **Critical vulnerabilities:** Patched within 24-48 hours
- **High-severity vulnerabilities:** Patched within 7 days
- **Medium-severity vulnerabilities:** Patched within 30 days
- **Low-severity vulnerabilities:** Addressed in next minor release

**Update Notifications:**
- Subscribe to [GitHub Security Advisories](https://github.com/aaj441/wcag-ai-platform/security/advisories)
- Follow our [security changelog](CHANGELOG_SECURITY.md)

---

## Reporting a Vulnerability

**CRITICAL: DO NOT create public GitHub issues for security vulnerabilities.**

### Reporting Channels

**Preferred Method - Private Security Advisory:**
1. Go to [GitHub Security Advisories](https://github.com/aaj441/wcag-ai-platform/security/advisories/new)
2. Click "Report a vulnerability"
3. Fill out the vulnerability report template
4. We will acknowledge within 48 hours

**Alternative Method - Email:**
- **Email:** security@wcagai.com
- **Subject:** [SECURITY] Brief vulnerability description
- **Encryption:** PGP key available at [pgp.wcagai.com](https://pgp.wcagai.com)

**Emergency Hotline (Critical Vulnerabilities Only):**
- **Phone:** +1 (555) WCAG-SEC
- **Hours:** 24/7 for P0 vulnerabilities (data breach, RCE, auth bypass)

### What to Include

Please include in your report:
- **Description:** Clear explanation of the vulnerability
- **Impact:** What an attacker could achieve
- **Reproduction Steps:** Detailed steps to reproduce
- **Proof of Concept:** Code/screenshots (if applicable)
- **Suggested Fix:** Your recommendation (optional)
- **Disclosure Timeline:** When you plan to publicly disclose (if at all)

### Our Response Process

1. **Acknowledgment:** Within 48 hours
2. **Initial Assessment:** Within 5 business days
3. **Regular Updates:** Every 7 days until resolved
4. **Patch Development:** Prioritized based on severity
5. **Coordinated Disclosure:** 90 days from report (or sooner if fixed)

### Security Researcher Recognition

We believe in recognizing security researchers who help us improve:

- **Hall of Fame:** Public acknowledgment (with permission)
- **Swag:** WCAGAI security researcher t-shirt
- **Bounty Program:** Coming Q1 2026 (sign up for early access)

**Responsible Disclosure Guidelines:**
- Allow 90 days for patch development before public disclosure
- Do not access/modify user data beyond PoC requirements
- Do not perform DoS attacks or spamming
- Do not exploit vulnerabilities for personal gain

---

## Security Measures

### Authentication & Authorization

**Current Implementation:**
- **Provider:** [Clerk](https://clerk.com) (SOC 2 Type II certified)
- **MFA Support:** Email OTP, SMS, Authenticator apps
- **Session Management:** JWT with 7-day expiration, automatic refresh
- **RBAC:** Role-Based Access Control with 4 roles:
  - `admin` - Full system access
  - `consultant` - Scan review and approval
  - `client` - View own scans only
  - `user` - Limited read-only access

**Security Features:**
- ✅ Brute force protection (5 attempts, 15-min lockout)
- ✅ Session invalidation on password change
- ✅ Suspicious login detection (new device/location)
- ✅ API key rotation every 90 days
- ⏳ Hardware security key support (Coming Q1 2026)

**Configuration:**
```typescript
// No hardcoded credentials - all via environment variables
CLERK_SECRET_KEY=sk_live_*** // Managed via Railway secrets
CLERK_WEBHOOK_SECRET=whsec_*** // Webhook signature verification
```

---

### Network Security

**API Security:**
- **Rate Limiting:** 100 requests/minute per IP
- **CORS:** Whitelist-only (configured per environment)
- **Helmet.js:** Security headers (CSP, HSTS, X-Frame-Options)
- **HTTPS Only:** TLS 1.3 enforced, HTTP→HTTPS redirect

**SSRF Protection:**
- ✅ Blocks private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- ✅ Blocks cloud metadata endpoints (169.254.169.254)
- ✅ Blocks localhost/127.0.0.1
- ✅ DNS resolution validation before requests
- ✅ URL scheme whitelist (http, https only)

**Implementation:** `src/middleware/security.ts`

---

### Data Security

#### Encryption

**At Rest:**
- **Database:** AES-256-GCM encryption (Railway PostgreSQL)
- **File Storage:** Server-side encryption (AWS S3 SSE)
- **Secrets:** Encrypted in Railway/env vault
- **Backups:** Encrypted with separate keys

**In Transit:**
- **TLS 1.3:** Required for all connections
- **Certificate:** Let's Encrypt with auto-renewal
- **HSTS:** Strict-Transport-Security header (max-age=31536000)
- **Certificate Pinning:** Planned for mobile apps

#### Access Control

**Database:**
- **Principle of Least Privilege:** App uses limited-privilege DB user
- **Row-Level Security:** Tenant isolation enforced at DB level
- **Audit Logging:** All data access logged with user ID + timestamp

**File Storage:**
- **Signed URLs:** Temporary access (1-hour expiration)
- **Bucket Policies:** Private by default, explicit grants only
- **Versioning:** Enabled for accidental deletion recovery

---

### Input Validation

**Runtime Validation:**
- **Library:** [Zod](https://zod.dev/) for schema validation
- **All Endpoints:** Input validated before processing
- **SQL Injection:** Protected via Prisma ORM (parameterized queries)
- **XSS Protection:** Output escaping + Content Security Policy

**Example:**
```typescript
const ScanRequestSchema = z.object({
  url: z.string().url().max(2048),
  wcagLevel: z.enum(['A', 'AA', 'AAA']),
  clientId: z.string().uuid()
});

// Throws ValidationError if invalid
const validated = ScanRequestSchema.parse(req.body);
```

**What We Validate:**
- URL format (RFC 3986 compliant)
- UUID format (v4)
- Email addresses (RFC 5322 compliant)
- File uploads (MIME type, size < 10MB)
- JSON payloads (size < 100KB)

---

### Circuit Breaker Protection

**Purpose:** Prevent cascading failures from external service outages

**Protected Services:**
- OpenAI/Anthropic AI APIs
- Apollo.io lead enrichment
- HubSpot CRM
- Stripe payments
- AWS S3

**Behavior:**
- **Threshold:** 50% error rate over 10 requests
- **Open Duration:** 60 seconds (exponential backoff)
- **Fallback:** Graceful degradation (cached data, error messages)

**Monitoring:** `/health/detailed` endpoint shows circuit breaker status

---

### Error Handling

**Secure Error Messages:**
- **Production:** Generic error messages (no stack traces)
- **Sentry:** Detailed errors logged privately
- **User-Facing:** RFC 7807 Problem Details format

**Example:**
```json
{
  "type": "validation-error",
  "title": "Invalid Request",
  "status": 400,
  "detail": "URL must be a valid HTTP/HTTPS URL",
  "requestId": "req_abc123"
}
```

**What We DON'T Expose:**
- ❌ Database connection strings
- ❌ Internal file paths
- ❌ Third-party API keys
- ❌ Stack traces (except to Sentry)

---

### Logging & Monitoring

**What We Log:**
- ✅ Authentication attempts (success/failure)
- ✅ Authorization decisions (granted/denied)
- ✅ Data access (who accessed what, when)
- ✅ Configuration changes
- ✅ Security events (unusual patterns)

**What We DON'T Log:**
- ❌ Passwords (even hashed)
- ❌ Session tokens
- ❌ Credit card numbers
- ❌ API keys

**Log Retention:**
- **Audit Logs:** 365 days (compliance requirement)
- **Application Logs:** 90 days
- **Access Logs:** 30 days

**Monitoring Tools:**
- **Sentry:** Error tracking + performance monitoring
- **Railway Logs:** Infrastructure logs
- **Custom Health Checks:** `/health/detailed` every 30 seconds

---

## Data Handling & Privacy

### Personal Information Collected

**We Process the Following PII:**

| Data Type | Purpose | Legal Basis (GDPR) | Retention |
|-----------|---------|-------------------|-----------|
| Name | User identification | Contract | Account lifetime |
| Email | Authentication, notifications | Contract + Consent | Account lifetime + 30 days |
| IP Address | Security, rate limiting | Legitimate interest | 30 days |
| Scan URLs | Service provision | Contract | 90 days |
| Scan Results | Service provision | Contract | 90 days |
| Usage Data | Analytics, improvements | Legitimate interest | 90 days |

**Special Categories:**
- **Health Data:** NOT collected (WCAG scans are technical, not health-related)
- **Financial Data:** Credit cards processed by Stripe (PCI-DSS compliant), we store only last 4 digits

### Data Subject Rights (GDPR/CCPA)

**Your Rights:**
1. **Right to Access:** Request copy of your data
2. **Right to Rectification:** Correct inaccurate data
3. **Right to Erasure:** Delete your data ("right to be forgotten")
4. **Right to Portability:** Export data in machine-readable format
5. **Right to Object:** Object to data processing
6. **Right to Restrict:** Limit how we process your data

**How to Exercise Rights:**
- **Portal:** https://app.wcagai.com/privacy/requests
- **Email:** privacy@wcagai.com
- **Response Time:** 30 days (GDPR requirement)

### Data Retention

**Deletion Schedule:**
- **Active Accounts:** Data retained during account lifetime
- **Closed Accounts:** Most data deleted within 30 days
- **Legal Hold:** Audit logs retained 365 days (compliance)
- **Backups:** Data in backups deleted after 30-day backup rotation

**Automated Deletion:**
```typescript
// Cron job runs daily
async function purgeOldData() {
  // Delete scan results >90 days old
  await prisma.scan.deleteMany({
    where: { createdAt: { lt: Date.now() - 90days } }
  });
}
```

### Third-Party Data Sharing

**We Share Data With:**

| Provider | Purpose | Data Shared | Location | Privacy Policy |
|----------|---------|-------------|----------|----------------|
| Clerk | Authentication | Email, name | USA | [Link](https://clerk.com/privacy) |
| Stripe | Payments | Email, card (tokenized) | USA | [Link](https://stripe.com/privacy) |
| Sentry | Error tracking | Anonymized errors, IP | USA | [Link](https://sentry.io/privacy) |
| Railway | Hosting | All platform data | USA | [Link](https://railway.app/legal/privacy) |
| OpenAI | AI analysis | Scan results (URLs) | USA | [Link](https://openai.com/privacy) |

**Data Processing Agreements:** Signed DPAs with all processors (available on request)

**International Transfers:**
- **Mechanism:** EU-US Data Privacy Framework + Standard Contractual Clauses
- **Adequacy Decision:** USA (Framework participants only)

### Data Breach Notification

**Our Commitment:**
- **Detection:** Real-time monitoring via Sentry + health checks
- **Assessment:** Severity evaluation within 24 hours
- **Notification:**
  - **Users:** Within 72 hours (GDPR Article 33)
  - **Authorities:** Data Protection Authority notification if high risk
  - **Public:** Security advisory if widespread impact

**Breach Response Plan:**
1. **Contain:** Isolate affected systems, revoke compromised credentials
2. **Assess:** Determine scope (# users affected, data types)
3. **Notify:** Email all affected users with remediation steps
4. **Remediate:** Patch vulnerability, rotate secrets
5. **Review:** Post-mortem, update security controls

---

## Incident Response

### Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **P0 - Critical** | Data breach, service down | 15 min | Database exposed, RCE exploit |
| **P1 - High** | Security bypass, degraded service | 1 hour | Auth bypass, XSS vulnerability |
| **P2 - Medium** | Potential vulnerability, minor issue | 1 day | Outdated dependency, info disclosure |
| **P3 - Low** | Cosmetic, no security impact | 7 days | Typo in error message |

### Incident Response Team

**On-Call Rotation:**
- **Primary:** Engineering on-call (PagerDuty)
- **Secondary:** Security lead
- **Escalation:** CTO → CEO → Legal (for breaches)

**Contact Directory:**
- **Engineering:** on-call@wcagai.com
- **Security:** security@wcagai.com
- **Legal:** legal@wcagai.com
- **PR/Comms:** pr@wcagai.com

### Incident Lifecycle

**1. Detection**
- Sentry alerts
- Health check failures
- User reports
- Security researcher report

**2. Assessment**
- Determine severity (P0-P3)
- Estimate impact (# users, data types)
- Identify root cause

**3. Containment**
- Rollback recent deploys
- Activate circuit breakers
- Revoke compromised credentials
- Block malicious IPs

**4. Recovery**
- Apply hotfix
- Verify fix in staging
- Deploy to production
- Monitor for 1 hour

**5. Postmortem**
- Timeline reconstruction
- Root cause analysis (5 Whys)
- Action items (prevent recurrence)
- Publish postmortem (if user-impacting)

**Example Playbook:** [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md)

---

## Compliance & Certifications

### Current Compliance

**✅ GDPR (General Data Protection Regulation)**
- **Status:** Compliant
- **DPO:** privacy@wcagai.com
- **Representative (EU):** TBD
- **Legal Basis:** Contract + Legitimate Interest
- **Data Transfers:** EU-US Data Privacy Framework + SCCs

**✅ CCPA (California Consumer Privacy Act)**
- **Status:** Compliant
- **Do Not Sell:** We do not sell personal information
- **Opt-Out:** Available at https://app.wcagai.com/privacy/ccpa

**✅ WCAG 2.1 AA (Self-Compliance)**
- **Status:** Compliant (ironic, we know!)
- **Audit Date:** October 2025
- **Report:** Available upon request

**⏳ SOC 2 Type II**
- **Status:** In progress (Q2 2025 completion target)
- **Scope:** Security, Availability, Confidentiality
- **Auditor:** [TBD]

**⏳ ISO 27001**
- **Status:** Planned for Q3 2025
- **Certification Body:** [TBD]

### Security Certifications (Third-Party)

**Our Providers:**
- ✅ **Clerk:** SOC 2 Type II, ISO 27001
- ✅ **Stripe:** PCI-DSS Level 1, SOC 2 Type II
- ✅ **Railway:** SOC 2 Type II
- ✅ **AWS:** ISO 27001, SOC 1/2/3, PCI-DSS

**Attestations Available:**
- Request SOC 2 report: compliance@wcagai.com

---

## Security Best Practices

### For Users

**Account Security:**
- ✅ Use a strong, unique password (20+ characters)
- ✅ Enable MFA (authenticator app preferred over SMS)
- ✅ Review active sessions regularly
- ✅ Don't share API keys (treat like passwords)
- ✅ Rotate API keys every 90 days

**Data Security:**
- ✅ Only scan URLs you have permission to scan
- ✅ Don't include sensitive data in scan URLs (query params, etc.)
- ✅ Review scan results before sharing

**Reporting Issues:**
- ✅ Report suspicious activity to security@wcagai.com
- ✅ Report phishing emails impersonating WCAGAI
- ✅ Verify email sender before clicking links

### For Developers

**API Key Security:**
```bash
# ❌ DON'T commit secrets
git add .env # NEVER DO THIS

# ✅ DO use environment variables
export WCAGAI_API_KEY=wcagai_*** # In shell, not code
```

**Webhook Security:**
```typescript
// ✅ Always verify webhook signatures
const isValid = verifyWebhookSignature(
  req.body,
  req.headers['x-wcagai-signature'],
  process.env.WEBHOOK_SECRET
);

if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

**Rate Limiting:**
- Respect rate limits (100 req/min)
- Implement exponential backoff on 429 errors
- Cache scan results (90-day expiry)

---

## Third-Party Dependencies

### Dependency Management

**Security Scanning:**
- **npm audit:** Run on every build
- **Snyk:** Weekly scans for vulnerabilities
- **Dependabot:** Automated PR for security updates

**Update Policy:**
- **Critical vulnerabilities:** Patch within 24 hours
- **High vulnerabilities:** Patch within 7 days
- **Other updates:** Monthly dependency updates

### Current Vulnerabilities

**Known Issues:** 3 low-severity vulnerabilities (as of Nov 17, 2025)

```bash
npm audit
# 3 low severity vulnerabilities
# Run `npm audit fix` to fix them
```

**Assessment:** Low-risk dev dependencies, no production impact.
**Remediation:** Scheduled for next minor release (v1.1.0)

### Supply Chain Security

**Protections:**
- ✅ Package lock files (package-lock.json) committed
- ✅ npm verify signatures enabled
- ✅ Private registry for internal packages
- ✅ Code review for all dependency updates
- ⏳ SBOM (Software Bill of Materials) generation (Q1 2026)

---

## Security Roadmap

### Q4 2025 (Current)
- ✅ TypeScript strict mode compliance
- ✅ Circuit breaker implementation
- ✅ RFC 7807 error handling
- ⏳ SOC 2 Type II audit kickoff
- ⏳ Penetration testing (external firm)

### Q1 2026
- Security bug bounty program launch
- Hardware security key support (WebAuthn)
- SBOM generation
- Advanced threat detection (anomaly detection)

### Q2 2026
- SOC 2 Type II certification complete
- ISO 27001 audit kickoff
- Zero-knowledge encryption option (for scan results)
- Security training certification for all engineers

---

## Contact & Resources

**Security Team:**
- **Email:** security@wcagai.com
- **PGP Key:** https://pgp.wcagai.com
- **Response Time:** 48 hours (business days)

**Compliance:**
- **Email:** compliance@wcagai.com
- **DPO:** privacy@wcagai.com

**Resources:**
- **Security Advisory:** https://github.com/aaj441/wcag-ai-platform/security/advisories
- **Changelog:** [CHANGELOG_SECURITY.md](CHANGELOG_SECURITY.md)
- **Incident Response:** [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md)
- **Status Page:** https://status.wcagai.com

---

**Last Reviewed:** November 17, 2025
**Next Review:** February 17, 2026 (Quarterly)

*This security policy is a living document. Subscribe to [releases](https://github.com/aaj441/wcag-ai-platform/releases) to be notified of updates.*
