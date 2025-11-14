/**
 * AI Fix Generator Service
 * Generates automated code fixes for WCAG violations
 */

import { v4 as uuidv4 } from 'uuid';
import { FixRequest, FixResult, CodeFix, LegacyViolation } from '../types';
import { log } from '../utils/logger';

/**
 * List of WCAG criteria that can be automatically fixed
 */
export const AUTO_FIXABLE_CRITERIA = [
  '1.1.1', // Alt text
  '1.4.3', // Color contrast
  '2.1.1', // Keyboard access
  '2.4.4', // Link purpose
  '3.3.2', // Labels
  '4.1.2', // Name, Role, Value
] as const;

/**
 * Fix templates for common WCAG violations
 */
const FIX_TEMPLATES: Record<string, (violation: LegacyViolation) => CodeFix> = {
  // 1.1.1 Non-text Content (Missing alt text)
  '1.1.1': (violation) => ({
    original: violation.codeSnippet || '<img src="hero.jpg">',
    fixed: '<img src="hero.jpg" alt="Team collaborating in modern office space">',
    explanation: `Added descriptive alt text to provide text alternative for non-text content. The alt attribute describes the image content for users who cannot see it.`,
  }),

  // 1.4.3 Contrast (Minimum)
  '1.4.3': (violation) => ({
    original: violation.codeSnippet || 'color: #999999; /* Low contrast */',
    fixed: 'color: #333333; /* WCAG AA compliant contrast */',
    explanation: `Improved color contrast to meet WCAG AA standards (4.5:1 ratio for normal text). Changed from low contrast #999 to #333 for better readability.`,
  }),

  // 2.1.1 Keyboard (Missing keyboard access)
  '2.1.1': (violation) => ({
    original: violation.codeSnippet || '<div onclick="handleClick()">Button</div>',
    fixed: '<button type="button" onclick="handleClick()">Button</button>',
    explanation: `Replaced non-semantic div with a semantic button element. Buttons are keyboard-accessible by default and work with assistive technologies.`,
  }),

  // 2.4.4 Link Purpose (In Context)
  '2.4.4': (violation) => ({
    original: violation.codeSnippet || '<a href="/more">Click here</a>',
    fixed: '<a href="/more">Learn more about accessibility features</a>',
    explanation: `Made link text descriptive and meaningful. Users should understand the link's purpose from its text alone, without relying on surrounding context.`,
  }),

  // 3.3.2 Labels or Instructions
  '3.3.2': (violation) => ({
    original: violation.codeSnippet || '<input type="text" placeholder="Name">',
    fixed: '<label for="name">Full Name:</label>\n<input type="text" id="name" name="name" placeholder="Name">',
    explanation: `Added a visible label element associated with the input. Labels provide instructions and are essential for screen reader users.`,
  }),

  // 4.1.2 Name, Role, Value (Missing ARIA)
  '4.1.2': (violation) => ({
    original: violation.codeSnippet || '<div class="custom-button">Submit</div>',
    fixed: '<div class="custom-button" role="button" tabindex="0" aria-label="Submit form">Submit</div>',
    explanation: `Added ARIA role, tabindex, and label to make the custom element accessible. Custom UI components need explicit roles and keyboard support.`,
  }),
};

/**
 * Generate fix instructions based on WCAG criteria
 */
function generateInstructions(wcagCriteria: string, violation: LegacyViolation): string[] {
  const instructions: Record<string, string[]> = {
    '1.1.1': [
      '1. Locate the image element in your HTML/JSX file',
      '2. Add an alt attribute with descriptive text',
      '3. For decorative images, use alt=""',
      '4. Test with a screen reader to verify the description is helpful',
    ],
    '1.4.3': [
      '1. Open your CSS file or style section',
      '2. Update the color values to meet WCAG AA contrast ratio (4.5:1)',
      '3. Use a contrast checker tool to verify compliance',
      '4. Test with different color vision deficiency simulations',
    ],
    '2.1.1': [
      '1. Replace <div> with semantic <button> or <a> elements',
      '2. Ensure interactive elements are keyboard focusable',
      '3. Test navigation using only keyboard (Tab, Enter, Space)',
      '4. Verify focus indicators are visible',
    ],
    '2.4.4': [
      '1. Replace generic link text ("click here", "read more") with descriptive text',
      '2. Ensure link purpose is clear from the text alone',
      '3. Consider adding aria-label for additional context if needed',
    ],
    '3.3.2': [
      '1. Add <label> elements for all form inputs',
      '2. Use the "for" attribute to associate labels with inputs',
      '3. Ensure labels are visible (not just placeholders)',
      '4. Test form with screen reader to verify label announcements',
    ],
    '4.1.2': [
      '1. Add appropriate ARIA role to custom elements',
      '2. Add tabindex="0" to make element keyboard focusable',
      '3. Add aria-label or aria-labelledby for accessible name',
      '4. Implement keyboard event handlers (Enter, Space)',
    ],
  };

  return instructions[wcagCriteria] || [
    '1. Review the WCAG criteria documentation',
    '2. Apply the suggested code changes',
    '3. Test with accessibility tools',
    '4. Verify with real users if possible',
  ];
}

