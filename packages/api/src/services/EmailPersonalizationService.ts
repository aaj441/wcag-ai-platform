/**
 * Email Personalization Service
 * AI-powered personalized email generation using GPT-4
 */

import { PrismaClient } from '@prisma/client';
import { log } from '../utils/logger';
import { OpenAIClient } from '../integrations/OpenAIClient';
import type { AuditResult } from './BatchAuditService';
import type { RiskProfile } from './RiskScoringService';

const prisma = new PrismaClient();

export interface PersonalizationContext {
  prospectName: string;
  businessName: string;
  industry: string;
  website: string;
  metro: string;
  riskProfile: RiskProfile;
  auditResults?: AuditResult;
  localContext?: string[]; // e.g., ["Denver tech boom", "3 lawsuits filed last month"]
}

export interface PersonalizedEmail {
  subjectLines: string[]; // 5 variants for A/B testing
  emailBody: string;
  hook: string;
  personalizationFactors: any;
  confidenceScore: number;
  aiModel: string;
  generationCost: number;
}

export class EmailPersonalizationService {
  /**
   * Generate personalized email for prospect
   */
  static async generatePersonalizedEmail(
    context: PersonalizationContext
  ): Promise<PersonalizedEmail> {
    log.info('Generating AI-personalized email', { business: context.businessName });

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(context);

    const startTime = Date.now();

    // Generate email with GPT-4
    const emailContent = await OpenAIClient.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      model: 'gpt-4',
      temperature: 0.8, // Higher temperature for creativity
      maxTokens: 1500,
    });

    const generationTime = Date.now() - startTime;

    // Parse response
    const parsed = this.parseAIResponse(emailContent);

    // Save to database
    const personalizedEmail = {
      subjectLines: parsed.subjectLines,
      emailBody: parsed.body,
      hook: context.riskProfile.suggestedHook,
      personalizationFactors: {
        website_issues: context.auditResults?.violations.map(v => v.id) || [],
        local_context: context.localContext || [],
        risk_score: context.riskProfile.riskScore,
        industry_risk: context.riskProfile.riskFactors.industryRisk,
      },
      confidenceScore: this.calculateConfidenceScore(context, parsed),
      aiModel: 'gpt-4',
      generationCost: OpenAIClient.calculateCost(500, 1000), // Estimated
    };

    log.info('Email generated', { generationTime, cost: personalizedEmail.generationCost });

    return personalizedEmail;
  }

  /**
   * Build system prompt for GPT-4
   */
  private static buildSystemPrompt(): string {
    return `You are an expert B2B email copywriter specializing in WCAG accessibility compliance outreach.

Your job is to write highly personalized, compelling emails to business owners who have accessibility violations on their websites.

Key principles:
1. Lead with empathy and value, not fear
2. Reference specific issues found on THEIR website
3. Include local context (lawsuits in their metro, industry trends)
4. Keep it concise (under 150 words)
5. Clear call-to-action
6. Professional but conversational tone

Output format (JSON):
{
  "subject_lines": ["Subject 1", "Subject 2", "Subject 3", "Subject 4", "Subject 5"],
  "body": "Email body here..."
}

Make each subject line different:
- Subject 1: Question-based
- Subject 2: Urgency-based
- Subject 3: Benefit-focused
- Subject 4: Social proof
- Subject 5: Direct/straightforward`;
  }

  /**
   * Build user prompt with context
   */
  private static buildUserPrompt(context: PersonalizationContext): string {
    const violations = context.auditResults?.violations.slice(0, 3).map(v => v.description).join(', ') || 'accessibility violations';

    return `Generate a personalized email for:

Business: ${context.businessName}
Industry: ${context.industry}
Website: ${context.website}
Location: ${context.metro}

Accessibility Issues Found:
${violations}

Risk Profile:
- Overall Risk Score: ${context.riskProfile.riskScore}/100
- Industry Risk: ${context.riskProfile.riskFactors.industryRisk}/100
- Compliance Score: ${100 - context.riskProfile.riskFactors.complianceRisk}%

Local Context:
${context.localContext?.join('\n') || 'No specific local context'}

Recommended Hook: ${context.riskProfile.suggestedHook}

Key Reasoning:
${context.riskProfile.reasoning.join('\n')}

Generate 5 unique subject lines and a personalized email body that:
1. References their specific violations (be specific!)
2. Mentions local context if applicable
3. Positions as helpful partner, not salesperson
4. Includes compelling call-to-action
5. Is under 150 words

Return as JSON with keys: subject_lines (array of 5 strings), body (string)`;
  }

  /**
   * Parse AI response (expect JSON)
   */
  private static parseAIResponse(response: string): {
    subjectLines: string[];
    body: string;
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        subjectLines: parsed.subject_lines || [],
        body: parsed.body || '',
      };
    } catch (error) {
      log.error('Failed to parse AI response', error as Error);

      // Fallback: try to extract manually
      const lines = response.split('\n');
      return {
        subjectLines: [
          'Quick question about your website',
          'Accessibility issue detected',
          'Protect your business from lawsuits',
          'Free accessibility audit results',
          'Website accessibility update',
        ],
        body: response,
      };
    }
  }

  /**
   * Calculate confidence score based on context quality
   */
  private static calculateConfidenceScore(
    context: PersonalizationContext,
    parsed: any
  ): number {
    let score = 0.5; // Base

    // Boost if we have audit results
    if (context.auditResults && context.auditResults.violations.length > 0) {
      score += 0.2;
    }

    // Boost if we have local context
    if (context.localContext && context.localContext.length > 0) {
      score += 0.15;
    }

    // Boost if subject lines are diverse
    if (parsed.subjectLines && parsed.subjectLines.length === 5) {
      score += 0.1;
    }

    // Boost if email is right length (100-150 words)
    const wordCount = parsed.body.split(' ').length;
    if (wordCount >= 100 && wordCount <= 150) {
      score += 0.05;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Save personalized email to database
   */
  static async savePersonalizedEmail(
    prospectId: string,
    email: PersonalizedEmail
  ): Promise<void> {
    await prisma.personalizedEmail.create({
      data: {
        prospectId,
        subjectLines: email.subjectLines,
        emailBody: email.emailBody,
        hook: email.hook,
        personalizationFactors: email.personalizationFactors,
        aiModel: email.aiModel,
        generationCost: email.generationCost,
        confidenceScore: email.confidenceScore,
      },
    });
  }

  /**
   * Batch generate emails for multiple prospects
   */
  static async batchGenerateEmails(
    contexts: PersonalizationContext[]
  ): Promise<PersonalizedEmail[]> {
    const results: PersonalizedEmail[] = [];

    // Process in batches of 5 to avoid rate limits
    for (let i = 0; i < contexts.length; i += 5) {
      const batch = contexts.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(ctx => this.generatePersonalizedEmail(ctx))
      );
      results.push(...batchResults);

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }
}
