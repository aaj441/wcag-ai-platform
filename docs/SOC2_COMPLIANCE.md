# SOC 2 Type II Compliance Documentation
## WCAG AI Platform

**Last Updated**: November 15, 2025
**Compliance Status**: In Progress
**Target Audit Date**: Q2 2026

---

## Table of Contents
- [Overview](#overview)
- [Trust Service Criteria](#trust-service-criteria)
- [Security Controls](#security-controls)
- [Compliance Evidence](#compliance-evidence)
- [Audit Readiness Checklist](#audit-readiness-checklist)
- [Continuous Monitoring](#continuous-monitoring)

---

## Overview

This document outlines the WCAG AI Platform's compliance framework for SOC 2 Type II certification, covering all five Trust Service Criteria (TSC).

### Scope
- **Systems in Scope**: WCAG AI Platform API, Webapp, Database
- **Services**: Accessibility scanning, AI remediation, reporting, email automation
- **Infrastructure**: Railway (hosting), PostgreSQL (database), OpenAI (AI processing)
- **Data Classification**: PII (consultant/client emails), scan results, WCAG violations

### Objectives
- ✅ Protect customer data
- ✅ Ensure system availability (99.9% uptime)
- ✅ Maintain confidentiality of sensitive information
- ✅ Provide processing integrity for scan results
- ✅ Respect privacy of user data

---

## Trust Service Criteria

### CC1: Control Environment

**Common Criteria 1: The entity demonstrates a commitment to integrity and ethical values.**

#### Controls Implemented:

| Control ID | Control | Implementation | Evidence |
|------------|---------|----------------|----------|
| CC1.1 | Code of Conduct | All team members sign code of conduct | `docs/CODE_OF_CONDUCT.md` |
| CC1.2 | Security Training | Quarterly security awareness training | Training records |
| CC1.3 | Background Checks | Background checks for all employees with data access | HR records |
| CC1.4 | Conflict of Interest | Annual conflict of interest disclosures | Signed declarations |

**Evidence Location**: `/legal/policies/`

---

### CC2: Communication and Information

**Common Criteria 2: The entity obtains or generates and uses relevant, quality information to support the functioning of internal control.**

#### Controls Implemented:

| Control ID | Control | Implementation | Evidence |
|------------|---------|----------------|----------|
| CC2.1 | System Documentation | Comprehensive technical documentation | `docs/` directory |
| CC2.2 | Change Management | All changes tracked via GitHub PRs | GitHub audit logs |
| CC2.3 | Incident Response Plan | Documented incident response procedures | `docs/DEPLOYMENT_STRATEGY.md` |
| CC2.4 | Security Policies | Written security policies and procedures | `SECURITY.md`, `docs/SOC2_COMPLIANCE.md` |

**Evidence Location**: GitHub repository, `/docs/`

---

### CC3: Risk Assessment

**Common Criteria 3: The entity identifies, analyzes, and responds to risks related to achieving its objectives.**

#### Controls Implemented:

| Control ID | Control | Implementation | Evidence |
|------------|---------|----------------|----------|
| CC3.1 | Risk Register | Maintain and review risk register quarterly | `/legal/risk-register.xlsx` |
| CC3.2 | Threat Modeling | Annual threat modeling exercises | Threat model documents |
| CC3.3 | Vulnerability Scanning | Weekly automated vulnerability scans | `npm audit` reports |
| CC3.4 | Penetration Testing | Annual third-party penetration test | Pentest reports |

**Risk Register Sample**:
```
Risk ID: R-001
Risk: Unauthorized access to customer data
Likelihood: Medium
Impact: High
Mitigation: MFA, API key rotation, encryption at rest
Owner: Security Team
Status: Mitigated
```

---

### CC4: Monitoring Activities

**Common Criteria 4: The entity selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning.**

#### Controls Implemented:

| Control ID | Control | Implementation | Evidence |
|------------|---------|----------------|----------|
| CC4.1 | Continuous Monitoring | Real-time monitoring via DataDog/Sentry | `config/monitoring/` |
| CC4.2 | Log Review | Weekly security log reviews | Log review reports |
| CC4.3 | Access Reviews | Quarterly access rights reviews | Access review reports |
| CC4.4 | Compliance Audits | Monthly internal compliance checks | Audit reports |

**Monitoring Configuration**: See `config/monitoring/datadog-dashboard.json`

---

### CC5: Control Activities

**Common Criteria 5: The entity selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.**

#### Controls Implemented:

| Control ID | Control | Implementation | Evidence |
|------------|---------|----------------|----------|
| CC5.1 | Least Privilege | RBAC with 50+ granular permissions | `packages/api/src/middleware/rbac.ts` |
| CC5.2 | Segregation of Duties | Separate roles for dev, ops, security | Role matrix |
| CC5.3 | Change Approval | All production changes require approval | GitHub branch protection |
| CC5.4 | Code Review | Mandatory code reviews for all PRs | GitHub PR history |

---

## Security Controls

### A1: Security - Access Control

#### A1.1 User Authentication
- **Control**: Multi-factor authentication (MFA) required for admin accounts
- **Implementation**: Clerk authentication with MFA enforcement
- **Testing**: Attempt login without MFA (should fail)
- **Evidence**: Clerk dashboard showing MFA enforcement

#### A1.2 API Key Management
- **Control**: API keys rotated every 90 days
- **Implementation**: Automated rotation via `.github/workflows/rotate-secrets.yml`
- **Testing**: Check API key creation dates in database
- **Evidence**: Secret rotation audit logs

#### A1.3 Session Management
- **Control**: Sessions expire after 30 minutes of inactivity
- **Implementation**: NextAuth session configuration
- **Testing**: Verify session timeout after inactivity
- **Evidence**: NextAuth configuration

#### A1.4 Role-Based Access Control (RBAC)
- **Control**: Users assigned roles with least privilege
- **Implementation**: RBAC middleware with 50+ permissions
- **Testing**: Verify user cannot access unauthorized endpoints
- **Evidence**: `packages/api/src/middleware/rbac.ts`

**Roles**:
- `admin`: Full system access
- `consultant`: Client management, scan review
- `viewer`: Read-only access
- `api_user`: API-only access

---

### A2: Security - Data Protection

#### A2.1 Encryption at Rest
- **Control**: Sensitive data encrypted in database
- **Implementation**: AES-256-GCM encryption for PII fields
- **Testing**: Query database, verify encrypted fields
- **Evidence**: `packages/api/src/lib/encryption.ts`

**Encrypted Fields**:
- Consultant emails
- Client contact information
- API keys
- Authentication tokens

#### A2.2 Encryption in Transit
- **Control**: All traffic encrypted with TLS 1.3
- **Implementation**: HTTPS enforcement via Railway/Vercel
- **Testing**: Attempt HTTP connection (should redirect to HTTPS)
- **Evidence**: SSL Labs scan results

#### A2.3 Data Backup
- **Control**: Daily automated backups with 90-day retention
- **Implementation**: Railway automated backups + manual exports
- **Testing**: Restore from backup to verify integrity
- **Evidence**: Backup logs, restoration test results

#### A2.4 Data Retention
- **Control**: Data deleted after retention period
- **Implementation**: Automated cleanup jobs
- **Testing**: Verify old data is deleted
- **Evidence**: Data retention policy document

---

### A3: Security - Network Security

#### A3.1 Rate Limiting
- **Control**: API rate limits enforced per tier
- **Implementation**: Express rate-limit middleware
- **Testing**: Exceed rate limit, verify 429 response
- **Evidence**: `packages/api/src/middleware/security-advanced.ts`

**Rate Limits**:
- Free: 100 requests / 15 minutes
- Pro: 1000 requests / 15 minutes
- Enterprise: 10,000 requests / 15 minutes

#### A3.2 DDoS Protection
- **Control**: DDoS mitigation via CDN
- **Implementation**: Cloudflare (if configured) or Railway built-in
- **Testing**: Simulate traffic spike
- **Evidence**: CDN configuration

#### A3.3 CORS Policy
- **Control**: Strict CORS policy limiting origins
- **Implementation**: CORS middleware with whitelist
- **Testing**: Attempt request from unauthorized origin
- **Evidence**: `packages/api/src/middleware/security-advanced.ts`

---

### A4: Security - Vulnerability Management

#### A4.1 Dependency Scanning
- **Control**: Weekly dependency vulnerability scans
- **Implementation**: GitHub Dependabot + `npm audit`
- **Testing**: Run `npm audit` in all packages
- **Evidence**: Dependabot alerts, audit reports

#### A4.2 Code Security Scanning
- **Control**: Static code analysis on every PR
- **Implementation**: GitHub CodeQL analysis
- **Testing**: Submit PR with security vulnerability
- **Evidence**: CodeQL scan results

#### A4.3 Penetration Testing
- **Control**: Annual third-party penetration test
- **Implementation**: Engage security firm for annual test
- **Testing**: External security assessment
- **Evidence**: Penetration test report

---

### A5: Availability

#### A5.1 Uptime Monitoring
- **Control**: 99.9% uptime SLA
- **Implementation**: UptimeRobot + DataDog monitoring
- **Testing**: Check uptime metrics
- **Evidence**: Uptime reports from monitoring tools

#### A5.2 Incident Response
- **Control**: Incidents responded to within SLA
- **Implementation**: PagerDuty on-call rotation
- **Testing**: Simulate critical incident
- **Evidence**: Incident response logs

**SLA Targets**:
- Critical: 15-minute response, 4-hour resolution
- High: 1-hour response, 24-hour resolution
- Medium: 4-hour response, 7-day resolution

#### A5.3 Disaster Recovery
- **Control**: Disaster recovery plan with RTO < 4 hours
- **Implementation**: Database backups, infrastructure as code
- **Testing**: Annual DR drill
- **Evidence**: DR test results

#### A5.4 Redundancy
- **Control**: Multi-region deployment capability
- **Implementation**: Railway multi-region setup (optional)
- **Testing**: Failover test
- **Evidence**: Infrastructure configuration

---

### A6: Confidentiality

#### A6.1 Data Classification
- **Control**: All data classified and labeled
- **Implementation**: Data classification policy
- **Testing**: Review random sample of data
- **Evidence**: Data classification matrix

**Classifications**:
- **Public**: Marketing materials, public docs
- **Internal**: Business processes, internal docs
- **Confidential**: Customer PII, scan results
- **Restricted**: API keys, credentials, secrets

#### A6.2 Non-Disclosure Agreements
- **Control**: NDAs signed with all employees and contractors
- **Implementation**: Onboarding process requires NDA
- **Testing**: Verify NDA on file for all team members
- **Evidence**: Signed NDAs

#### A6.3 Data Minimization
- **Control**: Collect only necessary data
- **Implementation**: Data collection policy
- **Testing**: Review data fields collected
- **Evidence**: Privacy policy, data mapping

---

### A7: Privacy

#### A7.1 Privacy Notice
- **Control**: Privacy policy published and accessible
- **Implementation**: Privacy policy on website
- **Testing**: Verify privacy policy link on all pages
- **Evidence**: Website privacy page

#### A7.2 Consent Management
- **Control**: Explicit consent for data collection
- **Implementation**: Consent banners and forms
- **Testing**: Verify consent captured before data collection
- **Evidence**: Consent records

#### A7.3 Data Subject Rights
- **Control**: Process for data access, deletion requests
- **Implementation**: Privacy request form and workflow
- **Testing**: Submit and process test request
- **Evidence**: Request handling logs

**Supported Rights**:
- Right to access
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to data portability

#### A7.4 Data Breach Notification
- **Control**: Breach notification within 72 hours (GDPR)
- **Implementation**: Incident response plan includes breach procedures
- **Testing**: Tabletop exercise for breach scenario
- **Evidence**: Breach response plan, exercise results

---

## Compliance Evidence

### Evidence Repository Structure
```
/evidence-vault/
├── access-reviews/
│   ├── 2025-Q1-access-review.pdf
│   └── 2025-Q2-access-review.pdf
├── audits/
│   ├── internal/
│   └── external/
├── training/
│   ├── security-awareness-2025-01.pdf
│   └── attendance-records.xlsx
├── incidents/
│   ├── INC-001-postmortem.md
│   └── INC-002-postmortem.md
├── backups/
│   └── backup-test-results.pdf
└── penetration-tests/
    └── pentest-2025-report.pdf
```

### Automated Evidence Collection
- **System Logs**: Automatically collected in DataDog
- **Deployment Logs**: GitHub Actions artifacts
- **Access Logs**: Database audit logs via Prisma
- **Security Scans**: `npm audit` reports in CI/CD

---

## Audit Readiness Checklist

### Pre-Audit (3 months before)
- [ ] Complete risk assessment
- [ ] Update all policies and procedures
- [ ] Conduct internal audit
- [ ] Collect all evidence
- [ ] Fix identified gaps
- [ ] Schedule penetration test
- [ ] Review vendor SOC 2 reports (Railway, OpenAI)

### Audit Preparation (1 month before)
- [ ] Organize evidence repository
- [ ] Create audit evidence index
- [ ] Prepare control narratives
- [ ] Schedule audit kick-off meeting
- [ ] Assign audit liaisons
- [ ] Set up auditor access (read-only)

### During Audit
- [ ] Respond to auditor requests within 24 hours
- [ ] Document all auditor findings
- [ ] Conduct daily status calls
- [ ] Track evidence requests in spreadsheet

### Post-Audit
- [ ] Review draft report
- [ ] Address management letter items
- [ ] Implement remediation plans
- [ ] Update SOC 2 controls based on findings
- [ ] Plan for next audit cycle

---

## Continuous Monitoring

### Daily
- Monitor security alerts in Sentry
- Review failed authentication attempts
- Check system uptime

### Weekly
- Review security logs
- Run `npm audit` on all packages
- Check for Dependabot alerts

### Monthly
- Internal compliance audit
- Access rights review
- Incident metrics review

### Quarterly
- Risk assessment update
- Access rights recertification
- Policy review and updates

### Annually
- Third-party penetration test
- External SOC 2 audit
- Disaster recovery drill
- Full security assessment

---

## Controls Testing

### Testing Schedule

| Control | Test Frequency | Test Type | Responsibility |
|---------|---------------|-----------|----------------|
| MFA Enforcement | Quarterly | Automated | Security Team |
| API Key Rotation | Monthly | Manual | DevOps |
| Encryption at Rest | Quarterly | Manual | Security Team |
| Rate Limiting | Monthly | Automated | QA Team |
| Backup Restoration | Quarterly | Manual | DevOps |
| Incident Response | Annually | Tabletop | All Teams |
| DR Plan | Annually | Full DR Drill | DevOps |

---

## Remediation Tracking

### Sample Remediation Plan

| Finding ID | Control | Gap | Remediation | Owner | Due Date | Status |
|------------|---------|-----|-------------|-------|----------|--------|
| F-001 | CC3.4 | No penetration test | Schedule annual pentest | Security | 2026-Q1 | In Progress |
| F-002 | A2.3 | Backup restore not tested | Conduct quarterly restore test | DevOps | 2025-12 | Planned |
| F-003 | A7.3 | No DSR process | Implement data request workflow | Privacy | 2025-12 | Complete |

---

## Vendor Management

### Third-Party Service Providers

| Vendor | Service | SOC 2 Status | Review Date | Risk Level |
|--------|---------|--------------|-------------|------------|
| Railway | Infrastructure Hosting | SOC 2 Type II | 2025-01 | High |
| OpenAI | AI Processing | In Progress | 2025-06 | High |
| SendGrid | Email Delivery | SOC 2 Type II | 2025-03 | Medium |
| Stripe | Payment Processing | PCI DSS, SOC 2 | 2025-02 | High |

**Vendor Assessment Criteria**:
- ✅ SOC 2 Type II report (or equivalent)
- ✅ Annual security questionnaire
- ✅ Data processing agreement (DPA)
- ✅ Business continuity plan
- ✅ Incident notification procedures

---

## Contact Information

**Compliance Officer**: compliance@wcagai.com
**Security Team**: security@wcagai.com
**Privacy Officer**: privacy@wcagai.com
**Audit Coordinator**: audit@wcagai.com

---

**Document Version**: 1.0
**Next Review Date**: February 15, 2026
**Classification**: Internal - Confidential
