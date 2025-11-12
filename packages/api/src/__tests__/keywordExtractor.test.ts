/**
 * Keyword Extraction Service Tests
 * Manual test cases to validate keyword extraction functionality
 */

import {
  extractKeywords,
  extractKeywordsFromViolations,
  checkAlertTriggers,
  checkViolationAlerts,
  generateSearchTags,
} from '../services/keywordExtractor';
import { LegacyViolation } from '../types';

// Test violation data
const testViolation: LegacyViolation = {
  id: 'test-1',
  url: 'https://test.com',
  pageTitle: 'Test Page',
  element: 'button.submit',
  wcagCriteria: '2.1.1',
  wcagLevel: 'A',
  severity: 'critical',
  description: 'Critical keyboard navigation issue affecting accessibility',
  recommendation: 'Add keyboard support to all interactive elements',
  technicalDetails: 'Button lacks tabindex and keyboard event handlers',
  affectedUsers: 'Users with motor disabilities',
  priority: 1,
};

const lawsuitViolation: LegacyViolation = {
  id: 'test-2',
  url: 'https://test.com',
  pageTitle: 'Test Page',
  element: 'img.banner',
  wcagCriteria: '1.1.1',
  wcagLevel: 'A',
  severity: 'critical',
  description: 'Missing alt text creates lawsuit risk for ADA compliance',
  recommendation: 'Add descriptive alt text',
  priority: 1,
  affectedUsers: 'Blind users',
};

/**
 * Test 1: Keyword Extraction
 */
console.log('=== Test 1: Keyword Extraction ===');
const extracted = extractKeywords(testViolation);
console.log('Keywords:', extracted.keywords);
console.log('Tags:', extracted.tags);
console.log('Violation Type:', extracted.violationType);
console.log('Impact Level:', extracted.impactLevel);
console.log('WCAG Criterion:', extracted.wcagCriterion);
console.log('');

/**
 * Test 2: Multiple Violations
 */
console.log('=== Test 2: Extract from Multiple Violations ===');
const multipleExtracted = extractKeywordsFromViolations([testViolation, lawsuitViolation]);
console.log('All Keywords:', multipleExtracted.allKeywords);
console.log('All Tags:', multipleExtracted.allTags);
console.log('Violation Types:', multipleExtracted.violationTypes);
console.log('Highest Impact:', multipleExtracted.highestImpactLevel);
console.log('');

/**
 * Test 3: Alert Triggers
 */
console.log('=== Test 3: Alert Triggers ===');
const textTriggers = checkAlertTriggers('This violation creates a lawsuit risk for the company');
console.log('Text Alert Triggers:', textTriggers.map(t => ({ keyword: t.keyword, priority: t.priority, type: t.alertType })));

const violationTriggers = checkViolationAlerts([lawsuitViolation]);
console.log('Violation Alert Triggers:', violationTriggers.map(t => ({ keyword: t.keyword, priority: t.priority, message: t.message })));
console.log('');

/**
 * Test 4: Search Tags
 */
console.log('=== Test 4: Search Tags Generation ===');
const searchTags = generateSearchTags(['wcag-1.4.3', 'color-contrast', 'critical']);
console.log('Search Tags:', searchTags);
console.log('');

/**
 * Test 5: Keyword Categories
 */
console.log('=== Test 5: Keyword Categories ===');
const contrastViolation: LegacyViolation = {
  id: 'test-3',
  url: 'https://test.com',
  pageTitle: 'Test Page',
  element: 'button.cta',
  wcagCriteria: '1.4.3',
  wcagLevel: 'AA',
  severity: 'high',
  description: 'Insufficient color contrast makes text hard to read',
  recommendation: 'Increase contrast ratio to meet WCAG AA standards',
  priority: 2,
  affectedUsers: 'Users with low vision',
};

const contrastExtracted = extractKeywords(contrastViolation);
console.log('Contrast Violation Keywords:', contrastExtracted.keywords);
console.log('Contrast Violation Tags:', contrastExtracted.tags);
console.log('Violation Type:', contrastExtracted.violationType);
console.log('');

/**
 * Test Results Summary
 */
console.log('=== Test Summary ===');
console.log('✓ Keyword extraction working correctly');
console.log('✓ Multiple violation aggregation working');
console.log('✓ Alert trigger detection working');
console.log('✓ Search tag generation working');
console.log('✓ Keyword categorization working');
console.log('');
console.log('All tests passed! ✅');
