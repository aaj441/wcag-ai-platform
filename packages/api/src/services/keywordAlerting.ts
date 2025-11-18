/**
 * Keyword-Based Alerting Service
 * Triggers priority notifications based on specific keywords in email drafts
 */

import { randomUUID } from 'crypto';
import { EmailDraft } from '../types';
import { containsPriorityKeywords, getPriorityKeywords } from './keywordExtractor';

export interface Alert {
  id: string;
  draftId: string;
  type: 'priority' | 'critical' | 'warning';
  severity: 'high' | 'medium' | 'low';
  message: string;
  keywords: string[];
  createdAt: Date;
}

/**
 * Alert rules configuration
 */
const ALERT_RULES = {
  'lawsuit risk': {
    type: 'critical' as const,
    severity: 'high' as const,
    message: 'Draft contains legal liability keywords - requires immediate attention',
  },
  'legal liability': {
    type: 'critical' as const,
    severity: 'high' as const,
    message: 'Draft mentions legal liability - urgent review needed',
  },
  'critical severity': {
    type: 'priority' as const,
    severity: 'high' as const,
    message: 'Critical severity violations detected - prioritize for review',
  },
  'ada violation': {
    type: 'critical' as const,
    severity: 'high' as const,
    message: 'ADA compliance violation mentioned - high priority',
  },
  'wcag failure': {
    type: 'priority' as const,
    severity: 'medium' as const,
    message: 'WCAG compliance failure detected',
  },
  'compliance violation': {
    type: 'priority' as const,
    severity: 'medium' as const,
    message: 'Compliance violation keywords found',
  },
  'immediate attention': {
    type: 'priority' as const,
    severity: 'high' as const,
    message: 'Draft marked for immediate attention',
  },
  'high risk': {
    type: 'warning' as const,
    severity: 'medium' as const,
    message: 'High risk keywords detected - review recommended',
  },
  'accessibility barrier': {
    type: 'priority' as const,
    severity: 'medium' as const,
    message: 'Major accessibility barrier identified',
  },
  'blocking issue': {
    type: 'priority' as const,
    severity: 'high' as const,
    message: 'Blocking accessibility issue - requires prompt action',
  },
};

/**
 * Check if a draft should trigger an alert
 */
export function shouldTriggerAlert(draft: EmailDraft): boolean {
  const allKeywords = [
    ...(draft.keywords || []),
    ...(draft.keywordTags || []),
  ];
  
  return containsPriorityKeywords(allKeywords);
}

/**
 * Generate alerts for a draft based on keywords
 */
export function generateAlertsForDraft(draft: EmailDraft): Alert[] {
  const allKeywords = [
    ...(draft.keywords || []),
    ...(draft.keywordTags || []),
  ];
  
  const priorityKeywords = getPriorityKeywords(allKeywords);
  const alerts: Alert[] = [];
  
  for (const keyword of priorityKeywords) {
    const keywordLower = keyword.toLowerCase();
    
    // Check if any alert rule matches this keyword
    for (const [ruleKeyword, config] of Object.entries(ALERT_RULES)) {
      if (keywordLower.includes(ruleKeyword.toLowerCase())) {
        alerts.push({
          id: `alert-${draft.id}-${randomUUID()}`,
          draftId: draft.id,
          type: config.type,
          severity: config.severity,
          message: config.message,
          keywords: [keyword],
          createdAt: new Date(),
        });
      }
    }
  }
  
  // Check for critical violations in the draft
  if (draft.violations) {
    const criticalCount = draft.violations.filter(v => v.severity === 'critical').length;
    if (criticalCount > 0) {
      alerts.push({
        id: `alert-${draft.id}-critical-${Date.now()}`,
        draftId: draft.id,
        type: 'critical',
        severity: 'high',
        message: `${criticalCount} critical severity violation(s) found - immediate review required`,
        keywords: ['critical'],
        createdAt: new Date(),
      });
    }
  }
  
  return alerts;
}

/**
 * Get alert priority score for sorting
 */
export function getAlertPriorityScore(alert: Alert): number {
  let score = 0;
  
  // Type scoring
  if (alert.type === 'critical') score += 100;
  else if (alert.type === 'priority') score += 50;
  else if (alert.type === 'warning') score += 25;
  
  // Severity scoring
  if (alert.severity === 'high') score += 10;
  else if (alert.severity === 'medium') score += 5;
  else if (alert.severity === 'low') score += 1;
  
  return score;
}

/**
 * Sort alerts by priority
 */
export function sortAlertsByPriority(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => getAlertPriorityScore(b) - getAlertPriorityScore(a));
}

/**
 * Filter drafts that need attention based on keywords
 */
export function getDraftsNeedingAttention(drafts: EmailDraft[]): EmailDraft[] {
  return drafts.filter(draft => shouldTriggerAlert(draft));
}

/**
 * Get alert summary statistics
 */
export function getAlertStats(alerts: Alert[]): {
  total: number;
  critical: number;
  priority: number;
  warning: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
} {
  return {
    total: alerts.length,
    critical: alerts.filter(a => a.type === 'critical').length,
    priority: alerts.filter(a => a.type === 'priority').length,
    warning: alerts.filter(a => a.type === 'warning').length,
    highSeverity: alerts.filter(a => a.severity === 'high').length,
    mediumSeverity: alerts.filter(a => a.severity === 'medium').length,
    lowSeverity: alerts.filter(a => a.severity === 'low').length,
  };
}

/**
 * Check if any drafts have critical alerts
 */
export function hasCriticalAlerts(drafts: EmailDraft[]): boolean {
  return drafts.some(draft => {
    const alerts = generateAlertsForDraft(draft);
    return alerts.some(alert => alert.type === 'critical');
  });
}
