# Incident Response Plan

## WCAGAI Security Incident Response Procedures

**Last Updated:** November 17, 2025
**Plan Status:** Active
**Review Frequency:** Quarterly

---

## 📋 Table of Contents

- [Overview](#overview)
- [Incident Classification](#incident-classification)
- [Response Team](#response-team)
- [Incident Response Phases](#incident-response-phases)
- [Communication Procedures](#communication-procedures)
- [Incident Playbooks](#incident-playbooks)
- [Post-Incident Activities](#post-incident-activities)
- [Contact Information](#contact-information)

---

## 🎯 Overview

### Purpose

This Incident Response Plan establishes procedures for identifying, responding to, and recovering from security incidents affecting the WCAGAI platform. The goals are:

1. **Minimize Impact:** Contain incidents quickly to limit damage
2. **Protect Data:** Prevent unauthorized access or data loss
3. **Maintain Operations:** Restore services as quickly as possible
4. **Learn & Improve:** Conduct post-mortems to prevent recurrence
5. **Comply with Laws:** Meet GDPR 72-hour breach notification requirements

### Scope

This plan covers:
- ✅ Security breaches (data breaches, unauthorized access)
- ✅ System compromises (malware, ransomware, account takeover)
- ✅ Denial of Service attacks
- ✅ Data integrity incidents (data corruption, tampering)
- ✅ Insider threats
- ✅ Third-party security incidents (sub-processor breaches)

This plan does **NOT** cover:
- ❌ General IT support issues (use standard support channels)
- ❌ Non-security production incidents (use SRE on-call procedures)
- ❌ Planned maintenance windows

### Activation Criteria

Activate this plan when:
- Confirmed or suspected security breach
- Unauthorized access to production systems
- Data exposure or leakage
- Malware or ransomware detected
- Significant increase in failed authentication attempts
- DDoS attack causing service degradation
- Third-party notifies us of a security issue
- Discovery of critical vulnerability being actively exploited

---

## 🚨 Incident Classification

### Severity Levels

| Severity | Description | Examples | Response Time | Notification |
|----------|-------------|----------|---------------|--------------|
| **P0 - Critical** | Active data breach or complete service outage | Database exposed, RCE exploit, ransomware | **15 minutes** | CEO, CTO, all engineers, legal |
| **P1 - High** | Security bypass or major vulnerability | Authentication bypass, XSS, privilege escalation | **1 hour** | CTO, security team, engineering manager |
| **P2 - Medium** | Limited security impact or data exposure | IDOR affecting small dataset, SSRF | **4 hours** | Security team, on-call engineer |
| **P3 - Low** | Minimal security risk | Outdated dependency, information disclosure | **24 hours** | Security team |

### GDPR Data Breach Classification

Under GDPR Article 33, we must determine if an incident constitutes a "personal data breach":

**Qualifies as Data Breach:**
- ✅ Unauthorized access to user emails, scan data, or PII
- ✅ Accidental exposure of customer data (misconfigured S3 bucket, etc.)
- ✅ Data loss (deleted backups, corrupted database)
- ✅ Ransomware encrypting customer data

**Does NOT Qualify:**
- ❌ DDoS attack with no data access
- ❌ Vulnerability discovered before exploitation
- ❌ Failed intrusion attempt (blocked by security controls)

**If Data Breach:**
- Must notify Data Protection Authority within **72 hours**
- Must notify affected users "without undue delay" if high risk
- Document decision-making process (even if notification not required)

---

## 👥 Response Team

### Roles and Responsibilities

| Role | Responsibilities | Primary Contact | Backup |
|------|------------------|-----------------|--------|
| **Incident Commander (IC)** | Overall incident coordination, decision-making | CTO | Engineering Manager |
| **Security Lead** | Technical investigation, forensics, remediation | Security Engineer | Senior Developer |
| **Communications Lead** | Customer notifications, PR, legal liaison | CEO | Marketing Lead |
| **Engineering Lead** | System changes, deployments, rollbacks | Engineering Manager | Senior Developer |
| **Legal Counsel** | Regulatory compliance, law enforcement liaison | General Counsel | External counsel |
| **Data Protection Officer** | GDPR compliance, DPA notification | DPO | Legal Counsel |

### On-Call Rotation

**24/7 On-Call Coverage:**
- **Security Team:** Rotating weekly schedule
- **Engineering Team:** Rotating daily schedule (overlaps with SRE on-call)

**On-Call Expectations:**
- Respond within 15 minutes for P0, 1 hour for P1
- Escalate to Incident Commander if security incident confirmed
- Access to laptop, VPN, production credentials
- Sober and able to respond (no alcohol within 8 hours of on-call)

**On-Call Schedule:** [PagerDuty/OpsGenie link - TBD]

---

## 🔄 Incident Response Phases

### Phase 1: Detection & Identification

**Goal:** Detect and confirm security incident as quickly as possible

**Detection Sources:**
- Automated monitoring alerts (Sentry, health checks)
- Security vulnerability reports (GitHub Security Advisories)
- Customer reports (support tickets, social media)
- Third-party notifications (Clerk, Stripe, Railway)
- Penetration testing findings
- Security researcher disclosures

**Identification Steps:**
1. **Gather Initial Information:**
   - What happened? (description of the issue)
   - When was it detected?
   - Who reported it?
   - What systems are affected?
   - Is it ongoing?

2. **Confirm Security Incident:**
   - Review logs and monitoring data
   - Reproduce the issue if possible
   - Determine if this is truly a security incident
   - Assess severity (P0-P3)

3. **Document Everything:**
   - Create incident ticket: `INC-YYYY-NNNN`
   - Start incident log (timestamped notes)
   - Preserve evidence (logs, screenshots, memory dumps)

**Tools:**
- Incident tracking: GitHub Issues (private security repository)
- Communication: Dedicated Slack channel `#incident-[ticket-id]`
- Logging: Sentry, PostgreSQL audit logs, Railway logs

### Phase 2: Containment

**Goal:** Stop the incident from spreading and limit damage

**Short-Term Containment (0-1 hour):**
1. **Isolate affected systems:**
   - Disable compromised user accounts
   - Block malicious IP addresses (WAF rules)
   - Disable vulnerable endpoints or features
   - Disconnect compromised systems from network

2. **Prevent further damage:**
   - Enable circuit breakers (stop external API calls)
   - Increase authentication requirements (force MFA)
   - Rate limit aggressively
   - Enable additional logging/monitoring

3. **Preserve evidence:**
   - Take database snapshots
   - Save all logs (don't let them rotate)
   - Screenshot affected pages
   - Document all containment actions

**Long-Term Containment (1-24 hours):**
1. **Apply temporary fixes:**
   - Deploy hot-fix patches
   - Update firewall rules
   - Rotate API keys and secrets
   - Force password resets for affected users

2. **Maintain business operations:**
   - Enable workarounds if possible
   - Communicate with customers about service status
   - Document impact on SLAs

**Containment Decision Matrix:**

| Incident Type | Containment Action |
|---------------|-------------------|
| **Data Breach** | Disable affected API, rotate credentials, force logout all users |
| **RCE/Malware** | Shut down affected servers, restore from clean backup |
| **DDoS** | Enable Railway DDoS protection, rate limiting, IP blocking |
| **Account Takeover** | Disable account, force password reset, invalidate sessions |
| **SQL Injection** | Disable vulnerable endpoint, deploy parameterized queries |

### Phase 3: Eradication

**Goal:** Remove the threat from the environment

**Eradication Steps:**
1. **Identify root cause:**
   - Code review (find vulnerable code)
   - Configuration audit (misconfigured settings)
   - Access review (compromised credentials)
   - Dependency audit (vulnerable packages)

2. **Remove the threat:**
   - Delete malware, backdoors, unauthorized accounts
   - Close security holes (code fixes, config changes)
   - Update vulnerable dependencies
   - Revoke compromised credentials

3. **Verify eradication:**
   - Re-scan systems for malware
   - Review logs for residual malicious activity
   - Penetration test to confirm fix
   - Code review and security testing

**Deployment:**
- All fixes must go through normal CI/CD (unless P0)
- For P0: Emergency deployment allowed, but post-merge PR required
- Document all changes in incident ticket

### Phase 4: Recovery

**Goal:** Restore systems to normal operations

**Recovery Steps:**
1. **Restore services:**
   - Re-enable disabled features/endpoints
   - Remove aggressive rate limits
   - Restore from backups if needed
   - Verify data integrity

2. **Monitor for recurrence:**
   - Increase monitoring sensitivity
   - Watch for signs of re-infection
   - Monitor affected user accounts
   - Set up alerts for similar patterns

3. **Verify recovery:**
   - Run end-to-end tests
   - Confirm all services operational
   - Check metrics (error rates, response times)
   - Customer validation (pilot group testing)

**Recovery Decision Criteria:**
- ✅ Threat fully eradicated
- ✅ Root cause identified and fixed
- ✅ All systems scanned and verified clean
- ✅ Monitoring in place to detect recurrence
- ✅ Incident Commander approves recovery

### Phase 5: Lessons Learned

**Goal:** Prevent future incidents through continuous improvement

**Post-Incident Review (Within 7 days):**
1. **Schedule post-mortem meeting:**
   - All incident responders attend
   - Blameless culture (focus on systems, not people)
   - 1-2 hour meeting

2. **Review incident timeline:**
   - What happened?
   - When was it detected?
   - How long to contain/eradicate/recover?
   - What went well?
   - What went poorly?

3. **Identify improvements:**
   - How could we detect this faster?
   - How could we prevent this?
   - What tools/processes are needed?
   - What training is required?

4. **Create action items:**
   - Specific, measurable tasks
   - Assign owners and deadlines
   - Track to completion

5. **Document and share:**
   - Write public incident report (redacted)
   - Update incident response playbooks
   - Share learnings with team
   - Update security training

**Post-Mortem Template:**
```markdown
# Incident Post-Mortem: [INC-YYYY-NNNN]

## Incident Summary
- **Severity:** P0/P1/P2/P3
- **Duration:** [Detection time → Resolution time]
- **Impact:** [Users affected, data exposed, service downtime]

## Timeline
- **[HH:MM]** - Incident detected
- **[HH:MM]** - Incident confirmed
- **[HH:MM]** - Containment actions taken
- **[HH:MM]** - Root cause identified
- **[HH:MM]** - Fix deployed
- **[HH:MM]** - Service restored

## Root Cause
[Detailed explanation of why this happened]

## What Went Well
- [Positive aspects of the response]

## What Went Poorly
- [Areas for improvement]

## Action Items
- [ ] [Task 1] - Owner: [Name] - Deadline: [Date]
- [ ] [Task 2] - Owner: [Name] - Deadline: [Date]

## Appendix
- Incident logs: [Link]
- Monitoring data: [Link]
- Customer communications: [Link]
```

---

## 📢 Communication Procedures

### Internal Communication

**Incident Slack Channel:**
- Create: `#incident-[ticket-id]`
- Purpose: Real-time coordination during incident
- Members: Response team + stakeholders
- Archive after incident resolved

**Status Updates:**
- Frequency: Every 30 minutes for P0/P1, hourly for P2, daily for P3
- Format: "Status: [Detecting/Containing/Eradicating/Recovering], ETA: [time], Impact: [description]"
- Post in: Incident Slack channel, incident ticket

**Escalation:**
- P0: Immediately notify CEO, CTO, legal counsel
- P1: Notify CTO, engineering manager within 1 hour
- P2: Notify security team, on-call engineer within 4 hours
- P3: Notify security team within 24 hours

### External Communication

**Customer Notification:**

**When to Notify:**
- Data breach affecting customer PII (GDPR requirement)
- Service outage >30 minutes
- Security vulnerability that requires customer action
- Any incident that could impact customer trust

**Notification Timeline:**
- P0 (data breach): Within 72 hours (GDPR), ideally within 24 hours
- P1: Within 7 days
- P2: Include in monthly security update
- P3: Optional (include in quarterly security report)

**Notification Channels:**
- Email (primary): Use pre-approved template
- Status page: https://status.wcagai.com
- In-app banner: For active users
- Social media: For widespread incidents

**Customer Notification Template:**
```
Subject: Important Security Notice for WCAGAI Customers

Dear WCAGAI Customer,

We are writing to inform you of a security incident that may affect your account.

WHAT HAPPENED:
[Brief description of the incident]

WHAT INFORMATION WAS INVOLVED:
[Specific data types affected - email, scan data, etc.]

WHAT WE ARE DOING:
[Containment and remediation actions taken]

WHAT YOU SHOULD DO:
[Specific actions for customers - change password, review account, etc.]

MORE INFORMATION:
[Link to detailed incident report]

We sincerely apologize for this incident and are committed to preventing similar issues in the future. If you have any questions, please contact security@wcagai.com.

Sincerely,
The WCAGAI Security Team
```

**Regulatory Notification:**

**GDPR Data Breach Notification (within 72 hours):**
- Notify: Data Protection Authority in our jurisdiction
- Method: Online portal or email
- Include: Nature of breach, categories of data, number of affected individuals, consequences, measures taken
- Contact: dpo@wcagai.com

**CCPA Data Breach Notification (without unreasonable delay):**
- Notify: California Attorney General (if >500 CA residents affected)
- Notify: Affected individuals
- Method: Email or postal mail

**Other Notifications:**
- Law enforcement (if criminal activity suspected)
- Cyber insurance provider (within 24 hours)
- Sub-processors affected (Clerk, Stripe, Railway)
- Payment card brands (if payment data compromised)

### Media Relations

**Spokesperson:**
- CEO (primary)
- CTO (technical questions)
- No one else authorized to speak to media

**Media Statement Template:**
```
We recently became aware of a security incident affecting the WCAGAI platform. We immediately launched an investigation, contained the issue, and notified affected customers. The security and privacy of our customers' data is our top priority. We are working with cybersecurity experts to investigate the incident and strengthen our security measures. For more information, visit [status page URL].
```

---

## 📖 Incident Playbooks

### Playbook 1: Data Breach

**Trigger:** Unauthorized access to customer data (emails, scan results, PII)

**Immediate Actions (0-15 minutes):**
1. Confirm scope: How many records? What data types?
2. Disable affected API endpoints or database access
3. Rotate all API keys and database credentials
4. Force logout all users (invalidate sessions)
5. Enable enhanced logging

**Containment (15-60 minutes):**
1. Identify attack vector (how did they get in?)
2. Block attacker's IP addresses
3. Review access logs for data exfiltration
4. Take database snapshot for forensics
5. Notify legal counsel and DPO

**Eradication (1-24 hours):**
1. Fix vulnerability (code patch, config change)
2. Deploy fix to production (emergency deployment)
3. Scan for backdoors or persistent access
4. Review all admin/privileged accounts

**Recovery (24-72 hours):**
1. Re-enable services with enhanced monitoring
2. Force password reset for affected users
3. Offer credit monitoring if PII exposed (US)
4. Monitor for suspicious activity

**Notification (within 72 hours):**
1. Draft customer notification (Communications Lead)
2. Legal review of notification
3. Notify Data Protection Authority (GDPR)
4. Send customer emails
5. Post to status page and social media

### Playbook 2: Remote Code Execution (RCE)

**Trigger:** Attacker can execute arbitrary code on our servers

**Immediate Actions (0-15 minutes):**
1. **SHUT DOWN AFFECTED SERVERS IMMEDIATELY**
2. Isolate from network (prevent lateral movement)
3. Preserve memory dump for forensics
4. Block attacker's IP at WAF level
5. Notify entire engineering team (all hands on deck)

**Containment (15-60 minutes):**
1. Review logs for extent of compromise
2. Identify if data was accessed or exfiltrated
3. Check for malware, backdoors, crypto miners
4. Rotate ALL production credentials (database, API keys, secrets)
5. Force logout all users

**Eradication (1-6 hours):**
1. Restore servers from clean backup (before compromise)
2. Fix RCE vulnerability (code patch)
3. Deploy fix to staging and test thoroughly
4. Scan all servers for indicators of compromise
5. Review all code changes from past 30 days

**Recovery (6-24 hours):**
1. Deploy fixed code to production
2. Restore from backup if data was tampered with
3. Enable aggressive monitoring (all traffic logged)
4. Conduct penetration test to verify fix
5. Monitor for re-infection (72 hours)

**Post-Incident:**
1. Hire external forensics firm (for P0 RCE)
2. Notify cyber insurance
3. Consider law enforcement notification
4. Conduct security code review of entire codebase

### Playbook 3: Denial of Service (DoS/DDoS)

**Trigger:** Service degradation or outage due to excessive traffic

**Immediate Actions (0-15 minutes):**
1. Confirm attack (legitimate traffic spike vs malicious)
2. Enable Railway DDoS protection
3. Implement aggressive rate limiting (10 req/min per IP)
4. Block top offending IP addresses
5. Enable CDN caching for static assets

**Containment (15-60 minutes):**
1. Identify attack vector (which endpoints targeted?)
2. Implement endpoint-specific rate limits
3. Enable CAPTCHA for sensitive endpoints
4. Scale up infrastructure (more workers, bigger database)
5. Monitor queue capacity (prevent queue overflow)

**Eradication (1-6 hours):**
1. Analyze attack patterns (IP ranges, user agents, patterns)
2. Implement WAF rules to block attack signatures
3. Coordinate with Railway to block at network level
4. Consider third-party DDoS mitigation (Cloudflare, Akamai)

**Recovery (6-24 hours):**
1. Gradually relax rate limits (monitor metrics)
2. Re-enable features disabled during attack
3. Verify service performance and error rates
4. Monitor for follow-up attacks (attackers often retry)

**Post-Incident:**
1. Analyze attack source (botnet? targeted?)
2. Improve baseline rate limits
3. Consider implementing queue-based request processing
4. Review infrastructure auto-scaling settings

### Playbook 4: Account Takeover

**Trigger:** Unauthorized access to user account(s)

**Immediate Actions (0-15 minutes):**
1. Disable compromised account(s)
2. Invalidate all sessions for affected user(s)
3. Review access logs for unauthorized actions
4. Identify compromise method (phishing, credential stuffing, etc.)
5. Force password reset for affected user(s)

**Containment (15-60 minutes):**
1. Check if attacker modified account settings (email, payment info)
2. Review other accounts for similar compromise patterns
3. Implement temporary MFA requirement for all logins
4. Monitor for brute force attempts (increase rate limiting)

**Eradication (1-6 hours):**
1. If phishing: Report phishing site, warn other users
2. If credential stuffing: Implement CAPTCHA, check haveibeenpwned API
3. If session hijacking: Rotate session secret, shorten session timeout
4. Review authentication logs for other compromised accounts

**Recovery (6-24 hours):**
1. Contact affected user(s) via verified channel (phone, original email)
2. Help user secure account (password reset, enable MFA)
3. Revert unauthorized changes (if any)
4. Monitor account for 30 days

**Post-Incident:**
1. Encourage all users to enable MFA (in-app banner)
2. Implement anomaly detection (login from new location/device)
3. Consider passwordless authentication (passkeys)

### Playbook 5: Supply Chain Attack

**Trigger:** Malicious code in a dependency (npm package, Docker image, etc.)

**Immediate Actions (0-30 minutes):**
1. Identify affected package and version
2. Check if malicious version is deployed to production
3. If in production: Roll back to previous version IMMEDIATELY
4. Block package from being installed (add to package.json resolutions)
5. Scan codebase for indicators of compromise

**Containment (30-120 minutes):**
1. Review what the malicious code does (exfiltrate secrets? backdoor?)
2. Rotate ALL secrets if data exfiltration suspected
3. Review logs for evidence of exploitation
4. Check if other services use the same dependency
5. Notify security community (GitHub Security Advisory)

**Eradication (2-24 hours):**
1. Pin to safe version of package (or remove if not critical)
2. Review all dependencies for similar issues (npm audit)
3. Implement dependency scanning in CI/CD (Snyk, Dependabot)
4. Code review all usages of affected package

**Recovery (24-72 hours):**
1. Deploy fixed version without malicious dependency
2. Monitor for signs of compromise (exfiltrated data used elsewhere)
3. Verify secrets not leaked (check GitHub, Pastebin, etc.)

**Post-Incident:**
1. Implement Software Bill of Materials (SBOM)
2. Pin all dependency versions (no `^` or `~`)
3. Review all dependencies quarterly
4. Consider internal npm registry with vetted packages

---

## 📊 Post-Incident Activities

### Incident Documentation

**Required Documentation:**
1. **Incident Ticket (GitHub Issue):**
   - Title: `[INC-YYYY-NNNN] Brief description`
   - Severity, affected systems, timeline
   - All actions taken (timestamped)
   - Root cause analysis
   - Resolution summary

2. **Post-Mortem Report:**
   - Blameless analysis of incident
   - Timeline of events
   - What went well / what went poorly
   - Action items to prevent recurrence

3. **Customer Notification:**
   - Email sent to affected users
   - Status page updates
   - Social media posts (if applicable)

4. **Regulatory Notifications:**
   - GDPR data breach notification (if applicable)
   - CCPA notification (if applicable)
   - Other regulatory filings

5. **Executive Summary:**
   - One-page summary for leadership
   - Business impact, remediation cost
   - Recommendations for investment

### Metrics and Reporting

**Track These Metrics:**
- **MTTD (Mean Time to Detect):** How long to detect incident?
- **MTTR (Mean Time to Respond):** How long from detection to containment?
- **MTTRC (Mean Time to Recover):** How long to full recovery?
- **Number of incidents by severity (P0/P1/P2/P3)**
- **Number of incidents by type (data breach, RCE, DoS, etc.)**
- **Cost of incidents (engineering time, customer refunds, etc.)**

**Quarterly Security Report:**
- Summary of incidents (anonymized)
- Trends and patterns
- Security improvements implemented
- Comparison to previous quarter

### Continuous Improvement

**Action Items from Post-Mortems:**
- Create GitHub issues for all action items
- Assign owners and deadlines
- Track to completion (review in weekly security meeting)
- Measure effectiveness (did it prevent recurrence?)

**Playbook Updates:**
- Update incident playbooks based on lessons learned
- Add new playbooks for novel incident types
- Remove outdated procedures

**Training:**
- Conduct incident response tabletop exercises (quarterly)
- Train new engineers on incident response procedures
- Share post-mortems with entire engineering team

**Tool Improvements:**
- Invest in better detection tools (SIEM, IDS/IPS)
- Automate containment actions (circuit breakers, auto-blocking)
- Improve logging and monitoring

---

## 📞 Contact Information

### 24/7 Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| **Incident Commander** | [CTO Name] | +1 (555) XXX-XXXX | cto@wcagai.com |
| **Security Lead** | [Security Engineer] | +1 (555) XXX-XXXX | security@wcagai.com |
| **On-Call Engineer** | [PagerDuty] | N/A | oncall@wcagai.com |
| **Legal Counsel** | [General Counsel] | +1 (555) XXX-XXXX | legal@wcagai.com |
| **DPO** | [DPO Name] | +1 (555) XXX-XXXX | dpo@wcagai.com |

### External Contacts

| Organization | Purpose | Contact |
|--------------|---------|---------|
| **Railway** | Infrastructure provider | support@railway.app |
| **Clerk** | Authentication provider | support@clerk.dev |
| **Stripe** | Payment provider | security@stripe.com |
| **Sentry** | Error tracking | support@sentry.io |
| **Cyber Insurance** | [Provider Name] | [Contact info - TBD] |
| **External Forensics** | [Firm Name] | [Contact info - TBD] |
| **Data Protection Authority** | GDPR breach notification | [EU DPA contact] |
| **California AG** | CCPA breach notification | oag.ca.gov |

### Reporting Channels

**For Security Researchers:**
- GitHub Security Advisory: https://github.com/aaj441/wcag-ai-platform/security/advisories/new
- Email: security@wcagai.com
- PGP Key: https://wcagai.com/.well-known/pgp-key.txt

**For Customers:**
- Security concerns: security@wcagai.com
- Support tickets: support@wcagai.com
- Status updates: https://status.wcagai.com

---

## 📚 References

- [SECURITY.md](./SECURITY.md) - Security policies
- [VULNERABILITY_DISCLOSURE.md](./VULNERABILITY_DISCLOSURE.md) - Responsible disclosure
- [COMPLIANCE.md](./COMPLIANCE.md) - Compliance frameworks
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework) - Industry best practices
- [SANS Incident Response Guide](https://www.sans.org/white-papers/33901/) - Incident response methodology

---

## 🔄 Plan Maintenance

**Review Schedule:**
- Quarterly review of procedures
- Annual full update
- After every P0/P1 incident (lessons learned)

**Approval:**
- CTO (owner)
- Security Lead
- Legal Counsel

**Version History:**
- v1.0 (Nov 2025) - Initial incident response plan

---

**Last Updated:** November 17, 2025
**Next Review:** February 17, 2026
**Plan Owner:** CTO
**Document Classification:** Internal - Confidential
