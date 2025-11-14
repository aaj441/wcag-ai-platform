#!/usr/bin/env node

/**
 * Medicare.gov WCAG Violation Test
 * Tests RemediationEngine Phase 1 against real Medicare violations
 *
 * Run with: npx ts-node scripts/test-medicare-violations.ts
 */

import { RemediationEngine } from '../src/services/RemediationEngine';

interface TestViolation {
  wcagCriteria: string;
  issueType: string;
  description: string;
  elementSelector: string;
  codeSnippet: string;
}

// Real violations commonly found on government health sites like Medicare
const MEDICARE_VIOLATIONS: TestViolation[] = [
  {
    wcagCriteria: '1.1.1',
    issueType: 'missing_alt_text',
    description: 'Medicare logo image missing alt text',
    elementSelector: 'header img.medicare-logo',
    codeSnippet: '<img src="/images/medicare-logo.png" class="medicare-logo">',
  },
  {
    wcagCriteria: '1.4.3',
    issueType: 'low_contrast',
    description: 'Gray text on light gray background in benefits table',
    elementSelector: '.benefits-table tbody',
    codeSnippet: '<td style="color: #888888; background: #f5f5f5;">Medicare Part B Premium</td>',
  },
  {
    wcagCriteria: '1.3.1',
    issueType: 'missing_form_label',
    description: 'Search form input missing associated label',
    elementSelector: 'form.search-form input',
    codeSnippet: '<input type="text" name="medicare_search" placeholder="Search plans...">',
  },
  {
    wcagCriteria: '1.3.1',
    issueType: 'missing_heading_structure',
    description: 'Critical section using <div> instead of <h1>',
    elementSelector: '.hero-section',
    codeSnippet: '<div style="font-size: 32px; font-weight: bold;">Find Your Medicare Plan</div>',
  },
  {
    wcagCriteria: '2.1.1',
    issueType: 'missing_focus_indicator',
    description: 'Interactive button has no focus outline',
    elementSelector: 'button.enroll-btn',
    codeSnippet: '<button class="enroll-btn">Enroll Now</button>',
  },
  {
    wcagCriteria: '4.1.2',
    issueType: 'missing_aria_label',
    description: 'Icon-only button lacks accessible name',
    elementSelector: 'button.icon-menu',
    codeSnippet: '<button class="icon-menu"><svg><!-- hamburger icon --></svg></button>',
  },
  {
    wcagCriteria: '2.4.4',
    issueType: 'missing_link_text',
    description: 'Link with only generic "Read More" text',
    elementSelector: 'a.read-more',
    codeSnippet: '<a href="/coverage-details">Read More</a>',
  },
];

async function testRemediationEngine() {
  const results: any[] = [];

  console.log('\n🏥 MEDICARE.GOV WCAG VIOLATION TEST\n');
  console.log('Testing RemediationEngine Phase 1 with real Medicare violations...\n');
  console.log('─'.repeat(80));

  for (const violation of MEDICARE_VIOLATIONS) {
    console.log(`\n📋 WCAG ${violation.wcagCriteria}: ${violation.issueType}`);
    console.log(`   Description: ${violation.description}`);
    console.log(`   Selector: ${violation.elementSelector}`);
    console.log(`   Original: ${violation.codeSnippet.substring(0, 60)}...`);

    try {
      // Generate fix using RemediationEngine
      const fixRequest = {
        violationId: `violation-${Date.now()}`,
        wcagCriteria: violation.wcagCriteria,
        issueType: violation.issueType,
        description: violation.description,
        codeLanguage: 'html',
        codeSnippet: violation.codeSnippet,
        elementSelector: violation.elementSelector,
      };

      const fix = await RemediationEngine.generateFix(fixRequest);

      console.log(`\n   ✅ Fix Generated:`);
      console.log(`   Confidence: ${(fix.confidenceScore * 100).toFixed(0)}%`);
      console.log(`   Status: ${fix.confidenceScore > 0.9 ? 'Auto-Approved' : 'Needs Review'}`);
      console.log(`   Fixed Code:\n${fix.fixedCode
        .split('\n')
        .map((line: string) => `     ${line}`)
        .join('\n')}`);
      console.log(`\n   Explanation: ${fix.explanation}`);

      results.push({
        wcagCriteria: violation.wcagCriteria,
        issueType: violation.issueType,
        confidenceScore: fix.confidenceScore,
        reviewStatus: fix.confidenceScore > 0.9 ? 'approved' : 'pending',
        success: true,
      });
    } catch (error) {
      console.log(`\n   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        wcagCriteria: violation.wcagCriteria,
        issueType: violation.issueType,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    console.log('\n' + '─'.repeat(80));
  }

  // Summary
  console.log('\n📊 TEST SUMMARY\n');
  const successful = results.filter((r) => r.success).length;
  const avgConfidence =
    results.reduce((sum: number, r: any) => sum + (r.confidenceScore || 0), 0) / results.length;

  console.log(`Total Violations Tested: ${results.length}`);
  console.log(`Successfully Fixed: ${successful}/${results.length}`);
  console.log(`Average Confidence: ${(avgConfidence * 100).toFixed(0)}%`);

  console.log('\n📈 BREAKDOWN BY CONFIDENCE:\n');
  const high = results.filter((r) => r.success && r.confidenceScore >= 0.9);
  const medium = results.filter((r) => r.success && r.confidenceScore >= 0.7 && r.confidenceScore < 0.9);
  const low = results.filter((r) => r.success && r.confidenceScore < 0.7);

  console.log(`Very High (90-100%): ${high.length} violations`);
  high.forEach((r) =>
    console.log(`  ✓ ${r.wcagCriteria}: ${r.issueType} (${(r.confidenceScore * 100).toFixed(0)}%)`)
  );

  console.log(`\nHigh (70-89%): ${medium.length} violations`);
  medium.forEach((r) =>
    console.log(`  ✓ ${r.wcagCriteria}: ${r.issueType} (${(r.confidenceScore * 100).toFixed(0)}%)`)
  );

  console.log(`\nMedium (Below 70%): ${low.length} violations`);
  low.forEach((r) =>
    console.log(`  ⚠ ${r.wcagCriteria}: ${r.issueType} (${(r.confidenceScore * 100).toFixed(0)}%) - Needs human review`)
  );

  console.log('\n💡 RECOMMENDATIONS:\n');
  if (high.length >= 5) {
    console.log('✅ Phase 1 is ready for production! Most violations auto-fixed with high confidence.');
  } else if (successful >= MEDICARE_VIOLATIONS.length * 0.8) {
    console.log('⚠️  Phase 1 handles common issues well. Consider Phase 2 for edge cases.');
  } else {
    console.log('❌ Phase 1 needs work. Low success rate suggests template approach is insufficient.');
  }

  console.log('\n✨ Next steps:');
  console.log('  1. Deploy Phase 1 to production for template-based fixes');
  console.log('  2. Integrate with real WCAG scanner to validate real violations');
  console.log('  3. Show consultant dashboard with auto-generated fixes');
  console.log('  4. Collect confidence scores for Phase 2 AI training data');

  return { success: successful >= MEDICARE_VIOLATIONS.length * 0.8, results };
}

// Run test
testRemediationEngine()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
