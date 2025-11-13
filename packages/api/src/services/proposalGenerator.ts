/**
 * Automated Proposal Generator
 * Creates consulting proposals based on preliminary scan data
 */

export interface ProposalData {
  clientName: string;
  consultantName?: string;
  url: string;
  violationCount: number;
  criticalViolations: number;
  userImpact: number;
  recommendedTier: 'basic' | 'pro' | 'enterprise';
  scanDate?: Date;
}

export interface TierPricing {
  name: string;
  price: number;
  includedScans: number;
  supportLevel: string;
  reportingFrequency: string;
  features: string[];
}

const TIER_PRICING: { [key: string]: TierPricing } = {
  basic: {
    name: 'Basic Scan',
    price: 299,
    includedScans: 1,
    supportLevel: 'Email (48hr response)',
    reportingFrequency: 'One-time report',
    features: [
      'Single site audit (up to 100 pages)',
      'Detailed WCAG 2.2 AA compliance report',
      'AI-generated remediation recommendations',
      'PDF report with white-label branding',
      '30-day report access'
    ]
  },
  pro: {
    name: 'Professional Monitoring',
    price: 499,
    includedScans: 10,
    supportLevel: 'Email & Chat (24hr response)',
    reportingFrequency: 'Monthly reports',
    features: [
      'Up to 10 scans per month',
      'Continuous monitoring & alerts',
      'Priority scanning (5-min SLA)',
      'Monthly compliance reports',
      'Trend analysis & dashboards',
      'Remediation tracking',
      'Email notifications for new violations',
      '1-year report retention'
    ]
  },
  enterprise: {
    name: 'Enterprise Suite',
    price: 999,
    includedScans: 9999,
    supportLevel: 'Dedicated Account Manager',
    reportingFrequency: 'Weekly reports + on-demand',
    features: [
      'Unlimited scans',
      'Multi-site monitoring',
      'API access for integrations',
      '2-minute SLA guarantee',
      'Custom reporting & analytics',
      'Dedicated account manager',
      'Quarterly compliance reviews',
      'Training & onboarding support',
      'White-glove service',
      'Unlimited report retention'
    ]
  }
};

/**
 * Generate markdown proposal
 */
export function generateProposal(data: ProposalData): string {
  const tier = TIER_PRICING[data.recommendedTier];
  const date = data.scanDate || new Date();
  
  // Calculate ROI estimates
  const lawsuitAvoidance = data.criticalViolations > 0 ? '50k-200k' : '20k-100k';
  const marketExpansion = Math.round(data.userImpact * 0.15).toLocaleString();
  
  return `
# WCAG 2.2 AA Compliance Proposal

**Client:** ${data.clientName}  
**Prepared by:** ${data.consultantName || 'WCAGAI Accessibility Team'}  
**Date:** ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

---

## Executive Summary

Based on our preliminary scanning of **${data.url}**, we have identified **${data.violationCount} accessibility violations** impacting approximately **${data.userImpact.toLocaleString()} users monthly**. 

${data.criticalViolations > 0 ? `
⚠️ **Critical Finding:** ${data.criticalViolations} critical violations were detected that pose immediate legal and usability risks.
` : ''}

Our analysis indicates that implementing WCAG 2.2 AA compliance will:
- Reduce legal risk and potential ADA lawsuit exposure
- Expand your addressable market by 15-20%
- Improve SEO and user experience
- Demonstrate commitment to inclusive design

---

## Recommended Solution: ${tier.name}

### Pricing
**$${tier.price}/month** (${data.recommendedTier === 'basic' ? 'one-time' : 'subscription'})

### What's Included
${tier.features.map(f => `- ${f}`).join('\n')}

### Service Level Agreement
- **Support:** ${tier.supportLevel}
- **Reporting:** ${tier.reportingFrequency}
- **Scans Included:** ${tier.includedScans === 9999 ? 'Unlimited' : tier.includedScans}

---

## Expected Return on Investment

### Risk Mitigation
- **Lawsuit avoidance:** $${lawsuitAvoidance} (average ADA settlement)
- **Brand protection:** Avoid negative publicity from accessibility lawsuits
- **Regulatory compliance:** Meet federal and state accessibility requirements

### Business Growth
- **Market expansion:** +${marketExpansion} additional addressable users
- **SEO improvement:** +10-15% organic traffic (Google prioritizes accessible sites)
- **Conversion rate:** +5-10% improvement from better UX
- **Customer satisfaction:** Increased accessibility leads to higher retention

### Competitive Advantage
- Demonstrate leadership in inclusive design
- Meet enterprise client accessibility requirements
- Qualify for government/education contracts
- Build trust with disability community

---

## Timeline & Next Steps

### Week 1: Onboarding
1. Sign agreement and process payment
2. Grant access to sites for scanning
3. Schedule kickoff call with our accessibility team

### Week 2-4: Initial Audit & Remediation
1. Complete comprehensive WCAG 2.2 AA audit
2. Receive detailed report with prioritized recommendations
3. Access to our remediation dashboard
4. Begin implementing fixes (critical items first)

### Ongoing: Monitoring & Support
1. ${tier.reportingFrequency}
2. Continuous monitoring for new violations
3. ${tier.supportLevel}
4. Quarterly business reviews (Enterprise only)

---

## Why Choose WCAGAI?

- **AI-Powered Scanning:** Faster and more comprehensive than manual audits
- **Continuous Monitoring:** Catch issues before they become lawsuits
- **Actionable Insights:** Clear, prioritized recommendations
- **White-Label Reports:** Professional deliverables for your clients
- **Expert Support:** Real accessibility consultants, not just automated tools

---

## Investment Summary

| Item | Cost |
|------|------|
| ${tier.name} | $${tier.price}/month |
| Setup Fee | $0 |
| **Total** | **$${tier.price}/month** |

${data.recommendedTier === 'basic' ? '*One-time payment, no recurring fees*' : '*Monthly subscription, cancel anytime*'}

---

## Ready to Get Started?

We're committed to making the web more accessible. Let's work together to ensure your digital properties meet WCAG 2.2 AA standards and provide an excellent experience for all users.

**Next Step:** Reply to this proposal to schedule your onboarding call, or visit our portal to sign up immediately.

---

*This proposal is valid for 30 days from the date above.*
  `.trim();
}

/**
 * Generate HTML proposal for email
 */
export function generateHTMLProposal(data: ProposalData): string {
  const markdown = generateProposal(data);
  
  // Simple markdown to HTML conversion
  let html = markdown
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^\*\*(.*)\*\*/gm, '<strong>$1</strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^⚠️/gm, '⚠️');
  
  // Wrap lists
  html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #1f2937;
    }
    h1 { color: #2563eb; font-size: 28px; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; font-size: 22px; margin-top: 30px; }
    h3 { color: #374151; font-size: 18px; }
    ul { padding-left: 20px; }
    li { margin: 5px 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
  </style>
</head>
<body>
  ${html}
</body>
</html>
  `.trim();
}

/**
 * Determine recommended tier based on violation data
 */
export function recommendTier(
  violationCount: number,
  criticalViolations: number,
  needsMonitoring: boolean = false
): 'basic' | 'pro' | 'enterprise' {
  // Enterprise for high-volume or complex needs
  if (violationCount > 50 || needsMonitoring) {
    return 'enterprise';
  }
  
  // Pro for ongoing monitoring needs
  if (criticalViolations > 5 || violationCount > 20) {
    return 'pro';
  }
  
  // Basic for simple, one-time scans
  return 'basic';
}
