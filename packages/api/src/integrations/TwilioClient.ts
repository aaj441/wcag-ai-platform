/**
 * Twilio SMS Client
 * SMS messaging for high-priority prospects
 */

import axios from 'axios';
import { log } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SendSMSOptions {
  to: string; // Phone number in E.164 format (+1234567890)
  message: string;
  trackingId?: string;
}

export class TwilioClient {
  private static accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  private static authToken = process.env.TWILIO_AUTH_TOKEN || '';
  private static fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  private static baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;

  /**
   * Send SMS via Twilio
   */
  static async sendSMS(options: SendSMSOptions): Promise<{
    success: boolean;
    messageSid?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Validate phone number format
      if (!options.to.startsWith('+')) {
        return {
          success: false,
          error: 'Phone number must be in E.164 format (+1234567890)',
        };
      }

      const response = await axios.post(
        `${this.baseUrl}/Messages.json`,
        new URLSearchParams({
          To: options.to,
          From: this.fromNumber,
          Body: options.message,
        }),
        {
          auth: {
            username: this.accountSid,
            password: this.authToken,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const messageSid = response.data.sid;

      log.info('SMS sent via Twilio', {
        to: options.to,
        messageSid,
        responseTime: Date.now() - startTime,
      });

      // Log to database
      await this.logSMSSent({
        to: options.to,
        message: options.message,
        messageSid,
        trackingId: options.trackingId,
      });

      return {
        success: true,
        messageSid,
      };
    } catch (error: any) {
      log.error('Twilio SMS send failed', error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send voicemail drop
   */
  static async sendVoicemailDrop(options: {
    to: string;
    voicemailUrl: string; // URL to MP3 voicemail recording
    trackingId?: string;
  }): Promise<{
    success: boolean;
    callSid?: string;
    error?: string;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/Calls.json`,
        new URLSearchParams({
          To: options.to,
          From: this.fromNumber,
          Url: options.voicemailUrl, // TwiML URL that plays the voicemail
        }),
        {
          auth: {
            username: this.accountSid,
            password: this.authToken,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const callSid = response.data.sid;

      log.info('Voicemail drop sent', { to: options.to, callSid });

      return {
        success: true,
        callSid,
      };
    } catch (error: any) {
      log.error('Voicemail drop failed', error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get SMS delivery status
   */
  static async getSMSStatus(messageSid: string): Promise<{
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
    errorCode?: number;
    errorMessage?: string;
  } | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/Messages/${messageSid}.json`,
        {
          auth: {
            username: this.accountSid,
            password: this.authToken,
          },
        }
      );

      return {
        status: response.data.status,
        errorCode: response.data.error_code,
        errorMessage: response.data.error_message,
      };
    } catch (error) {
      log.error('Failed to get SMS status', error as Error);
      return null;
    }
  }

  /**
   * Validate phone number
   */
  static async validatePhoneNumber(phoneNumber: string): Promise<{
    valid: boolean;
    formatted?: string; // E.164 format
    carrier?: string;
    type?: 'mobile' | 'landline' | 'voip';
  }> {
    try {
      const response = await axios.get(
        `https://lookups.twilio.com/v1/PhoneNumbers/${encodeURIComponent(phoneNumber)}?Type=carrier`,
        {
          auth: {
            username: this.accountSid,
            password: this.authToken,
          },
        }
      );

      return {
        valid: true,
        formatted: response.data.phone_number,
        carrier: response.data.carrier?.name,
        type: response.data.carrier?.type,
      };
    } catch (error) {
      return {
        valid: false,
      };
    }
  }

  /**
   * Format US phone number to E.164
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // If it's 10 digits, assume US number
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // If it's 11 digits starting with 1, add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }

    // Otherwise return as-is (may be invalid)
    return phoneNumber;
  }

  /**
   * Log SMS sent to database
   */
  private static async logSMSSent(params: {
    to: string;
    message: string;
    messageSid: string;
    trackingId?: string;
  }): Promise<void> {
    try {
      await prisma.aPIIntegrationLog.create({
        data: {
          provider: 'twilio',
          endpoint: 'send_sms',
          requestData: { to: params.to, message: params.message, trackingId: params.trackingId },
          responseData: { messageSid: params.messageSid },
          status: 'success',
          responseTimeMs: 0,
          costUsd: 0.0075, // ~$0.0075 per SMS
        },
      });
    } catch (error) {
      log.error('Failed to log SMS send', error as Error);
    }
  }
}
