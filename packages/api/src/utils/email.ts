import nodemailer from 'nodemailer';
import { logger } from './logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter(): Promise<void> {
    try {
      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };

      // Validate required configuration
      if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
        logger.warn('Email service not configured - missing SMTP credentials');
        return;
      }

      this.transporter = nodemailer.createTransporter(smtpConfig);
      
      // Verify the connection configuration
      await this.transporter.verify();
      this.isConfigured = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.error('Email service not configured - cannot send email');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${process.env.FROM_NAME || 'WCAG AI Platform'}" <${process.env.FROM_EMAIL}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  // Template methods for common email types
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const subject = 'Welcome to WCAG AI Platform!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to WCAG AI Platform, ${userName}!</h2>
        <p>Thank you for joining our platform. We're excited to help you create more accessible websites.</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #334155;">What you can do:</h3>
          <ul style="color: #64748b;">
            <li>Scan websites for accessibility issues</li>
            <li>Generate detailed WCAG compliance reports</li>
            <li>Track accessibility improvements over time</li>
            <li>Collaborate with your team</li>
          </ul>
        </div>
        <p style="color: #64748b;">If you have any questions, feel free to reply to this email.</p>
        <p>Best regards,<br/>The WCAG AI Platform Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<boolean> {
    const subject = 'Reset Your Password - WCAG AI Platform';
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Reset Your Password</h2>
        <p>You requested to reset your password for your WCAG AI Platform account.</p>
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
          <p style="color: #991b1b;"><strong>Important:</strong> This link will expire in 1 hour.</p>
        </div>
        <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Reset Password
        </a>
        <p style="color: #64748b;">If you didn't request this password reset, you can safely ignore this email.</p>
        <p>Best regards,<br/>The WCAG AI Platform Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  async sendScanCompleteEmail(userEmail: string, scanUrl: string, scanResults: any): Promise<boolean> {
    const subject = 'Accessibility Scan Completed';
    const scanUrlPath = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/scans/${scanResults.id}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Accessibility Scan Complete! 🎉</h2>
        <p>Your accessibility scan for <strong>${scanUrl}</strong> has been completed.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <h3 style="color: #166534;">Scan Summary:</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
            <div>
              <strong>Total Issues:</strong> ${scanResults.totalIssues}
            </div>
            <div>
              <strong>Accessibility Score:</strong> ${scanResults.score.toFixed(1)}%
            </div>
            <div style="color: #dc2626;">
              <strong>Critical:</strong> ${scanResults.criticalIssues}
            </div>
            <div style="color: #ea580c;">
              <strong>Serious:</strong> ${scanResults.seriousIssues}
            </div>
            <div style="color: #f59e0b;">
              <strong>Moderate:</strong> ${scanResults.moderateIssues}
            </div>
            <div style="color: #3b82f6;">
              <strong>Minor:</strong> ${scanResults.minorIssues}
            </div>
          </div>
        </div>
        
        <a href="${scanUrlPath}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          View Full Report
        </a>
        
        <p style="color: #64748b;">Need help interpreting the results? Check out our <a href="${process.env.FRONTEND_URL}/help" style="color: #3b82f6;">help documentation</a>.</p>
        <p>Best regards,<br/>The WCAG AI Platform Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  async sendWeeklyDigestEmail(userEmail: string, weeklyStats: any): Promise<boolean> {
    const subject = 'Your Weekly Accessibility Report';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Your Weekly Accessibility Report</h2>
        <p>Here's your accessibility activity summary for the past week.</p>
        
        <div style="background-color: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9d5ff;">
          <h3 style="color: #6b21a8;">This Week's Activity:</h3>
          <ul style="color: #6b21a8; list-style: none; padding: 0;">
            <li>📊 Scans completed: ${weeklyStats.scansCompleted}</li>
            <li>✅ Issues resolved: ${weeklyStats.issuesResolved}</li>
            <li>📈 Average score improvement: ${weeklyStats.scoreImprovement}%</li>
            <li>🌐 Websites scanned: ${weeklyStats.websitesScanned}</li>
          </ul>
        </div>
        
        ${weeklyStats.topIssues.length > 0 ? `
        <div style="margin: 20px 0;">
          <h3 style="color: #334155;">Top Issues Found:</h3>
          <ol style="color: #64748b;">
            ${weeklyStats.topIssues.map((issue: any) => `<li>${issue.title} (${issue.count} occurrences)</li>`).join('')}
          </ol>
        </div>
        ` : ''}
        
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          View Dashboard
        </a>
        
        <p style="color: #64748b;">Keep up the great work improving web accessibility!</p>
        <p>Best regards,<br/>The WCAG AI Platform Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  async sendOrganizationInviteEmail(
    userEmail: string, 
    inviterName: string, 
    organizationName: string, 
    inviteUrl: string
  ): Promise<boolean> {
    const subject = `Invitation to join ${organizationName} on WCAG AI Platform`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">You're Invited! 🎊</h2>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on the WCAG AI Platform.</p>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bae6fd;">
          <p style="color: #075985;">Collaborate with your team to:</p>
          <ul style="color: #075985;">
            <li>Run accessibility scans as a team</li>
            <li>Share and review reports together</li>
            <li>Track organization-wide accessibility progress</li>
            <li>Manage access and permissions</li>
          </ul>
        </div>
        
        <a href="${inviteUrl}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Accept Invitation
        </a>
        
        <p style="color: #64748b;">This invitation will expire in 7 days.</p>
        <p>Best regards,<br/>The WCAG AI Platform Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  async sendEmailWithReport(
    userEmail: string, 
    subject: string, 
    reportContent: string | Buffer,
    filename: string,
    contentType: string = 'application/pdf'
  ): Promise<boolean> {
    return await this.sendEmail({
      to: userEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">${subject}</h2>
          <p>Please find your accessibility report attached to this email.</p>
          <p style="color: #64748b;">If you have any questions about the report, feel free to contact our support team.</p>
          <p>Best regards,<br/>The WCAG AI Platform Team</p>
        </div>
      `,
      attachments: [
        {
          filename,
          content: reportContent,
          contentType,
        },
      ],
    });
  }
}

// Create and export singleton instance
export const emailService = new EmailService();

// Export convenience function
export const sendEmail = (options: EmailOptions): Promise<boolean> => {
  return emailService.sendEmail(options);
};