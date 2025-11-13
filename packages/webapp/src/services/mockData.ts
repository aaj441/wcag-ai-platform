/**
 * Mock Data Service - The Foundation Stones
 * Provides demonstration data for the complete workflow
 */

import { EmailDraft, Violation, Consultant } from '../types';

// ============================================================================
// MOCK VIOLATIONS - The Challenges
// ============================================================================

export const mockViolations: Violation[] = [
  {
    id: 'v1',
    url: 'https://example-client.com/homepage',
    pageTitle: 'Homepage - Example Client',
    element: 'button.primary-cta',
    wcagCriteria: '1.4.3',
    wcagLevel: 'AA',
    severity: 'critical',
    description: 'Primary call-to-action button has insufficient color contrast (2.8:1). WCAG AA requires minimum 4.5:1 for normal text.',
    recommendation: 'Increase contrast by darkening button text or lightening background. Suggested: Use #FFFFFF text on #0066CC background for 7.5:1 contrast.',
    technicalDetails: 'Current colors: foreground #777777, background #CCCCCC',
    codeSnippet: '<button class="primary-cta">Sign Up Now</button>',
    affectedUsers: 'Users with low vision, color blindness (approx. 8% of male users)',
    priority: 1,
    screenshot: 'https://placeholder.co/400x300/333/FFF?text=Button+Contrast+Issue',
  },
  {
    id: 'v2',
    url: 'https://example-client.com/homepage',
    pageTitle: 'Homepage - Example Client',
    element: 'img.hero-image',
    wcagCriteria: '1.1.1',
    wcagLevel: 'A',
    severity: 'high',
    description: 'Hero image missing alternative text. Screen readers cannot describe this content to visually impaired users.',
    recommendation: 'Add descriptive alt attribute: alt="Team collaboration meeting showing diverse professionals working together on accessibility solutions"',
    technicalDetails: 'Element has empty alt="" or missing alt attribute entirely',
    codeSnippet: '<img src="hero.jpg" class="hero-image" />',
    affectedUsers: 'Blind users relying on screen readers (approx. 2.3% of population)',
    priority: 2,
  },
  {
    id: 'v3',
    url: 'https://example-client.com/contact',
    pageTitle: 'Contact Us - Example Client',
    element: 'form#contact-form input',
    wcagCriteria: '3.3.2',
    wcagLevel: 'A',
    severity: 'medium',
    description: 'Form inputs lack visible labels. Only placeholder text is present, which disappears on focus.',
    recommendation: 'Add permanent <label> elements associated with inputs via for/id attributes. Keep placeholder as additional hint.',
    technicalDetails: 'Missing <label> elements or aria-label attributes',
    codeSnippet: '<input type="text" name="name" placeholder="Your name" />',
    affectedUsers: 'Users with cognitive disabilities, screen reader users',
    priority: 3,
  },
  {
    id: 'v4',
    url: 'https://example-client.com/navigation',
    pageTitle: 'Main Navigation - Example Client',
    element: 'nav.main-menu a',
    wcagCriteria: '2.1.1',
    wcagLevel: 'A',
    severity: 'high',
    description: 'Dropdown navigation menu cannot be accessed via keyboard. Tab key skips over submenu items.',
    recommendation: 'Implement proper keyboard navigation with arrow keys. Ensure Enter/Space opens submenus and Escape closes them.',
    technicalDetails: 'Missing keyboard event handlers and ARIA attributes',
    codeSnippet: '<nav class="main-menu"><div onclick="showMenu()">...</div></nav>',
    affectedUsers: 'Keyboard-only users, motor disability users (approx. 15% of users)',
    priority: 2,
  },
  {
    id: 'v5',
    url: 'https://example-client.com/products',
    pageTitle: 'Products - Example Client',
    element: 'div.product-card',
    wcagCriteria: '4.1.2',
    wcagLevel: 'A',
    severity: 'medium',
    description: 'Custom checkbox elements lack proper ARIA roles and states. Screen readers announce them as generic divs.',
    recommendation: 'Add role="checkbox", aria-checked attribute, and handle spacebar activation. Or use native <input type="checkbox"> with custom styling.',
    technicalDetails: 'Using <div> elements styled to look like checkboxes',
    codeSnippet: '<div class="custom-checkbox" onclick="toggle()"></div>',
    affectedUsers: 'Screen reader users, assistive technology users',
    priority: 3,
  },
  {
    id: 'v6',
    url: 'https://example-client.com/articles',
    pageTitle: 'Articles - Example Client',
    element: 'div.content',
    wcagCriteria: '1.3.1',
    wcagLevel: 'A',
    severity: 'low',
    description: 'Content structure uses visual styling instead of semantic HTML headings. No proper heading hierarchy (h1, h2, h3).',
    recommendation: 'Replace <div class="heading"> with proper <h1>, <h2>, <h3> elements. Use CSS for styling while maintaining semantic structure.',
    technicalDetails: 'Using <div class="heading-large"> instead of <h2>',
    codeSnippet: '<div class="heading-large">Section Title</div>',
    affectedUsers: 'Screen reader users navigating by headings, SEO impact',
    priority: 4,
  },
];

