/**
 * Warranty and Liability Protection Tier Definitions
 * Provides tiered warranty coverage for WCAG compliance scanning
 */

export type WarrantyTier = 'basic' | 'pro' | 'enterprise';

export interface WarrantyTierConfig {
  tier: WarrantyTier;
  name: string;
  monthlyPrice: number; // in cents
  annualPrice: number; // in cents (if different from monthly * 12)
  
  // Scanning Features
  dailyScansIncluded: boolean;
  scanFrequency: 'daily' | 'weekly' | 'on-demand';
  maxPagesPerScan: number;
  prioritySLA: number; // in minutes
  
  // Liability Protection
  liabilityCoverage: number; // in dollars
  legalSupportIncluded: boolean;
  vpatReportIncluded: boolean;
  
  // Support Features
  supportResponseTime: string;
  dedicatedAccountManager: boolean;
  customIntegrations: boolean;
  
  // Legal Terms
  warrantyTerms: string[];
  disclaimers: string[];
}

export interface DailyScanSchedule {
  id: string;
  clientId: string;
  websiteUrl: string;
  enabled: boolean;
  scanTime: string; // ISO time string (e.g., "02:00:00")
  timezone: string;
  lastScanAt: Date | null;
  nextScanAt: Date | null;
  consecutiveFailures: number;
  notificationEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingRequest {
  // Client Information
  email: string;
  company: string;
  contactName: string;
  phone?: string; // Optional E.164 format phone number (e.g., "+1234567890")
  
  // Website Details
  websiteUrl: string;
  estimatedPages: number;
  
  // Tier Selection
  tier: WarrantyTier;
  billingCycle: 'monthly' | 'annual';
  
  // Legal Acceptance
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedWarrantyTerms: boolean;
  acceptanceTimestamp: string | Date;
  acceptanceIpAddress?: string; // Optional IPv4 or IPv6 address
  
  // Scanning Preferences
  enableDailyScans: boolean;
  preferredScanTime?: string; // HH:MM:SS format (e.g., "02:00:00")
  timezone?: string; // IANA timezone identifier (e.g., "America/New_York")
}

export interface OnboardingResponse {
  success: boolean;
  clientId?: string;
  apiKey?: string;
  message?: string;
  error?: string;
  
  // Next Steps
  nextSteps?: {
    setupBilling: boolean;
    verifyWebsite: boolean;
    scheduleFirstScan: boolean;
  };
  
  // Billing Information
  billingInfo?: {
    tier: WarrantyTier;
    monthlyPrice: number;
    annualPrice?: number;
    nextBillingDate: Date;
  };
  
  // Scanning Schedule
  scanSchedule?: DailyScanSchedule;
}

/**
 * Warranty Tier Configurations
 */
export const WARRANTY_TIERS: Record<WarrantyTier, WarrantyTierConfig> = {
  basic: {
    tier: 'basic',
    name: 'Basic Liability Protection',
    monthlyPrice: 29900, // $299.00
    annualPrice: 299000, // $2,990.00 (1 month free)
    
    dailyScansIncluded: true,
    scanFrequency: 'daily',
    maxPagesPerScan: 50,
    prioritySLA: 30,
    
    liabilityCoverage: 25000,
    legalSupportIncluded: false,
    vpatReportIncluded: true,
    
    supportResponseTime: '48 hours',
    dedicatedAccountManager: false,
    customIntegrations: false,
    
    warrantyTerms: [
      'Daily automated WCAG 2.1 AA compliance scans',
      'Up to 50 pages per scan',
      'Email notifications for critical violations',
      'VPAT report generation',
      '$25,000 liability coverage for ADA claims',
      '30-minute scan SLA',
    ],
    disclaimers: [
      'Automated scanning may not detect all accessibility issues',
      'Manual testing by certified consultants recommended for full compliance',
      'Coverage applies only to violations detected and reported by our system',
      'Client responsible for implementing recommended fixes',
      'No warranty on third-party content or plugins',
    ],
  },
  
  pro: {
    tier: 'pro',
    name: 'Professional Liability Protection',
    monthlyPrice: 99900, // $999.00
    annualPrice: 999000, // $9,990.00 (1 month free)
    
    dailyScansIncluded: true,
    scanFrequency: 'daily',
    maxPagesPerScan: 200,
    prioritySLA: 5,
    
    liabilityCoverage: 100000,
    legalSupportIncluded: true,
    vpatReportIncluded: true,
    
    supportResponseTime: '4 hours',
    dedicatedAccountManager: false,
    customIntegrations: true,
    
    warrantyTerms: [
      'Daily automated WCAG 2.1 AA/AAA compliance scans',
      'Up to 200 pages per scan',
      'Real-time violation alerts via email/Slack/webhook',
      'Monthly VPAT reports',
      '$100,000 liability coverage for ADA claims',
      'Legal consultation included (up to 3 hours/year)',
      '5-minute priority scan SLA',
      'Custom webhook integrations',
    ],
    disclaimers: [
      'Automated scanning supplemented with quarterly manual reviews',
      'Coverage applies to violations detected in scheduled scans',
      'Client responsible for maintaining accessibility after remediation',
      'Legal consultation does not constitute legal representation',
      'No warranty on third-party content, plugins, or user-generated content',
    ],
  },
  
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise Liability Protection',
    monthlyPrice: 250000, // $2,500.00
    annualPrice: 2500000, // $25,000.00 (2 months free)
    
    dailyScansIncluded: true,
    scanFrequency: 'daily',
    maxPagesPerScan: 1000,
    prioritySLA: 2,
    
    liabilityCoverage: 500000,
    legalSupportIncluded: true,
    vpatReportIncluded: true,
    
    supportResponseTime: '1 hour',
    dedicatedAccountManager: true,
    customIntegrations: true,
    
    warrantyTerms: [
      'Daily automated WCAG 2.1 AA/AAA compliance scans',
      'Up to 1,000 pages per scan',
      'Real-time violation alerts via multiple channels',
      'Weekly VPAT reports with consultant review',
      '$500,000 liability coverage for ADA claims',
      'Unlimited legal consultation with accessibility attorneys',
      '2-minute priority scan SLA with dedicated infrastructure',
      'Full API access and custom integrations',
      'Dedicated account manager and quarterly compliance reviews',
      'Expert witness support for litigation',
    ],
    disclaimers: [
      'Automated scanning combined with monthly manual expert reviews',
      'Comprehensive coverage for detected violations across all scheduled scans',
      'Client responsible for implementing fixes within recommended timelines',
      'Legal support includes consultation and litigation support, not full representation',
      'Coverage subject to client maintaining active subscription and implementing critical fixes',
    ],
  },
};

