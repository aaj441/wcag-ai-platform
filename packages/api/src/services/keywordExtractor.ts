/**
 * Keyword Extraction Service
 * Extracts keywords from violation descriptions using NLP techniques
 */

import { LegacyViolation, ViolationSeverity } from '../types';

export interface ExtractedKeywords {
  keywords: string[];
  tags: string[];
  violationType: string;
  impactLevel: string;
  wcagCriterion: string;
}

export interface AlertTrigger {
  keyword: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  alertType: 'lawsuit_risk' | 'critical_severity' | 'immediate_action' | 'compliance_issue';
  message: string;
}

/**
 * Common WCAG-related keywords for categorization
 */
const WCAG_KEYWORDS = {
  contrast: ['contrast', 'color', 'visibility', 'legibility', 'readable'],
  navigation: ['keyboard', 'navigation', 'focus', 'tab', 'shortcut'],
  alternative: ['alt', 'alternative', 'text', 'description', 'label'],
  structure: ['heading', 'landmark', 'semantic', 'structure', 'hierarchy'],
  forms: ['form', 'input', 'label', 'validation', 'error'],
  multimedia: ['video', 'audio', 'caption', 'transcript', 'media'],
  timing: ['timeout', 'timing', 'animation', 'motion', 'automatic'],
  cognitive: ['clear', 'simple', 'consistent', 'predictable', 'help'],
};

/**
 * Keywords that trigger alerts
 */
const ALERT_KEYWORDS: Record<string, AlertTrigger> = {
  'lawsuit': {
    keyword: 'lawsuit',
    priority: 'critical',
    alertType: 'lawsuit_risk',
    message: 'Potential lawsuit risk identified - immediate legal review recommended',
  },
  'legal': {
    keyword: 'legal',
    priority: 'critical',
    alertType: 'lawsuit_risk',
    message: 'Legal compliance issue detected - review required',
  },
  'ada violation': {
    keyword: 'ada violation',
    priority: 'critical',
    alertType: 'lawsuit_risk',
    message: 'ADA violation mentioned - high litigation risk',
  },
  'lawsuit risk': {
    keyword: 'lawsuit risk',
    priority: 'critical',
    alertType: 'lawsuit_risk',
    message: 'Explicit lawsuit risk mentioned - immediate action required',
  },
  'critical': {
    keyword: 'critical',
    priority: 'critical',
    alertType: 'critical_severity',
    message: 'Critical severity violation - priority remediation required',
  },
  'urgent': {
    keyword: 'urgent',
    priority: 'high',
    alertType: 'immediate_action',
    message: 'Urgent issue requiring immediate attention',
  },
  'compliance': {
    keyword: 'compliance',
    priority: 'high',
    alertType: 'compliance_issue',
    message: 'Compliance issue detected - regulatory review needed',
  },
};

/**
 * Extract keywords from a violation description
 */