// ============================================================================
// MOCK EMAIL DRAFTS - The Communications
// ============================================================================

export const mockEmailDrafts: EmailDraft[] = [
  {
    id: 'draft1',
    recipient: 'sarah.johnson@techcorp.com',
    recipientName: 'Sarah Johnson',
    company: 'TechCorp Solutions',
    subject: 'Critical Accessibility Issues Found on TechCorp Homepage',
    body: `Dear Sarah,

I hope this email finds you well. I'm reaching out regarding a recent WCAG accessibility audit of the TechCorp Solutions website.

Our automated scanning tool has identified 6 accessibility violations that could impact user experience and legal compliance. The most critical issue involves color contrast on your primary call-to-action buttons, which affects approximately 8% of your users.

Key findings:
• 2 Critical severity issues requiring immediate attention
• 2 High severity issues affecting keyboard navigation
• 2 Medium/Low issues for comprehensive compliance

I've attached a detailed report with:
✓ Specific WCAG criteria violations
✓ Code examples and technical details
✓ Step-by-step remediation guidance
✓ Impact analysis for affected users

These issues are typically quick to resolve (2-4 hours) and can significantly improve your site's accessibility and user experience.

Would you be available for a 15-minute call this week to discuss the findings and remediation strategy?

Best regards,
WCAG AI Platform Team`,
    violations: mockViolations,
    createdAt: new Date('2025-11-10T10:00:00'),
    updatedAt: new Date('2025-11-10T10:00:00'),
    status: 'pending_review',
    notes: 'High-priority prospect. Company has 50+ employees and recent funding.',
    tags: ['high-value', 'tech-sector', 'warm-lead'],
      keywords: ['contrast', 'cta', 'accessibility', 'wcag'],
  },
  {
    id: 'draft2',
    recipient: 'michael.chen@designstudio.io',
    recipientName: 'Michael Chen',
    company: 'Creative Design Studio',
    subject: 'Website Accessibility Audit Results - Action Required',
    body: `Hi Michael,

Following our conversation about accessibility compliance, I wanted to share the audit results for designstudio.io.

Our analysis revealed several opportunities to improve accessibility and reach a wider audience. As a design-focused company, this is especially important for your brand reputation.

Top Priority Items:
1. Navigation menu keyboard accessibility
2. Form label clarity and structure
3. Image alternative text for portfolio items

The good news: most of these are straightforward fixes that align with modern web standards. I've prepared a prioritized remediation plan that fits within typical design sprint cycles.

Can we schedule 20 minutes to walk through the findings?

Thanks,
WCAG Team`,
    violations: mockViolations.slice(2, 5),
    createdAt: new Date('2025-11-09T14:30:00'),
    updatedAt: new Date('2025-11-09T14:30:00'),
    status: 'draft',
    tags: ['design-agency', 'follow-up'],
    keywords: ['navigation', 'form', 'alt-text'],
  },
  {
    id: 'draft3',
    recipient: 'jennifer.williams@ecommerce-giant.com',
    recipientName: 'Jennifer Williams',
    company: 'E-commerce Giant Inc',
    subject: 'Your Website Accessibility Report is Ready',
    body: `Dear Jennifer,

Your website accessibility scan is complete. We've identified areas where improving accessibility could enhance user experience and potentially increase conversions.

Summary:
✓ 3 High-impact issues affecting 15% of users
✓ Quick fixes available for most violations
✓ Estimated 4-6 hours remediation time

Report includes code examples and testing tools.

Let me know if you'd like to review the findings together.

Best,
WCAG AI Platform`,
    violations: mockViolations.slice(1, 4),
    createdAt: new Date('2025-11-11T09:15:00'),
    updatedAt: new Date('2025-11-11T09:15:00'),
    status: 'approved',
    approvedBy: 'admin@wcag-ai.com',
    approvedAt: new Date('2025-11-11T09:45:00'),
    tags: ['ecommerce', 'enterprise'],
    keywords: ['form', 'labels', 'accessibility'],
  },
  {
    id: 'draft4',
    recipient: 'david.martinez@nonprofit.org',
    recipientName: 'David Martinez',
    company: 'Community Nonprofit Foundation',
    subject: 'Free Accessibility Audit Results for Nonprofit.org',
    body: `Hi David,

As part of our nonprofit outreach program, we've completed a complimentary accessibility audit for your website.

We found several areas where improving accessibility will help you serve more community members, especially those with disabilities.

Key Issues:
• Color contrast improvements needed
• Missing image descriptions
• Form accessibility enhancements

I've prepared a simple, actionable checklist you can share with your development team or volunteers.

Happy to answer any questions!

Community regards,
WCAG AI Team`,
    violations: mockViolations.slice(0, 3),
    createdAt: new Date('2025-11-08T16:00:00'),
    updatedAt: new Date('2025-11-08T16:00:00'),
    status: 'sent',
    approvedBy: 'admin@wcag-ai.com',
    approvedAt: new Date('2025-11-08T16:30:00'),
    tags: ['nonprofit', 'outreach'],
    keywords: ['contrast', 'images', 'forms'],
  },
];

