/**
 * Outreach Campaign Service
 *
 * Manages multi-touch email sequences with:
 * - Automated follow-ups
 * - Timing optimization
 * - Response tracking
 * - Campaign analytics
 * - A/B testing
 */

import { PrismaClient, Prospect, OutreachEmail, OutreachEmailStatus } from '@prisma/client';
import EmailTemplateService, { EmailTemplate, PersonalizationData } from './EmailTemplateService';
import PersonalizationEngine, { PersonalizationContext } from './PersonalizationEngine';
import { sendEmail } from '../email';

export interface CampaignSequence {
  id: string;
  name: string;
  description: string;
  steps: CampaignStep[];
  targetAudience?: {
    industries?: string[];
    minEmployees?: number;
    maxEmployees?: number;
    riskScoreMin?: number;
  };
}

export interface CampaignStep {
  sequenceNumber: number;
  delayDays: number; // Days after previous step (0 for first step)
  templateId?: string;
  useAI: boolean; // Use AI personalization or template
  hook: EmailTemplate['hook'];
  stopIfReplied: boolean;
  abTestVariants?: string[]; // Template IDs for A/B testing
}

export interface CampaignStats {
  campaignId: string;
  totalProspects: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
  replies: number;
  conversions: number;
  openRate: number;
  responseRate: number;
  conversionRate: number;
  byStep: Array<{
    step: number;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  }>;
}

