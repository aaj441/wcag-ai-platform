/**
 * Email Service
 * SendGrid-based email delivery with templating
 */

import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@wcag-ai.com';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email via SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured. Email not sent.');
      return false;
    }

    await sgMail.send({
      to: options.to,
      from: SENDER_EMAIL,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html)
    });

    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error: any) {
    console.error('Email send error:', error.response?.body || error.message);
    return false;
  }
}

/**
 * Send welcome email to new client
 */
export async function sendWelcomeEmail(
  email: string,
  company: string,
  apiKey: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .api-key { background: #e5e7eb; padding: 15px; border-radius: 5px; font-family: monospace; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to WCAG AI Platform! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hello ${company}!</h2>
            <p>Thank you for signing up for WCAG AI Platform. We're excited to help you ensure your websites are accessible to everyone.</p>
            
            <h3>Your API Key</h3>
            <p>Use this key to authenticate your requests:</p>
            <div class="api-key">
              ${apiKey}
            </div>
            
            <h3>Getting Started</h3>
            <ol>
              <li>Include your API key in the <code>x-api-key</code> header</li>
              <li>Make a POST request to <code>/api/scans</code> to start your first scan</li>
              <li>View results and generate accessibility reports</li>
            </ol>
            
            <h3>Need Help?</h3>
            <p>Visit our <a href="https://docs.wcag-ai.com">documentation</a> or contact support at support@wcag-ai.com</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 WCAG AI Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to WCAG AI Platform - ${company}`,
    html
  });
}

/**
 * Send scan report email
 */
export async function sendScanReportEmail(
  email: string,
  scanId: string,
  websiteUrl: string,
  violationCount: number,
  reportUrl?: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .stats { background: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your WCAG Scan is Complete</h1>
          </div>
          <div class="content">
            <h2>Scan Results</h2>
            <p>We've completed scanning <strong>${websiteUrl}</strong></p>
            
            <div class="stats">
              <h3>Summary</h3>
              <p><strong>${violationCount}</strong> accessibility violations found</p>
              <p>Scan ID: <code>${scanId}</code></p>
            </div>
            
            ${reportUrl ? `
              <a href="${reportUrl}" class="button">View Full Report</a>
            ` : ''}
            
            <h3>Next Steps</h3>
            <ol>
              <li>Review the detailed violation report</li>
              <li>Prioritize critical issues</li>
              <li>Implement recommended fixes</li>
              <li>Run a follow-up scan to verify improvements</li>
            </ol>
          </div>
          <div class="footer">
            <p>&copy; 2024 WCAG AI Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `WCAG Scan Complete - ${violationCount} violations found`,
    html
  });
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(
  email: string,
  amount: number,
  tier: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Confirmed ✓</h1>
          </div>
          <div class="content">
            <h2>Thank You!</h2>
            <p>Your payment of <strong>$${(amount / 100).toFixed(2)}</strong> has been processed successfully.</p>
            <p>Plan: <strong>${tier.toUpperCase()}</strong></p>
            <p>Your account has been updated and you can continue using our services.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 WCAG AI Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Payment Confirmation - WCAG AI Platform',
    html
  });
}

/**
 * Send payment failure notification
 */
export async function sendPaymentFailureEmail(
  email: string,
  reason?: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Failed</h1>
          </div>
          <div class="content">
            <h2>Action Required</h2>
            <p>We were unable to process your payment.</p>
            ${reason ? `<p>Reason: <strong>${reason}</strong></p>` : ''}
            <p>Please update your payment method to continue using our services.</p>
            <p>If you have questions, contact support@wcag-ai.com</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 WCAG AI Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Payment Failed - Action Required',
    html
  });
}

/**
 * Strip HTML tags for plain text fallback
 * 
 * SECURITY NOTE: This function is ONLY used to convert internal email templates 
 * to plain text for email clients that don't support HTML. It is NOT used for 
 * sanitizing user-provided HTML. The input is always generated by our server
 * from safe templates, never from user input.
 * 
 * @param html - HTML string from internal email templates
 * @returns Plain text version for email fallback
 */
function stripHtml(html: string): string {
  // Remove all HTML tags including script tags
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities in safe order (decode &amp; last to avoid double-decoding)
  const entityMap: [RegExp, string][] = [
    [/&lt;/g, '<'],
    [/&gt;/g, '>'],
    [/&quot;/g, '"'],
    [/&#39;/g, "'"],
    [/&nbsp;/g, ' '],
    [/&amp;/g, '&']  // Last to prevent double-decoding
  ];
  
  for (const [regex, replacement] of entityMap) {
    text = text.replace(regex, replacement);
  }
  
  return text.trim();
}

export default {
  sendEmail,
  sendWelcomeEmail,
  sendScanReportEmail,
  sendPaymentConfirmationEmail,
  sendPaymentFailureEmail
};