// ============================================================================
// MOCK CONSULTANTS
// ============================================================================

export const mockConsultants: Consultant[] = [
  {
    id: 'c1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    company: 'TechCorp Solutions',
    website: 'https://techcorp.com',
    phone: '+1 (555) 123-4567',
    hubspotContactId: 'hs-001',
    lastContacted: new Date('2025-11-10'),
    responseRate: 0.75,
  },
  {
    id: 'c2',
    name: 'Michael Chen',
    email: 'michael.chen@designstudio.io',
    company: 'Creative Design Studio',
    website: 'https://designstudio.io',
    hubspotContactId: 'hs-002',
    lastContacted: new Date('2025-11-09'),
    responseRate: 0.60,
  },
  {
    id: 'c3',
    name: 'Jennifer Williams',
    email: 'jennifer.williams@ecommerce-giant.com',
    company: 'E-commerce Giant Inc',
    website: 'https://ecommerce-giant.com',
    phone: '+1 (555) 987-6543',
    hubspotContactId: 'hs-003',
    lastContacted: new Date('2025-11-11'),
    responseRate: 0.85,
  },
  {
    id: 'c4',
    name: 'David Martinez',
    email: 'david.martinez@nonprofit.org',
    company: 'Community Nonprofit Foundation',
    website: 'https://nonprofit.org',
    hubspotContactId: 'hs-004',
    lastContacted: new Date('2025-11-08'),
    responseRate: 0.40,
  },
];