/**
 * Calculate confidence score based on violation type and available context
 */
function calculateConfidence(violation: LegacyViolation): number {
  let confidence = 0.85; // Base confidence

  // Higher confidence for violations with code snippets
  if (violation.codeSnippet && violation.codeSnippet.trim().length > 0) {
    confidence += 0.1;
  }

  // Adjust based on violation type
  const highConfidenceTypes = ['1.1.1', '2.1.1', '3.3.2'];
  if (highConfidenceTypes.includes(violation.wcagCriteria)) {
    confidence += 0.05;
  }

  // Cap at 0.99 (never 100% certain without testing)
  return Math.min(confidence, 0.99);
}

/**
 * Estimate effort required for fix implementation
 */
function estimateEffort(violation: LegacyViolation): string {
  const effortMap: Record<string, string> = {
    '1.1.1': '5 minutes',
    '1.4.3': '10 minutes',
    '2.1.1': '15 minutes',
    '2.4.4': '5 minutes',
    '3.3.2': '10 minutes',
    '4.1.2': '20 minutes',
  };

  return effortMap[violation.wcagCriteria] || '15 minutes';
}

/**
 * Generate AI-powered fix for a violation
 */
export async function generateFix(
  request: FixRequest,
  violation: LegacyViolation
): Promise<FixResult> {
  try {
    log.info(`Generating fix for violation ${request.violationId}`);

    // Get fix template based on WCAG criteria
    const templateFn = FIX_TEMPLATES[violation.wcagCriteria];
    
    let codeFix: CodeFix;
    if (templateFn) {
      codeFix = templateFn(violation);
    } else {
      // Generic fix for unsupported criteria
      codeFix = {
        original: violation.codeSnippet || '/* Original code not available */',
        fixed: '/* Apply WCAG fixes based on recommendation */',
        explanation: `${violation.recommendation}. Refer to WCAG ${violation.wcagCriteria} documentation for specific implementation guidance.`,
      };
    }

    // Detect affected files from violation context
    const filesAffected = detectAffectedFiles(violation);

    const fixResult: FixResult = {
      id: uuidv4(),
      violationId: request.violationId,
      type: request.type || 'manual',
      status: 'generated',
      codeFix,
      filesAffected,
      estimatedEffort: estimateEffort(violation),
      confidence: calculateConfidence(violation),
      instructions: generateInstructions(violation.wcagCriteria, violation),
      generatedAt: new Date(),
      metadata: {
        model: 'template-based-v1',
      },
    };

    log.info(`Successfully generated fix for violation ${request.violationId}`);
    return fixResult;
  } catch (error) {
    log.error('Error generating fix', error as Error);
    throw new Error('Failed to generate fix');
  }
}

/**
 * Detect affected files from violation context
 */
function detectAffectedFiles(violation: LegacyViolation): string[] {
  const files: string[] = [];

  // Try to extract file path from element selector or technical details
  if (violation.technicalDetails) {
    const fileMatch = violation.technicalDetails.match(/([^\s]+\.(?:html|jsx?|tsx?|css))/i);
    if (fileMatch) {
      files.push(fileMatch[1]);
    }
  }

  // Infer file type from violation type
  if (violation.wcagCriteria.startsWith('1.4')) {
    files.push('styles.css');
  } else if (violation.element) {
    files.push('index.html');
  }

  return files.length > 0 ? files : ['index.html'];
}

/**
 * Generate multiple fixes for a batch of violations
 */
export async function generateBatchFixes(
  violations: LegacyViolation[]
): Promise<FixResult[]> {
  const fixes: FixResult[] = [];

  for (const violation of violations) {
    try {
      const request: FixRequest = {
        violationId: violation.id,
        type: 'manual',
      };
      const fix = await generateFix(request, violation);
      fixes.push(fix);
    } catch (error) {
      log.error(`Failed to generate fix for violation ${violation.id}`, error as Error);
    }
  }

  return fixes;
}
