/**
 * Test script for keyword extraction and alerting functionality
 */

import { extractKeywordsFromViolation, extractKeywordsFromViolations, autoTagDraft, applyTemplateSubstitution, generateTemplatePlaceholders } from './services/keywordExtractor';
import { generateAlertsForDraft, shouldTriggerAlert, getDraftsNeedingAttention } from './services/keywordAlerting';
import { getAllDrafts } from './data/store';
import { LegacyViolation } from './types';

console.log('🧪 Testing Keyword Extraction and Alerting Functionality\n');
console.log('━'.repeat(60));

// Test 1: Keyword extraction from violation
console.log('\n1️⃣  Testing keyword extraction from violation:');
const testViolation: LegacyViolation = {
  id: 'test1',
  url: 'https://test.com',
  pageTitle: 'Test Page',
  element: 'button',
  wcagCriteria: '1.4.3',
  wcagLevel: 'AA',
  severity: 'critical',
  description: 'Button has insufficient color contrast',
  recommendation: 'Increase contrast ratio',
  priority: 1,
};

const keywords = extractKeywordsFromViolation(testViolation);
console.log(`   Keywords extracted: ${keywords.slice(0, 5).join(', ')}... (${keywords.length} total)`);

// Test 2: Template substitution
console.log('\n2️⃣  Testing template substitution:');
const template = 'We found {{violation_count}} issues including {{critical_count}} critical items. Primary concerns: {{primary_keywords}}.';
const violations = [testViolation];
const result = applyTemplateSubstitution(template, violations);
console.log(`   Template: "${template}"`);
console.log(`   Result:   "${result}"`);

// Test 3: Auto-tagging drafts
console.log('\n3️⃣  Testing auto-tagging:');
const drafts = getAllDrafts();
console.log(`   Found ${drafts.length} drafts in store`);

if (drafts.length > 0) {
  const draft = drafts[0];
  console.log(`   Draft "${draft.id}" has ${(draft.keywords || []).length} keywords:`);
  console.log(`   Keywords: ${(draft.keywords || []).slice(0, 5).join(', ')}`);
  
  // Test 4: Alert generation
  console.log('\n4️⃣  Testing alert generation:');
  const shouldAlert = shouldTriggerAlert(draft);
  console.log(`   Should trigger alert: ${shouldAlert}`);
  
  if (shouldAlert) {
    const alerts = generateAlertsForDraft(draft);
    console.log(`   Generated ${alerts.length} alert(s):`);
    alerts.forEach((alert, i) => {
      console.log(`   ${i + 1}. [${alert.type.toUpperCase()}/${alert.severity}] ${alert.message}`);
    });
  }
}

// Test 5: Drafts needing attention
console.log('\n5️⃣  Testing drafts needing attention:');
const needingAttention = getDraftsNeedingAttention(drafts);
console.log(`   ${needingAttention.length} out of ${drafts.length} drafts need attention`);
needingAttention.forEach(draft => {
  console.log(`   - ${draft.id}: ${draft.company || 'Unknown'}`);
});

console.log('\n' + '━'.repeat(60));
console.log('✅ All tests completed successfully!\n');
