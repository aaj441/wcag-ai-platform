/**
 * Fintech Test Data - Realistic Financial Services Companies
 * Testing WCAG compliance for banking, payments, and financial platforms
 */

import { EmailDraft, LegacyViolation, ConsultantProfile } from '../types';
import { EmailDraft, LegacyViolation, Consultant } from '../types';

// ============================================================================
// FINTECH-SPECIFIC WCAG VIOLATIONS
// ============================================================================

export const fintechViolations: LegacyViolation[] = [
  {
    id: 'fintech-v1',
    url: 'https://payment-processor.com/checkout',
    pageTitle: 'Checkout - Payment Processor',
    element: 'input[type="number"].cvv-input',
    wcagCriteria: '3.3.2',
    wcagLevel: 'A',
    severity: 'critical',
    description: 'CVV security code input field lacks visible label. Only placeholder text "CVV" is shown, which disappears when field is focused. This is a critical security and accessibility issue for payment forms.',
    recommendation: 'Add permanent <label for="cvv">Security Code (CVV)</label> element. Include help text: "3-digit code on back of card" with proper ARIA description. Keep placeholder as additional hint.',
    technicalDetails: 'Missing <label> element. Using placeholder-only creates confusion for screen readers and users with cognitive disabilities during financial transactions.',
    codeSnippet: '<input type="number" class="cvv-input" name="cvv" placeholder="CVV" maxlength="3" />',
    affectedUsers: 'Blind users (2.3%), users with cognitive disabilities (15%), elderly users completing financial transactions',
    priority: 1,
    screenshot: 'https://placeholder.co/400x300/333/FFF?text=CVV+Input+Missing+Label',
  },
  {
    id: 'fintech-v2',
    url: 'https://banking-app.com/transfer',
    pageTitle: 'Transfer Funds - Banking App',
    element: 'button.confirm-transfer',
    wcagCriteria: '1.4.3',
    wcagLevel: 'AA',
    severity: 'critical',
    description: 'Primary "Confirm Transfer" button has insufficient color contrast (3.1:1). Button uses light gray text (#999) on white background. For financial transactions, this is both a usability and legal compliance issue.',
    recommendation: 'Increase contrast to minimum 4.5:1. Recommended: Use #0066CC (blue) background with #FFFFFF (white) text for 8.2:1 contrast ratio. Add visual focus indicator for keyboard users.',
    technicalDetails: 'Current: #999999 on #FFFFFF = 3.1:1 contrast. WCAG AA requires 4.5:1 minimum. Financial action buttons should exceed minimum standards.',
    codeSnippet: '<button class="confirm-transfer" style="color: #999; background: #fff;">Confirm Transfer $5,000</button>',
    affectedUsers: 'Users with low vision (8%), color blindness (8% of males), elderly users (20% over 65)',
    priority: 1,
  },
  {
    id: 'fintech-v3',
    url: 'https://investment-platform.com/portfolio',
    pageTitle: 'Portfolio Dashboard - Investment Platform',
    element: 'canvas#stock-chart',
    wcagCriteria: '1.1.1',
    wcagLevel: 'A',
    severity: 'high',
    description: 'Interactive stock price chart rendered in <canvas> without text alternative or data table. Screen readers cannot access investment performance data, violating financial accessibility regulations.',
    recommendation: 'Add aria-label with summary. Provide <table> with same data below chart or in expandable section. Include alt text: "Stock performance chart showing AAPL up 15% YTD with 52-week range $120-$180"',
    technicalDetails: 'Canvas element has no fallback content. Missing role="img" and aria-describedby attributes.',
    codeSnippet: '<canvas id="stock-chart" width="800" height="400"></canvas>',
    affectedUsers: 'Blind investors using screen readers, users with visual impairments, regulatory compliance requirement',
    priority: 2,
  },
  {
    id: 'fintech-v4',
    url: 'https://crypto-exchange.com/trade',
    pageTitle: 'Trading Dashboard - Crypto Exchange',
    element: 'div.price-alert',
    wcagCriteria: '4.1.3',
    wcagLevel: 'AA',
    severity: 'high',
    description: 'Real-time price alerts and notifications are not announced to screen readers. Critical for traders who rely on assistive technology to receive time-sensitive market updates.',
    recommendation: 'Implement aria-live="assertive" for critical price alerts. Use role="status" for non-critical updates. Add audio notification option with user control.',
    technicalDetails: 'Missing ARIA live region attributes. Dynamic content updates without screen reader notification.',
    codeSnippet: '<div class="price-alert">BTC reached $45,000!</div>',
    affectedUsers: 'Blind traders, users with visual impairments managing investments',
    priority: 2,
  },
  {
    id: 'fintech-v5',
    url: 'https://lending-platform.com/application',
    pageTitle: 'Loan Application - Lending Platform',
    element: 'form#loan-application',
    wcagCriteria: '3.3.3',
    wcagLevel: 'AA',
    severity: 'high',
    description: 'Loan application form validation errors appear only as red border around fields without descriptive error messages. Users cannot identify what corrections are needed for financial application.',
    recommendation: 'Add explicit error messages: "Social Security Number must be 9 digits". Use aria-describedby to link errors to fields. Display errors in text, not just color. Include error summary at top of form.',
    technicalDetails: 'Form validation relies solely on visual cues (red borders). Missing aria-invalid and aria-describedby attributes.',
    codeSnippet: '<input type="text" class="error" name="ssn" style="border: 2px solid red;" />',
    affectedUsers: 'All users completing financial applications, especially those with visual or cognitive disabilities',
    priority: 2,
  },
  {
    id: 'fintech-v6',
    url: 'https://payment-processor.com/subscription',
    pageTitle: 'Subscription Management - Payment Processor',
    element: 'button.cancel-subscription',
    wcagCriteria: '2.1.1',
    wcagLevel: 'A',
    severity: 'medium',
    description: 'Cancel subscription action requires mouse click on custom JavaScript button. Keyboard users cannot cancel subscriptions, creating potential legal issues for recurring payments.',
    recommendation: 'Ensure button is accessible via keyboard (Tab key to focus, Enter/Space to activate). Add visible focus indicator. Test with keyboard-only navigation.',
    technicalDetails: 'Custom div with onclick handler instead of semantic button. Missing tabindex and keyboard event handlers.',
    codeSnippet: '<div class="cancel-subscription" onclick="cancelSub()">Cancel</div>',
    affectedUsers: 'Keyboard-only users (15%), users with motor disabilities, users managing financial subscriptions',
    priority: 3,
  },
  {
    id: 'fintech-v7',
    url: 'https://banking-app.com/statements',
    pageTitle: 'Account Statements - Banking App',
    element: 'table.transactions',
    wcagCriteria: '1.3.1',
    wcagLevel: 'A',
    severity: 'medium',
    description: 'Transaction history table missing proper header associations. Screen readers cannot determine which column headers correspond to transaction amounts, dates, and descriptions.',
    recommendation: 'Add <th scope="col"> for column headers. Include <caption> for table: "Transaction History - Last 30 Days". Use scope="row" for date columns if needed.',
    technicalDetails: 'Table uses <div> instead of proper <th> elements. Missing scope attributes and caption.',
    codeSnippet: '<table class="transactions"><tr><div>Date</div><div>Amount</div></tr></table>',
    affectedUsers: 'Screen reader users reviewing financial transactions and statements',
    priority: 3,
  },
  {
    id: 'fintech-v8',
    url: 'https://investment-platform.com/research',
    pageTitle: 'Research Reports - Investment Platform',
    element: 'a.pdf-download',
    wcagCriteria: '2.4.4',
    wcagLevel: 'A',
    severity: 'medium',
    description: 'PDF financial report download links use generic "Download" text without indicating file type or report name. Users cannot distinguish between different investment reports.',
    recommendation: 'Use descriptive link text: "Download Q4 2024 Earnings Report (PDF, 2.5MB)". Add aria-label if link text must remain short. Include file format and size.',
    technicalDetails: 'Link text is generic "Download" repeated for multiple reports. Missing aria-label or descriptive text.',
    codeSnippet: '<a href="report.pdf" class="pdf-download">Download</a>',
    affectedUsers: 'All users downloading financial documents, especially screen reader users',
    priority: 3,
  },
  {
    id: 'fintech-v9',
    url: 'https://crypto-exchange.com/wallet',
    pageTitle: 'Wallet Management - Crypto Exchange',
    element: 'input.wallet-address',
    wcagCriteria: '1.4.13',
    wcagLevel: 'AA',
    severity: 'low',
    description: 'Cryptocurrency wallet address input field crops long addresses without horizontal scroll or text wrapping. Users cannot verify complete wallet address before transfers.',
    recommendation: 'Allow text wrapping or horizontal scroll. Use word-break CSS property. Add "Show Full Address" button. Ensure users can verify complete address for security.',
    technicalDetails: 'Fixed width input with overflow:hidden. Long crypto addresses are partially hidden.',
    codeSnippet: '<input type="text" class="wallet-address" style="width: 200px; overflow: hidden;" />',
    affectedUsers: 'All users entering cryptocurrency addresses, especially on mobile devices',
    priority: 4,
  },
  {
    id: 'fintech-v10',
    url: 'https://lending-platform.com/dashboard',
    pageTitle: 'Loan Dashboard - Lending Platform',
    element: 'div.status-indicator',
    wcagCriteria: '1.4.1',
    wcagLevel: 'A',
    severity: 'low',
    description: 'Loan approval status indicated only by color (green = approved, red = denied). Color blind users cannot distinguish loan status, critical for financial decisions.',
    recommendation: 'Add text labels: "Approved" or "Denied". Use icons alongside color (✓ checkmark, ✗ cross). Ensure status is communicated through multiple methods, not color alone.',
    technicalDetails: 'Status div uses background-color only. Missing text content and ARIA labels.',
    codeSnippet: '<div class="status-indicator" style="background: green;"></div>',
    affectedUsers: 'Color blind users (8% of males), users with visual impairments',
    priority: 4,
  },
];

