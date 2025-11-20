/**
 * Outreach Sequencing Service
 * Multi-touch, multi-channel automated outreach campaigns
 */

import { PrismaClient } from '@prisma/client';
import { log } from '../utils/logger';
import { SendGridClient } from '../integrations/SendGridClient';
import { TwilioClient } from '../integrations/TwilioClient';
import { EmailPersonalizationService } from './EmailPersonalizationService';

const prisma = new PrismaClient();

export interface CreateSequenceOptions {
  name: string;
  description?: string;
  triggerEvent: 'audit_complete' | 'high_risk_score' | 'no_response_3days' | 'manual';
  targetIndustries?: string[];
  targetRiskScore?: number;
  steps: Array<{
    stepNumber: number;
    channel: 'email' | 'sms' | 'linkedin' | 'voicemail';
    delayDays: number;
    delayHours?: number;
    subject?: string; // For email
    body: string;
    sendCondition?: 'always' | 'if_not_opened' | 'if_not_clicked' | 'if_not_replied';
  }>;
}

export interface EnrollProspectOptions {
  prospectId: string;
  sequenceId: string;
  startImmediately?: boolean;
}

export class OutreachSequencingService {
  /**
   * Create new outreach sequence
   */
  static async createSequence(options: CreateSequenceOptions): Promise<string> {
    const sequence = await prisma.outreachSequence.create({
      data: {
        name: options.name,
        description: options.description,
        triggerEvent: options.triggerEvent,
        targetIndustries: options.targetIndustries || [],
        targetRiskScore: options.targetRiskScore,
        isActive: true,
        steps: {
          create: options.steps.map(step => ({
            stepNumber: step.stepNumber,
            channel: step.channel,
            delayDays: step.delayDays,
            delayHours: step.delayHours || 0,
            subject: step.subject,
            body: step.body,
            sendCondition: step.sendCondition || 'always',
          })),
        },
      },
    });

    log.info('Outreach sequence created', { sequenceId: sequence.id, name: sequence.name });

    return sequence.id;
  }