export class OutreachCampaignService {
  private prisma: PrismaClient;
  private personalizationEngine: PersonalizationEngine;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.personalizationEngine = new PersonalizationEngine();
  }

  /**
   * Pre-built campaign sequences
   */
  public static getDefaultSequences(): CampaignSequence[] {
    return [
      {
        id: 'lawsuit_risk_5_touch',
        name: '5-Touch Lawsuit Risk Campaign',
        description: 'Aggressive sequence focusing on lawsuit risk and compliance gaps',
        steps: [
          {
            sequenceNumber: 1,
            delayDays: 0,
            templateId: 'initial_lawsuit_risk_a',
            useAI: true,
            hook: 'lawsuit_risk',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 2,
            delayDays: 3,
            templateId: 'follow_up_1_soft',
            useAI: false,
            hook: 'lawsuit_risk',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 3,
            delayDays: 4,
            templateId: 'follow_up_2_urgency',
            useAI: true,
            hook: 'lawsuit_risk',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 4,
            delayDays: 7,
            templateId: 'follow_up_3_final',
            useAI: false,
            hook: 'lawsuit_risk',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 5,
            delayDays: 7,
            templateId: 'breakup_helpful',
            useAI: false,
            hook: 'value_first',
            stopIfReplied: false,
          },
        ],
        targetAudience: {
          industries: ['healthtech', 'fintech', 'saas'],
          riskScoreMin: 60,
        },
      },
      {
        id: 'value_first_6_touch',
        name: '6-Touch Value-First Campaign',
        description: 'Softer approach leading with free value and education',
        steps: [
          {
            sequenceNumber: 1,
            delayDays: 0,
            templateId: 'initial_value_first',
            useAI: true,
            hook: 'value_first',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 2,
            delayDays: 3,
            templateId: 'follow_up_1_value_add',
            useAI: false,
            hook: 'value_first',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 3,
            delayDays: 3,
            templateId: 'value_add_guide',
            useAI: false,
            hook: 'value_first',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 4,
            delayDays: 7,
            templateId: 'initial_lawsuit_risk_b',
            useAI: true,
            hook: 'lawsuit_risk',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 5,
            delayDays: 7,
            templateId: 'follow_up_3_final',
            useAI: false,
            hook: 'lawsuit_risk',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 6,
            delayDays: 7,
            templateId: 'breakup_wrong_person',
            useAI: false,
            hook: 'lawsuit_risk',
            stopIfReplied: false,
          },
        ],
      },
      {
        id: 'competitive_4_touch',
        name: '4-Touch Competitive Intelligence Campaign',
        description: 'Focus on how competitors are ahead on accessibility',
        steps: [
          {
            sequenceNumber: 1,
            delayDays: 0,
            templateId: 'initial_competitive_advantage',
            useAI: true,
            hook: 'competitive_advantage',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 2,
            delayDays: 3,
            templateId: 'follow_up_1_soft',
            useAI: false,
            hook: 'competitive_advantage',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 3,
            delayDays: 7,
            templateId: 'follow_up_2_case_study',
            useAI: true,
            hook: 'competitive_advantage',
            stopIfReplied: true,
          },
          {
            sequenceNumber: 4,
            delayDays: 7,
            templateId: 'breakup_helpful',
            useAI: false,
            hook: 'value_first',
            stopIfReplied: false,
          },
        ],
        targetAudience: {
          industries: ['saas', 'ecommerce'],
        },
      },
    ];
  }

  /**
   * Enroll a prospect in a campaign sequence
   */
  public async enrollProspect(
    prospectId: string,
    campaignId: string,
    personalizationData?: Partial<PersonalizationData>
  ): Promise<void> {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new Error('Prospect not found');
    }

    const sequence = OutreachCampaignService.getDefaultSequences().find(
      s => s.id === campaignId
    );

    if (!sequence) {
      throw new Error('Campaign sequence not found');
    }

    // Check if already enrolled
    const existingEmails = await this.prisma.outreachEmail.findMany({
      where: {
        prospectId,
        campaignId,
      },
    });

    if (existingEmails.length > 0) {
      console.log(`Prospect ${prospectId} already enrolled in campaign ${campaignId}`);
      return;
    }

    // Schedule all emails in the sequence
    let scheduledDate = new Date();

    for (const step of sequence.steps) {
      if (step.sequenceNumber > 1) {
        scheduledDate = new Date(scheduledDate.getTime() + step.delayDays * 24 * 60 * 60 * 1000);
      }

      // Determine which template to use (A/B testing)
      let templateId = step.templateId;
      if (step.abTestVariants && step.abTestVariants.length > 0) {
        // Randomly select variant for A/B testing
        const allVariants = [step.templateId, ...step.abTestVariants].filter(Boolean) as string[];
        templateId = allVariants[Math.floor(Math.random() * allVariants.length)];
      }

      await this.prisma.outreachEmail.create({
        data: {
          prospectId,
          campaignId,
          sequenceStep: step.sequenceNumber,
          templateId: templateId || 'custom',
          hook: step.hook,
          scheduledFor: scheduledDate,
          status: 'scheduled',
          useAI: step.useAI,
        },
      });
    }

    console.log(`Enrolled prospect ${prospectId} in campaign ${campaignId} with ${sequence.steps.length} emails`);
  }

  /**
   * Process scheduled emails (to be called via cron job)
   */
  public async processScheduledEmails(): Promise<void> {
    const now = new Date();

    // Get all emails scheduled to be sent
    const scheduledEmails = await this.prisma.outreachEmail.findMany({
      where: {
        status: 'scheduled',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        prospect: true,
      },
    });

    console.log(`Processing ${scheduledEmails.length} scheduled emails`);

    for (const email of scheduledEmails) {
      await this.sendScheduledEmail(email);
    }
  }

  /**
   * Send a scheduled email
   */
  private async sendScheduledEmail(
    scheduledEmail: OutreachEmail & { prospect: Prospect }
  ): Promise<void> {
    try {
      // Check if prospect has replied (if stopIfReplied is true)
      if (scheduledEmail.prospect.responseStatus === 'interested') {
        await this.prisma.outreachEmail.update({
          where: { id: scheduledEmail.id },
          data: { status: 'cancelled' },
        });
        console.log(`Cancelled email ${scheduledEmail.id} - prospect already replied`);
        return;
      }

      // Generate or retrieve email content
      let subject: string;
      let body: string;

      if (scheduledEmail.useAI) {
        // Use AI personalization
        const personalized = await this.generatePersonalizedEmail(
          scheduledEmail.prospect,
          scheduledEmail.hook
        );
        subject = personalized.subject;
        body = personalized.body;
      } else {
        // Use template
        const template = EmailTemplateService.getAllTemplates().find(
          t => t.id === scheduledEmail.templateId
        );

        if (!template) {
          throw new Error(`Template ${scheduledEmail.templateId} not found`);
        }

        const personalizationData: PersonalizationData = {
          firstName: scheduledEmail.prospect.contactFirstName || undefined,
          lastName: scheduledEmail.prospect.contactLastName || undefined,
          companyName: scheduledEmail.prospect.businessName,
          companyWebsite: scheduledEmail.prospect.website,
          industry: scheduledEmail.prospect.industry || undefined,
        };

        const result = EmailTemplateService.personalizeTemplate(template, personalizationData);
        subject = result.subject;
        body = result.body;
      }

      // Send email via SendGrid
      const emailResult = await sendEmail({
        to: scheduledEmail.prospect.contactEmail,
        subject,
        html: this.formatEmailBody(body),
        from: process.env.SENDGRID_FROM_EMAIL || 'outreach@example.com',
      });

      // Update email status
      await this.prisma.outreachEmail.update({
        where: { id: scheduledEmail.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          subject,
          body,
        },
      });

      // Update prospect
      await this.prisma.prospect.update({
        where: { id: scheduledEmail.prospect.id },
        data: {
          emailsSent: { increment: 1 },
          lastContacted: new Date(),
        },
      });

      console.log(`Sent email ${scheduledEmail.id} to ${scheduledEmail.prospect.contactEmail}`);
    } catch (error) {
      console.error(`Error sending email ${scheduledEmail.id}:`, error);

      await this.prisma.outreachEmail.update({
        where: { id: scheduledEmail.id },
        data: {
          status: 'bounced',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Generate personalized email using AI
   */
  private async generatePersonalizedEmail(
    prospect: Prospect,
    hook: EmailTemplate['hook']
  ): Promise<{ subject: string; body: string }> {
    const context: PersonalizationContext = {
      prospect: {
        firstName: prospect.contactFirstName || undefined,
        lastName: prospect.contactLastName || undefined,
        companyName: prospect.businessName,
        companyWebsite: prospect.website,
        industry: prospect.industry || undefined,
      },
    };

    const result = await this.personalizationEngine.generatePersonalizedEmail(
      context,
      'initial',
      hook
    );

    return {
      subject: result.subject,
      body: result.body,
    };
  }

  /**
   * Format email body with proper HTML
   */
  private formatEmailBody(body: string): string {
    // Convert plain text to HTML with proper formatting
    const paragraphs = body
      .split('\n\n')
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${paragraphs}
</body>
</html>`;
  }

  /**
   * Track email open (webhook from SendGrid)
   */
  public async trackEmailOpen(emailId: string): Promise<void> {
    await this.prisma.outreachEmail.update({
      where: { id: emailId },
      data: {
        status: 'opened',
        openCount: { increment: 1 },
      },
    });
  }

  /**
   * Track email click (webhook from SendGrid)
   */
  public async trackEmailClick(emailId: string): Promise<void> {
    await this.prisma.outreachEmail.update({
      where: { id: emailId },
      data: {
        status: 'clicked',
        clickCount: { increment: 1 },
      },
    });
  }

  /**
   * Mark prospect as replied
   */
  public async markProspectReplied(prospectId: string): Promise<void> {
    await this.prisma.prospect.update({
      where: { id: prospectId },
      data: {
        responseStatus: 'interested',
      },
    });

    // Cancel future emails in sequence
    await this.prisma.outreachEmail.updateMany({
      where: {
        prospectId,
        status: 'scheduled',
      },
      data: {
        status: 'cancelled',
      },
    });
  }

  /**
   * Get campaign statistics
   */
  public async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    const emails = await this.prisma.outreachEmail.findMany({
      where: { campaignId },
    });

    const prospects = await this.prisma.prospect.findMany({
      where: {
        outreachEmails: {
          some: { campaignId },
        },
      },
    });

    const totalProspects = new Set(emails.map(e => e.prospectId)).size;
    const emailsSent = emails.filter(e => e.status === 'sent' || e.status === 'opened' || e.status === 'clicked').length;
    const emailsOpened = emails.filter(e => e.status === 'opened' || e.status === 'clicked').length;
    const emailsClicked = emails.filter(e => e.status === 'clicked').length;
    const emailsBounced = emails.filter(e => e.status === 'bounced').length;
    const replies = prospects.filter(p => p.responseStatus === 'interested').length;
    const conversions = prospects.filter(p => p.responseStatus === 'converted').length;

    // Calculate by-step stats
    const stepNumbers = [...new Set(emails.map(e => e.sequenceStep))].sort();
    const byStep = stepNumbers.map(step => {
      const stepEmails = emails.filter(e => e.sequenceStep === step);
      return {
        step,
        sent: stepEmails.filter(e => e.status === 'sent' || e.status === 'opened' || e.status === 'clicked').length,
        opened: stepEmails.filter(e => e.status === 'opened' || e.status === 'clicked').length,
        clicked: stepEmails.filter(e => e.status === 'clicked').length,
        replied: stepEmails.filter(e => {
          return prospects.find(p => p.id === e.prospectId && p.responseStatus === 'interested');
        }).length,
      };
    });

    return {
      campaignId,
      totalProspects,
      emailsSent,
      emailsOpened,
      emailsClicked,
      emailsBounced,
      replies,
      conversions,
      openRate: emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0,
      responseRate: emailsSent > 0 ? (replies / emailsSent) * 100 : 0,
      conversionRate: emailsSent > 0 ? (conversions / emailsSent) * 100 : 0,
      byStep,
    };
  }

  /**
   * Pause a campaign for a prospect
   */
  public async pauseCampaign(prospectId: string, campaignId: string): Promise<void> {
    await this.prisma.outreachEmail.updateMany({
      where: {
        prospectId,
        campaignId,
        status: 'scheduled',
      },
      data: {
        status: 'draft',
      },
    });
  }

  /**
   * Resume a paused campaign
   */
  public async resumeCampaign(prospectId: string, campaignId: string): Promise<void> {
    await this.prisma.outreachEmail.updateMany({
      where: {
        prospectId,
        campaignId,
        status: 'draft',
      },
      data: {
        status: 'scheduled',
      },
    });
  }
}

export default OutreachCampaignService;