// ============================================================================
// FINTECH COMPANIES - Email Drafts
// ============================================================================

export const fintechEmailDrafts: EmailDraft[] = [
  {
    id: 'fintech-draft1',
    recipient: 'compliance@stripe-corp.com',
    recipientName: 'Sarah Chen',
    company: 'Stripe Corporation',
    subject: 'Critical WCAG Compliance Issues on Payment Checkout Flow',
    body: `Dear Sarah,

I hope this email finds you well. I'm reaching out regarding a recent WCAG accessibility audit of Stripe's payment checkout interface.

Our analysis has identified several critical accessibility violations that could impact your compliance with ADA, Section 508, and international financial accessibility regulations.

🚨 CRITICAL FINDINGS:

1. **CVV Input Field** (WCAG 3.3.2 - Critical)
   - Missing visible labels on security code input
   - Impacts: Users completing financial transactions
   - Risk: Potential ADA lawsuits, customer loss
   - Fix Time: ~2 hours

2. **Confirm Payment Button** (WCAG 1.4.3 - Critical)
   - Insufficient color contrast (3.1:1)
   - Impacts: 8% of users with visual impairments
   - Risk: Failed transactions, accessibility complaints
   - Fix Time: ~1 hour

3. **Form Validation** (WCAG 3.3.3 - High)
   - Error messages not accessible to screen readers
   - Impacts: Users unable to correct payment errors
   - Fix Time: ~3 hours

📊 IMPACT ANALYSIS:
• Affects approximately 15-20% of your user base
• Potential violation of payment card industry (PCI) accessibility requirements
• Risk of legal action under ADA Title III
• Estimated revenue impact from failed transactions: Significant

✅ REMEDIATION PLAN:
We've prepared a prioritized fix list with code examples and testing procedures. Most issues can be resolved within one sprint cycle (2-4 hours development time).

The detailed report includes:
- Specific WCAG criteria violations
- Code snippets showing current vs. corrected implementation
- Testing procedures with screen readers
- Compliance documentation for audit trails

Would you be available for a 20-minute call this week to discuss our findings and remediation strategy? Given the financial nature of your platform, addressing these issues promptly is critical.

Best regards,
WCAG AI Platform Team

P.S. We're offering a complimentary follow-up scan after remediation to verify compliance.`,
    violations: [
      fintechViolations[0], // CVV input
      fintechViolations[1], // Confirm button
      fintechViolations[4], // Form validation
    ],
    createdAt: new Date('2025-11-11T09:00:00'),
    updatedAt: new Date('2025-11-11T09:00:00'),
    status: 'pending_review',
    notes: 'High-value prospect. Major payment processor with significant transaction volume. Compliance is critical.',
    tags: ['fintech', 'payments', 'critical', 'compliance'],
  },
  {
    id: 'fintech-draft2',
    recipient: 'accessibility@robinhood.com',
    recipientName: 'Michael Torres',
    company: 'Robinhood Markets Inc',
    subject: 'Investment Platform Accessibility Audit - Regulatory Compliance Issues',
    body: `Hi Michael,

Following our conversation at the FinTech Accessibility Summit, I wanted to share the audit results for Robinhood's trading platform.

Our automated WCAG scanning identified several accessibility barriers that could impact your compliance with SEC accessibility guidelines and ADA requirements for financial services.

🎯 KEY FINDINGS:

1. **Stock Charts** (WCAG 1.1.1 - High Priority)
   - Canvas-based charts lack text alternatives
   - Screen reader users cannot access investment data
   - Regulatory risk: SEC requires accessible financial data

2. **Real-time Price Alerts** (WCAG 4.1.3 - High Priority)
   - Notifications not announced to assistive technology
   - Critical for traders with disabilities
   - Impacts time-sensitive trading decisions

3. **Transaction Table** (WCAG 1.3.1 - Medium Priority)
   - Missing proper header associations
   - Users cannot review trade history effectively

📈 BUSINESS IMPACT:
• Approximately 26% of US adults have disabilities (CDC)
• Investment platforms must be accessible under ADA
• Recent lawsuits against financial platforms: $500K+ settlements
• Competitive advantage: Accessible platforms increase user base

💡 SOLUTIONS:
All identified issues have straightforward fixes:
- Add data table alternatives for charts
- Implement ARIA live regions for alerts
- Proper semantic HTML for transaction tables
- Estimated effort: 1-2 week sprint

The detailed report includes specific code examples, ARIA patterns for financial applications, and testing procedures with NVDA/JAWS screen readers.

Can we schedule 30 minutes to walk through the findings and discuss your remediation timeline?

Thanks for your commitment to accessibility!

Best,
WCAG AI Platform Team`,
    violations: [
      fintechViolations[2], // Stock charts
      fintechViolations[3], // Price alerts
      fintechViolations[6], // Transaction table
    ],
    createdAt: new Date('2025-11-10T14:00:00'),
    updatedAt: new Date('2025-11-10T14:00:00'),
    status: 'pending_review',
    notes: 'Met contact at conference. Very interested in accessibility. SEC compliance is major concern.',
    tags: ['fintech', 'investment', 'regulatory', 'high-value'],
  },
  {
    id: 'fintech-draft3',
    recipient: 'cto@coinbase.com',
    recipientName: 'Jennifer Park',
    company: 'Coinbase Global Inc',
    subject: 'Crypto Trading Platform WCAG Audit - Accessibility Gaps Identified',
    body: `Dear Jennifer,

I'm reaching out regarding accessibility compliance for Coinbase's cryptocurrency trading platform.

Our WCAG 2.1 AA audit revealed several barriers affecting users with disabilities in your trading interface and wallet management features.

🔍 FINDINGS SUMMARY:

HIGH PRIORITY:
• Real-time price notifications not accessible to screen readers
• Wallet address input fields crop long addresses
• Trading buttons inaccessible via keyboard

MEDIUM PRIORITY:
• Chart data lacks text alternatives
• Status indicators rely only on color

⚖️ REGULATORY CONSIDERATIONS:
• ADA Title III applies to cryptocurrency exchanges
• Recent DOJ guidance includes digital financial services
• State-level digital accessibility laws expanding
• International markets (EU) require WCAG compliance

📊 USER IMPACT:
Estimated 15-20% of crypto traders have accessibility needs:
- Visual impairments
- Motor disabilities (keyboard-only navigation)
- Cognitive disabilities

🛠️ RECOMMENDED ACTIONS:
1. Implement ARIA live regions for price updates
2. Add keyboard navigation to all trading functions
3. Provide text alternatives for wallet address validation
4. Ensure color is not sole indicator of transaction status

Timeline: Most fixes achievable in 2-3 sprints
Cost: Minimal compared to potential legal exposure

I've attached a detailed report with:
✓ WCAG criteria violations
✓ Code remediation examples
✓ Testing procedures
✓ Compliance documentation

Would you like to schedule a technical review with your development team?

Best regards,
WCAG AI Team`,
    violations: [
      fintechViolations[3], // Price alerts
      fintechViolations[5], // Keyboard access
      fintechViolations[8], // Wallet address
      fintechViolations[9], // Status indicators
    ],
    createdAt: new Date('2025-11-09T11:30:00'),
    updatedAt: new Date('2025-11-09T11:30:00'),
    status: 'draft',
    notes: 'Crypto exchange. Growing regulatory pressure. Good opportunity for long-term engagement.',
    tags: ['crypto', 'fintech', 'trading'],
  },
  {
    id: 'fintech-draft4',
    recipient: 'product@sofi.com',
    recipientName: 'David Liu',
    company: 'SoFi Technologies',
    subject: 'Personal Finance Platform Accessibility Review Results',
    body: `Hi David,

Thanks for requesting our accessibility audit of SoFi's personal finance platform.

EXECUTIVE SUMMARY:
We identified 6 WCAG violations across your loan application, investment tools, and account management interfaces. Good news: Most are quick fixes!

PRIORITY ITEMS:

1. Loan Application Form (WCAG 3.3.3)
   ⚠️ Validation errors not descriptive
   📍 Impact: Users cannot complete applications
   ⏱️ Fix: 2-3 hours

2. PDF Documents (WCAG 2.4.4)
   ⚠️ Generic "Download" link text
   📍 Impact: Users cannot identify reports
   ⏱️ Fix: 1 hour

3. Subscription Management (WCAG 2.1.1)
   ⚠️ Cancel button not keyboard accessible
   📍 Impact: Legal risk for recurring charges
   ⏱️ Fix: 1 hour

STRENGTHS OBSERVED:
✓ Good semantic HTML structure
✓ Responsive design works well
✓ Clear navigation hierarchy

RECOMMENDATIONS:
• Add explicit form error messages with aria-describedby
• Update download links with descriptive text
• Ensure all interactive elements are keyboard accessible
• Consider accessibility testing in QA process

ROI:
- Improved conversion rates (accessible forms)
- Reduced customer support calls
- Compliance with federal regulations
- Expanded addressable market

Next Steps:
1. Review detailed report (attached)
2. Schedule technical walkthrough with dev team
3. Implement fixes in priority order
4. Request validation scan

Let me know when you'd like to discuss!

Thanks,
WCAG Team`,
    violations: [
      fintechViolations[4], // Form validation
      fintechViolations[5], // Keyboard access
      fintechViolations[7], // PDF links
    ],
    createdAt: new Date('2025-11-11T08:00:00'),
    updatedAt: new Date('2025-11-11T08:00:00'),
    status: 'approved',
    approvedBy: 'admin@wcag-ai.com',
    approvedAt: new Date('2025-11-11T08:30:00'),
    notes: 'Requested audit. Very responsive. Good candidate for ongoing accessibility partnership.',
    tags: ['fintech', 'lending', 'personal-finance'],
  },
  {
    id: 'fintech-draft5',
    recipient: 'engineering@plaid.com',
    recipientName: 'Amanda Rodriguez',
    company: 'Plaid Inc',
    subject: 'Financial Data Platform - Critical Accessibility Issues Found',
    body: `Dear Amanda,

Our WCAG audit of Plaid's financial account linking interface has identified several critical accessibility barriers.

As a platform that connects to bank accounts for millions of users, ensuring accessibility is both a legal requirement and business imperative.

CRITICAL ISSUES:

1. Account Selection (WCAG 2.1.1 & 4.1.2)
   - Custom bank selection UI not keyboard accessible
   - Screen readers cannot identify account options
   - Users with disabilities cannot link accounts

2. Authentication Flow (WCAG 3.3.2)
   - MFA input fields lack proper labels
   - Security implications for users with disabilities

3. Error Handling (WCAG 3.3.3)
   - Connection errors not clearly announced
   - Users cannot troubleshoot failed connections

REGULATORY CONTEXT:
• ADA applies to financial technology services
• CFPB guidance on accessible banking technology
• Potential liability for partner institutions
• Growing litigation in fintech space

IMPACT:
- 61 million US adults with disabilities (26%)
- Many are banking customers requiring accessible interfaces
- Partner banks rely on your accessibility compliance

SOLUTION:
We've documented specific fixes with code examples:
✓ Keyboard navigation patterns for custom UI
✓ Proper ARIA roles for account selection
✓ Accessible error messaging
✓ Screen reader testing procedures

Timeline: 1-2 sprints to address all issues
Risk mitigation: Significant reduction in legal exposure

Can we schedule a call to discuss integration with your development roadmap?

Best regards,
WCAG AI Platform Team`,
    violations: [
      fintechViolations[0], // Input labels
      fintechViolations[4], // Error handling
      fintechViolations[5], // Keyboard access
    ],
    createdAt: new Date('2025-11-08T15:00:00'),
    updatedAt: new Date('2025-11-08T15:00:00'),
    status: 'sent',
    approvedBy: 'admin@wcag-ai.com',
    approvedAt: new Date('2025-11-08T15:30:00'),
    notes: 'Infrastructure provider. High impact. Already sent, awaiting response.',
    tags: ['fintech', 'infrastructure', 'banking'],
  },
];

