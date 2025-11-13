# WCAG AI Platform Service Level Agreement (SLA)

**Effective Date:** {EFFECTIVE_DATE}
**Last Updated:** January 2024

---

## OVERVIEW

This SLA defines the service levels, uptime commitments, and support response times for WCAG AI Platform by subscription tier.

---

## 1. SERVICE AVAILABILITY

### Basic Tier ($299/month)

| Metric | Commitment |
|--------|------------|
| **Monthly Uptime Target** | 99.0% |
| **Maximum Monthly Downtime** | 7 hours 12 minutes |
| **Maintenance Window** | Up to 4 hours/month (non-billable) |
| **Monitoring** | 24/7 automated monitoring |
| **Incident Response** | Best effort |

**What's Included:**
- Automated WCAG scanning
- Email notifications
- Daily summary reports
- 90-day data retention
- Community support (forum/docs)

**What's NOT Included:**
- Phone support
- Guaranteed response times
- Custom SLA terms
- Dedicated infrastructure

---

### Pro Tier ($999/month)

| Metric | Commitment |
|--------|------------|
| **Monthly Uptime Target** | 99.5% |
| **Maximum Monthly Downtime** | 3 hours 36 minutes |
| **Maintenance Window** | Up to 4 hours/month (non-billable) |
| **Monitoring** | 24/7 continuous monitoring |
| **Incident Response** | 1-hour acknowledgment |

**What's Included:**
- Everything in Basic
- Priority email support (8 business hours)
- Chat support during business hours
- 1-year data retention
- Custom scan schedules
- Violation trend analysis

**What's NOT Included:**
- 24/7 phone support
- Dedicated account manager
- Custom infrastructure

---

### Enterprise Tier (Custom Pricing)

| Metric | Commitment |
|--------|------------|
| **Monthly Uptime Target** | 99.9% |
| **Maximum Monthly Downtime** | 43 minutes |
| **Maintenance Window** | Coordinated (minimal impact) |
| **Monitoring** | Real-time monitoring + alerts |
| **Incident Response** | 15-minute acknowledgment |

**What's Included:**
- Everything in Pro
- Dedicated support channel (Slack/Phone)
- 24/7 priority support
- Dedicated account manager
- 3-year data retention
- White-label options
- Custom integrations
- SLA credits for breaches

**What's NOT Included:**
- Guaranteed scan success (network dependent)
- Prevention of third-party outages

---

## 2. SCAN PERFORMANCE GUARANTEES

### Scan Completion Time

| Metric | Target | Maximum |
|--------|--------|---------|
| **Average Scan Duration** | 30 seconds | 120 seconds |
| **Results Delivery** | 2 minutes | 5 minutes |
| **Report Generation** | 1 minute | 5 minutes |
| **Email Delivery** | 2 minutes | 15 minutes |

**Notes:**
- Actual duration depends on website size, complexity, and network conditions
- Large websites (10,000+ pages) may exceed maximum time
- Third-party service dependencies may cause delays
- Guaranteed to auto-retry on timeout

### Scan Success Rate

| Tier | Success Rate | Auto-Retry |
|------|-------------|-----------|
| Basic | 95% | 3 attempts |
| Pro | 98% | 5 attempts |
| Enterprise | 99%+ | 10 attempts |

---

## 3. SUPPORT RESPONSE TIMES

### Response Tier Definitions

**Severity Level 1 (Critical)**
- Service completely unavailable
- Complete loss of functionality
- Affects all customers' scans
- Examples: Database down, API offline, all authentication failing

**Severity Level 2 (High)**
- Service partially degraded
- Significant functionality loss
- Affects some customers or features
- Examples: Slow scans, intermittent API errors, email delays

**Severity Level 3 (Medium)**
- Minor functionality issue
- Workaround available
- Limited impact
- Examples: UI bug, documentation issue, feature request

**Severity Level 4 (Low)**
- Questions, feature requests, enhancement suggestions
- No impact on functionality
- Informational

### Response Time by Tier

