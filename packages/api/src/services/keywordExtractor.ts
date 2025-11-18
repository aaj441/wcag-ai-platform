/**
 * Keyword Extraction Service
 * Extracts accessibility-related keywords from violation descriptions
 * Uses NLP techniques and WCAG criterion mappings
 */

import { LegacyViolation } from '../types';

/**
 * WCAG Keyword Mappings
 * Maps WCAG success criteria to relevant accessibility keywords
 */
export const WCAG_KEYWORDS: Record<string, string[]> = {
  '1.1.1': ['alt text', 'non-text content', 'images', 'alternative text', 'screen reader'],
  '1.2.1': ['audio', 'video', 'media', 'captions', 'transcripts'],
  '1.2.2': ['captions', 'synchronized', 'media', 'video'],
  '1.2.3': ['audio description', 'video', 'media', 'visual information'],
  '1.3.1': ['semantic markup', 'structure', 'headings', 'labels', 'landmark'],
  '1.3.2': ['content order', 'sequence', 'meaningful', 'reading order'],
  '1.3.3': ['sensory characteristics', 'shape', 'color', 'size'],
  '1.4.1': ['color', 'not sole indicator', 'meaning'],
  '1.4.3': ['color contrast', 'text readability', 'visual', 'contrast ratio'],
  '1.4.4': ['text resize', 'zoom', 'responsive', 'scalable'],
  '1.4.5': ['images of text', 'text alternatives', 'visual presentation'],
  '1.4.10': ['reflow', 'responsive', 'mobile', 'scrolling'],
  '1.4.11': ['contrast', 'non-text', 'ui components', 'graphical objects'],
  '1.4.12': ['text spacing', 'line height', 'paragraph spacing'],
  '1.4.13': ['hover', 'focus', 'content', 'dismissible', 'persistent'],
  '2.1.1': ['keyboard', 'navigation', 'operable', 'keyboard accessible'],
  '2.1.2': ['keyboard trap', 'focus', 'navigation'],
  '2.1.4': ['keyboard shortcuts', 'single key', 'character key'],
  '2.4.1': ['bypass blocks', 'skip links', 'navigation', 'landmark'],
  '2.4.2': ['page title', 'document title', 'descriptive'],
  '2.4.3': ['focus order', 'tab order', 'keyboard navigation'],
  '2.4.4': ['link purpose', 'link text', 'context', 'descriptive'],
  '2.4.5': ['multiple ways', 'navigation', 'sitemap', 'search'],
  '2.4.6': ['headings', 'labels', 'descriptive', 'purpose'],
  '2.4.7': ['focus visible', 'focus indicator', 'keyboard'],
  '2.5.1': ['pointer gestures', 'touch', 'alternative', 'path-based'],
  '2.5.2': ['pointer cancellation', 'touch', 'down-event', 'up-event'],
  '2.5.3': ['label in name', 'accessible name', 'visible label'],
  '2.5.4': ['motion actuation', 'device motion', 'alternative'],
  '3.1.1': ['language', 'page language', 'lang attribute'],
  '3.1.2': ['language of parts', 'content language', 'lang attribute'],
  '3.2.1': ['on focus', 'context change', 'predictable'],
  '3.2.2': ['on input', 'context change', 'user interface'],
  '3.2.3': ['consistent navigation', 'repeated', 'navigation'],
  '3.2.4': ['consistent identification', 'components', 'icons'],
  '3.3.1': ['error identification', 'input error', 'form validation'],
  '3.3.2': ['labels', 'instructions', 'form', 'input'],
  '3.3.3': ['error suggestion', 'correction', 'form validation'],
  '3.3.4': ['error prevention', 'legal', 'financial', 'data'],
  '4.1.1': ['parsing', 'html', 'valid markup'],
  '4.1.2': ['name role value', 'aria', 'accessible name'],
  '4.1.3': ['status messages', 'aria-live', 'screen reader'],
};

/**
 * Priority keywords that trigger alerts
 */
export const PRIORITY_KEYWORDS = [
  'lawsuit risk',
  'legal liability',
  'critical severity',
  'compliance violation',
  'ada violation',
  'wcag failure',
  'immediate attention',
  'high risk',
  'accessibility barrier',
  'blocking issue',
];

/**
 * Common accessibility terms for extraction
 */
const ACCESSIBILITY_TERMS = [
  'accessibility',
  'screen reader',
  'keyboard',
  'focus',
  'aria',
  'semantic',
  'label',
  'alt text',
  'contrast',
  'color',
  'navigation',
  'heading',
  'landmark',
  'form',
  'button',
  'link',
  'input',
  'image',
  'video',
  'audio',
  'caption',
  'transcript',
  'zoom',
  'resize',
  'responsive',
  'mobile',
  'touch',
  'gesture',
  'error',
  'validation',
  'assistive technology',
  'wcag',
  'ada',
  'section 508',
];

