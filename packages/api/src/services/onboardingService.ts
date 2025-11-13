/**
 * Client Onboarding Service
 * Handles complete client onboarding workflow including:
 * - Legal document generation and delivery
 * - Automatic initial scan scheduling
 * - Compliance dashboard setup
 * - Welcome communication
 */

import prisma from '../lib/prisma';
import { sendEmail } from './email';
import { getScanQueue } from './orchestration/ScanQueue';
import { log } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export interface OnboardingRequest {
  email: string;
  company: string;
  website?: string;
  websites?: string[];
  tier: 'basic' | 'pro' | 'enterprise';
  contactName?: string;
  contactPhone?: string;
  industry?: string;
}

export interface OnboardingResult {
  success: boolean;
  clientId: string;
  apiKey: string;
  complianceDashboardUrl: string;
  legalDocumentsUrl: string;
  initialScanScheduled: boolean;
  nextSteps: string[];
  message: string;
}

class OnboardingService {
  /**
   * Execute complete onboarding workflow
   */
  static async onboardClient(req: OnboardingRequest): Promise<OnboardingResult> {
    try {
      // Validate input
      this.validateOnboardingRequest(req);

      // Check for existing client
      const existing = await prisma.client.findUnique({
        where: { email: req.email },
      });

      if (existing) {
        throw new Error(`Client with email ${req.email} already exists`);
      }

      // Create client record
      const client = await this.createClientRecord(req);
      log.info('Client created', { clientId: client.id, tier: req.tier });

      // Generate legal documents
      const legalDocs = await this.generateLegalDocuments(client, req);
      log.info('Legal documents generated', { clientId: client.id });

      // Send welcome package
      await this.sendWelcomePackage(client, req, legalDocs);
      log.info('Welcome package sent', { email: client.email });

      // Schedule initial scan if website provided
      let initialScanScheduled = false;
      if (req.website || req.websites) {
        initialScanScheduled = await this.scheduleInitialScans(client, req);
        log.info('Initial scans scheduled', { clientId: client.id, scheduled: initialScanScheduled });
      }

      // Create compliance dashboard entry
      const dashboardUrl = this.generateDashboardUrl(client);

      // Send legal documents for signature
      await this.initiateLegalSigning(client, legalDocs);

      return {
        success: true,
        clientId: client.id,
        apiKey: client.apiKey!,
        complianceDashboardUrl: dashboardUrl,
        legalDocumentsUrl: `${process.env.DASHBOARD_URL || 'https://dashboard.wcag-ai.com'}/legal/${client.id}`,
        initialScanScheduled,
        nextSteps: this.generateNextSteps(req.tier),
        message: `Welcome to WCAG AI Platform! Your account is ready. Review the legal documents and start your first scan.`,
      };
    } catch (error) {
      log.error('Onboarding failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Validate onboarding request
   */
  private static validateOnboardingRequest(req: OnboardingRequest): void {
    if (!req.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) {
      throw new Error('Valid email address is required');
    }

    if (!req.company || req.company.trim().length === 0) {
      throw new Error('Company name is required');
    }

    if (!['basic', 'pro', 'enterprise'].includes(req.tier)) {
      throw new Error('Invalid tier specified');
    }

    if (req.website && !/^https?:\/\//.test(req.website)) {
      throw new Error('Website URL must start with http:// or https://');
    }
  }

  /**
   * Create client database record
   */
  private static async createClientRecord(req: OnboardingRequest) {
    const apiKey = `wcag_${require('crypto').randomBytes(32).toString('hex')}`;

    const scanLimits = {
      basic: 2,
      pro: 10,
      enterprise: 50,
    };

    return await prisma.client.create({
      data: {
        email: req.email,
        company: req.company,
        tier: req.tier,
        apiKey,
        scansRemaining: scanLimits[req.tier],
        status: 'active',
      },
    });
  }

  /**
   * Generate legal documents for client
   */
  private static async generateLegalDocuments(client: any, req: OnboardingRequest) {
    const basePath = path.join(process.cwd(), '..', '..', 'legal-templates');

    // Read template files
    const serviceAgreement = fs.readFileSync(
      path.join(basePath, 'SERVICE_AGREEMENT.md'),
      'utf-8'
    );
    const liabilityWaiver = fs.readFileSync(
      path.join(basePath, 'LIABILITY_WAIVER.md'),
      'utf-8'
    );
    const slaDocument = fs.readFileSync(
      path.join(basePath, 'SLA_BY_TIER.md'),
      'utf-8'
    );

    // Customize templates with client information
    const tierPrices = {
      basic: '$299',
      pro: '$999',
      enterprise: 'Custom pricing',
    };

    const customizedSA = this.customizeTemplate(serviceAgreement, {
      CLIENT_COMPANY: client.company,
      CLIENT_EMAIL: client.email,
      TIER: client.tier.toUpperCase(),
      EFFECTIVE_DATE: new Date().toLocaleDateString(),
      JURISDICTION: 'Delaware', // Customize as needed
      BASIC_PRICE: '$299',
      PRO_PRICE: '$999',
      ENTERPRISE_PRICE: 'Custom',
    });

    const customizedWaiver = this.customizeTemplate(liabilityWaiver, {
      CLIENT_COMPANY: client.company,
    });

    const customizedSLA = this.customizeTemplate(slaDocument, {
      EFFECTIVE_DATE: new Date().toLocaleDateString(),
      TIER: client.tier.toUpperCase(),
    });

    return {
      serviceAgreement: customizedSA,
      liabilityWaiver: customizedWaiver,
      slaDocument: customizedSLA,
      accessibilityStatement: '', // Will be generated after client setup
    };
  }

  /**
   * Customize template with client-specific data
   */
  private static customizeTemplate(template: string, data: Record<string, string>): string {
    let result = template;
    Object.entries(data).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return result;
  }

  /**
   * Send welcome package to client
   */
  private static async sendWelcomePackage(client: any, req: OnboardingRequest, docs: any) {
    const dashboardUrl = this.generateDashboardUrl(client);
    const tieredFeatures = {
      basic: [
        '2 websites per day',
        'Daily email summaries',
        'Violation tracking',
      ],
      pro: [
        '10 websites per day',
        'Detailed daily reports',
        'Violation trend analysis',
        'Priority email support',
      ],
      enterprise: [
        'Unlimited daily scans',
        'Custom schedules',
        'Advanced analytics',
        '24/7 phone & Slack support',
        'Dedicated account manager',
      ],
    };

    const features = tieredFeatures[client.tier] || tieredFeatures.basic;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
            .tier-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; margin-top: 15px; font-weight: bold; }
            .content { padding: 30px 0; }
            .section { margin: 25px 0; }
            .section h2 { color: #4F46E5; font-size: 20px; border-bottom: 2px solid #e0e7ff; padding-bottom: 10px; }
            .features { list-style: none; padding: 0; }
            .features li { padding: 10px 0; padding-left: 30px; position: relative; }
            .features li:before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px 10px 0; }
            .button-secondary { background: #e0e7ff; color: #4F46E5; }
            .api-key { background: #f3f4f6; padding: 15px; border-left: 4px solid #4F46E5; font-family: monospace; word-break: break-all; margin: 15px 0; }
            .next-steps { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 3px; margin: 20px 0; }
            .footer { padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #666; }
            .divider { height: 1px; background: #e5e7eb; margin: 30px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to WCAG AI Platform! 🎉</h1>
              <p>${client.company}</p>
              <div class="tier-badge">${client.tier.toUpperCase()} TIER</div>
            </div>

            <div class="content">
              <div class="section">
                <h2>Your Account is Ready</h2>
                <p>We're excited to help you ensure your websites are accessible to everyone. Your WCAG AI Platform account is now active and ready to use.</p>
              </div>

              <div class="section">
                <h2>What's Included in Your ${client.tier.toUpperCase()} Plan</h2>
                <ul class="features">
                  ${features.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </div>

              <div class="section">
                <h2>Your API Key</h2>
                <p>Use this key to authenticate API requests:</p>
                <div class="api-key">${client.apiKey}</div>
                <p style="color: #dc2626; font-weight: bold;">⚠️ Keep this key secret. Never share it publicly.</p>
              </div>

              <div class="divider"></div>

              <div class="section">
                <h2>Get Started in 3 Steps</h2>
                <ol style="padding-left: 20px; line-height: 2;">
                  <li><strong>Review Documents:</strong> Sign the Service Agreement and acknowledge the Liability Waiver</li>
                  <li><strong>Add Websites:</strong> Register the websites you want to scan</li>
                  <li><strong>Run Scan:</strong> Click "Scan Now" or use the API to start your first scan</li>
                </ol>
              </div>

              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Access Your Dashboard</a>
                <a href="${dashboardUrl}/docs" class="button button-secondary">View Documentation</a>
              </div>

              <div class="next-steps">
                <h3 style="margin-top: 0;">⚠️ Important: Legal Documents Require Your Attention</h3>
                <p><strong>Please review and sign these documents within 7 days:</strong></p>
                <ul style="padding-left: 20px;">
                  <li>Service Agreement</li>
                  <li>Liability Waiver</li>
                  <li>Service Level Agreement (SLA)</li>
                </ul>
                <p><a href="${dashboardUrl}/legal" class="button" style="font-size: 14px; padding: 10px 20px;">Review Legal Documents</a></p>
              </div>

              <div class="section">
                <h2>Quick Tips</h2>
                <ul style="padding-left: 20px;">
                  <li><strong>Automated Testing Only:</strong> Our scans find many issues, but manual testing with assistive technologies is recommended</li>
                  <li><strong>Daily Scans:</strong> Scans run automatically daily to track accessibility progress</li>
                  <li><strong>AI-Powered Fixes:</strong> Get suggestions for fixing violations (available in Pro tier)</li>
                  <li><strong>SLA Protection:</strong> See our SLA document for uptime guarantees and support response times</li>
                </ul>
              </div>

              <div class="section">
                <h2>Need Help?</h2>
                <p>
                  Email: <a href="mailto:support@wcag-ai.com">support@wcag-ai.com</a><br>
                  Phone: <a href="tel:1-855-9224349">1-855-WCAG-FIX</a><br>
                  Docs: <a href="https://docs.wcag-ai.com">docs.wcag-ai.com</a>
                </p>
              </div>
            </div>

            <div class="footer">
              <p>&copy; 2024 WCAG AI Platform. All rights reserved.</p>
              <p><a href="https://wcag-ai.com/privacy">Privacy Policy</a> | <a href="https://wcag-ai.com/terms">Terms of Service</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: client.email,
      subject: `Welcome to WCAG AI Platform - Your ${client.tier.toUpperCase()} Account is Ready`,
      html,
    });
  }

  /**
   * Schedule initial scans for client websites
   */
  private static async scheduleInitialScans(client: any, req: OnboardingRequest): Promise<boolean> {
    try {
      const scanQueue = getScanQueue();
      const websites = req.websites || (req.website ? [req.website] : []);

      if (websites.length === 0) return false;

      for (const website of websites) {
        // Create a prospect record for tracking
        const prospect = await prisma.prospect.create({
          data: {
            businessName: req.company,
            website,
            industry: req.industry || 'Unknown',
            city: 'Unknown',
            email: client.email,
            phone: req.contactPhone,
            metroId: 'initial-scan', // Placeholder
            industryId: 'initial-scan', // Placeholder
          },
        });

        // Queue the scan with high priority
        await scanQueue.addScan({
          clientId: client.id,
          prospectId: prospect.id,
          url: website,
          priority: 'high',
          retries: 3,
        });
      }

      return true;
    } catch (error) {
      log.error('Failed to schedule initial scans', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Generate compliance dashboard URL
   */
  private static generateDashboardUrl(client: any): string {
    const baseUrl = process.env.DASHBOARD_URL || 'https://dashboard.wcag-ai.com';
    return `${baseUrl}/clients/${client.id}`;
  }

  /**
   * Initiate legal document signing (e-signature)
   */
  private static async initiateLegalSigning(client: any, docs: any): Promise<void> {
    // In a real implementation, this would:
    // 1. Upload documents to e-signature service (DocuSign, HelloSign, etc.)
    // 2. Send signing request to client email
    // 3. Track signing status
    // 4. Store signed documents

    try {
      // For now, send email with links to legal documents
      const dashboardUrl = this.generateDashboardUrl(client);

      await sendEmail({
        to: client.email,
        subject: 'Please Review and Sign WCAG AI Platform Legal Documents',
        html: `
          <p>Before you can start using WCAG AI Platform, please review and sign the following documents:</p>
          <ol>
            <li><a href="${dashboardUrl}/legal/service-agreement">Service Agreement</a></li>
            <li><a href="${dashboardUrl}/legal/liability-waiver">Liability Waiver</a></li>
            <li><a href="${dashboardUrl}/legal/sla">Service Level Agreement</a></li>
          </ol>
          <p>Once you've signed, you can begin scanning immediately.</p>
          <p><a href="${dashboardUrl}/legal/sign">Sign Documents Now</a></p>
        `,
      });

      log.info('Legal signing initiated', { clientId: client.id });
    } catch (error) {
      log.error('Failed to initiate legal signing', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generate next steps based on tier
   */
  private static generateNextSteps(tier: string): string[] {
    const baseSteps = [
      'Review and sign legal documents (required within 7 days)',
      'Add websites to your account',
      'Run your first accessibility scan',
      'Review violation results in your dashboard',
    ];

    const tierSteps = {
      basic: [
        ...baseSteps,
        'Enable daily automatic scans',
        'Set up email notifications',
      ],
      pro: [
        ...baseSteps,
        'Configure custom scan schedule',
        'Enable violation trend analysis',
        'Invite team members to dashboard',
      ],
      enterprise: [
        ...baseSteps,
        'Schedule onboarding call with your account manager',
        'Configure Slack integration',
        'Set up GitHub webhook for CI/CD scanning',
        'Enable API access for automation',
      ],
    };

    return tierSteps[tier] || baseSteps;
  }
}

export default OnboardingService;
