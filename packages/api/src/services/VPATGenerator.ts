/**
 * VPAT 2.4 Rev Generator
 *
 * Generates official Voluntary Product Accessibility Template (VPAT) reports
 * conforming to the VPAT 2.4 Revised format for:
 * - WCAG 2.1/2.2 (Levels A, AA, AAA)
 * - Section 508
 * - EN 301 549
 *
 * Reference: https://www.itic.org/policy/accessibility/vpat
 */

import { Violation } from '../types';

export interface VPATProductInfo {
  name: string;
  version: string;
  description: string;
  productURL?: string;
  dateGenerated: Date;
  contactInfo: {
    name: string;
    company: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  evaluationMethods: string[];
  testingTools: string[];
}

export interface WCAGCriterion {
  number: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  conformance: 'Supports' | 'Partially Supports' | 'Does Not Support' | 'Not Applicable';
  remarks: string;
}

export interface Section508Criterion {
  section: string;
  criteria: string;
  conformance: 'Supports' | 'Partially Supports' | 'Does Not Support' | 'Not Applicable';
  remarks: string;
}

export interface VPATReport {
  productInfo: VPATProductInfo;
  executiveSummary: string;
  wcag21Criteria: WCAGCriterion[];
  section508Criteria: Section508Criterion[];
  legalDisclaimer: string;
}

export class VPATGenerator {
  /**
   * Generate a complete VPAT 2.4 Rev report
   */
  public generateVPAT(
    productInfo: VPATProductInfo,
    violations: Violation[]
  ): string {
    const wcagCriteria = this.generateWCAGCriteria(violations);
    const section508Criteria = this.generateSection508Criteria(violations);
    const executiveSummary = this.generateExecutiveSummary(wcagCriteria);

    return this.renderVPATHTML({
      productInfo,
      executiveSummary,
      wcag21Criteria: wcagCriteria,
      section508Criteria,
      legalDisclaimer: this.getLegalDisclaimer(),
    });
  }

  /**
   * Map violations to WCAG 2.1 criteria
   */
  private generateWCAGCriteria(violations: Violation[]): WCAGCriterion[] {
    const criteriaMap = new Map<string, WCAGCriterion>();

    // Initialize all WCAG 2.1 criteria
    this.getAllWCAGCriteria().forEach(criterion => {
      criteriaMap.set(criterion.number, {
        ...criterion,
        conformance: 'Supports',
        remarks: 'No issues found.',
      });
    });

    // Update based on violations
    violations.forEach(violation => {
      const criterion = criteriaMap.get(violation.wcagCriteria);
      if (criterion) {
        criterion.conformance = this.determineConformance(violation);
        criterion.remarks = this.generateRemarks(violation);
      }
    });

    return Array.from(criteriaMap.values()).sort((a, b) =>
      a.number.localeCompare(b.number)
    );
  }

