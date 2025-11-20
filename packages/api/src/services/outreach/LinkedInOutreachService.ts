/**
 * LinkedIn Outreach Service
 *
 * Generates LinkedIn connection requests, InMail messages, and comment strategies
 * for cold outreach on LinkedIn
 */

import Anthropic from '@anthropic-ai/sdk';
import { PersonalizationData } from './EmailTemplateService';

export interface LinkedInMessage {
  type: 'connection_request' | 'inmail' | 'comment' | 'post_engagement';
  content: string;
  characterCount: number;
  hooks: string[];
  reasoning?: string;
}

export interface LinkedInProfile {
  name: string;
  title?: string;
  company: string;
  recentPosts?: Array<{
    content: string;
    date: string;
    likes: number;
  }>;
  sharedConnections?: number;
  mutualGroups?: string[];
}

export class LinkedInOutreachService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate a personalized LinkedIn connection request (max 300 chars)
   */
  public async generateConnectionRequest(
    profile: LinkedInProfile,
    context?: Partial<PersonalizationData>
  ): Promise<LinkedInMessage> {
    const prompt = `Write a LinkedIn connection request message.

TARGET PROFILE:
- Name: ${profile.name}
- Title: ${profile.title || 'Unknown'}
- Company: ${profile.company}
${profile.sharedConnections ? `- Shared connections: ${profile.sharedConnections}` : ''}
${profile.mutualGroups ? `- Mutual groups: ${profile.mutualGroups.join(', ')}` : ''}

${profile.recentPosts && profile.recentPosts.length > 0 ? `
RECENT ACTIVITY:
- Recent post: "${profile.recentPosts[0].content.substring(0, 100)}..."
` : ''}

YOUR CONTEXT:
- You're an accessibility consultant
${context?.industry ? `- Their industry (${context.industry}) is relevant to your expertise` : ''}

REQUIREMENTS:
- Max 300 characters (LinkedIn limit)
- Reference something specific (post, shared connection, mutual group, or company)
- Professional but warm tone
- Clear value proposition
- No hard sell

Return as JSON:
{
  "content": "the message text",
  "hooks": ["what personalization you used"],
  "reasoning": "why this approach"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
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

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        type: 'connection_request',
        content: parsed.content,
        characterCount: parsed.content.length,
        hooks: parsed.hooks || [],
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('Error generating connection request:', error);
      return {
        type: 'connection_request',
        content: `Hi ${profile.name.split(' ')[0]}, I help ${profile.company} and similar companies with accessibility compliance. Would love to connect!`,
        characterCount: 100,
        hooks: ['company_mention'],
      };
    }
  }

  /**
   * Generate LinkedIn InMail message (can be longer than connection request)
   */
  public async generateInMail(
    profile: LinkedInProfile,
    context?: Partial<PersonalizationData>
  ): Promise<LinkedInMessage> {
    const prompt = `Write a LinkedIn InMail message for cold outreach.

TARGET PROFILE:
- Name: ${profile.name}
- Title: ${profile.title || 'Decision maker'}
- Company: ${profile.company}

${profile.recentPosts && profile.recentPosts.length > 0 ? `
RECENT ACTIVITY:
${profile.recentPosts.map(p => `- "${p.content.substring(0, 150)}..." (${p.likes} likes)`).join('\n')}
` : ''}

YOUR CONTEXT:
- You're an accessibility consultant
- You help companies avoid ADA lawsuits through WCAG compliance
${context?.specificViolations ? `- You found ${context.specificViolations.length} violations on their website` : ''}
${context?.riskScore ? `- Their risk score: ${context.riskScore}/100` : ''}

REQUIREMENTS:
- 100-200 words
- Reference their recent activity or company news if available
- Lead with value, not credentials
- Include specific insight or finding
- End with soft CTA (not pushy)
- Professional but conversational

Return as JSON:
{
  "content": "the message text",
  "hooks": ["personalization elements used"],
  "reasoning": "strategy explanation"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 600,
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

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        type: 'inmail',
        content: parsed.content,
        characterCount: parsed.content.length,
        hooks: parsed.hooks || [],
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('Error generating InMail:', error);
      throw error;
    }
  }

  /**
   * Generate thoughtful comment for prospect's LinkedIn post
   */
  public async generatePostComment(
    post: {
      author: string;
      authorTitle: string;
      company: string;
      content: string;
    }
  ): Promise<LinkedInMessage> {
    const prompt = `Write a thoughtful LinkedIn comment on this post:

POST AUTHOR: ${post.author} (${post.authorTitle} at ${post.company})
POST CONTENT:
"${post.content}"

YOUR CONTEXT:
- You're an accessibility consultant
- You want to add value to the conversation
- You want to build relationship, not sell

REQUIREMENTS:
- 50-100 words
- Add genuine insight or perspective
- Reference specific point from the post
- Professional and thoughtful
- NO selling or self-promotion
- Position yourself as a peer/expert

Return as JSON:
{
  "content": "the comment text",
  "hooks": ["what made this comment relevant"],
  "reasoning": "why this approach works"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        temperature: 0.8,
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

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        type: 'comment',
        content: parsed.content,
        characterCount: parsed.content.length,
        hooks: parsed.hooks || [],
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('Error generating comment:', error);
      throw error;
    }
  }

  /**
   * Generate LinkedIn post for thought leadership (accessibility teardowns)
   */
  public async generateThoughtLeadershipPost(
    topic: 'ai_accessibility' | 'wcag_violation' | 'industry_trend' | 'case_study',
    details?: {
      toolName?: string;
      violationType?: string;
      industry?: string;
      companyName?: string;
    }
  ): Promise<{ post: string; hashtags: string[] }> {
    const topicPrompts = {
      ai_accessibility: `Generate a LinkedIn post exposing accessibility issues in a popular AI tool.

TOOL: ${details?.toolName || 'ChatGPT/Claude/Midjourney'}

Create a "teardown" style post that:
- Points out specific WCAG violations
- Explains why it matters
- Offers constructive fixes
- Positions you as an expert
- Encourages discussion

Format:
- Hook in first line
- 3-5 short paragraphs
- Specific violation examples
- Call-to-action question at end
- 200-300 words`,

      wcag_violation: `Generate a LinkedIn post about a common WCAG violation.

VIOLATION TYPE: ${details?.violationType || 'Color contrast (1.4.3)'}

Create an educational post that:
- Explains the violation simply
- Shows real-world impact
- Provides quick fix
- Invites discussion

Format: 150-250 words`,

      industry_trend: `Generate a LinkedIn post about accessibility trends in an industry.

INDUSTRY: ${details?.industry || 'SaaS'}

Create a thought leadership post about:
- Current state of accessibility in this industry
- Lawsuit trends
- Best practices
- Future outlook

Format: 200-300 words`,

      case_study: `Generate a LinkedIn post sharing a case study (anonymized).

Create a story-driven post about:
- Client challenge
- Your approach
- Results achieved
- Lessons learned

Format: 200-300 words, story structure`,
    };

    const prompt = topicPrompts[topic] + `

Return as JSON:
{
  "post": "the full post text",
  "hashtags": ["relevant", "hashtags"]
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        temperature: 0.8,
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

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        post: parsed.post,
        hashtags: parsed.hashtags || ['accessibility', 'WCAG', 'a11y'],
      };
    } catch (error) {
      console.error('Error generating post:', error);
      throw error;
    }
  }

  /**
   * Get LinkedIn outreach strategy for a prospect
   */
  public async getOutreachStrategy(
    profile: LinkedInProfile,
    context?: Partial<PersonalizationData>
  ): Promise<{
    recommendedApproach: 'connection_then_message' | 'inmail_direct' | 'engage_then_connect';
    reasoning: string;
    steps: string[];
  }> {
    const hasSharedConnections = profile.sharedConnections && profile.sharedConnections > 0;
    const hasRecentActivity = profile.recentPosts && profile.recentPosts.length > 0;
    const hasMutualGroups = profile.mutualGroups && profile.mutualGroups.length > 0;

    if (hasRecentActivity && !hasSharedConnections) {
      return {
        recommendedApproach: 'engage_then_connect',
        reasoning: 'They\'re active on LinkedIn but no shared connections. Build familiarity through engagement first.',
        steps: [
          'Comment thoughtfully on their recent post',
          'Wait 2-3 days',
          'Like/engage with another post',
          'Send connection request mentioning your previous comment',
          'After connection, send personalized message',
        ],
      };
    }

    if (hasSharedConnections || hasMutualGroups) {
      return {
        recommendedApproach: 'connection_then_message',
        reasoning: 'Shared connections/groups provide warm intro path. Connection likely to be accepted.',
        steps: [
          'Send connection request mentioning shared connection/group',
          'Wait for acceptance',
          'Send personalized message with value proposition',
          'Reference shared connection in conversation',
        ],
      };
    }

    return {
      recommendedApproach: 'inmail_direct',
      reasoning: 'No existing connection points. InMail allows longer, more valuable first touch.',
      steps: [
        'Send InMail with specific value/insight about their company',
        'Include concrete finding (e.g., accessibility scan results)',
        'Offer free audit or resource',
        'If no response after 7 days, engage with their content',
        'Send connection request referencing your InMail',
      ],
    };
  }
}

export default LinkedInOutreachService;