  /**
   * Enroll prospect in sequence
   */
  static async enrollProspect(options: EnrollProspectOptions): Promise<string> {
    // Check if already enrolled
    const existing = await prisma.outreachEnrollment.findUnique({
      where: {
        prospectId_sequenceId: {
          prospectId: options.prospectId,
          sequenceId: options.sequenceId,
        },
      },
    });

    if (existing) {
      log.warn('Prospect already enrolled in sequence', {
        prospectId: options.prospectId,
        sequenceId: options.sequenceId,
      });
      return existing.id;
    }

    // Get sequence steps
    const sequence = await prisma.outreachSequence.findUnique({
      where: { id: options.sequenceId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    if (!sequence) {
      throw new Error('Sequence not found');
    }

    // Calculate next step schedule
    const firstStep = sequence.steps[0];
    const nextStepScheduledAt = options.startImmediately
      ? new Date()
      : new Date(Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000 + firstStep.delayHours * 60 * 60 * 1000);

    const enrollment = await prisma.outreachEnrollment.create({
      data: {
        prospectId: options.prospectId,
        sequenceId: options.sequenceId,
        status: 'active',
        currentStep: 0,
        nextStepScheduledAt,
      },
    });

    // Update sequence metrics
    await prisma.outreachSequence.update({
      where: { id: options.sequenceId },
      data: {
        totalProspects: { increment: 1 },
      },
    });

    log.info('Prospect enrolled in sequence', {
      enrollmentId: enrollment.id,
      nextStepScheduledAt,
    });

    return enrollment.id;
  }

  /**
   * Process scheduled outreach (run via cron)
   */
  static async processScheduledOutreach(): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {
    log.info('Processing scheduled outreach...');

    // Find all enrollments with scheduled steps
    const enrollments = await prisma.outreachEnrollment.findMany({
      where: {
        status: 'active',
        nextStepScheduledAt: {
          lte: new Date(),
        },
      },
      include: {
        prospect: true,
        sequence: {
          include: {
            steps: { orderBy: { stepNumber: 'asc' } },
          },
        },
      },
      take: 100, // Process 100 at a time
    });

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const enrollment of enrollments) {
      try {
        const result = await this.sendNextStep(enrollment.id);

        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        processed++;
      } catch (error) {
        log.error('Failed to process enrollment', error as Error);
        failed++;
      }
    }

    log.info('Scheduled outreach processing complete', { processed, sent, failed });

    return { processed, sent, failed };
  }

  /**
   * Send next step in sequence for an enrollment
   */
  static async sendNextStep(enrollmentId: string): Promise<{
    success: boolean;
    activityId?: string;
    error?: string;
  }> {
    const enrollment = await prisma.outreachEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        prospect: {
          include: {
            industry: true,
            metro: true,
          },
        },
        sequence: {
          include: {
            steps: { orderBy: { stepNumber: 'asc' } },
          },
        },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!enrollment) {
      return { success: false, error: 'Enrollment not found' };
    }

    // Get next step
    const nextStepNumber = enrollment.currentStep + 1;
    const nextStep = enrollment.sequence.steps.find(s => s.stepNumber === nextStepNumber);

    if (!nextStep) {
      // Sequence complete
      await prisma.outreachEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      return { success: true };
    }

    // Check send condition
    const shouldSend = await this.checkSendCondition(enrollment, nextStep.sendCondition || 'always');

    if (!shouldSend) {
      // Skip this step, schedule next one
      await this.scheduleNextStep(enrollmentId, nextStepNumber + 1, enrollment.sequence.steps);
      return { success: true };
    }

    // Personalize content
    const content = await this.personalizeContent(nextStep.body, enrollment.prospect);
    const subject = nextStep.subject
      ? await this.personalizeContent(nextStep.subject, enrollment.prospect)
      : undefined;

    // Send via appropriate channel
    let externalId: string | undefined;
    let deliverySuccess = false;
    let errorMessage: string | undefined;

    switch (nextStep.channel) {
      case 'email':
        const emailResult = await SendGridClient.sendEmail({
          to: enrollment.prospect.email || '',
          subject: subject || 'Update from WCAG Platform',
          html: content,
          trackingId: enrollmentId,
          customArgs: {
            enrollmentId,
            prospectId: enrollment.prospectId,
            stepNumber: nextStepNumber.toString(),
          },
        });

        deliverySuccess = emailResult.success;
        externalId = emailResult.messageId;
        errorMessage = emailResult.error;
        break;

      case 'sms':
        if (enrollment.prospect.phone) {
          const smsResult = await TwilioClient.sendSMS({
            to: TwilioClient.formatPhoneNumber(enrollment.prospect.phone),
            message: content,
            trackingId: enrollmentId,
          });

          deliverySuccess = smsResult.success;
          externalId = smsResult.messageSid;
          errorMessage = smsResult.error;
        } else {
          errorMessage = 'No phone number available';
        }
        break;

      case 'voicemail':
        // TODO: Implement voicemail drop
        errorMessage = 'Voicemail not yet implemented';
        break;

      case 'linkedin':
        // TODO: Implement LinkedIn automation
        errorMessage = 'LinkedIn not yet implemented';
        break;
    }

    // Create activity record
    const activity = await prisma.outreachActivity.create({
      data: {
        enrollmentId,
        stepNumber: nextStepNumber,
        channel: nextStep.channel,
        subject,
        body: content,
        status: deliverySuccess ? 'sent' : 'failed',
        scheduledFor: new Date(),
        sentAt: deliverySuccess ? new Date() : undefined,
        externalId,
        externalProvider: nextStep.channel === 'email' ? 'sendgrid' : nextStep.channel === 'sms' ? 'twilio' : undefined,
        errorMessage,
      },
    });

    if (deliverySuccess) {
      // Update enrollment
      await prisma.outreachEnrollment.update({
        where: { id: enrollmentId },
        data: {
          currentStep: nextStepNumber,
          lastStepSentAt: new Date(),
          stepsCompleted: { increment: 1 },
        },
      });

      // Update sequence metrics
      await prisma.outreachSequence.update({
        where: { id: enrollment.sequenceId },
        data: {
          totalSent: { increment: 1 },
        },
      });

      // Schedule next step
      await this.scheduleNextStep(enrollmentId, nextStepNumber + 1, enrollment.sequence.steps);

      log.info('Outreach step sent', {
        enrollmentId,
        stepNumber: nextStepNumber,
        channel: nextStep.channel,
        activityId: activity.id,
      });
    }

    return {
      success: deliverySuccess,
      activityId: activity.id,
      error: errorMessage,
    };
  }

  /**
   * Check if step should be sent based on condition
   */
  private static async checkSendCondition(
    enrollment: any,
    condition: string
  ): Promise<boolean> {
    if (condition === 'always') {
      return true;
    }

    const lastActivity = enrollment.activities[0];

    if (!lastActivity) {
      return true; // First step, always send
    }

    if (condition === 'if_not_opened') {
      return !lastActivity.opened;
    }

    if (condition === 'if_not_clicked') {
      return !lastActivity.clicked;
    }

    if (condition === 'if_not_replied') {
      return !lastActivity.replied;
    }

    return true;
  }

  /**
   * Schedule next step
   */
  private static async scheduleNextStep(
    enrollmentId: string,
    nextStepNumber: number,
    steps: any[]
  ): Promise<void> {
    const nextStep = steps.find(s => s.stepNumber === nextStepNumber);

    if (!nextStep) {
      // No more steps, mark as complete
      await prisma.outreachEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          nextStepScheduledAt: null,
        },
      });

