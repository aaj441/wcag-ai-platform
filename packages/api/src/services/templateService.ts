/**
 * Email Template Service
 * Handles keyword substitution and template generation
 */

import { LegacyViolation, ViolationSeverity } from '../types';
import { extractKeywordsFromViolations } from './keywordExtractor';

export interface TemplateContext {
  recipient_name?: string;
  company?: string;
  violation_type: string;
  wcag_criterion: string;
  impact_level: string;
  severity_level: string;
  total_violations: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  affected_users?: string;
  primary_issue?: string;
}

/**
 * Available template variables
 */
export const TEMPLATE_VARIABLES = [
  '{{recipient_name}}',
  '{{company}}',
  '{{violation_type}}',
  '{{wcag_criterion}}',
  '{{impact_level}}',
  '{{severity_level}}',
  '{{total_violations}}',
  '{{critical_count}}',
  '{{high_count}}',
  '{{medium_count}}',
  '{{low_count}}',
  '{{affected_users}}',
  '{{primary_issue}}',
];

/**
 * Build template context from violations
 */
export function buildTemplateContext(
  violations: LegacyViolation[],
  recipientName?: string,
  company?: string
): TemplateContext {
  const extracted = extractKeywordsFromViolations(violations);
  
  // Count violations by severity
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  for (const violation of violations) {
    severityCounts[violation.severity as ViolationSeverity]++;
  }
  
  // Get primary violation for context
  const primaryViolation = violations.sort((a, b) => a.priority - b.priority)[0];
  
  return {
    recipient_name: recipientName || 'there',
    company: company || 'your organization',
    violation_type: extracted.violationTypes[0] || 'accessibility-issues',
    wcag_criterion: primaryViolation?.wcagCriteria || 'multiple',
    impact_level: extracted.highestImpactLevel,
    severity_level: primaryViolation?.severity || 'medium',
    total_violations: violations.length,
    critical_count: severityCounts.critical,
    high_count: severityCounts.high,
    medium_count: severityCounts.medium,
    low_count: severityCounts.low,
    affected_users: primaryViolation?.affectedUsers,
    primary_issue: primaryViolation?.description,
  };
}

/**
 * Substitute template variables in text
 */
export function substituteTemplateVariables(
  template: string,
  context: TemplateContext
): string {
  let result = template;
  
  // Replace each variable
  result = result.replace(/\{\{recipient_name\}\}/g, context.recipient_name || 'there');
  result = result.replace(/\{\{company\}\}/g, context.company || 'your organization');
  result = result.replace(/\{\{violation_type\}\}/g, formatViolationType(context.violation_type));
  result = result.replace(/\{\{wcag_criterion\}\}/g, context.wcag_criterion);
  result = result.replace(/\{\{impact_level\}\}/g, formatImpactLevel(context.impact_level));
  result = result.replace(/\{\{severity_level\}\}/g, context.severity_level);
  result = result.replace(/\{\{total_violations\}\}/g, String(context.total_violations));
  result = result.replace(/\{\{critical_count\}\}/g, String(context.critical_count));
  result = result.replace(/\{\{high_count\}\}/g, String(context.high_count));
  result = result.replace(/\{\{medium_count\}\}/g, String(context.medium_count));
  result = result.replace(/\{\{low_count\}\}/g, String(context.low_count));
  result = result.replace(/\{\{affected_users\}\}/g, context.affected_users || 'users with disabilities');
  result = result.replace(/\{\{primary_issue\}\}/g, context.primary_issue || 'accessibility issues');
  
  return result;
}

/**
 * Format violation type for display
 */
