/**
 * In-Memory Data Store
 * Production would use PostgreSQL/MongoDB
 */

import { EmailDraft, LegacyViolation } from '../types';

// Mock violations database
export const violationsDB: LegacyViolation[] = [
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
];

// Mock email drafts database
export const emailDraftsDB: EmailDraft[] = [
  {
    id: 'draft1',
    recipient: 'sarah.johnson@techcorp.com',
    recipientName: 'Sarah Johnson',
    company: 'TechCorp Solutions',
    subject: 'Critical Accessibility Issues Found on TechCorp Homepage',
    body: `Dear Sarah,

I hope this email finds you well. I'm reaching out regarding a recent WCAG accessibility audit of the TechCorp Solutions website.

Our automated scanning tool has identified several accessibility violations that could impact user experience and legal compliance. The most critical issue involves color contrast on your primary call-to-action buttons, which affects approximately 8% of your users.

Key findings:
• 2 Critical severity issues requiring immediate attention
• Several High severity issues affecting keyboard navigation
• Medium/Low issues for comprehensive compliance

I've attached a detailed report with specific WCAG criteria violations, code examples, and step-by-step remediation guidance.

Would you be available for a 15-minute call this week to discuss the findings?

Best regards,
WCAG AI Platform Team`,
    violations: [violationsDB[0], violationsDB[1]],
    createdAt: new Date('2025-11-10T10:00:00'),
    updatedAt: new Date('2025-11-10T10:00:00'),
    status: 'pending_review',
    notes: 'High-priority prospect. Company has 50+ employees.',
    tags: ['high-value', 'tech-sector'],
    keywords: ['color contrast', 'text readability', 'visual', 'contrast ratio', 'alt text', 'non-text content', 'images', 'alternative text', 'screen reader', 'critical', 'high', 'WCAG AA', 'WCAG A', 'WCAG 1.4.3', 'WCAG 1.1.1', 'button', 'navigation', 'compliance', 'high-priority', 'legal-risk'],
  },
  {
    id: 'draft2',
    recipient: 'michael.chen@designstudio.io',
    recipientName: 'Michael Chen',
    company: 'Creative Design Studio',
    subject: 'Website Accessibility Audit Results',
    body: `Hi Michael,

Following our conversation about accessibility compliance, I wanted to share the audit results for designstudio.io.

Top Priority Items:
1. Form label clarity and structure
2. Image alternative text

Can we schedule 20 minutes to walk through the findings?

Thanks,
WCAG Team`,
    violations: [violationsDB[2]],
    createdAt: new Date('2025-11-09T14:30:00'),
    updatedAt: new Date('2025-11-09T14:30:00'),
    status: 'draft',
    tags: ['design-agency'],
    keywords: ['labels', 'instructions', 'form', 'input', 'medium', 'WCAG A', 'WCAG 3.3.2', 'accessibility', 'form-issues'],
  },
];

// Helper functions
export function getAllDrafts(): EmailDraft[] {
  return [...emailDraftsDB];
}

export function getDraftById(id: string): EmailDraft | undefined {
  return emailDraftsDB.find(d => d.id === id);
}

export function createDraft(draft: Omit<EmailDraft, 'id' | 'createdAt' | 'updatedAt'>): EmailDraft {
  const newDraft: EmailDraft = {
    ...draft,
    id: `draft${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  emailDraftsDB.push(newDraft);
  return newDraft;
}

export function updateDraft(id: string, updates: Partial<EmailDraft>): EmailDraft | null {
  const index = emailDraftsDB.findIndex(d => d.id === id);
  if (index === -1) return null;

  emailDraftsDB[index] = {
    ...emailDraftsDB[index],
    ...updates,
    updatedAt: new Date(),
  };
  return emailDraftsDB[index];
}

export function deleteDraft(id: string): boolean {
  const index = emailDraftsDB.findIndex(d => d.id === id);
  if (index === -1) return false;

  emailDraftsDB.splice(index, 1);
  return true;
}

export function getAllViolations(): LegacyViolation[] {
  return [...violationsDB];
}
