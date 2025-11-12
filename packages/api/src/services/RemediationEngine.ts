import { prisma } from '../lib/db';
import { log } from '../utils/logger';

export interface FixRequest {
  violationId: string;
  wcagCriteria: string;
  issueType: string;
  description: string;
  elementSelector?: string;
  codeSnippet?: string;
  codeLanguage?: string;
}

export interface GeneratedFix {
  wcagCriteria: string;
  issueType: string;
  originalCode?: string;
  fixedCode: string;
  explanation: string;
  confidenceScore: number;
  codeLanguage: string;
}

/**
 * Remediation Engine
 *
 * Generates accessibility fixes for WCAG violations using AI
 * Phase 1: HTML/CSS fixes via prompt templates
 * Phase 2: GitHub PR integration
 * Phase 3: Multi-language support (React, Vue, etc)
 */
export class RemediationEngine {
  /**
   * Generate a fix for a WCAG violation
   */
  static async generateFix(req: FixRequest): Promise<GeneratedFix> {
    try {
      log.info('Generating fix', {
        violationId: req.violationId,
        wcagCriteria: req.wcagCriteria,
        issueType: req.issueType,
      });

      const fixTemplate = await this.getFixTemplate(req.wcagCriteria, req.issueType);
      const codeLanguage = req.codeLanguage || 'html';

      if (fixTemplate && fixTemplate.templates[codeLanguage]) {
        // Use template if available
        return this.applyTemplate(fixTemplate, req, codeLanguage);
      }

      // Otherwise, generate with AI (Phase 2)
      return this.generateWithAI(req);
    } catch (error) {
      log.error(
        'Failed to generate fix',
        error instanceof Error ? error : new Error(String(error)),
        { violationId: req.violationId }
      );
      throw error;
    }
  }

  /**
   * Get fix template for a violation type
   */
  private static async getFixTemplate(
    wcagCriteria: string,
    issueType: string
  ) {
    return await prisma.fixTemplate.findFirst({
      where: {
        wcagCriteria,
        issueType,
        isActive: true,
      },
    });
  }

  /**
   * Apply a template fix
   */
  private static applyTemplate(
    template: any,
    req: FixRequest,
    codeLanguage: string
  ): GeneratedFix {
    const templateCode = template.templates[codeLanguage] || '';
    const example = template.examples?.[0] || {};

    return {
      wcagCriteria: template.wcagCriteria,
      issueType: template.issueType,
      originalCode: req.codeSnippet,
      fixedCode: this.interpolateTemplate(templateCode, req),
      explanation: template.description,
      confidenceScore: 0.9, // Templates have high confidence
      codeLanguage,
    };
  }

