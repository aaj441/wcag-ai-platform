/**
 * AI-Powered Personalization Engine for Cold Outreach
 *
 * Uses AI to create hyper-personalized outreach messages based on:
 * - Company data and industry
 * - Website scan results
 * - Recent news and events
 * - Competitor intelligence
 * - Local market insights
 */

import Anthropic from '@anthropic-ai/sdk';
import { PersonalizationData } from './EmailTemplateService';

export interface PersonalizationContext {
  prospect: PersonalizationData;
  scanResults?: {
    violations: Array<{
      code: string;
      description: string;
      impact: 'critical' | 'serious' | 'moderate' | 'minor';
      element?: string;
    }>;
    complianceScore: number;
    riskLevel: 'high' | 'medium' | 'low';
  };
  recentNews?: Array<{
    title: string;
    date: string;
    source: string;
  }>;
  competitorIntel?: {
    competitors: string[];
    competitorComplianceScores?: Record<string, number>;
  };
  industryInsights?: {
    lawsuitTrends: number; // % change
    averageSettlement: number;
    commonViolations: string[];
  };
}

export interface PersonalizedMessage {
  subject: string;
  body: string;
  personalizationScore: number; // 0-100
  hooks: string[]; // Which personalization elements were used
  reasoning?: string; // Why these personalization choices were made
}

