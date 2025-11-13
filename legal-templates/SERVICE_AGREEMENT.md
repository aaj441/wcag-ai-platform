# WCAG AI Platform Service Agreement

**Effective Date:** {EFFECTIVE_DATE}
**Client:** {CLIENT_COMPANY}
**Service Tier:** {TIER} (Basic / Pro / Enterprise)

---

## 1. SERVICE DESCRIPTION

WCAG AI Platform ("Service") provides automated web accessibility scanning, analysis, and reporting services in accordance with Web Content Accessibility Guidelines (WCAG) 2.1 standards.

### 1.1 Included Services
- Automated WCAG 2.1 Level A/AA/AAA compliance scanning
- Violation identification and severity assessment
- Accessibility score reporting and trending
- Daily automated scans ({SCAN_FREQUENCY})
- Email violation alerts and summary reports
- API access for programmatic scanning

### 1.2 Service Scope
The Service scans websites and web applications you designate. Results are based on automated testing using industry-standard tools (axe-core, Pa11y, WAVE).

**IMPORTANT: This Service performs automated testing only.** Automated tools cannot detect all accessibility issues. Manual testing with assistive technologies is recommended for comprehensive accessibility assessment.

---

## 2. SERVICE LEVEL AGREEMENT (SLA)

### 2.1 Availability Target
- **Target Uptime:** 99.5% monthly availability
- **Scheduled Maintenance:** Up to 4 hours per month
- **Monitoring:** 24/7 infrastructure monitoring with automatic failover

### 2.2 Scan Performance
- **Maximum Scan Time:** 120 seconds per website
- **Expected Results Delivery:** Within 5 minutes of scan completion
- **Retry Policy:** Automatic retry on timeout (3 attempts)

### 2.3 Support Response Times
- **Critical Issues:** 4 hours
- **High Priority:** 8 hours
- **Standard Issues:** 24 hours
- **Enhancement Requests:** Best effort

---

## 3. LIMITATIONS OF LIABILITY

### 3.1 Service Limitations
Client acknowledges that:
- Automated accessibility scanning identifies a subset of potential accessibility issues
- The Service cannot guarantee discovery of all violations
- Compliance with WCAG does not guarantee ADA/legal accessibility compliance
- Third-party code, plugins, or embedded content may not be fully scanned
- JavaScript-rendered content may be partially or completely unavailable to the scanner

### 3.2 Limitation of Damages
To the maximum extent permitted by law, neither party shall be liable for:
- Indirect, incidental, consequential, or punitive damages
- Lost profits, revenue, data, or business opportunity
- Client's liability to third parties
- Damages exceeding twelve (12) months of fees paid

### 3.3 Liability Cap
Except for indemnification obligations and either party's breach of confidentiality, each party's total liability under this Agreement shall not exceed the fees paid by Client in the twelve (12) months preceding the claim.

---

## 4. WARRANTY DISCLAIMER

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WCAG AI PLATFORM DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:
- Fitness for a particular purpose
- Merchantability
- Non-infringement
- Accuracy or completeness of scan results
- That the Service will meet your specific accessibility compliance requirements

---

## 5. CLIENT RESPONSIBILITIES

### 5.1 Compliance Verification
Client is solely responsible for:
- Verifying scan results and fixing identified violations
- Conducting manual accessibility testing with assistive technologies
- Ensuring compliance with applicable laws (ADA, WCAG, Section 508, etc.)
- Obtaining professional legal counsel regarding accessibility compliance

### 5.2 Website Authorization
Client warrants that:
- It has authority to authorize scanning of submitted websites
- It will not submit third-party websites without permission
- Scanning complies with all applicable laws and website terms of service

### 5.3 Data Security
Client shall:
- Keep API keys confidential
- Not share login credentials
- Report any unauthorized access immediately
- Comply with data privacy regulations (GDPR, CCPA, etc.)

---

## 6. INTELLECTUAL PROPERTY

### 6.1 Service Ownership
WCAG AI Platform retains all rights to the Service, including software, algorithms, and intellectual property.

### 6.2 User-Generated Content
Client retains rights to any websites scanned. WCAG AI Platform may use aggregated, anonymized scan data for service improvement and analytics.

### 6.3 Compliance Reports
Client may use scan reports for internal compliance purposes and ADA defense if scanning followed our guidance.

---

## 7. CONFIDENTIALITY

Each party shall:
- Keep confidential information confidential
- Use it only to perform obligations under this Agreement
- Disclose only to employees/contractors with a need to know
- Maintain reasonable security measures

Exceptions: Information that is public domain, independently developed, or legally required to disclose.

---

## 8. INDEMNIFICATION

Client shall indemnify and hold harmless WCAG AI Platform from claims arising from:
- Client's use of the Service
- Client's websites or content
- Client's violation of this Agreement
- Client's violation of applicable laws
- Claims by third parties related to Client's websites

WCAG AI Platform shall indemnify Client from claims that the Service infringes third-party intellectual property rights.

