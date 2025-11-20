/**
 * Multi-Channel Outreach Coordinator
 *
 * Orchestrates outreach across multiple channels:
 * - Email sequences
 * - LinkedIn engagement
 * - Phone calls
 * - Social media
 *
 * Ensures coordinated, non-spammy multi-touch campaigns
 */

import { PrismaClient, Prospect } from '@prisma/client';
import OutreachCampaignService from './OutreachCampaignService';
import LinkedInOutreachService from './LinkedInOutreachService';
import ColdCallScriptGenerator from './ColdCallScriptGenerator';
import PersonalizationEngine from './PersonalizationEngine';

export interface MultiChannelStrategy {
  prospectId: string;
  channels: {
    email: boolean;
    linkedin: boolean;
    phone: boolean;
    socialMedia: boolean;
  };
  cadence: TouchPoint[];
  totalDays: number;
}

export interface TouchPoint {
  day: number;
  channel: 'email' | 'linkedin' | 'phone' | 'social';
  action: string;
  template?: string;
  notes?: string;
}

export interface ChannelPreferences {
  preferredChannel: 'email' | 'linkedin' | 'phone' | 'balanced';
  emailFrequency: 'aggressive' | 'moderate' | 'conservative';
  includeLinkedIn: boolean;
  includeColdCalls: boolean;
  respectWorkHours: boolean;
  timezone?: string;
}

