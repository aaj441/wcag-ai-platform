/**
 * Multi-LLM Validation Workflow Orchestrator
 *
 * Implements a production-level multi-LLM validation pattern:
 * 1. Sends prompts to multiple LLMs (Claude, GPT, Sonar)
 * 2. Aggregates and compares responses
 * 3. Uses a critic/reviewer LLM to analyze outputs
 * 4. Returns comprehensive results with majority vote and expert review
 */

import { log } from '../utils/logger';
import { AIFixRequest, AIFixResponse } from './AIService';

export interface LLMResponse {
  model: string;
  provider: 'openai' | 'anthropic' | 'sonar';
  output: AIFixResponse;
  latency: number;
  cost?: number;
}

export interface CriticReview {
  best: string;
  issues: Record<string, string[]>;
  rationale: string;
  merged?: AIFixResponse;
  agreementScore: number;
}

export interface MultiLLMValidationResult {
  responses: LLMResponse[];
  majorityVote: AIFixResponse;
  critic: CriticReview;
  timestamp: Date;
  totalLatency: number;
  totalCost: number;
  consensusLevel: 'high' | 'medium' | 'low';
}

export class MultiLLMValidator {
  private openaiApiKey: string;
  private anthropicApiKey: string;
  private sonarApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
    this.sonarApiKey = process.env.PERPLEXITY_API_KEY || process.env.SONAR_API_KEY || '';