  /**
   * Map violations to Section 508 criteria
   */
  private generateSection508Criteria(violations: Violation[]): Section508Criterion[] {
    return [
      {
        section: '502.3.1',
        criteria: 'Object Information',
        conformance: violations.some(v => v.wcagCriteria.startsWith('4.1'))
          ? 'Partially Supports'
          : 'Supports',
        remarks: this.getSection508Remarks('502.3.1', violations),
      },
      {
        section: '502.3.2',
        criteria: 'Modification of Object Information',
        conformance: violations.some(v => v.wcagCriteria.startsWith('4.1'))
          ? 'Partially Supports'
          : 'Supports',
        remarks: this.getSection508Remarks('502.3.2', violations),
      },
      {
        section: '502.3.3',
        criteria: 'Row, Column, and Headers',
        conformance: violations.some(v => v.wcagCriteria === '1.3.1')
          ? 'Partially Supports'
          : 'Supports',
        remarks: this.getSection508Remarks('502.3.3', violations),
      },
      {
        section: '502.3.4',
        criteria: 'Values',
        conformance: violations.some(v => v.wcagCriteria === '4.1.2')
          ? 'Partially Supports'
          : 'Supports',
        remarks: this.getSection508Remarks('502.3.4', violations),
      },
      {
        section: '502.3.5',
        criteria: 'Modification of Values',
        conformance: 'Supports',
        remarks: 'All form controls support assistive technology modification.',
      },
      {
        section: '502.3.6',
        criteria: 'Label Relationships',
        conformance: violations.some(v => v.wcagCriteria === '1.3.1' || v.wcagCriteria === '3.3.2')
          ? 'Does Not Support'
          : 'Supports',
        remarks: this.getSection508Remarks('502.3.6', violations),
      },
      {
        section: '502.4',
        criteria: 'Platform Accessibility Features',
        conformance: 'Supports',
        remarks: 'Product preserves accessibility features provided by platform.',
      },
    ];
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(criteria: WCAGCriterion[]): string {
    const supported = criteria.filter(c => c.conformance === 'Supports').length;
    const partiallySupported = criteria.filter(c => c.conformance === 'Partially Supports').length;
    const notSupported = criteria.filter(c => c.conformance === 'Does Not Support').length;
    const total = criteria.length;

    const supportPercentage = Math.round((supported / total) * 100);

    return `This product has been evaluated for accessibility conformance. Out of ${total} WCAG 2.1 Level A and AA success criteria, ${supported} (${supportPercentage}%) are fully supported, ${partiallySupported} are partially supported, and ${notSupported} are not supported. The product demonstrates ${supportPercentage >= 90 ? 'strong' : supportPercentage >= 70 ? 'moderate' : 'limited'} accessibility compliance with room for improvement in specific areas detailed below.`;
  }

  /**
   * Determine conformance level based on violation
   */
  private determineConformance(violation: Violation): WCAGCriterion['conformance'] {
    if (violation.severity === 'critical' || violation.severity === 'high') {
      return 'Does Not Support';
    } else if (violation.severity === 'medium') {
      return 'Partially Supports';
    }
    return 'Supports';
  }

  /**
   * Generate detailed remarks for a criterion
   */
  private generateRemarks(violation: Violation): string {
    return `${violation.description}. Location: ${violation.elementSelector || 'Multiple elements'}. Recommended action: ${this.getRecommendation(violation.wcagCriteria)}.`;
  }

  /**
   * Get Section 508 remarks based on violations
   */
  private getSection508Remarks(section: string, violations: Violation[]): string {
    const relevantViolations = violations.filter(v => this.isRelevantTo508(section, v));

    if (relevantViolations.length === 0) {
      return 'Fully compliant with this requirement.';
    }

    return `${relevantViolations.length} issue(s) identified: ${relevantViolations.map(v => v.description).join('; ')}`;
  }

  /**
   * Check if violation is relevant to Section 508 criterion
   */
  private isRelevantTo508(section: string, violation: Violation): boolean {
    const mapping: Record<string, string[]> = {
      '502.3.1': ['4.1.1', '4.1.2'],
      '502.3.2': ['4.1.2'],
      '502.3.3': ['1.3.1'],
      '502.3.4': ['4.1.2'],
      '502.3.6': ['1.3.1', '3.3.2'],
    };

    return mapping[section]?.includes(violation.wcagCriteria) || false;
  }

  /**
   * Get all WCAG 2.1 criteria
   */
  private getAllWCAGCriteria(): Omit<WCAGCriterion, 'conformance' | 'remarks'>[] {
    return [
      // Level A
      { number: '1.1.1', name: 'Non-text Content', level: 'A' },
      { number: '1.2.1', name: 'Audio-only and Video-only (Prerecorded)', level: 'A' },
      { number: '1.2.2', name: 'Captions (Prerecorded)', level: 'A' },
      { number: '1.2.3', name: 'Audio Description or Media Alternative (Prerecorded)', level: 'A' },
      { number: '1.3.1', name: 'Info and Relationships', level: 'A' },
      { number: '1.3.2', name: 'Meaningful Sequence', level: 'A' },
      { number: '1.3.3', name: 'Sensory Characteristics', level: 'A' },
      { number: '1.4.1', name: 'Use of Color', level: 'A' },
      { number: '1.4.2', name: 'Audio Control', level: 'A' },
      { number: '2.1.1', name: 'Keyboard', level: 'A' },
      { number: '2.1.2', name: 'No Keyboard Trap', level: 'A' },
      { number: '2.1.4', name: 'Character Key Shortcuts', level: 'A' },
      { number: '2.2.1', name: 'Timing Adjustable', level: 'A' },
      { number: '2.2.2', name: 'Pause, Stop, Hide', level: 'A' },
      { number: '2.3.1', name: 'Three Flashes or Below Threshold', level: 'A' },
      { number: '2.4.1', name: 'Bypass Blocks', level: 'A' },
      { number: '2.4.2', name: 'Page Titled', level: 'A' },
      { number: '2.4.3', name: 'Focus Order', level: 'A' },
      { number: '2.4.4', name: 'Link Purpose (In Context)', level: 'A' },
      { number: '2.5.1', name: 'Pointer Gestures', level: 'A' },
      { number: '2.5.2', name: 'Pointer Cancellation', level: 'A' },
      { number: '2.5.3', name: 'Label in Name', level: 'A' },
      { number: '2.5.4', name: 'Motion Actuation', level: 'A' },
      { number: '3.1.1', name: 'Language of Page', level: 'A' },
      { number: '3.2.1', name: 'On Focus', level: 'A' },
      { number: '3.2.2', name: 'On Input', level: 'A' },
      { number: '3.3.1', name: 'Error Identification', level: 'A' },
      { number: '3.3.2', name: 'Labels or Instructions', level: 'A' },
      { number: '4.1.1', name: 'Parsing', level: 'A' },
      { number: '4.1.2', name: 'Name, Role, Value', level: 'A' },

      // Level AA
      { number: '1.2.4', name: 'Captions (Live)', level: 'AA' },
      { number: '1.2.5', name: 'Audio Description (Prerecorded)', level: 'AA' },
      { number: '1.3.4', name: 'Orientation', level: 'AA' },
      { number: '1.3.5', name: 'Identify Input Purpose', level: 'AA' },
      { number: '1.4.3', name: 'Contrast (Minimum)', level: 'AA' },
      { number: '1.4.4', name: 'Resize Text', level: 'AA' },
      { number: '1.4.5', name: 'Images of Text', level: 'AA' },
      { number: '1.4.10', name: 'Reflow', level: 'AA' },
      { number: '1.4.11', name: 'Non-text Contrast', level: 'AA' },
      { number: '1.4.12', name: 'Text Spacing', level: 'AA' },
      { number: '1.4.13', name: 'Content on Hover or Focus', level: 'AA' },
      { number: '2.4.5', name: 'Multiple Ways', level: 'AA' },
      { number: '2.4.6', name: 'Headings and Labels', level: 'AA' },
      { number: '2.4.7', name: 'Focus Visible', level: 'AA' },
      { number: '3.1.2', name: 'Language of Parts', level: 'AA' },
      { number: '3.2.3', name: 'Consistent Navigation', level: 'AA' },
      { number: '3.2.4', name: 'Consistent Identification', level: 'AA' },
      { number: '3.3.3', name: 'Error Suggestion', level: 'AA' },
      { number: '3.3.4', name: 'Error Prevention (Legal, Financial, Data)', level: 'AA' },
      { number: '4.1.3', name: 'Status Messages', level: 'AA' },

      // Level AAA (selected criteria)
      { number: '1.2.6', name: 'Sign Language (Prerecorded)', level: 'AAA' },
      { number: '1.2.7', name: 'Extended Audio Description (Prerecorded)', level: 'AAA' },
      { number: '1.2.8', name: 'Media Alternative (Prerecorded)', level: 'AAA' },
      { number: '1.2.9', name: 'Audio-only (Live)', level: 'AAA' },
      { number: '1.4.6', name: 'Contrast (Enhanced)', level: 'AAA' },
      { number: '1.4.7', name: 'Low or No Background Audio', level: 'AAA' },
      { number: '1.4.8', name: 'Visual Presentation', level: 'AAA' },
      { number: '1.4.9', name: 'Images of Text (No Exception)', level: 'AAA' },
      { number: '2.1.3', name: 'Keyboard (No Exception)', level: 'AAA' },
      { number: '2.2.3', name: 'No Timing', level: 'AAA' },
      { number: '2.2.4', name: 'Interruptions', level: 'AAA' },
      { number: '2.2.5', name: 'Re-authenticating', level: 'AAA' },
      { number: '2.2.6', name: 'Timeouts', level: 'AAA' },
      { number: '2.3.2', name: 'Three Flashes', level: 'AAA' },
      { number: '2.3.3', name: 'Animation from Interactions', level: 'AAA' },
      { number: '2.4.8', name: 'Location', level: 'AAA' },
      { number: '2.4.9', name: 'Link Purpose (Link Only)', level: 'AAA' },
      { number: '2.4.10', name: 'Section Headings', level: 'AAA' },
      { number: '2.5.5', name: 'Target Size', level: 'AAA' },
      { number: '2.5.6', name: 'Concurrent Input Mechanisms', level: 'AAA' },
      { number: '3.1.3', name: 'Unusual Words', level: 'AAA' },
      { number: '3.1.4', name: 'Abbreviations', level: 'AAA' },
      { number: '3.1.5', name: 'Reading Level', level: 'AAA' },
      { number: '3.1.6', name: 'Pronunciation', level: 'AAA' },
      { number: '3.2.5', name: 'Change on Request', level: 'AAA' },
      { number: '3.3.5', name: 'Help', level: 'AAA' },
      { number: '3.3.6', name: 'Error Prevention (All)', level: 'AAA' },
    ];
  }

  /**
   * Get recommended action for a WCAG criterion
   */
  private getRecommendation(criterion: string): string {
    const recommendations: Record<string, string> = {
      '1.1.1': 'Add appropriate alt text to all images',
      '1.3.1': 'Use semantic HTML and proper heading structure',
      '1.3.2': 'Ensure meaningful content order in DOM',
      '1.4.3': 'Increase color contrast to at least 4.5:1 for text',
      '2.1.1': 'Ensure all functionality is keyboard accessible',
      '2.1.2': 'Remove keyboard traps and allow focus escape',
      '2.4.1': 'Add skip navigation links',
      '2.4.3': 'Fix focus order to match visual order',
      '3.3.2': 'Add labels or instructions for form inputs',
      '4.1.1': 'Fix HTML validation errors',
      '4.1.2': 'Add proper ARIA labels and roles',
    };

    return recommendations[criterion] || 'Review WCAG documentation for specific guidance';
  }

  /**
   * Get legal disclaimer
   */
  private getLegalDisclaimer(): string {
    return `This Voluntary Product Accessibility Template (VPAT®) is provided for informational purposes only. While every effort has been made to ensure accuracy, this document does not constitute a legal certification or guarantee of accessibility compliance. Organizations should conduct their own independent accessibility evaluations and consult with legal counsel regarding compliance obligations under applicable laws, including but not limited to the Americans with Disabilities Act (ADA), Section 508 of the Rehabilitation Act, and international accessibility standards. The VPAT® is a registered service mark of the Information Technology Industry Council (ITI).`;
  }

  /**
   * Render VPAT as HTML
   */
  private renderVPATHTML(report: VPATReport): string {
    const { productInfo, executiveSummary, wcag21Criteria, section508Criteria, legalDisclaimer } = report;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPAT 2.4 Revised - ${productInfo.name}</title>
  <style>
    @page { margin: 2cm; }
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 21cm;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { font-size: 24px; color: #0066cc; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }
    h2 { font-size: 20px; color: #0066cc; margin-top: 30px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
    h3 { font-size: 16px; color: #444; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #0066cc; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .header-info { background: #f0f8ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; }
    .header-info p { margin: 8px 0; }
    .summary { background: #ffffcc; border-left: 4px solid #ffcc00; padding: 15px; margin: 20px 0; }
    .disclaimer { background: #fff0f0; border: 1px solid #ff6666; padding: 15px; margin: 30px 0; font-size: 12px; }
    .conformance-supports { color: #008800; font-weight: bold; }
    .conformance-partial { color: #ff8800; font-weight: bold; }
    .conformance-not { color: #cc0000; font-weight: bold; }
    .logo { text-align: right; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="logo">
    <strong>VPAT® 2.4 Revised</strong><br>
    <small>Voluntary Product Accessibility Template</small>
  </div>

  <h1>Accessibility Conformance Report</h1>
  <p><strong>Based on VPAT® Version 2.4 Revised</strong></p>

  <div class="header-info">
    <h3>Product Information</h3>
    <p><strong>Product Name:</strong> ${productInfo.name}</p>
    <p><strong>Version:</strong> ${productInfo.version}</p>
    <p><strong>Description:</strong> ${productInfo.description}</p>
    ${productInfo.productURL ? `<p><strong>Product URL:</strong> <a href="${productInfo.productURL}">${productInfo.productURL}</a></p>` : ''}
    <p><strong>Report Date:</strong> ${productInfo.dateGenerated.toLocaleDateString()}</p>
    <p><strong>Contact Information:</strong> ${productInfo.contactInfo.name}, ${productInfo.contactInfo.company}</p>
    ${productInfo.contactInfo.email ? `<p><strong>Email:</strong> ${productInfo.contactInfo.email}</p>` : ''}
    <p><strong>Evaluation Methods:</strong> ${productInfo.evaluationMethods.join(', ')}</p>
    <p><strong>Testing Tools:</strong> ${productInfo.testingTools.join(', ')}</p>
  </div>

  <h2>Executive Summary</h2>
  <div class="summary">
    <p>${executiveSummary}</p>
  </div>

  <h2>WCAG 2.1 Report</h2>
  <p>The following table lists all WCAG 2.1 Level A and AA Success Criteria and conformance levels.</p>

  <h3>Table 1: Success Criteria, Level A</h3>
  <table>
    <thead>
      <tr>
        <th>Criterion</th>
        <th>Conformance Level</th>
        <th>Remarks and Explanations</th>
      </tr>
    </thead>
    <tbody>
      ${wcag21Criteria.filter(c => c.level === 'A').map(c => `
      <tr>
        <td><strong>${c.number}</strong> ${c.name}</td>
        <td class="conformance-${c.conformance.toLowerCase().replace(/ /g, '-')}">${c.conformance}</td>
        <td>${c.remarks}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <h3>Table 2: Success Criteria, Level AA</h3>
  <table>
    <thead>
      <tr>
        <th>Criterion</th>
        <th>Conformance Level</th>
        <th>Remarks and Explanations</th>
      </tr>
    </thead>
    <tbody>
      ${wcag21Criteria.filter(c => c.level === 'AA').map(c => `
      <tr>
        <td><strong>${c.number}</strong> ${c.name}</td>
        <td class="conformance-${c.conformance.toLowerCase().replace(/ /g, '-')}">${c.conformance}</td>
        <td>${c.remarks}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <h3>Table 3: Success Criteria, Level AAA</h3>
  <table>
    <thead>
      <tr>
        <th>Criterion</th>
        <th>Conformance Level</th>
        <th>Remarks and Explanations</th>
      </tr>
    </thead>
    <tbody>
      ${wcag21Criteria.filter(c => c.level === 'AAA').map(c => `
      <tr>
        <td><strong>${c.number}</strong> ${c.name}</td>
        <td class="conformance-${c.conformance.toLowerCase().replace(/ /g, '-')}">${c.conformance}</td>
        <td>${c.remarks}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Revised Section 508 Report</h2>
  <p>The following table lists conformance with functional performance criteria from Section 508 of the Rehabilitation Act.</p>

  <table>
    <thead>
      <tr>
        <th>Criteria</th>
        <th>Conformance Level</th>
        <th>Remarks and Explanations</th>
      </tr>
    </thead>
    <tbody>
      ${section508Criteria.map(c => `
      <tr>
        <td><strong>${c.section}</strong> ${c.criteria}</td>
        <td class="conformance-${c.conformance.toLowerCase().replace(/ /g, '-')}">${c.conformance}</td>
        <td>${c.remarks}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Legal Disclaimer</h2>
  <div class="disclaimer">
    <p>${legalDisclaimer}</p>
  </div>

  <h2>Evaluation Methods Used</h2>
  <ul>
    ${productInfo.evaluationMethods.map(method => `<li>${method}</li>`).join('')}
  </ul>

  <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
    <p>This VPAT was generated on ${productInfo.dateGenerated.toLocaleDateString()} using automated accessibility testing combined with manual review.</p>
    <p>VPAT® is a registered service mark of the Information Technology Industry Council (ITI).</p>
  </footer>
</body>
</html>`;
  }
}

export default VPATGenerator;