export class PersonalizationEngine {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate a hyper-personalized cold email using AI
   */
  public async generatePersonalizedEmail(
    context: PersonalizationContext,
    templateType: 'initial' | 'follow_up' | 'value_add' = 'initial',
    hook: 'lawsuit_risk' | 'compliance' | 'competitive_advantage' | 'value_first' = 'lawsuit_risk'
  ): Promise<PersonalizedMessage> {
    const prompt = this.buildPersonalizationPrompt(context, templateType, hook);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseAIResponse(content.text, context);
    } catch (error) {
      console.error('Error generating personalized email:', error);
      throw new Error('Failed to generate personalized email');
    }
  }

  /**
   * Build the AI prompt for email personalization
   */
  private buildPersonalizationPrompt(
    context: PersonalizationContext,
    templateType: string,
    hook: string
  ): string {
    const { prospect, scanResults, recentNews, competitorIntel, industryInsights } = context;

    return `You are an expert B2B cold email copywriter specializing in accessibility consulting sales.

Write a highly personalized cold outreach email with the following context:

PROSPECT INFORMATION:
- Company: ${prospect.companyName}
- Website: ${prospect.companyWebsite}
- Industry: ${prospect.industry || 'Unknown'}
- Size: ${prospect.employeeCount ? `${prospect.employeeCount} employees` : 'Unknown'}
- Contact: ${prospect.firstName || 'Decision maker'} ${prospect.lastName || ''}

${scanResults ? `
ACCESSIBILITY SCAN RESULTS:
- Compliance Score: ${scanResults.complianceScore}/100
- Risk Level: ${scanResults.riskLevel}
- Total Violations: ${scanResults.violations.length}
- Critical Issues: ${scanResults.violations.filter(v => v.impact === 'critical').length}

Top 3 Violations:
${scanResults.violations.slice(0, 3).map(v => `• ${v.code}: ${v.description} (${v.impact})`).join('\n')}
` : ''}

${recentNews && recentNews.length > 0 ? `
RECENT COMPANY NEWS:
${recentNews.map(n => `• ${n.title} (${n.date})`).join('\n')}
` : ''}

${competitorIntel ? `
COMPETITIVE INTELLIGENCE:
- Known Competitors: ${competitorIntel.competitors.join(', ')}
${competitorIntel.competitorComplianceScores ? `
- Competitor Compliance Scores:
${Object.entries(competitorIntel.competitorComplianceScores).map(([name, score]) => `  • ${name}: ${score}/100`).join('\n')}
` : ''}
` : ''}

${industryInsights ? `
INDUSTRY INSIGHTS (${prospect.industry}):
- Lawsuit Trend: ${industryInsights.lawsuitTrends > 0 ? '+' : ''}${industryInsights.lawsuitTrends}% year-over-year
- Average Settlement: $${industryInsights.averageSettlement.toLocaleString()}
- Most Common Violations: ${industryInsights.commonViolations.join(', ')}
` : ''}

EMAIL REQUIREMENTS:
- Type: ${templateType} contact
- Primary Hook: ${hook}
- Tone: Professional but conversational, not salesy
- Length: 100-150 words max
- Call to Action: Request a 15-minute call

PERSONALIZATION REQUIREMENTS:
1. Use specific data points from the scan results (actual violation codes/descriptions)
2. Reference recent news if available and relevant
3. Use competitor comparisons if data is available
4. Cite specific industry statistics
5. Make it feel like you personally researched this company
6. Avoid generic phrases like "I noticed" or "I see that"
7. Lead with value, not your credentials
8. Include one specific, actionable insight they can use immediately

OUTPUT FORMAT:
Return your response in this exact JSON format:
{
  "subject": "email subject line (max 60 characters)",
  "body": "email body text",
  "hooks": ["list", "of", "personalization", "elements", "used"],
  "reasoning": "brief explanation of personalization strategy"
}

Write the email now:`;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(
    aiResponse: string,
    context: PersonalizationContext
  ): PersonalizedMessage {
    try {
      // Extract JSON from response (AI might include explanatory text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Calculate personalization score based on hooks used
      const personalizationScore = this.calculatePersonalizationScore(
        parsed.hooks || [],
        context
      );

      return {
        subject: parsed.subject,
        body: parsed.body,
        personalizationScore,
        hooks: parsed.hooks || [],
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI-generated email');
    }
  }

  /**
   * Calculate personalization score (0-100)
   */
  private calculatePersonalizationScore(
    hooks: string[],
    context: PersonalizationContext
  ): number {
    let score = 0;

    // Base score for having any personalization
    score += 20;

    // Score for specific data usage
    if (context.scanResults) score += 25;
    if (context.recentNews && context.recentNews.length > 0) score += 20;
    if (context.competitorIntel) score += 20;
    if (context.industryInsights) score += 15;

    // Bonus for multiple hooks
    score += Math.min(hooks.length * 5, 20);

    return Math.min(score, 100);
  }

  /**
   * Generate personalized subject lines (A/B test variants)
   */
  public async generateSubjectLines(
    context: PersonalizationContext,
    count: number = 3
  ): Promise<string[]> {
    const prompt = `Generate ${count} different subject lines for a cold email to ${context.prospect.companyName}.

Context:
- Company: ${context.prospect.companyName}
- Industry: ${context.prospect.industry || 'Unknown'}
${context.scanResults ? `- Found ${context.scanResults.violations.length} WCAG violations` : ''}
${context.competitorIntel ? `- Competitors: ${context.competitorIntel.competitors.join(', ')}` : ''}

Requirements:
- Max 60 characters each
- Each should use a different hook: curiosity, urgency, personalization, value
- Professional tone
- Avoid spam trigger words

Return ONLY a JSON array of strings: ["subject 1", "subject 2", "subject 3"]`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        temperature: 0.8,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error generating subject lines:', error);
      return [
        `${context.prospect.companyName} - accessibility compliance gap`,
        `Quick question about ${context.prospect.companyWebsite}`,
        `${context.prospect.industry} accessibility audit results`,
      ];
    }
  }

  /**
   * Generate opening lines based on prospect research
   */
  public async generateOpeningLine(context: PersonalizationContext): Promise<string> {
    const prompt = `Write ONE opening line for a cold email to ${context.prospect.firstName || 'a decision maker'} at ${context.prospect.companyName}.

${context.recentNews && context.recentNews.length > 0 ? `
Recent news: "${context.recentNews[0].title}"
` : ''}

${context.scanResults ? `
Their website has ${context.scanResults.violations.length} accessibility violations.
` : ''}

Requirements:
- ONE sentence only
- Reference specific, recent information
- Create immediate relevance
- Don't mention yourself or your company yet
- Conversational tone

Return ONLY the opening line, no JSON, no explanation.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return content.text.trim().replace(/^["']|["']$/g, '');
    } catch (error) {
      console.error('Error generating opening line:', error);
      return `I noticed ${context.prospect.companyWebsite} has some accessibility compliance gaps that could be quick wins.`;
    }
  }

  /**
   * Enrich personalization data with AI-generated insights
   */
  public async enrichProspectData(
    prospect: PersonalizationData,
    additionalContext?: string
  ): Promise<Record<string, any>> {
    const prompt = `Analyze this prospect and suggest personalization angles for a cold outreach email:

Company: ${prospect.companyName}
Website: ${prospect.companyWebsite}
Industry: ${prospect.industry || 'Unknown'}
${additionalContext || ''}

Provide:
1. 2-3 specific pain points they likely have related to website accessibility
2. 1-2 relevant compliance concerns for their industry
3. A local/industry reference that would build credibility
4. One "quick win" accessibility fix they could implement

Return as JSON:
{
  "painPoints": ["...", "..."],
  "complianceConcerns": ["...", "..."],
  "credibilityReference": "...",
  "quickWin": "..."
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error enriching prospect data:', error);
      return {
        painPoints: ['ADA lawsuit risk', 'Missing enterprise customers due to compliance gaps'],
        complianceConcerns: ['WCAG 2.1 AA compliance', 'ADA Title III requirements'],
        credibilityReference: `Other ${prospect.industry || ''} companies in your area`,
        quickWin: 'Add ARIA labels to interactive elements',
      };
    }
  }
}

export default PersonalizationEngine;
