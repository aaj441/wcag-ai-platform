/**
 * Email Service using SendGrid
 * Handles transactional emails with retry logic
 */

import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const FROM_EMAIL = process.env.SENDER_EMAIL || 'noreply@wcag-ai.com';
const FROM_NAME = 'WCAG AI Platform';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email with retry logic
 */
export async function sendEmail(options: EmailOptions, retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sgMail.send({
        to: options.to,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: options.subject,
        html: options.html,
        text: options.text || stripHtml(options.html)
      });

      console.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error: any) {
      console.error(`Email send attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        console.error(`Failed to send email to ${options.to} after ${retries} attempts`);
        return false;
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return false;
}

/**
 * Send onboarding confirmation email
 */
export async function sendOnboardingEmail(
  email: string,
  company: string,
  apiKey: string,
  tier: string
): Promise<boolean> {
  const scansIncluded = tier === 'free' ? 5 : tier === 'starter' ? 20 : tier === 'pro' ? 100 : 'Unlimited';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Welcome to WCAG AI Platform</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to WCAG AI Platform</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your accessibility compliance journey starts now</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-top: 0;">Hi ${company} team,</p>
        
        <p>Thank you for choosing WCAG AI Platform! Your account has been successfully created.</p>
        
        <div style="background: white; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 15px 0; color: #2563eb;">Your Account Details</h3>
          <p style="margin: 5px 0;"><strong>Plan:</strong> ${tier.charAt(0).toUpperCase() + tier.slice(1)}</p>
          <p style="margin: 5px 0;"><strong>Scans Included:</strong> ${scansIncluded}</p>
          <p style="margin: 5px 0;"><strong>API Key:</strong></p>
          <code style="background: #f3f4f6; padding: 10px; display: block; border-radius: 4px; word-break: break-all; font-size: 12px; margin-top: 5px;">${apiKey}</code>
          <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">⚠️ Keep your API key secure. Never share it publicly.</p>
        </div>
        
        <h3 style="color: #1f2937; margin-top: 30px;">Getting Started</h3>
        <ol style="padding-left: 20px;">
          <li style="margin-bottom: 10px;">Use your API key to authenticate requests</li>
          <li style="margin-bottom: 10px;">Submit your first website scan via our API</li>
          <li style="margin-bottom: 10px;">Review AI-detected WCAG violations</li>
          <li style="margin-bottom: 10px;">Download your compliance report</li>
        </ol>
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="https://docs.wcag-ai.com" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Documentation</a>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
          Need help? Reply to this email or visit our <a href="https://support.wcag-ai.com" style="color: #2563eb;">support center</a>.
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
          <p>WCAG AI Platform | Making the web accessible for everyone</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🎉 Welcome to WCAG AI Platform - Your Account is Ready',
    html
  });
}

/**
 * Send SLA alert email
 */
export async function sendSLAAlertEmail(
  consultantEmail: string,
  scanId: string,
  websiteUrl: string,
  hoursRemaining: number
): Promise<boolean> {
  const urgencyClass = hoursRemaining <= 2 ? 'critical' : hoursRemaining <= 6 ? 'warning' : 'info';
  const urgencyColor = urgencyClass === 'critical' ? '#dc2626' : urgencyClass === 'warning' ? '#f59e0b' : '#2563eb';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>SLA Alert - Scan Requires Review</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">⏰ SLA Alert: Review Required</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        <div style="background: white; border-left: 4px solid ${urgencyColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">Scan Pending Review</p>
          <p style="margin: 5px 0;"><strong>Website:</strong> ${websiteUrl}</p>
          <p style="margin: 5px 0;"><strong>Scan ID:</strong> ${scanId}</p>
          <p style="margin: 5px 0;"><strong>Time Remaining:</strong> <span style="color: ${urgencyColor}; font-weight: 600;">${hoursRemaining} hours</span></p>
        </div>
        
        <p>A client scan requires your expert review to meet our SLA commitment.</p>
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="https://app.wcag-ai.com/consultant/scans/${scanId}" style="display: inline-block; background: ${urgencyColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Review Scan Now</a>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
          <p>WCAG AI Platform | Consultant Dashboard</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: consultantEmail,
    subject: `⏰ SLA Alert: Scan review required (${hoursRemaining}h remaining)`,
    html
  });
}

/**
 * Send report ready notification email
 */
export async function sendReportNotificationEmail(
  clientEmail: string,
  company: string,
  websiteUrl: string,
  reportUrl: string,
  complianceScore: number
): Promise<boolean> {
  const scoreColor = complianceScore >= 90 ? '#10b981' : complianceScore >= 70 ? '#f59e0b' : '#dc2626';
  const scoreLabel = complianceScore >= 90 ? 'Excellent' : complianceScore >= 70 ? 'Good' : 'Needs Improvement';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Your WCAG Compliance Report is Ready</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">✅ Your Report is Ready</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">WCAG 2.2 AA Compliance Audit Results</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-top: 0;">Hi ${company} team,</p>
        
        <p>Your accessibility compliance report for <strong>${websiteUrl}</strong> has been completed and verified by our expert consultants.</p>
        
        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Compliance Score</p>
          <div style="font-size: 48px; font-weight: bold; color: ${scoreColor}; margin: 10px 0;">${complianceScore}%</div>
          <p style="margin: 10px 0 0 0; color: ${scoreColor}; font-weight: 600;">${scoreLabel}</p>
        </div>
        
        <p>Your detailed report includes:</p>
        <ul style="padding-left: 20px;">
          <li style="margin-bottom: 8px;">Complete WCAG violation analysis</li>
          <li style="margin-bottom: 8px;">Severity rankings and impact assessments</li>
          <li style="margin-bottom: 8px;">Step-by-step remediation guidance</li>
          <li style="margin-bottom: 8px;">Code examples and best practices</li>
        </ul>
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="${reportUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Download Your Report</a>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
          Questions about your report? Reply to this email or schedule a consultation with our team.
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
          <p>WCAG AI Platform | Making the web accessible for everyone</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: clientEmail,
    subject: `✅ Your WCAG Compliance Report is Ready - ${complianceScore}% Score`,
    html
  });
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