/**
 * Extract keywords from a single violation
 */
export function extractKeywordsFromViolation(violation: LegacyViolation): string[] {
  const keywords = new Set<string>();

  // Add WCAG criterion-based keywords
  const wcagKeywords = WCAG_KEYWORDS[violation.wcagCriteria];
  if (wcagKeywords) {
    wcagKeywords.forEach(kw => keywords.add(kw));
  }

  // Extract from description
  const text = `${violation.description} ${violation.recommendation}`.toLowerCase();

  // Extract accessibility terms
  ACCESSIBILITY_TERMS.forEach(term => {
    if (text.includes(term.toLowerCase())) {
      keywords.add(term);
    }
  });

  // Extract severity as keyword
  keywords.add(violation.severity);

  // Extract WCAG level as keyword
  keywords.add(`WCAG ${violation.wcagLevel}`);

  // Add criterion itself
  keywords.add(`WCAG ${violation.wcagCriteria}`);

  return Array.from(keywords);
}

/**
 * Extract keywords from multiple violations
 */
export function extractKeywordsFromViolations(violations: LegacyViolation[]): string[] {
  const allKeywords = new Set<string>();

  violations.forEach(violation => {
    const keywords = extractKeywordsFromViolation(violation);
    keywords.forEach(kw => allKeywords.add(kw));
  });

  return Array.from(allKeywords).sort();
}

/**
 * Check if keywords contain any priority/alert keywords
 */
export function containsPriorityKeywords(keywords: string[]): boolean {
  const keywordsLower = keywords.map(k => k.toLowerCase());
  return PRIORITY_KEYWORDS.some(pk => 
    keywordsLower.some(k => k.includes(pk.toLowerCase()))
  );
}

/**
 * Get priority keywords from a list
 */
export function getPriorityKeywords(keywords: string[]): string[] {
  const keywordsLower = keywords.map(k => k.toLowerCase());
  return PRIORITY_KEYWORDS.filter(pk => 
    keywordsLower.some(k => k.includes(pk.toLowerCase()))
  );
}

/**
 * Extract keywords from email body text
 */
export function extractKeywordsFromText(text: string): string[] {
  const keywords = new Set<string>();
  const textLower = text.toLowerCase();

  // Extract accessibility terms from text
  ACCESSIBILITY_TERMS.forEach(term => {
    if (textLower.includes(term.toLowerCase())) {
      keywords.add(term);
    }
  });

  // Check for priority keywords
  PRIORITY_KEYWORDS.forEach(pk => {
    if (textLower.includes(pk.toLowerCase())) {
      keywords.add(pk);
    }
  });

  return Array.from(keywords);
}

/**
 * Auto-tag a draft based on violations and content
 */
export function autoTagDraft(violations: LegacyViolation[], body: string): {
  keywords: string[];
  containsCritical: boolean;
  priorityKeywords: string[];
} {
  // Extract from violations
  const violationKeywords = extractKeywordsFromViolations(violations);
  
  // Extract from body text
  const bodyKeywords = extractKeywordsFromText(body);
  
  // Combine and deduplicate
  const allKeywords = new Set([...violationKeywords, ...bodyKeywords]);
  const keywords = Array.from(allKeywords).sort();
  
  // Check for critical issues
  const containsCritical = violations.some(v => v.severity === 'critical') || 
    keywords.some(k => k.toLowerCase().includes('critical'));
  
  // Get priority keywords
  const priorityKeywords = getPriorityKeywords(keywords);
  
  return {
    keywords,
    containsCritical,
    priorityKeywords,
  };
}

/**
 * Generate template placeholders for email personalization
 */
export function generateTemplatePlaceholders(violations: LegacyViolation[]): Record<string, string> {
  if (violations.length === 0) {
    return {};
  }

  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const highCount = violations.filter(v => v.severity === 'high').length;
  const wcagCriteriaSet = new Set(violations.map(v => v.wcagCriteria));
  const wcagCriteria = Array.from(wcagCriteriaSet);
  const keywords = extractKeywordsFromViolations(violations);

  return {
    '{{violation_count}}': violations.length.toString(),
    '{{critical_count}}': criticalCount.toString(),
    '{{high_count}}': highCount.toString(),
    '{{violation_type}}': violations[0].description.split('.')[0],
    '{{wcag_criterion}}': violations[0].wcagCriteria,
    '{{wcag_criteria_list}}': wcagCriteria.join(', '),
    '{{primary_keywords}}': keywords.slice(0, 5).join(', '),
    '{{severity_level}}': violations[0].severity,
  };
}

/**
 * Apply template substitution to email body
 */
export function applyTemplateSubstitution(body: string, violations: LegacyViolation[]): string {
  const placeholders = generateTemplatePlaceholders(violations);
  
  let result = body;
  Object.entries(placeholders).forEach(([placeholder, value]) => {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return result;
}