export function extractKeywords(violation: LegacyViolation): ExtractedKeywords {
  const text = `${violation.description} ${violation.recommendation} ${violation.technicalDetails || ''}`.toLowerCase();
  const words = text.split(/\s+/);
  
  // Extract relevant keywords
  const keywords = new Set<string>();
  const tags = new Set<string>();
  
  // Add WCAG criteria as a keyword
  keywords.add(`wcag-${violation.wcagCriteria}`);
  keywords.add(violation.wcagLevel.toLowerCase());
  
  // Add severity
  keywords.add(violation.severity);
  
  // Extract WCAG category keywords
  for (const [category, categoryKeywords] of Object.entries(WCAG_KEYWORDS)) {
    for (const keyword of categoryKeywords) {
      if (text.includes(keyword)) {
        keywords.add(keyword);
        tags.add(category);
      }
    }
  }
  
  // Extract element type if present
  if (violation.element) {
    const elementType = violation.element.split(/[.#\s]/)[0];
    if (elementType) {
      keywords.add(elementType);
    }
  }
  
  // Add affected users keywords
  if (violation.affectedUsers) {
    const userText = violation.affectedUsers.toLowerCase();
    if (userText.includes('blind')) keywords.add('blind-users');
    if (userText.includes('low vision')) keywords.add('low-vision');
    if (userText.includes('cognitive')) keywords.add('cognitive-disability');
    if (userText.includes('motor')) keywords.add('motor-disability');
    if (userText.includes('deaf')) keywords.add('deaf-users');
  }
  
  // Determine violation type
  const violationType = determineViolationType(violation, Array.from(tags));
  tags.add(violationType);
  
  // Determine impact level
  const impactLevel = determineImpactLevel(violation);
  
  return {
    keywords: Array.from(keywords),
    tags: Array.from(tags),
    violationType,
    impactLevel,
    wcagCriterion: violation.wcagCriteria,
  };
}

/**
 * Extract keywords from multiple violations
 */
export function extractKeywordsFromViolations(violations: LegacyViolation[]): {
  allKeywords: string[];
  allTags: string[];
  violationTypes: string[];
  highestImpactLevel: string;
} {
  const allKeywords = new Set<string>();
  const allTags = new Set<string>();
  const violationTypes = new Set<string>();
  let highestPriority = 5;
  
  for (const violation of violations) {
    const extracted = extractKeywords(violation);
    extracted.keywords.forEach(k => allKeywords.add(k));
    extracted.tags.forEach(t => allTags.add(t));
    violationTypes.add(extracted.violationType);
    
    // Track highest priority
    if (violation.priority < highestPriority) {
      highestPriority = violation.priority;
    }
  }
  
  return {
    allKeywords: Array.from(allKeywords),
    allTags: Array.from(allTags),
    violationTypes: Array.from(violationTypes),
    highestImpactLevel: priorityToImpactLevel(highestPriority),
  };
}

/**
 * Determine the violation type based on content
 */
function determineViolationType(violation: LegacyViolation, tags: string[]): string {
  // Use tags to determine primary type
  if (tags.includes('contrast')) return 'color-contrast';
  if (tags.includes('alternative')) return 'missing-alt-text';
  if (tags.includes('forms')) return 'form-accessibility';
  if (tags.includes('navigation')) return 'keyboard-navigation';
  if (tags.includes('structure')) return 'semantic-structure';
  if (tags.includes('multimedia')) return 'multimedia-accessibility';
  if (tags.includes('timing')) return 'timing-issues';
  if (tags.includes('cognitive')) return 'cognitive-accessibility';
  
  // Fallback to element-based detection
  const element = violation.element.toLowerCase();
  if (element.includes('img')) return 'image-accessibility';
  if (element.includes('button')) return 'button-accessibility';
  if (element.includes('form') || element.includes('input')) return 'form-accessibility';
  if (element.includes('nav')) return 'navigation';
  if (element.includes('video') || element.includes('audio')) return 'multimedia-accessibility';
  
  return 'general-wcag';
}

/**
 * Determine impact level based on severity and priority
 */
function determineImpactLevel(violation: LegacyViolation): string {
  if (violation.severity === 'critical') return 'critical-impact';
  if (violation.severity === 'high') return 'high-impact';
  if (violation.severity === 'medium') return 'medium-impact';
  if (violation.severity === 'low') return 'low-impact';
  return 'unknown-impact';
}

/**
 * Convert priority number to impact level
 */
function priorityToImpactLevel(priority: number): string {
  if (priority === 1) return 'critical-impact';
  if (priority === 2) return 'high-impact';
  if (priority === 3) return 'medium-impact';
  return 'low-impact';
}

/**
 * Check for alert triggers in text
 */
export function checkAlertTriggers(text: string): AlertTrigger[] {
  const lowerText = text.toLowerCase();
  const triggers: AlertTrigger[] = [];
  
  for (const trigger of Object.values(ALERT_KEYWORDS)) {
    if (lowerText.includes(trigger.keyword)) {
      triggers.push(trigger);
    }
  }
  
  return triggers;
}

/**
 * Check for alert triggers in violations
 */
export function checkViolationAlerts(violations: LegacyViolation[]): AlertTrigger[] {
  const triggers: AlertTrigger[] = [];
  const seen = new Set<string>();
  
  for (const violation of violations) {
    // Check severity-based alerts
    if (violation.severity === 'critical') {
      const key = 'critical-severity';
      if (!seen.has(key)) {
        triggers.push(ALERT_KEYWORDS['critical']);
        seen.add(key);
      }
    }
    
    // Check text-based alerts
    const text = `${violation.description} ${violation.recommendation} ${violation.technicalDetails || ''}`;
    const textTriggers = checkAlertTriggers(text);
    
    for (const trigger of textTriggers) {
      const key = trigger.keyword;
      if (!seen.has(key)) {
        triggers.push(trigger);
        seen.add(key);
      }
    }
  }
  
  // Sort by priority
  return triggers.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Generate search-friendly tags from keywords
 */
export function generateSearchTags(keywords: string[]): string[] {
  const tags = new Set<string>();
  
  for (const keyword of keywords) {
    // Add the keyword itself
    tags.add(keyword);
    
    // Add normalized versions
    tags.add(keyword.replace(/-/g, ' '));
    tags.add(keyword.replace(/\s+/g, '-'));
  }
  
  return Array.from(tags);
}
