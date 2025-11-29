import { prisma } from '../lib/db';
import { log } from '../utils/logger';
import { aiService, AIFixRequest } from './AIService';
import { multiLLMValidator, MultiLLMValidationResult } from './MultiLLMValidator';

export interface FixRequest {
  violationId: string;
  wcagCriteria: string;
  issueType: string;
  description: string;
  elementSelector?: string;
  codeSnippet?: string;
  codeLanguage?: string;
  pageContext?: string;
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
        // Use template if available (fast path)
        return this.applyTemplate(fixTemplate, req, codeLanguage);
      }

      // Otherwise, generate with AI (intelligent path)
      return await this.generateWithAI(req);
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
   * Generate fix with AI (integrated with OpenAI/Anthropic)
   */
  private static async generateWithAI(req: FixRequest): Promise<GeneratedFix> {
    // Use the AI service for generation
    const aiRequest: AIFixRequest = {
      violationId: req.violationId,
      wcagCriteria: req.wcagCriteria,
      issueType: req.issueType,
      description: req.description,
      elementSelector: req.elementSelector,
      codeSnippet: req.codeSnippet,
      pageContext: req.pageContext,
    };

    const aiResponse = await aiService.generateFix(aiRequest);

    return {
      wcagCriteria: req.wcagCriteria,
      issueType: req.issueType,
      originalCode: req.codeSnippet,
      fixedCode: aiResponse.fixedCode,
      explanation: aiResponse.explanation,
      confidenceScore: aiResponse.confidence,
      codeLanguage: req.codeLanguage || 'html',
    };
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

    const successfulApps = applications.filter((a: any) => a.success && a.verificationStatus === 'verified');

    return {
      totalFixes: fixes.length,
      approvedFixes: fixes.filter((f: any) => f.reviewStatus === 'approved').length,
      averageConfidence:
        fixes.length > 0
          ? (fixes.reduce((sum: number, f: any) => sum + f.confidenceScore, 0) / fixes.length).toFixed(2)
          : '0.00',
      totalApplications: applications.length,
      successfulApplications: successfulApps.length,
      successRate:
        applications.length > 0
          ? ((successfulApps.length / applications.length) * 100).toFixed(1) + '%'
          : '0%',
      totalGenerationCost: fixes.reduce((sum: number, f: any) => sum + f.generationCost, 0).toFixed(2),
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

  /**
   * Generate fix with multi-LLM validation
   *
   * Uses multiple LLMs to generate and validate fixes, providing:
   * - Responses from multiple AI providers (GPT, Claude, Sonar)
   * - Majority vote consensus
   * - Expert critic review
   * - Agreement scoring
   *
   * This provides higher confidence and transparency for critical fixes.
   */
  static async generateFixWithMultiLLM(req: FixRequest): Promise<{
    fix: GeneratedFix;
    validation: MultiLLMValidationResult;
  }> {
    try {
      log.info('Generating fix with multi-LLM validation', {
        violationId: req.violationId,
        wcagCriteria: req.wcagCriteria,
        issueType: req.issueType,
      });

      // Build AI request
      const aiRequest: AIFixRequest = {
        violationId: req.violationId,
        wcagCriteria: req.wcagCriteria,
        issueType: req.issueType,
        description: req.description,
        elementSelector: req.elementSelector,
        codeSnippet: req.codeSnippet,
        pageContext: req.pageContext,
      };

      // Run multi-LLM validation workflow
      const validation = await multiLLMValidator.validateWithMultipleLLMs(aiRequest);

      // Use the best response (either from critic's merged solution or majority vote)
      const bestResponse = validation.critic.merged || validation.majorityVote;

      // Create GeneratedFix from the best response
      const fix: GeneratedFix = {
        wcagCriteria: req.wcagCriteria,
        issueType: req.issueType,
        originalCode: req.codeSnippet,
        fixedCode: bestResponse.fixedCode,
        explanation: bestResponse.explanation,
        confidenceScore: this.calculateEnhancedConfidence(bestResponse.confidence, validation),
        codeLanguage: req.codeLanguage || 'html',
      };

      log.info('Multi-LLM fix generated successfully', {
        violationId: req.violationId,
        consensusLevel: validation.consensusLevel,
        agreementScore: validation.critic.agreementScore,
        finalConfidence: fix.confidenceScore,
      });

      return { fix, validation };
    } catch (error) {
      log.error(
        'Failed to generate multi-LLM fix',
        error instanceof Error ? error : new Error(String(error)),
        { violationId: req.violationId }
      );
      throw error;
    }
  }

  /**
   * Save multi-LLM validation to database
   */
  static async saveMultiLLMValidation(
    tenantId: string,
    fixId: string,
    validation: MultiLLMValidationResult,
    request: FixRequest
  ) {
    try {
      const validationRecord = await prisma.multiLLMValidation.create({
        data: {
          tenantId,
          fixId,
          violationId: request.violationId,
          wcagCriteria: request.wcagCriteria,
          issueType: request.issueType,
          requestData: {
            violationId: request.violationId,
            wcagCriteria: request.wcagCriteria,
            issueType: request.issueType,
            description: request.description,
            elementSelector: request.elementSelector,
            codeSnippet: request.codeSnippet,
            codeLanguage: request.codeLanguage,
            pageContext: request.pageContext,
          },
          majorityVoteResult: {
            fixedCode: validation.majorityVote.fixedCode,
            explanation: validation.majorityVote.explanation,
            confidence: validation.majorityVote.confidence,
            alternativeFixes: validation.majorityVote.alternativeFixes,
          },
          criticReview: {
            best: validation.critic.best,
            issues: validation.critic.issues,
            rationale: validation.critic.rationale,
            agreementScore: validation.critic.agreementScore,
            merged: validation.critic.merged,
          },
          consensusLevel: validation.consensusLevel,
          agreementScore: validation.critic.agreementScore,
          totalLatency: validation.totalLatency,
          totalCost: validation.totalCost,
          numProviders: validation.responses.length,
          status: 'completed',
          providerResponses: {
            create: validation.responses.map((response) => ({
              provider: response.provider,
              model: response.model,
              fixedCode: response.output.fixedCode,
              explanation: response.output.explanation,
              confidence: response.output.confidence,
              alternativeFixes: response.output.alternativeFixes || [],
              latency: response.latency,
              cost: response.cost || 0,
              issues: validation.critic.issues[response.model] || [],
              selectedAsBest: validation.critic.best === response.model,
              status: 'success',
            })),
          },
        },
        include: {
          providerResponses: true,
        },
      });

      log.info('Multi-LLM validation saved to database', {
        validationId: validationRecord.id,
        fixId,
        numProviders: validation.responses.length,
      });

      return validationRecord;
    } catch (error) {
      log.error(
        'Failed to save multi-LLM validation',
        error instanceof Error ? error : new Error(String(error)),
        { fixId }
      );
      throw error;
    }
  }

  /**
   * Calculate enhanced confidence based on multi-LLM consensus
   *
   * Boosts confidence when:
   * - High agreement between models
   * - High consensus level
   * - Multiple models agree on the solution
   */
  private static calculateEnhancedConfidence(
    baseConfidence: number,
    validation: MultiLLMValidationResult
  ): number {
    let enhancedConfidence = baseConfidence;

    // Boost for high agreement (up to +0.1)
    const agreementBoost = validation.critic.agreementScore * 0.1;
    enhancedConfidence += agreementBoost;

    // Boost for consensus level
    const consensusBoost = {
      high: 0.05,
      medium: 0.02,
      low: 0,
    };
    enhancedConfidence += consensusBoost[validation.consensusLevel];

    // Boost for multiple providers agreeing (up to +0.05)
    const providerCountBoost = Math.min(validation.responses.length / 3, 1) * 0.05;
    enhancedConfidence += providerCountBoost;

    // Cap at 1.0
    return Math.min(enhancedConfidence, 1.0);
  }

  /**
   * Get multi-LLM validation metrics for a tenant
   */
  static async getMultiLLMMetrics(tenantId: string) {
    const validations = await prisma.multiLLMValidation.findMany({
      where: { tenantId },
      include: {
        providerResponses: true,
      },
    });

    if (validations.length === 0) {
      return {
        totalValidations: 0,
        averageAgreementScore: '0.00',
        consensusBreakdown: { high: 0, medium: 0, low: 0 },
        averageLatency: '0ms',
        totalCost: '$0.00',
        averageConfidence: '0.00',
      };
    }

    const consensusBreakdown = validations.reduce(
      (acc, v) => {
        acc[v.consensusLevel as 'high' | 'medium' | 'low']++;
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );

    return {
      totalValidations: validations.length,
      averageAgreementScore: (
        validations.reduce((sum, v) => sum + v.agreementScore, 0) / validations.length
      ).toFixed(2),
      consensusBreakdown,
      averageLatency:
        Math.round(
          validations.reduce((sum, v) => sum + v.totalLatency, 0) / validations.length
        ) + 'ms',
      totalCost: '$' + validations.reduce((sum, v) => sum + v.totalCost, 0).toFixed(2),
      averageConfidence:
        validations.length > 0
          ? (
              validations.reduce((sum, v) => {
                const result = v.majorityVoteResult as any;
                return sum + (result.confidence || 0);
              }, 0) / validations.length
            ).toFixed(2)
          : '0.00',
    };
  }
}