function formatViolationType(type: string): string {
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format impact level for display
 */
function formatImpactLevel(level: string): string {
  return level
    .replace('-impact', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate email subject from template
 */
export function generateSubject(
  template: string | null,
  violations: LegacyViolation[],
  company?: string
): string {
  if (template) {
    const context = buildTemplateContext(violations, undefined, company);
    return substituteTemplateVariables(template, context);
  }
  
  // Default subject generation
  const extracted = extractKeywordsFromViolations(violations);
  const violationType = formatViolationType(extracted.violationTypes[0] || 'accessibility-issues');
  const severityText = extracted.highestImpactLevel.includes('critical') ? 'Critical' : 'Important';
  
  return `${severityText} ${violationType} Found${company ? ` - ${company}` : ''}`;
}

/**
 * Generate email body from template
 */
export function generateEmailBody(
  template: string | null,
  violations: LegacyViolation[],
  recipientName?: string,
  company?: string
): string {
  if (template) {
    const context = buildTemplateContext(violations, recipientName, company);
    return substituteTemplateVariables(template, context);
  }
  
  // Default body generation
  const context = buildTemplateContext(violations, recipientName, company);
  
  return `Dear ${context.recipient_name},

I hope this email finds you well. I'm reaching out regarding recent accessibility findings for ${context.company}.

Our WCAG compliance audit has identified ${context.total_violations} accessibility ${context.total_violations === 1 ? 'violation' : 'violations'} that require attention:

• ${context.critical_count} Critical severity issue${context.critical_count !== 1 ? 's' : ''}
• ${context.high_count} High severity issue${context.high_count !== 1 ? 's' : ''}
• ${context.medium_count} Medium severity issue${context.medium_count !== 1 ? 's' : ''}
• ${context.low_count} Low severity issue${context.low_count !== 1 ? 's' : ''}

The primary issue involves ${formatViolationType(context.violation_type)} (WCAG ${context.wcag_criterion}), which has a ${formatImpactLevel(context.impact_level)} on ${context.affected_users}.

I've attached a detailed report with specific recommendations and code examples to help your team address these issues efficiently.

Would you be available for a brief call this week to discuss the findings and remediation strategy?

Best regards,
WCAG AI Platform Team`;
}

/**
 * Default email templates
 */
export const EMAIL_TEMPLATES = {
  formal: {
    subject: '{{severity_level}} WCAG Accessibility Issues - {{company}}',
    body: `Dear {{recipient_name}},

Following our accessibility audit of {{company}}'s digital properties, we have identified {{total_violations}} WCAG violations requiring remediation.

Primary Concern: {{violation_type}} (WCAG {{wcag_criterion}})
Impact Level: {{impact_level}}
Affected Users: {{affected_users}}

Severity Breakdown:
• Critical: {{critical_count}}
• High: {{high_count}}
• Medium: {{medium_count}}
• Low: {{low_count}}

A comprehensive report with technical details and remediation steps is attached for your review.

We recommend scheduling a consultation to discuss implementation priorities and timelines.

Best regards,
WCAG AI Platform`,
  },
  
  friendly: {
    subject: 'Quick heads-up: {{violation_type}} issues at {{company}}',
    body: `Hi {{recipient_name}},

Hope you're doing well! I wanted to share some findings from our recent accessibility review of {{company}}.

We found {{total_violations}} items that need attention, with the main focus being {{violation_type}} (WCAG {{wcag_criterion}}). This has a {{impact_level}} and primarily affects {{affected_users}}.

Here's the breakdown:
✓ {{critical_count}} critical items
✓ {{high_count}} high priority
✓ {{medium_count}} medium priority
✓ {{low_count}} low priority

I've put together a detailed report with everything your team needs to fix these issues. 

Can we hop on a quick call this week to walk through it together?

Thanks!
WCAG AI Platform`,
  },
  
  urgent: {
    subject: '🚨 URGENT: Critical {{violation_type}} Issues - {{company}}',
    body: `URGENT ATTENTION REQUIRED

Dear {{recipient_name}},

Our audit has detected {{critical_count}} critical accessibility violations affecting {{company}}'s website that require immediate attention.

Primary Issue: {{violation_type}} (WCAG {{wcag_criterion}})
Severity: {{severity_level}}
Impact: {{impact_level}}
Affected Population: {{affected_users}}

These violations pose significant compliance risks and may impact user experience for individuals with disabilities.

Total violations detected:
• Critical: {{critical_count}}
• High: {{high_count}}
• Medium: {{medium_count}}
• Low: {{low_count}}

IMMEDIATE ACTIONS REQUIRED:
1. Review attached detailed report
2. Prioritize critical violations
3. Contact us within 24 hours to discuss remediation

Time is critical for both compliance and user experience.

WCAG AI Platform - Accessibility Compliance Team`,
  },
};

/**
 * Select appropriate template based on severity
 */
export function selectTemplate(violations: LegacyViolation[]): {
  subject: string;
  body: string;
} {
  const hasCritical = violations.some(v => v.severity === 'critical');
  const hasMultipleHigh = violations.filter(v => v.severity === 'high').length >= 3;
  
  if (hasCritical || hasMultipleHigh) {
    return EMAIL_TEMPLATES.urgent;
  }
  
  return EMAIL_TEMPLATES.formal;
}