  /**
   * Generate fix with AI (placeholder for Phase 2 with OpenAI)
   */
  private static generateWithAI(req: FixRequest): GeneratedFix {
    // Phase 2: Call OpenAI GPT-4 here
    // For now, return mock generation

    const fixes: Record<string, GeneratedFix> = {
      missing_alt_text: {
        wcagCriteria: '1.1.1',
        issueType: 'missing_alt_text',
        originalCode: '<img src="logo.png">',
        fixedCode: '<img src="logo.png" alt="Company logo">',
        explanation:
          'Added descriptive alt text to image. Alt text describes the purpose/content of the image for screen reader users.',
        confidenceScore: 0.95,
        codeLanguage: 'html',
      },
      low_contrast: {
        wcagCriteria: '1.4.3',
        issueType: 'low_contrast',
        originalCode: 'color: #999999; background: #f5f5f5;',
        fixedCode: 'color: #333333; background: #ffffff;',
        explanation:
          'Increased contrast ratio from 3.2:1 to 7.1:1 (WCAG AAA compliant). Changed text color to darker shade for better readability.',
        confidenceScore: 0.92,
        codeLanguage: 'css',
      },
      missing_form_label: {
        wcagCriteria: '1.3.1',
        issueType: 'missing_form_label',
        originalCode: '<input type="email" placeholder="Enter email">',
        fixedCode:
          '<label for="email">Email Address</label>\n<input id="email" type="email" aria-label="Email Address">',
        explanation:
          'Added explicit <label> element and aria-label attribute. Labels help screen reader users understand form field purposes.',
        confidenceScore: 0.93,
        codeLanguage: 'html',
      },
      missing_heading_structure: {
        wcagCriteria: '2.4.1',
        issueType: 'missing_heading_structure',
        originalCode: '<div style="font-size: 24px; font-weight: bold;">Main Title</div>',
        fixedCode: '<h1>Main Title</h1>',
        explanation:
          'Replaced styled div with semantic H1 heading. Proper heading hierarchy helps screen readers and keyboard users navigate content structure.',
        confidenceScore: 0.94,
        codeLanguage: 'html',
      },
      missing_focus_indicator: {
        wcagCriteria: '2.4.7',
        issueType: 'missing_focus_indicator',
        originalCode: 'button { outline: none; }',
        fixedCode:
          'button { }\nbutton:focus { outline: 2px solid #0066cc; outline-offset: 2px; }',
        explanation:
          'Restored focus indicator for keyboard navigation. Users need to see which element is focused when navigating via keyboard.',
        confidenceScore: 0.91,
        codeLanguage: 'css',
      },
    };

    const key = Object.keys(fixes).find((k) =>
      req.issueType.includes(k.split('_')[0])
    );

    return (
      fixes[key || req.issueType] || {
        wcagCriteria: req.wcagCriteria,
        issueType: req.issueType,
        originalCode: req.codeSnippet,
        fixedCode: '<!-- Fix would be generated by GPT-4 in Phase 2 -->',
        explanation: 'AI-powered fix generation available in Phase 2',
        confidenceScore: 0.5,
        codeLanguage: req.codeLanguage || 'html',
      }
    );
  }

  /**
   * Interpolate template with request data
   */
  private static interpolateTemplate(template: string, req: FixRequest): string {
    return template
      .replace('{selector}', req.elementSelector || 'element')
      .replace('{description}', req.description || '');
  }

  /**
   * Save generated fix to database
   */
  static async saveFix(
    tenantId: string,
    violationId: string,
    fix: GeneratedFix
  ) {
    return await prisma.fix.create({
      data: {
        tenantId,
        violationId,
        wcagCriteria: fix.wcagCriteria,
        issueType: fix.issueType,
        codeLanguage: fix.codeLanguage,
        originalCode: fix.originalCode,
        fixedCode: fix.fixedCode,
        explanation: fix.explanation,
        confidenceScore: fix.confidenceScore,
        reviewStatus: fix.confidenceScore > 0.9 ? 'approved' : 'pending',
        generatedBy: 'gpt-4-mock', // Phase 2: actual GPT-4
      },
    });
  }

  /**
   * Get fix quality metrics
   */
  static async getFixMetrics(tenantId: string) {
    const fixes = await prisma.fix.findMany({
      where: { tenantId },
    });

    const applications = await prisma.fixApplication.findMany({
      where: { tenantId },
    });

    const successfulApps = applications.filter((a) => a.success && a.verificationStatus === 'verified');

    return {
      totalFixes: fixes.length,
      approvedFixes: fixes.filter((f) => f.reviewStatus === 'approved').length,
      averageConfidence:
        fixes.length > 0
          ? (fixes.reduce((sum, f) => sum + f.confidenceScore, 0) / fixes.length).toFixed(2)
          : '0.00',
      totalApplications: applications.length,
      successfulApplications: successfulApps.length,
      successRate:
        applications.length > 0
          ? ((successfulApps.length / applications.length) * 100).toFixed(1) + '%'
          : '0%',
      totalGenerationCost: fixes.reduce((sum, f) => sum + f.generationCost, 0).toFixed(2),
    };
  }

  /**
   * Get common fix patterns (for Phase 2 training)
   */
  static async getFixPatterns() {
    const templates = await prisma.fixTemplate.findMany({
      where: { isActive: true },
      orderBy: { usageCount: 'desc' },
      take: 20,
    });

    return templates;
  }
}