export class MultiChannelCoordinator {
  private prisma: PrismaClient;
  private campaignService: OutreachCampaignService;
  private linkedInService: LinkedInOutreachService;
  private callScriptGenerator: ColdCallScriptGenerator;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.campaignService = new OutreachCampaignService(prisma);
    this.linkedInService = new LinkedInOutreachService();
    this.callScriptGenerator = new ColdCallScriptGenerator();
  }

  /**
   * Pre-built multi-channel strategies
   */
  public static getPrebuiltStrategies(): Record<string, MultiChannelStrategy> {
    return {
      // Aggressive high-value prospect strategy
      enterprise_aggressive: {
        prospectId: '',
        channels: {
          email: true,
          linkedin: true,
          phone: true,
          socialMedia: true,
        },
        cadence: [
          // Week 1: Research & Soft Touch
          { day: 0, channel: 'linkedin', action: 'View profile', notes: 'Show up in their "who viewed your profile"' },
          { day: 1, channel: 'email', action: 'Send initial value email', template: 'initial_value_first' },
          { day: 2, channel: 'linkedin', action: 'Comment on recent post', notes: 'Build familiarity' },

          // Week 2: Increase Presence
          { day: 4, channel: 'email', action: 'Follow-up email with free audit', template: 'follow_up_1_value_add' },
          { day: 5, channel: 'linkedin', action: 'Like 2-3 posts', notes: 'Stay on radar' },
          { day: 6, channel: 'phone', action: 'First call attempt', notes: 'Try to reach decision maker' },

          // Week 3: Multi-touch push
          { day: 8, channel: 'linkedin', action: 'Send connection request', notes: 'Reference previous engagement' },
          { day: 10, channel: 'email', action: 'Send urgency email', template: 'follow_up_2_urgency' },
          { day: 11, channel: 'phone', action: 'Second call attempt', notes: 'Leave voicemail if no answer' },

          // Week 4: Final push
          { day: 14, channel: 'linkedin', action: 'Send InMail if not connected', notes: 'Last LinkedIn touch' },
          { day: 15, channel: 'email', action: 'Final email', template: 'follow_up_3_final' },
          { day: 16, channel: 'phone', action: 'Final call attempt' },

          // Week 5: Breakup
          { day: 21, channel: 'email', action: 'Breakup email', template: 'breakup_helpful' },
        ],
        totalDays: 21,
      },

      // Moderate warm-up strategy
      saas_balanced: {
        prospectId: '',
        channels: {
          email: true,
          linkedin: true,
          phone: false,
          socialMedia: true,
        },
        cadence: [
          { day: 0, channel: 'linkedin', action: 'Engage with content' },
          { day: 1, channel: 'email', action: 'Value-first email', template: 'initial_value_first' },
          { day: 4, channel: 'linkedin', action: 'Comment on post' },
          { day: 5, channel: 'email', action: 'Follow-up with resource', template: 'value_add_guide' },
          { day: 8, channel: 'linkedin', action: 'Connection request' },
          { day: 11, channel: 'email', action: 'Urgency email', template: 'follow_up_2_urgency' },
          { day: 15, channel: 'email', action: 'Final email', template: 'follow_up_3_final' },
          { day: 21, channel: 'email', action: 'Breakup email', template: 'breakup_helpful' },
        ],
        totalDays: 21,
      },

      // Conservative relationship-building
      relationship_conservative: {
        prospectId: '',
        channels: {
          email: true,
          linkedin: true,
          phone: false,
          socialMedia: true,
        },
        cadence: [
          { day: 0, channel: 'linkedin', action: 'Follow their content for 1 week' },
          { day: 3, channel: 'linkedin', action: 'Thoughtful comment on post' },
          { day: 7, channel: 'email', action: 'Value-first email', template: 'initial_value_first' },
          { day: 10, channel: 'linkedin', action: 'Share their content with comment' },
          { day: 14, channel: 'email', action: 'Send educational resource', template: 'value_add_guide' },
          { day: 17, channel: 'linkedin', action: 'Connection request mentioning engagement' },
          { day: 21, channel: 'email', action: 'Soft follow-up', template: 'follow_up_1_value_add' },
          { day: 28, channel: 'email', action: 'Case study email', template: 'follow_up_2_case_study' },
          { day: 35, channel: 'email', action: 'Final check-in', template: 'follow_up_3_final' },
        ],
        totalDays: 35,
      },

      // Phone-heavy strategy
      call_focused: {
        prospectId: '',
        channels: {
          email: true,
          linkedin: false,
          phone: true,
          socialMedia: false,
        },
        cadence: [
          { day: 0, channel: 'phone', action: 'First call attempt' },
          { day: 0, channel: 'email', action: 'Send email after voicemail', template: 'initial_lawsuit_risk_a' },
          { day: 2, channel: 'phone', action: 'Second call attempt' },
          { day: 4, channel: 'email', action: 'Follow-up email', template: 'follow_up_1_soft' },
          { day: 5, channel: 'phone', action: 'Third call attempt' },
          { day: 7, channel: 'email', action: 'Value-add email', template: 'value_add_guide' },
          { day: 10, channel: 'phone', action: 'Final call attempt' },
          { day: 11, channel: 'email', action: 'Final email', template: 'breakup_helpful' },
        ],
        totalDays: 11,
      },

      // LinkedIn-only strategy (GDPR-friendly)
      linkedin_only: {
        prospectId: '',
        channels: {
          email: false,
          linkedin: true,
          phone: false,
          socialMedia: false,
        },
        cadence: [
          { day: 0, channel: 'linkedin', action: 'View profile' },
          { day: 1, channel: 'linkedin', action: 'Like recent post' },
          { day: 3, channel: 'linkedin', action: 'Thoughtful comment' },
          { day: 5, channel: 'linkedin', action: 'Connection request' },
          { day: 8, channel: 'linkedin', action: 'Send personalized message after connection' },
          { day: 11, channel: 'linkedin', action: 'Share valuable resource' },
          { day: 15, channel: 'linkedin', action: 'Follow-up message' },
          { day: 21, channel: 'linkedin', action: 'Final soft touch' },
        ],
        totalDays: 21,
      },
    };
  }

  /**
   * Recommend strategy based on prospect profile
   */
  public recommendStrategy(prospect: Prospect): string {
    const { industry, employeeCount, responseStatus } = prospect;

    // Enterprise prospects get aggressive strategy
    if (employeeCount && employeeCount > 1000) {
      return 'enterprise_aggressive';
    }

    // SaaS companies respond well to balanced approach
    if (industry === 'saas' || industry === 'software') {
      return 'saas_balanced';
    }

    // If previous interaction, use conservative relationship building
    if (responseStatus !== 'no_response') {
      return 'relationship_conservative';
    }

    // Default to balanced
    return 'saas_balanced';
  }

  /**
   * Execute multi-channel strategy for a prospect
   */
  public async executeStrategy(
    prospectId: string,
    strategyName: string,
    preferences?: Partial<ChannelPreferences>
  ): Promise<void> {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new Error('Prospect not found');
    }

    const strategies = MultiChannelCoordinator.getPrebuiltStrategies();
    let strategy = strategies[strategyName];

    if (!strategy) {
      // Use recommended strategy if specified one doesn't exist
      const recommendedStrategy = this.recommendStrategy(prospect);
      strategy = strategies[recommendedStrategy];
    }

    // Apply preferences to filter channels
    if (preferences) {
      strategy = this.applyPreferences(strategy, preferences);
    }

    // Schedule touchpoints
    await this.scheduleTouchpoints(prospect, strategy);

    console.log(`Executed ${strategyName} strategy for prospect ${prospectId}`);
  }

  /**
   * Apply channel preferences to strategy
   */
  private applyPreferences(
    strategy: MultiChannelStrategy,
    preferences: Partial<ChannelPreferences>
  ): MultiChannelStrategy {
    const filtered = { ...strategy };

    // Remove touchpoints for disabled channels
    filtered.cadence = strategy.cadence.filter(touchpoint => {
      if (!preferences.includeLinkedIn && touchpoint.channel === 'linkedin') return false;
      if (!preferences.includeColdCalls && touchpoint.channel === 'phone') return false;
      return true;
    });

    // Adjust email frequency
    if (preferences.emailFrequency === 'conservative') {
      // Remove every other email touchpoint
      filtered.cadence = filtered.cadence.filter((touchpoint, index) => {
        if (touchpoint.channel !== 'email') return true;
        return index % 2 === 0;
      });
    } else if (preferences.emailFrequency === 'aggressive') {
      // Add extra email touchpoints
      const extraEmails: TouchPoint[] = [];
      filtered.cadence.forEach(touchpoint => {
        if (touchpoint.channel === 'email') {
          extraEmails.push({
            day: touchpoint.day + 2,
            channel: 'email',
            action: 'Quick follow-up',
            template: 'follow_up_1_soft',
          });
        }
      });
      filtered.cadence = [...filtered.cadence, ...extraEmails].sort((a, b) => a.day - b.day);
    }

    return filtered;
  }

  /**
   * Schedule touchpoints for a prospect
   */
  private async scheduleTouchpoints(
    prospect: Prospect,
    strategy: MultiChannelStrategy
  ): Promise<void> {
    const now = new Date();

    for (const touchpoint of strategy.cadence) {
      const scheduledDate = new Date(now.getTime() + touchpoint.day * 24 * 60 * 60 * 1000);

      // Create records based on channel
      if (touchpoint.channel === 'email') {
        await this.prisma.outreachEmail.create({
          data: {
            prospectId: prospect.id,
            campaignId: 'multi_channel',
            sequenceStep: touchpoint.day,
            templateId: touchpoint.template || 'custom',
            hook: 'lawsuit_risk',
            scheduledFor: scheduledDate,
            status: 'scheduled',
            useAI: true,
          },
        });
      }

      // For other channels, you'd create appropriate records
      // For now, we'll log the plan
      console.log(`Scheduled ${touchpoint.channel} touchpoint for ${prospect.businessName} on day ${touchpoint.day}: ${touchpoint.action}`);
    }
  }

  /**
   * Get next recommended action for a prospect
   */
  public async getNextAction(prospectId: string): Promise<{
    channel: string;
    action: string;
    script?: any;
    timing: string;
  } | null> {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        outreachEmails: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!prospect) return null;

    const lastEmail = prospect.outreachEmails[0];
    const daysSinceLastContact = lastEmail
      ? Math.floor((Date.now() - lastEmail.sentAt!.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // If they replied, recommend phone call
    if (prospect.responseStatus === 'interested') {
      return {
        channel: 'phone',
        action: 'Call to schedule demo',
        timing: 'Within 4 hours of reply',
      };
    }

    // If email opened but no response after 3 days
    if (lastEmail?.status === 'opened' && daysSinceLastContact >= 3) {
      return {
        channel: 'linkedin',
        action: 'Send connection request or InMail',
        timing: 'Now',
      };
    }

    // If no opens after 5 days, try different channel
    if (daysSinceLastContact >= 5 && lastEmail?.status === 'sent') {
      return {
        channel: 'phone',
        action: 'Cold call attempt',
        timing: 'Best: Tuesday-Thursday, 10 AM - 11 AM or 2 PM - 4 PM',
      };
    }

    // If no action in 7+ days, send follow-up
    if (daysSinceLastContact >= 7) {
      return {
        channel: 'email',
        action: 'Send follow-up email',
        timing: 'Now',
      };
    }

    return null;
  }

  /**
   * Get engagement score for a prospect across all channels
   */
  public async getEngagementScore(prospectId: string): Promise<{
    score: number;
    breakdown: {
      email: number;
      linkedin: number;
      phone: number;
    };
    recommendation: string;
  }> {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        outreachEmails: true,
      },
    });

    if (!prospect) {
      throw new Error('Prospect not found');
    }

    // Calculate email engagement
    const emailScore = this.calculateEmailEngagement(prospect.outreachEmails);

    // For now, return email-focused score
    // In production, you'd track LinkedIn and phone interactions too
    const totalScore = emailScore;

    let recommendation = '';
    if (totalScore < 20) {
      recommendation = 'Low engagement. Try different channel or messaging.';
    } else if (totalScore < 50) {
      recommendation = 'Moderate engagement. Continue multi-touch sequence.';
    } else {
      recommendation = 'High engagement. Prioritize direct outreach (call/demo).';
    }

    return {
      score: totalScore,
      breakdown: {
        email: emailScore,
        linkedin: 0, // Placeholder
        phone: 0, // Placeholder
      },
      recommendation,
    };
  }

  /**
   * Calculate email engagement score
   */
  private calculateEmailEngagement(emails: any[]): number {
    if (emails.length === 0) return 0;

    let score = 0;

    emails.forEach(email => {
      if (email.status === 'sent') score += 10;
      if (email.status === 'opened') score += 30;
      if (email.status === 'clicked') score += 50;
      if (email.openCount > 1) score += 20; // Multiple opens = high interest
    });

    return Math.min(score, 100);
  }

  /**
   * Pause all outreach for a prospect
   */
  public async pauseAllOutreach(prospectId: string): Promise<void> {
    await this.prisma.outreachEmail.updateMany({
      where: {
        prospectId,
        status: 'scheduled',
      },
      data: {
        status: 'draft',
      },
    });

    console.log(`Paused all outreach for prospect ${prospectId}`);
  }

  /**
   * Resume outreach for a prospect
   */
  public async resumeOutreach(prospectId: string): Promise<void> {
    await this.prisma.outreachEmail.updateMany({
      where: {
        prospectId,
        status: 'draft',
      },
      data: {
        status: 'scheduled',
      },
    });

    console.log(`Resumed outreach for prospect ${prospectId}`);
  }
}

export default MultiChannelCoordinator;