/**
 * Legal Disclaimers for Onboarding
 */
export const ONBOARDING_LEGAL_DISCLAIMERS = {
  generalWarranty: `
    IMPORTANT LEGAL NOTICE: This service provides automated accessibility scanning 
    and liability protection as outlined in your selected tier. While we strive for 
    comprehensive detection, automated tools cannot identify all accessibility barriers. 
    This service does NOT guarantee complete ADA compliance or immunity from lawsuits. 
    
    By subscribing, you acknowledge that:
    - Automated scanning has limitations and may miss some violations
    - Manual testing by certified professionals is recommended for complete compliance
    - You are responsible for implementing all recommended fixes promptly
    - Coverage applies only to violations detected and reported by our system
    - We provide best-effort service but do not assume liability for undetected issues
  `,
  
  dataCollection: `
    We collect and process website data necessary to perform accessibility scans, 
    including page content, HTML structure, screenshots, and violation evidence. 
    This data is stored securely and used solely for scan reporting and historical 
    tracking. We do not sell or share your data with third parties except as 
    required by law or with your explicit consent.
  `,
  
  serviceAvailability: `
    We maintain 99.5% uptime SLA for scanning services. Scheduled maintenance windows 
    are announced 48 hours in advance. SLA credits apply for breach of stated scan 
    completion times. Service may be temporarily unavailable due to force majeure 
    events, including but not limited to network outages, natural disasters, or 
    circumstances beyond our reasonable control.
  `,
  
  billingTerms: `
    Subscription fees are billed in advance on a monthly or annual basis. Annual 
    plans receive discounted pricing equivalent to one or two free months. All 
    fees are non-refundable except as required by law. You may cancel at any time, 
    with service continuing until the end of the current billing period. Tier 
    upgrades take effect immediately; downgrades take effect at the next billing cycle.
  `,
  
  cancellationPolicy: `
    You may cancel your subscription at any time via the account dashboard or by 
    contacting support. Cancellation takes effect at the end of your current billing 
    period. No refunds are provided for partial months or unused scans. Upon 
    cancellation, access to historical reports remains available for 90 days, after 
    which data may be archived or deleted per our retention policy.
  `,
};

/**
 * SLA Terms by Tier
 */
export const SLA_TERMS = {
  scanCompletion: {
    basic: '30 minutes from scan initiation',
    pro: '5 minutes from scan initiation',
    enterprise: '2 minutes from scan initiation',
  },
  
  supportResponse: {
    basic: '48 business hours',
    pro: '4 business hours',
    enterprise: '1 hour (24/7)',
  },
  
  incidentResolution: {
    basic: '5 business days',
    pro: '2 business days',
    enterprise: '24 hours (24/7)',
  },
  
  uptime: '99.5% monthly uptime guarantee',
  
  slaCredits: {
    description: 'Automatic credits applied for SLA breaches',
    scanSLA: '10% monthly fee credit per breach',
    uptimeSLA: {
      '99.0-99.5%': '10% credit',
      '98.0-99.0%': '25% credit',
      'below 98.0%': '50% credit',
    },
  },
};