#### Basic Tier
| Issue Type | Initial Response | Resolution Target |
|------------|-----------------|-------------------|
| Severity 1 | Best effort | 24 hours |
| Severity 2 | Best effort | 48 hours |
| Severity 3 | Best effort | 5 business days |
| Severity 4 | No SLA | No SLA |

**Support Channels:** Email only
**Support Hours:** Monday-Friday 9 AM - 5 PM (US Eastern)
**Business Day:** 24 hours

#### Pro Tier
| Issue Type | Initial Response | Resolution Target |
|------------|-----------------|-------------------|
| Severity 1 | 2 hours | 8 hours |
| Severity 2 | 4 hours | 24 hours |
| Severity 3 | 8 hours | 3 business days |
| Severity 4 | Best effort | No SLA |

**Support Channels:** Email, Chat (business hours)
**Support Hours:** Monday-Friday 8 AM - 6 PM (US Eastern)
**Business Day:** 8 hours

#### Enterprise Tier
| Issue Type | Initial Response | Resolution Target |
|------------|-----------------|-------------------|
| Severity 1 | 15 minutes | 2 hours |
| Severity 2 | 1 hour | 8 hours |
| Severity 3 | 4 hours | 24 hours |
| Severity 4 | 24 hours | 5 business days |

**Support Channels:** Email, Chat, Phone, Slack
**Support Hours:** 24/7/365
**Response Time:** Calendar minutes

---

## 4. UPTIME CALCULATION

### Definition of Downtime

Downtime is counted when:
- API endpoints return 5xx errors for >1 minute
- Website/dashboard is inaccessible for >1 minute
- >5% of scan requests fail due to service issues (not network)

Downtime is NOT counted when:
- Planned maintenance (up to 4 hours/month, 30-day notice)
- Third-party service failures (AWS, SendGrid, etc.)
- Network issues at Client location
- Client-side errors or rate limit violations
- DDoS attacks or security incidents

### Uptime Calculation Formula

```
Uptime % = (Total Minutes in Month - Downtime Minutes) / Total Minutes in Month × 100
```

**Monthly Reporting:** Uptime reports available in dashboard by 5th of following month

---

## 5. SLA CREDITS

### Credit Eligibility

Clients are eligible for SLA credits if:
1. Documented incident causes unavailability
2. Client notifies support within 48 hours of incident
3. Incident is not due to excluded causes
4. All fees are current (no payment disputes)
5. Client is not in violation of Terms of Service

### Credit Amounts

#### Pro & Enterprise Only

| Uptime Achievement | Monthly Credit |
|--------------------|-----------------|
| 99.0% to 99.4% | 10% of monthly fee |
| 98.5% to 98.9% | 15% of monthly fee |
| 98.0% to 98.4% | 20% of monthly fee |
| 97.0% to 97.9% | 25% of monthly fee |
| Below 97% | 30% of monthly fee |

**Basic Tier:** No SLA credits (best-effort service)

### Credit Terms

- Credits are Client's only remedy for SLA breach
- Credits must be requested within 30 days of incident
- Credits apply to next month's invoice
- Credits cannot be transferred or refunded
- Credits cannot exceed 100% of monthly fee
- Annual billing is non-refundable but eligible for credits

### Example

If Pro tier client ($999/month) experiences downtime causing 99.2% uptime:
- Credit = $999 × 10% = **$99.90**
- Applied to next month's invoice

---

## 6. MAINTENANCE AND SCHEDULED DOWNTIME

### Maintenance Window

- **Duration:** Up to 4 hours per month
- **Frequency:** Typically 1-2 times per month
- **Notice:** 30 days advance notice via email
- **Timing:** 2-6 AM US Eastern Time (typically Sunday-Wednesday)
- **Scope:** May include scanning, API, or dashboard

### Emergency Maintenance

If emergency security or critical fix is needed:
- Notice provided as soon as practical (may be <1 hour)
- Typically <15 minutes duration
- Not counted against uptime SLA

### Maintenance Notification