    if (!this.openaiApiKey && !this.anthropicApiKey) {
      log.warn('⚠️  No LLM API keys configured for multi-LLM validation');
      log.warn('   Set OPENAI_API_KEY and ANTHROPIC_API_KEY for full functionality');
    }
  }

  /**
   * STEP 1: Send prompt to all available LLMs in parallel
   */
  async getAllLLMAnswers(request: AIFixRequest): Promise<LLMResponse[]> {
    const startTime = Date.now();
    const promises: Promise<LLMResponse | null>[] = [];

    // Call all available LLM providers in parallel
    if (this.openaiApiKey) {
      promises.push(this.callGPT(request));
    }
    if (this.anthropicApiKey) {
      promises.push(this.callClaude(request));
    }
    if (this.sonarApiKey) {
      promises.push(this.callSonar(request));
    }

    // If no API keys, return mock responses for testing
    if (promises.length === 0) {
      log.warn('No LLM API keys available, using mock responses');
      return this.getMockResponses(request);
    }

    const results = await Promise.all(promises);
    const validResponses = results.filter((r): r is LLMResponse => r !== null);

    log.info(`Retrieved ${validResponses.length} LLM responses in ${Date.now() - startTime}ms`);
    return validResponses;
  }

  /**
   * STEP 2: Aggregate and compare LLM outputs using majority vote
   */
  getMajorityVote(responses: LLMResponse[]): AIFixResponse {
    if (responses.length === 0) {
      throw new Error('No responses to calculate majority vote');
    }

    // Group similar responses by comparing fixed code similarity
    const responseGroups = new Map<string, { response: AIFixResponse; count: number; models: string[] }>();

    responses.forEach((r) => {
      const normalizedCode = this.normalizeCode(r.output.fixedCode);
      const existing = responseGroups.get(normalizedCode);

      if (existing) {
        existing.count++;
        existing.models.push(r.model);
        // Average the confidence scores
        existing.response.confidence = (existing.response.confidence * (existing.count - 1) + r.output.confidence) / existing.count;
      } else {
        responseGroups.set(normalizedCode, {
          response: { ...r.output },
          count: 1,
          models: [r.model],
        });
      }
    });

    // Find the group with the most votes
    let maxCount = 0;
    let majorityResponse: AIFixResponse | null = null;

    responseGroups.forEach((group) => {
      if (group.count > maxCount) {
        maxCount = group.count;
        majorityResponse = group.response;
      }
    });

    if (!majorityResponse) {
      // If no majority, return the first response with a warning
      log.warn('No clear majority found, returning first response');
      return responses[0].output;
    }

    log.info(`Majority vote: ${maxCount}/${responses.length} models agree`);
    return majorityResponse;
  }

  /**
   * STEP 3: Critique with a reviewer LLM (Claude as default)
   */
  async getCriticReview(
    request: AIFixRequest,
    responses: LLMResponse[]
  ): Promise<CriticReview> {
    const critiquePrompt = this.buildCritiquePrompt(request, responses);

    try {
      // Use Claude as the critic (or fallback to GPT if Claude unavailable)
      let reviewText: string;

      if (this.anthropicApiKey) {
        reviewText = await this.callCriticLLM(critiquePrompt, 'anthropic');
      } else if (this.openaiApiKey) {
        reviewText = await this.callCriticLLM(critiquePrompt, 'openai');
      } else {
        return this.getMockCriticReview(responses);
      }

      // Parse the JSON response
      const review = this.parseCriticResponse(reviewText, responses);
      return review;
    } catch (error) {
      log.error('Critic review failed', error instanceof Error ? error : new Error(String(error)));
      return this.getMockCriticReview(responses);
    }
  }

  /**
   * STEP 4: Full workflow runner
   */
  async validateWithMultipleLLMs(request: AIFixRequest): Promise<MultiLLMValidationResult> {
    const startTime = Date.now();

    log.info('Starting multi-LLM validation', {
      violationId: request.violationId,
      wcagCriteria: request.wcagCriteria,
    });

    try {
      // 1. Get answers from all LLMs
      const responses = await this.getAllLLMAnswers(request);

      // 2. Calculate majority vote
      const majorityVote = this.getMajorityVote(responses);

      // 3. Get critic review
      const critic = await this.getCriticReview(request, responses);

      // 4. Calculate consensus level
      const consensusLevel = this.calculateConsensusLevel(responses, critic);

      // 5. Calculate total cost and latency
      const totalLatency = Date.now() - startTime;
      const totalCost = responses.reduce((sum, r) => sum + (r.cost || 0), 0);

      const result: MultiLLMValidationResult = {
        responses,
        majorityVote,
        critic,
        timestamp: new Date(),
        totalLatency,
        totalCost,
        consensusLevel,
      };

      log.info('Multi-LLM validation completed', {
        violationId: request.violationId,
        numResponses: responses.length,
        consensusLevel,
        totalLatency: `${totalLatency}ms`,
      });

      return result;
    } catch (error) {
      log.error('Multi-LLM validation failed', error instanceof Error ? error : new Error(String(error)), {
        violationId: request.violationId,
      });
      throw error;
    }
  }

  /**
   * Call OpenAI GPT
   */
  private async callGPT(request: AIFixRequest): Promise<LLMResponse | null> {
    const startTime = Date.now();

    try {
      const prompt = this.buildFixPrompt(request);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert accessibility consultant. Always provide valid, production-ready code fixes in JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content || '';
      const parsedResponse = this.parseAIResponse(content, request);

      return {
        model: 'GPT-4',
        provider: 'openai',
        output: parsedResponse,
        latency: Date.now() - startTime,
        cost: this.estimateCost('openai', content.length),
      };
    } catch (error) {
      log.error('GPT call failed', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Call Anthropic Claude
   */
  private async callClaude(request: AIFixRequest): Promise<LLMResponse | null> {
    const startTime = Date.now();

    try {
      const prompt = this.buildFixPrompt(request);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.content[0]?.text || '';
      const parsedResponse = this.parseAIResponse(content, request);

      return {
        model: 'Claude-3',
        provider: 'anthropic',
        output: parsedResponse,
        latency: Date.now() - startTime,
        cost: this.estimateCost('anthropic', content.length),
      };
    } catch (error) {
      log.error('Claude call failed', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Call Perplexity Sonar
   */
  private async callSonar(request: AIFixRequest): Promise<LLMResponse | null> {
    const startTime = Date.now();

    try {
      const prompt = this.buildFixPrompt(request);
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sonarApiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are an expert accessibility consultant. Always provide valid, production-ready code fixes in JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sonar API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content || '';
      const parsedResponse = this.parseAIResponse(content, request);

      return {
        model: 'Sonar',
        provider: 'sonar',
        output: parsedResponse,
        latency: Date.now() - startTime,
        cost: this.estimateCost('sonar', content.length),
      };
    } catch (error) {
      log.error('Sonar call failed', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Build prompt for fix generation
   */
  private buildFixPrompt(request: AIFixRequest): string {
    return `You are an expert web accessibility consultant specializing in WCAG 2.1 AA/AAA compliance.

VIOLATION DETAILS:
- WCAG Criteria: ${request.wcagCriteria}
- Issue Type: ${request.issueType}
- Description: ${request.description}
- Element Selector: ${request.elementSelector || 'N/A'}

CURRENT CODE:
\`\`\`html
${request.codeSnippet || 'No code snippet provided'}
\`\`\`

${request.pageContext ? `PAGE CONTEXT:\n${request.pageContext}\n` : ''}

TASK:
Generate a complete, production-ready fix that:
1. Resolves the WCAG violation completely
2. Maintains existing functionality and design
3. Follows accessibility best practices
4. Includes proper ARIA attributes where needed
5. Is compatible with modern browsers and assistive technologies

Provide your response in the following JSON format:
{
  "fixedCode": "The complete fixed code",
  "explanation": "Clear explanation of what was changed and why",
  "confidence": 0.95,
  "alternativeFixes": ["Alternative approach 1", "Alternative approach 2"]
}`;
  }

  /**
   * Build prompt for critic review
   */
  private buildCritiquePrompt(request: AIFixRequest, responses: LLMResponse[]): string {
    const responsesText = responses
      .map((r, i) => `Answer ${i + 1} [${r.model}]:\nFixed Code:\n${r.output.fixedCode}\n\nExplanation:\n${r.output.explanation}\n\nConfidence: ${r.output.confidence}`)
      .join('\n\n---\n\n');

    return `Consider this WCAG accessibility violation task:
WCAG Criteria: ${request.wcagCriteria}
Issue Type: ${request.issueType}
Description: ${request.description}

Original Code:
${request.codeSnippet || 'N/A'}

---
Model outputs:
${responsesText}
---

As an expert accessibility consultant, please:
a) List issues, hallucinations, or errors found in each answer
b) Choose the best answer and explain why
c) Calculate an agreement score (0.0-1.0) based on how similar the solutions are
d) Suggest a merged/corrected version if beneficial

Provide output in JSON format:
{
  "issues": {
    "GPT-4": ["issue 1", "issue 2"],
    "Claude-3": ["issue 1"],
    "Sonar": []
  },
  "best": "Model name that provided the best solution",
  "rationale": "Detailed explanation of why this solution is best",
  "agreementScore": 0.85,
  "merged": {
    "fixedCode": "Optimal merged solution (if different from best)",
    "explanation": "Explanation of merged solution",
    "confidence": 0.95,
    "alternativeFixes": []
  }
}`;
  }

  /**
   * Call critic LLM for review
   */
  private async callCriticLLM(prompt: string, provider: 'openai' | 'anthropic'): Promise<string> {
    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.content[0]?.text || '';
    } else {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert accessibility consultant providing critical review of AI-generated solutions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.choices[0]?.message?.content || '';
    }
  }

  /**
   * Parse AI response to AIFixResponse format
   */
  private parseAIResponse(content: string, request: AIFixRequest): AIFixResponse {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) ||
                       content.match(/(\{[\s\S]*?\})/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          fixedCode: parsed.fixedCode || '',
          explanation: parsed.explanation || '',
          confidence: parsed.confidence || 0.75,
          alternativeFixes: parsed.alternativeFixes || [],
        };
      }
    } catch (error) {
      log.warn('Failed to parse AI response as JSON, using plain text');
    }

    // Fallback to plain text
    return {
      fixedCode: content,
      explanation: `AI-generated fix for ${request.issueType}`,
      confidence: 0.7,
      alternativeFixes: [],
    };
  }

  /**
   * Parse critic response
   */
  private parseCriticResponse(content: string, responses: LLMResponse[]): CriticReview {
    try {
      const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) ||
                       content.match(/(\{[\s\S]*?\})/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          best: parsed.best || responses[0].model,
          issues: parsed.issues || {},
          rationale: parsed.rationale || 'Analysis completed',
          merged: parsed.merged,
          agreementScore: parsed.agreementScore || 0.5,
        };
      }
    } catch (error) {
      log.warn('Failed to parse critic response, using default');
    }

    return this.getMockCriticReview(responses);
  }

  /**
   * Normalize code for comparison
   */
  private normalizeCode(code: string): string {
    return code
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/["']/g, '')
      .trim();
  }

  /**
   * Calculate consensus level
   */
  private calculateConsensusLevel(
    responses: LLMResponse[],
    critic: CriticReview
  ): 'high' | 'medium' | 'low' {
    if (critic.agreementScore >= 0.8) return 'high';
    if (critic.agreementScore >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Estimate API cost (rough estimates in USD)
   */
  private estimateCost(provider: 'openai' | 'anthropic' | 'sonar', tokens: number): number {
    const costPerToken = {
      openai: 0.00003, // GPT-4 pricing
      anthropic: 0.000015, // Claude-3 Sonnet pricing
      sonar: 0.00001, // Estimated Sonar pricing
    };

    return (tokens / 4) * costPerToken[provider]; // Rough token estimate
  }

  /**
   * Get mock responses for testing
   */
  private getMockResponses(request: AIFixRequest): LLMResponse[] {
    const mockFix: AIFixResponse = {
      fixedCode: '<img src="logo.png" alt="Company logo" role="img">',
      explanation: 'Added descriptive alt text for accessibility',
      confidence: 0.9,
      alternativeFixes: ['Use aria-label instead'],
    };

    return [
      {
        model: 'GPT-4 (Mock)',
        provider: 'openai',
        output: mockFix,
        latency: 100,
        cost: 0,
      },
      {
        model: 'Claude-3 (Mock)',
        provider: 'anthropic',
        output: { ...mockFix, confidence: 0.92 },
        latency: 120,
        cost: 0,
      },
    ];
  }

  /**
   * Get mock critic review
   */
  private getMockCriticReview(responses: LLMResponse[]): CriticReview {
    return {
      best: responses[0].model,
      issues: {},
      rationale: 'Mock review: All solutions are similar and correct',
      agreementScore: 0.85,
    };
  }
}

// Export singleton instance
export const multiLLMValidator = new MultiLLMValidator();
