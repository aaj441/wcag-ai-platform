/**
 * SendGrid Email Client
 * Transactional email delivery with tracking
 */

import sgMail from '@sendgrid/mail';
import { log } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
  trackingId?: string; // Custom tracking ID
  customArgs?: Record<string, string>; // For webhooks
}

export interface EmailDeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'bounced' | 'opened' | 'clicked' | 'failed';
  statusDetails?: string;
}

export class SendGridClient {
  private static defaultFrom = process.env.SENDGRID_FROM_EMAIL || 'outreach@wcag-platform.com';

  /**
   * Send email via SendGrid
   */
  static async sendEmail(options: SendEmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const msg = {
        to: options.to,
        from: options.from || this.defaultFrom,
        subject: options.subject,
        text: options.text || this.stripHtml(options.html),
        html: options.html,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
        customArgs: options.customArgs || {},
      };

      const [response] = await sgMail.send(msg);

      const messageId = response.headers['x-message-id'] as string;

      log.info('Email sent via SendGrid', {
        to: options.to,
        messageId,
        responseTime: Date.now() - startTime,
      });

      // Log to database
      await this.logEmailSent({
        to: options.to,
        subject: options.subject,
        messageId,
        trackingId: options.trackingId,
        status: 'sent',
      });

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      log.error('SendGrid send failed', error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk emails (batch)
   */
  static async sendBulkEmails(emails: SendEmailOptions[]): Promise<{
    sent: number;
    failed: number;
    results: Array<{ email: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    const results: Array<{ email: string; success: boolean; messageId?: string; error?: string }> = [];
    let sent = 0;
    let failed = 0;

    // SendGrid allows batching up to 1000 emails
    for (let i = 0; i < emails.length; i += 100) {
      const batch = emails.slice(i, i + 100);

      const batchResults = await Promise.allSettled(
        batch.map(email => this.sendEmail(email))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const email = batch[j];

        if (result.status === 'fulfilled' && result.value.success) {
          sent++;
          results.push({
            email: email.to,
            success: true,
            messageId: result.value.messageId,
          });
        } else {
          failed++;
          results.push({
            email: email.to,
            success: false,
            error: result.status === 'fulfilled' ? result.value.error : (result.reason as Error).message,
          });
        }
      }

      // Rate limit protection: wait between batches
      if (i + 100 < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    log.info('Bulk email send complete', { sent, failed, total: emails.length });

    return { sent, failed, results };
  }

  /**
   * Process SendGrid webhook event
   */
  static async processWebhookEvent(event: any): Promise<void> {
    try {
      const { event: eventType, email, sg_message_id, timestamp } = event;

      log.info('SendGrid webhook received', { eventType, email, messageId: sg_message_id });

      // Update database based on event type
      if (eventType === 'delivered' || eventType === 'open' || eventType === 'click' || eventType === 'bounce') {
        // Find the outreach activity by external ID
        const activity = await prisma.outreachActivity.findFirst({
          where: { externalId: sg_message_id },
        });

        if (activity) {
          const updates: any = {};

          if (eventType === 'delivered') {
            updates.status = 'delivered';
            updates.deliveredAt = new Date(timestamp * 1000);
          } else if (eventType === 'open') {
            updates.opened = true;
            updates.openedAt = new Date(timestamp * 1000);
          } else if (eventType === 'click') {
            updates.clicked = true;
            updates.clickedAt = new Date(timestamp * 1000);
          } else if (eventType === 'bounce') {
            updates.status = 'bounced';
          }

          await prisma.outreachActivity.update({
            where: { id: activity.id },
            data: updates,
          });

          log.info('Updated outreach activity', { activityId: activity.id, updates });
        }
      }
    } catch (error) {
      log.error('Webhook processing failed', error as Error);
    }
  }

  /**
   * Strip HTML tags for plain text version
   */
  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Log email sent to database
   */
  private static async logEmailSent(params: {
    to: string;
    subject: string;
    messageId: string;
    trackingId?: string;
    status: string;
  }): Promise<void> {
    try {
      await prisma.aPIIntegrationLog.create({
        data: {
          provider: 'sendgrid',
          endpoint: 'send',
          requestData: { to: params.to, subject: params.subject, trackingId: params.trackingId },
          responseData: { messageId: params.messageId },
          status: 'success',
          responseTimeMs: 0,
          costUsd: 0.0001, // ~$0.0001 per email
        },
      });
    } catch (error) {
      log.error('Failed to log email send', error as Error);
    }
  }
}