Clients receive notifications via:
1. Email (all clients)
2. Dashboard notification banner (Pro/Enterprise)
3. Slack integration (Enterprise)
4. Status page (https://status.wcag-ai.com)

---

## 7. EXCLUSIONS

The following are NOT covered by this SLA:

1. **Force Majeure**
   - Natural disasters, wars, terrorism
   - Government actions, pandemics
   - Utility failures beyond our control

2. **Third-Party Services**
   - AWS/cloud provider outages
   - Email delivery service failures
   - DNS/CDN issues
   - Internet backbone failures

3. **Client Responsibilities**
   - Network problems at Client location
   - Incorrect API usage or rate limit violations
   - Client misconfiguration
   - Attacks originating from Client systems

4. **Known Issues**
   - Issues in public beta features
   - Features with beta designation
   - Known limitations documented

5. **Custom Development**
   - Work performed under professional services
   - Custom integrations or features
   - Non-standard implementations

---

## 8. ESCALATION PROCEDURE

### For Severity 1 Issues

```
1. Customer reports via support channel (email/chat/phone)
2. On-call engineer notified immediately (Enterprise) or next business day (Pro)
3. Initial assessment within 15 minutes (Enterprise) or 2 hours (Pro)
4. Escalation to engineering lead if not resolved
5. VP of Engineering notified if unresolved after 1 hour (Enterprise)
```

### For Unresolved Issues

- Pro: Escalate after 24 hours of outage
- Enterprise: Escalate after 1 hour of outage
- Credits are issued even if issue is in excluded category (at our discretion)

---

## 9. COMMUNICATION

### Status Page

Real-time status available at: https://status.wcag-ai.com

- All incidents tracked
- Historical uptime data
- Incident post-mortems
- Maintenance schedule

### Incident Notifications

Customers are notified of:
- Major outages via email
- Maintenance windows (30-day advance)
- Emergency maintenance (as soon as possible)
- Resolution updates (every 30 minutes during outage)

### Post-Incident Reports

For Severity 1 incidents affecting Enterprise customers:
- Written post-mortem within 24 hours
- Root cause analysis
- Preventive measures
- Timeline of events

---

## 10. MONITORING AND MEASUREMENT

### Monitoring Infrastructure

- Distributed monitoring from 6 global regions
- Active endpoint testing every 60 seconds
- Real-user monitoring (RUM)
- Application performance monitoring (APM)
- Database performance tracking
- Queue monitoring

### Metrics Tracked

- API response time (p50, p95, p99)
- Error rate and error types
- Queue depth and processing time
- Database connection pool health
- Scan success/failure rate
- Email delivery latency
- Dashboard page load time

### Data Retention

- Real-time metrics: 30 days
- Hourly aggregates: 1 year
- Monthly summaries: 3 years
- Incident logs: Indefinite

---

## 11. MODIFICATIONS TO SLA

WCAG AI Platform reserves the right to modify this SLA with:
- 30 days written notice (email)
- Changes apply to renewals and new clients immediately
- Current clients continue under existing SLA until renewal

---

## 12. CONTACT FOR SLA ISSUES

**Email:** sla@wcag-ai.com
**Phone:** 1-855-WCAG-FIX (Enterprise only)
**Support Portal:** https://support.wcag-ai.com

---

## TIER COMPARISON SUMMARY

| Feature | Basic | Pro | Enterprise |
|---------|-------|-----|------------|
| **Uptime SLA** | 99.0% | 99.5% | 99.9% |
| **Support Response** | Best effort | 2-8 hrs | 15 min-1 hr |
| **Support Hours** | 9-5 M-F | 8-6 M-F | 24/7 |
| **Support Channels** | Email | Email, Chat | Email, Chat, Phone, Slack |
| **SLA Credits** | None | Yes | Yes |
| **Status Page** | Basic | Detailed | Real-time |
| **Maintenance Notice** | 30 days | 30 days | 30 days |
| **Cost** | $299/mo | $999/mo | Custom |

---

**Version:** 2.0
**Last Updated:** January 2024

**Disclaimer:** This SLA is binding only when explicitly referenced in your Service Agreement. Basic Tier users should note that this is "best-effort" service without guaranteed uptime. For compliance-critical systems, upgrade to Pro or Enterprise tier.