      return;
    }

    const nextScheduledAt = new Date(
      Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000 + nextStep.delayHours * 60 * 60 * 1000
    );

    await prisma.outreachEnrollment.update({
      where: { id: enrollmentId },
      data: {
        nextStepScheduledAt: nextScheduledAt,
      },
    });
  }

  /**
   * Personalize content with prospect data
   */
  private static async personalizeContent(template: string, prospect: any): Promise<string> {
    let content = template;

    // Replace variables
    content = content.replace(/\{\{firstName\}\}/g, prospect.ownerName?.split(' ')[0] || 'there');
    content = content.replace(/\{\{lastName\}\}/g, prospect.ownerName?.split(' ').slice(1).join(' ') || '');
    content = content.replace(/\{\{businessName\}\}/g, prospect.businessName || '');
    content = content.replace(/\{\{industry\}\}/g, prospect.industry?.name || '');
    content = content.replace(/\{\{city\}\}/g, prospect.city || '');
    content = content.replace(/\{\{website\}\}/g, prospect.website || '');

    return content;
  }

  /**
   * Pause enrollment
   */
  static async pauseEnrollment(enrollmentId: string): Promise<void> {
    await prisma.outreachEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'paused' },
    });
  }

  /**
   * Resume enrollment
   */
  static async resumeEnrollment(enrollmentId: string): Promise<void> {
    await prisma.outreachEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'active' },
    });
  }

  /**
   * Unsubscribe prospect from sequence
   */
  static async unsubscribeProspect(enrollmentId: string): Promise<void> {
    await prisma.outreachEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'unsubscribed',
        unsubscribedAt: new Date(),
      },
    });
  }

  /**
   * Get sequence performance analytics
   */
  static async getSequenceAnalytics(sequenceId: string): Promise<{
    totalProspects: number;
    totalSent: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    conversionRate: number;
    byChannel: Record<string, { sent: number; opened: number; clicked: number }>;
  }> {
    const sequence = await prisma.outreachSequence.findUnique({
      where: { id: sequenceId },
      include: {
        enrollments: {
          include: {
            activities: true,
          },
        },
      },
    });

    if (!sequence) {
      throw new Error('Sequence not found');
    }

    const totalActivities = sequence.enrollments.flatMap(e => e.activities);

    const byChannel: Record<string, { sent: number; opened: number; clicked: number }> = {};

    for (const activity of totalActivities) {
      if (!byChannel[activity.channel]) {
        byChannel[activity.channel] = { sent: 0, opened: 0, clicked: 0 };
      }

      if (activity.status === 'sent' || activity.status === 'delivered') {
        byChannel[activity.channel].sent++;
      }

      if (activity.opened) {
        byChannel[activity.channel].opened++;
      }

      if (activity.clicked) {
        byChannel[activity.channel].clicked++;
      }
    }

    const totalSent = totalActivities.filter(a => a.status === 'sent' || a.status === 'delivered').length;
    const totalOpened = totalActivities.filter(a => a.opened).length;
    const totalClicked = totalActivities.filter(a => a.clicked).length;
    const totalReplied = totalActivities.filter(a => a.replied).length;
    const totalConverted = sequence.enrollments.filter(e => e.converted).length;

    return {
      totalProspects: sequence.totalProspects,
      totalSent,
      openRate: totalSent > 0 ? totalOpened / totalSent : 0,
      clickRate: totalSent > 0 ? totalClicked / totalSent : 0,
      replyRate: totalSent > 0 ? totalReplied / totalSent : 0,
      conversionRate: sequence.totalProspects > 0 ? totalConverted / sequence.totalProspects : 0,
      byChannel,
    };
  }
}