// ============================================================================
// FINTECH CONSULTANTS
// ============================================================================

export const fintechConsultants: any[] = [
  {
    id: 'fc1',
    name: 'Sarah Chen',
    email: 'compliance@stripe-corp.com',
    company: 'Stripe Corporation',
    website: 'https://stripe.com',
    phone: '+1 (415) 555-0123',
    hubspotContactId: 'hs-fintech-001',
    lastContacted: new Date('2025-11-11'),
    responseRate: 0.85,
  },
  {
    id: 'fc2',
    name: 'Michael Torres',
    email: 'accessibility@robinhood.com',
    company: 'Robinhood Markets Inc',
    website: 'https://robinhood.com',
    phone: '+1 (650) 555-0456',
    hubspotContactId: 'hs-fintech-002',
    lastContacted: new Date('2025-11-10'),
    responseRate: 0.70,
  },
  {
    id: 'fc3',
    name: 'Jennifer Park',
    email: 'cto@coinbase.com',
    company: 'Coinbase Global Inc',
    website: 'https://coinbase.com',
    phone: '+1 (415) 555-0789',
    hubspotContactId: 'hs-fintech-003',
    lastContacted: new Date('2025-11-09'),
    responseRate: 0.75,
  },
  {
    id: 'fc4',
    name: 'David Liu',
    email: 'product@sofi.com',
    company: 'SoFi Technologies',
    website: 'https://sofi.com',
    phone: '+1 (415) 555-0321',
    hubspotContactId: 'hs-fintech-004',
    lastContacted: new Date('2025-11-11'),
    responseRate: 0.90,
  },
  {
    id: 'fc5',
    name: 'Amanda Rodriguez',
    email: 'engineering@plaid.com',
    company: 'Plaid Inc',
    website: 'https://plaid.com',
    phone: '+1 (415) 555-0654',
    hubspotContactId: 'hs-fintech-005',
    lastContacted: new Date('2025-11-08'),
    responseRate: 0.65,
  },
];
