/**
 * Cold Call Script Generator
 *
 * Generates personalized cold call scripts with:
 * - Opening hooks
 * - Value propositions
 * - Objection handling
 * - Call flow structure
 */

import Anthropic from '@anthropic-ai/sdk';
import { PersonalizationData } from './EmailTemplateService';

export interface CallScript {
  opening: string;
  valueProposition: string;
  qualifyingQuestions: string[];
  objectionHandlers: Record<string, string>;
  closingCTA: string;
  voicemailScript: string;
  followUpEmail: string;
}

export interface CallContext {
  prospect: PersonalizationData;
  callReason: 'cold_outreach' | 'email_follow_up' | 'referral' | 'event_follow_up';
  priorInteraction?: {
    type: 'email' | 'linkedin' | 'event';
    date: string;
    details: string;
  };
  scanResults?: {
    violationCount: number;
    criticalIssues: number;
    complianceScore: number;
  };
}

export class ColdCallScriptGenerator {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate a complete cold call script
   */
  public async generateScript(context: CallContext): Promise<CallScript> {
    const prompt = this.buildScriptPrompt(context);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return this.parseScriptResponse(content.text);
    } catch (error) {
      console.error('Error generating call script:', error);
      return this.getDefaultScript(context);
    }
  }

  /**
   * Build AI prompt for script generation
   */
  private buildScriptPrompt(context: CallContext): string {
    return `Generate a cold call script for an accessibility consultant.

PROSPECT INFORMATION:
- Company: ${context.prospect.companyName}
- Website: ${context.prospect.companyWebsite}
- Contact: ${context.prospect.firstName || 'decision maker'}
- Industry: ${context.prospect.industry || 'Unknown'}
- Call reason: ${context.callReason}

${context.priorInteraction ? `
PRIOR INTERACTION:
- Type: ${context.priorInteraction.type}
- Date: ${context.priorInteraction.date}
- Details: ${context.priorInteraction.details}
` : ''}

${context.scanResults ? `
SCAN RESULTS:
- Violations found: ${context.scanResults.violationCount}
- Critical issues: ${context.scanResults.criticalIssues}
- Compliance score: ${context.scanResults.complianceScore}/100
` : ''}

Generate a complete call script with these sections:

1. OPENING (First 10 seconds)
   - Permission-based opener
   - Quick value hook
   - Reason for call

2. VALUE PROPOSITION (15-20 seconds)
   - Specific to their company/industry
   - Reference scan results if available
   - Clear benefit statement

3. QUALIFYING QUESTIONS (3-5 questions)
   - Discover their awareness of accessibility
   - Current compliance status
   - Decision-making process
   - Budget/timeline

4. OBJECTION HANDLERS
   - "We're not interested"
   - "Send me information"
   - "We already have someone"
   - "Call back later"
   - "How did you get my number?"

5. CLOSING CTA
   - Low-commitment ask
   - Specific next step
   - Create urgency without pressure

6. VOICEMAIL SCRIPT (20-30 seconds)
   - Hook
   - Value
   - Specific CTA
   - Callback number

7. FOLLOW-UP EMAIL (if voicemail)
   - Reference the call
   - Provide value
   - Schedule callback

Return as JSON:
{
  "opening": "script text",
  "valueProposition": "script text",
  "qualifyingQuestions": ["question 1", "question 2", ...],
  "objectionHandlers": {
    "not_interested": "response",
    "send_info": "response",
    "have_someone": "response",
    "call_later": "response",
    "how_get_number": "response"
  },
  "closingCTA": "script text",
  "voicemailScript": "script text",
  "followUpEmail": "email text"
}`;
  }

  /**
   * Parse AI response into script structure
   */
  private parseScriptResponse(response: string): CallScript {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        opening: parsed.opening || '',
        valueProposition: parsed.valueProposition || '',
        qualifyingQuestions: parsed.qualifyingQuestions || [],
        objectionHandlers: parsed.objectionHandlers || {},
        closingCTA: parsed.closingCTA || '',
        voicemailScript: parsed.voicemailScript || '',
        followUpEmail: parsed.followUpEmail || '',
      };
    } catch (error) {
      console.error('Error parsing script response:', error);
      throw error;
    }
  }

  /**
   * Get default script (fallback)
   */
  private getDefaultScript(context: CallContext): CallScript {
    const firstName = context.prospect.firstName || 'there';
    const company = context.prospect.companyName;

    return {
      opening: `Hi ${firstName}, this is [Your Name] - I'm calling about ${company}'s website accessibility compliance. Do you have 60 seconds?`,

      valueProposition: `I ran a quick scan on your website and found ${context.scanResults?.violationCount || 'several'} WCAG violations that could expose ${company} to ADA lawsuits. I help ${context.prospect.industry || ''} companies fix these issues in 2-3 weeks.`,

      qualifyingQuestions: [
        'Are you familiar with WCAG 2.1 accessibility standards?',
        'Has your legal team mentioned ADA Title III compliance?',
        'Who typically handles website compliance decisions at your company?',
        'What would be your timeline if you decided to address this?',
        'Have you budgeted for compliance work this year?',
      ],

      objectionHandlers: {
        not_interested: 'I understand - most companies don\'t prioritize this until they get a demand letter. Can I at least send you the scan results so you have them on file? Takes 2 minutes to review.',
        send_info: 'I can definitely send information, but honestly, a 10-minute call would be more valuable. I can walk you through the specific issues on your site. Does Thursday at 2pm work?',
        have_someone: 'That\'s great you\'re already working on it. Can I ask - have they done a full WCAG 2.1 AA audit? I\'m finding a lot of companies think they\'re compliant but are missing critical issues.',
        call_later: 'Absolutely - when would be better? I have availability Thursday at 10am or Friday at 2pm. Which works better for you?',
        how_get_number: 'I found your info through [LinkedIn/company website/industry directory]. I specifically reached out because I noticed accessibility gaps that affect companies in your industry. Worth a quick conversation?',
      },

      closingCTA: 'How about this - let me send you a 1-page summary of what I found, and we can schedule a 15-minute call next week to review. Does Tuesday or Thursday work better for you?',

      voicemailScript: `Hi ${firstName}, this is [Your Name] calling about ${company}'s website accessibility. I found ${context.scanResults?.violationCount || 'several'} compliance issues that could put you at risk for ADA lawsuits. I can fix these in 2-3 weeks for a flat fee. Call me back at [your number]. Again, that's [your number]. Thanks.`,

      followUpEmail: `Hi ${firstName},

I tried calling you earlier about ${company}'s website accessibility compliance.

Quick context: I ran an automated WCAG scan on ${context.prospect.companyWebsite} and found ${context.scanResults?.violationCount || 'several'} violations that could expose ${company} to ADA lawsuits.

I've attached a 1-page summary of the top issues.

I help ${context.prospect.industry || ''} companies fix these gaps in 2-3 weeks. Happy to discuss if you have 15 minutes this week.

Best,
[Your Name]
[Your Phone]`,
    };
  }

  /**
   * Generate gatekeeper bypass scripts
   */
  public async generateGatekeeperScript(
    company: string,
    decisionMakerTitle: string = 'person handling website compliance'
  ): Promise<{
    approach1: string;
    approach2: string;
    approach3: string;
  }> {
    return {
      approach1: `Hi, I'm trying to reach the ${decisionMakerTitle} - we found some compliance issues on ${company}'s website that need attention. Who would handle that?`,

      approach2: `Hi, I need to speak with whoever manages website accessibility at ${company}. I have some audit results to share. Can you connect me?`,

      approach3: `Hi, this is [Your Name] - I'm following up on an accessibility compliance matter for ${company}. Who would be the right person to discuss website ADA compliance with?`,
    };
  }

  /**
   * Generate objection handling responses
   */
  public async generateObjectionResponse(
    objection: string,
    context: Partial<CallContext>
  ): Promise<string> {
    const prompt = `You're an accessibility consultant on a cold call. The prospect said:

"${objection}"

Generate a short, effective response that:
- Acknowledges their concern
- Provides value
- Keeps conversation going
- Doesn't sound defensive or pushy

Max 2 sentences. Return ONLY the response text, no JSON.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 150,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return content.text.trim();
    } catch (error) {
      console.error('Error generating objection response:', error);
      return 'I completely understand. Can I at least send you a quick summary so you have it for reference? Takes 30 seconds to review.';
    }
  }

  /**
   * Get call timing recommendations
   */
  public getCallTimingRecommendations(industry?: string): {
    bestDays: string[];
    bestTimes: string[];
    avoid: string[];
    reasoning: string;
  } {
    const generalRecs = {
      bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
      bestTimes: ['10:00 AM - 11:30 AM', '2:00 PM - 4:00 PM'],
      avoid: ['Monday before 10 AM', 'Friday after 3 PM', 'Lunch hours (12-1 PM)'],
      reasoning: 'Mid-week, mid-morning or mid-afternoon calls have highest answer rates.',
    };

    if (industry === 'healthtech') {
      return {
        ...generalRecs,
        bestTimes: ['9:00 AM - 10:00 AM', '3:00 PM - 5:00 PM'],
        reasoning: 'Healthcare professionals often have patient hours 10 AM - 3 PM.',
      };
    }

    if (industry === 'fintech') {
      return {
        ...generalRecs,
        avoid: [...generalRecs.avoid, 'Market open (9:30 AM)', 'Quarter-end dates'],
        reasoning: 'Fintech teams are busy during market hours and quarter-end.',
      };
    }

    return generalRecs;
  }

  /**
   * Generate discovery questions based on prospect profile
   */
  public async generateDiscoveryQuestions(
    prospect: PersonalizationData
  ): Promise<{
    technicalQuestions: string[];
    businessQuestions: string[];
    urgencyQuestions: string[];
  }> {
    return {
      technicalQuestions: [
        'What CMS or framework is your website built on?',
        'Have you run any accessibility audits before?',
        'Do you have a dedicated development team or use an agency?',
        'What browsers and assistive technologies do you test with?',
      ],
      businessQuestions: [
        'Do you have enterprise clients that require WCAG compliance?',
        'Has your legal team flagged accessibility as a risk?',
        'What would be the impact of being unable to bid on enterprise contracts?',
        'Who would be involved in a decision like this - just you or others?',
      ],
      urgencyQuestions: [
        'Have you received any accessibility complaints or demand letters?',
        'When is your next major website update or redesign?',
        'Are you bidding on any contracts that require Section 508 compliance?',
        'What\'s driving the timeline on this - legal, sales, or compliance?',
      ],
    };
  }
}

export default ColdCallScriptGenerator;
