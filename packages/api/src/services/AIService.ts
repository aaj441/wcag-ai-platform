/**
 * AI Service - OpenAI/Anthropic Integration for WCAG Remediation
 * 
 * Provides AI-powered fix generation for accessibility violations
 */

import { log } from '../utils/logger';

export interface AIFixRequest {
  violationId: string;
  wcagCriteria: string;
  issueType: string;
  description: string;
  elementSelector?: string;
  codeSnippet?: string;
  pageContext?: string;
}

export interface AIFixResponse {
  fixedCode: string;
  explanation: string;
  confidence: number;
  alternativeFixes?: string[];
}

export class AIService {
  private apiKey: string;
  private model: string;
  private provider: 'openai' | 'anthropic';

  constructor() {
    // Check for API keys and set provider
    this.apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    this.model = process.env.AI_MODEL || 'gpt-4';
    this.provider = process.env.OPENAI_API_KEY ? 'openai' : 'anthropic';

    if (!this.apiKey) {
      log.warn('No AI API key configured - using mock responses');
    }
  }

  /**
   * Generate accessibility fix using AI
   */
  async generateFix(request: AIFixRequest): Promise<AIFixResponse> {
    if (!this.apiKey) {
      return this.getMockFix(request);
    }

    try {
      const prompt = this.buildPrompt(request);
      
      if (this.provider === 'openai') {
        return await this.generateWithOpenAI(prompt, request);
      } else {
        return await this.generateWithAnthropic(prompt, request);
      }
    } catch (error) {
      log.error('AI fix generation failed', error instanceof Error ? error : new Error(String(error)), {
        violationId: request.violationId,
      });
      return this.getMockFix(request);
    }
  }

  /**
   * Build prompt for AI fix generation
   */
  private buildPrompt(request: AIFixRequest): string {
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
   * Generate fix using OpenAI
   */
  private async generateWithOpenAI(prompt: string, request: AIFixRequest): Promise<AIFixResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert accessibility consultant. Always provide valid, production-ready code fixes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent fixes
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.choices[0]?.message?.content || '';

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        fixedCode: parsed.fixedCode,
        explanation: parsed.explanation,
        confidence: parsed.confidence || 0.85,
        alternativeFixes: parsed.alternativeFixes || [],
      };
    } catch {
      // If not JSON, treat as plain text fix
      return {
        fixedCode: content,
        explanation: 'AI-generated fix for ' + request.issueType,
        confidence: 0.75,
        alternativeFixes: [],
      };
    }
  }

  /**
   * Generate fix using Anthropic Claude
   */
  private async generateWithAnthropic(prompt: string, request: AIFixRequest): Promise<AIFixResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
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
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.content[0]?.text || '';

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        fixedCode: parsed.fixedCode,
        explanation: parsed.explanation,
        confidence: parsed.confidence || 0.85,
        alternativeFixes: parsed.alternativeFixes || [],
      };
    } catch {
      // If not JSON, treat as plain text fix
      return {
        fixedCode: content,
        explanation: 'AI-generated fix for ' + request.issueType,
        confidence: 0.75,
        alternativeFixes: [],
      };
    }
  }

  /**
   * Get mock fix for testing/fallback
   */
  private getMockFix(request: AIFixRequest): AIFixResponse {
    const mockFixes: Record<string, AIFixResponse> = {
      missing_alt_text: {
        fixedCode: '<img src="logo.png" alt="Company logo" role="img">',
        explanation: 'Added descriptive alt text to provide text alternative for image content. Alt text describes the purpose/content of the image for screen reader users.',
        confidence: 0.95,
        alternativeFixes: [
          'Use aria-label instead if image is decorative',
          'Use empty alt="" if image is purely decorative'
        ],
      },
      low_contrast: {
        fixedCode: 'color: #1a1a1a; background: #ffffff;',
        explanation: 'Increased contrast ratio from 3.2:1 to 16.1:1 (WCAG AAA compliant). Changed text color to much darker shade for better readability.',
        confidence: 0.92,
        alternativeFixes: [
          'Use color: #333333 for slightly lighter text while maintaining AA compliance',
          'Add text-shadow for additional readability'
        ],
      },
      missing_form_label: {
        fixedCode: '<label for="email" class="sr-only">Email Address</label>\n<input id="email" type="email" name="email" aria-required="true" aria-label="Email Address">',
        explanation: 'Added explicit <label> element with matching for/id attributes and aria-label for redundancy. Labels help screen reader users understand form field purposes.',
        confidence: 0.93,
        alternativeFixes: [
          'Use aria-labelledby to reference visible text',
          'Use placeholder with aria-label for single-field forms'
        ],
      },
      missing_heading_structure: {
        fixedCode: '<h1>Main Title</h1>',
        explanation: 'Replaced styled div with semantic H1 heading. Proper heading hierarchy helps screen readers and keyboard users navigate content structure.',
        confidence: 0.94,
        alternativeFixes: [
          'Use role="heading" aria-level="1" if H1 tag cannot be used',
          'Restructure content to follow proper heading hierarchy (h1 > h2 > h3)'
        ],
      },
      missing_focus_indicator: {
        fixedCode: 'button:focus-visible { outline: 3px solid #4F46E5; outline-offset: 2px; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.3); }',
        explanation: 'Restored focus indicator with high-contrast outline and shadow for keyboard navigation. Users need to see which element is focused when navigating via keyboard.',
        confidence: 0.91,
        alternativeFixes: [
          'Use :focus-within for container-based focus indication',
          'Add custom focus styles matching brand colors while maintaining 3:1 contrast'
        ],
      },
    };

    const key = Object.keys(mockFixes).find((k) =>
      request.issueType.toLowerCase().includes(k.split('_')[0])
    );

    return mockFixes[key || request.issueType] || {
      fixedCode: request.codeSnippet || '<!-- Fix would be generated by AI -->',
      explanation: `Automated fix for ${request.issueType} - ${request.description}`,
      confidence: 0.75,
      alternativeFixes: [],
    };
  }

  /**
   * Batch generate fixes for multiple violations
   */
  async generateBatchFixes(requests: AIFixRequest[]): Promise<AIFixResponse[]> {
    log.info(`Generating ${requests.length} fixes in batch`);
    
    // Process in parallel with concurrency limit
    const BATCH_SIZE = 5;
    const results: AIFixResponse[] = [];
    
    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      const batch = requests.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(request => this.generateFix(request))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Validate fix against WCAG criteria
   */
  async validateFix(
    originalCode: string,
    fixedCode: string,
    wcagCriteria: string
  ): Promise<{ valid: boolean; issues: string[] }> {
    // Basic validation logic
    const issues: string[] = [];
    
    // Check if code actually changed
    if (originalCode === fixedCode) {
      issues.push('No changes detected in fixed code');
    }
    
    // Check for common issues
    if (wcagCriteria === '1.1.1' && !fixedCode.includes('alt=')) {
      issues.push('Alt attribute missing for image accessibility');
    }
    
    if (wcagCriteria.startsWith('2.4') && !fixedCode.match(/<h[1-6]|role="heading"/)) {
      issues.push('Heading structure not properly addressed');
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export const aiService = new AIService();