---

## 9. TERM AND TERMINATION

### 9.1 Term
- **Monthly Billing:** Month-to-month, either party may cancel with 30 days notice
- **Annual Billing:** 12-month term with auto-renewal unless 30-day notice given
- **Trial:** 14-day free trial with automatic conversion to paid plan

### 9.2 Termination for Cause
Either party may terminate immediately if:
- The other materially breaches this Agreement and fails to cure within 15 days
- The other becomes insolvent or bankrupt

### 9.3 Effect of Termination
- All access credentials are disabled
- Billing ceases at termination
- Client data is retained for 30 days then deleted
- Provisions surviving termination: Limitations of Liability, Indemnification, Confidentiality

---

## 10. BILLING AND PAYMENT

### 10.1 Service Fees
Client shall pay fees based on selected tier:
- **Basic Tier:** ${BASIC_PRICE}/month
- **Pro Tier:** ${PRO_PRICE}/month
- **Enterprise Tier:** ${ENTERPRISE_PRICE}/month + custom scans

### 10.2 Billing Cycle
- **Automatic Renewal:** Service automatically renews unless cancelled
- **Payment Method:** Credit card on file
- **Cancellation:** Takes effect at end of current billing cycle

### 10.3 Payment Terms
- Invoices due within 30 days of receipt
- Late payment subject to 1.5% monthly interest
- Failed payments: Service suspended after 15 days

### 10.4 Price Changes
WCAG AI Platform may adjust pricing with 30 days notice. Continued use constitutes acceptance.

---

## 11. DATA PRIVACY AND COMPLIANCE

### 11.1 Data Processing
Client grants WCAG AI Platform permission to:
- Store scan results and website URLs in our database
- Process data through cloud infrastructure (AWS)
- Use aggregated data for service improvement

### 11.2 GDPR Compliance
If Client is in the EU or processes EU resident data:
- WCAG AI Platform will execute a Data Processing Addendum (DPA)
- Standard data protection clauses apply
- Client is responsible for data subject consent

### 11.3 HIPAA/PCI Compliance
- The Service is NOT HIPAA or PCI-DSS compliant
- Clients handling protected health/payment data must contact sales
- Enterprise clients can negotiate BAA or alternative arrangements

---

## 12. PROHIBITED USES

Client shall not:
- Use the Service for any illegal purpose or to violate any law
- Scan websites without authorization
- Attempt to reverse-engineer or hack the Service
- Use the Service to test security of third-party systems
- Resell or redistribute the Service
- Exceed API rate limits or attempt denial-of-service attacks

Violation may result in immediate suspension without refund.

---

## 13. GOVERNING LAW AND DISPUTE RESOLUTION

### 13.1 Governing Law
This Agreement is governed by the laws of {JURISDICTION}, without regard to conflicts of law principles.

### 13.2 Dispute Resolution
- **Informal Resolution:** Parties will attempt to resolve disputes informally
- **Mediation:** If unresolved after 30 days, binding mediation in {JURISDICTION}
- **Litigation:** If mediation fails, either party may pursue litigation in courts of {JURISDICTION}

### 13.3 Arbitration Option
For Enterprise clients: Either party may elect binding arbitration under AAA Commercial Rules.

---

## 14. MISCELLANEOUS

### 14.1 Entire Agreement
This Agreement constitutes the entire agreement between the parties regarding the Service, superseding all prior agreements.

### 14.2 Modifications
WCAG AI Platform may modify this Agreement with 30 days written notice. Continued use constitutes acceptance.

### 14.3 Severability
If any provision is unenforceable, it shall be modified to the minimum extent necessary, or severed, without affecting other provisions.

### 14.4 Assignment
Client may not assign this Agreement without written consent. WCAG AI Platform may assign to successors or in connection with merger/acquisition.

### 14.5 No Waiver
Failure to enforce any right shall not constitute waiver of that right.

---

## SIGNATURE

**WCAG AI Platform**

By: ___________________
Name: ___________________
Date: ___________________

**Client: {CLIENT_COMPANY}**

By: ___________________
Name: ___________________
Title: ___________________
Date: ___________________

---

## APPENDIX A: SERVICE TIER SPECIFICATIONS

| Feature | Basic | Pro | Enterprise |
|---------|-------|-----|------------|
| Monthly Cost | $299 | $999 | Custom |
| Daily Scans | 2 | 10 | 50+ |
| Websites | Up to 5 | Up to 25 | Unlimited |
| Email Reports | Daily Summary | Daily Detail | Custom Schedule |
| API Access | Limited | Standard | Premium |
| Support | Email Only | Email + Chat | Phone + Slack |
| SLA Uptime | 99% | 99.5% | 99.9% |
| Data Retention | 90 days | 1 year | 3 years |

---

**Version:** 1.0
**Last Updated:** January 2024

**IMPORTANT:** This is a template. Legal review by an attorney is strongly recommended before use. Customize all {BRACKETED} fields and jurisdictional provisions for your specific situation.
