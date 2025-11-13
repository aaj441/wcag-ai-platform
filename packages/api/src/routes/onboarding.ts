/**
 * Warranty Tier Onboarding API Routes
 * Handles client onboarding with warranty tiers and daily scanning
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { 
  OnboardingRequest, 
  OnboardingResponse, 
  WARRANTY_TIERS,
  ONBOARDING_LEGAL_DISCLAIMERS,
  SLA_TERMS,
  WarrantyTier 
} from '../types/warranty';
import { createDailyScanSchedule } from '../services/dailyScanScheduler';

const router = Router();

// In-memory storage for onboarding records (replace with database in production)
interface OnboardingRecord extends OnboardingRequest {
  clientId: string;
  apiKey: string;
  createdAt: Date;
  status: 'pending' | 'active' | 'suspended';
}

const onboardingRecords: Map<string, OnboardingRecord> = new Map();

// Generate API Key
function generateApiKey(): string {
  return `wcagaii_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * POST /api/onboarding/warranty
 * Full-featured onboarding with warranty tiers and legal acceptance
 */
router.post('/warranty', async (req: Request, res: Response) => {
  try {
    const request: OnboardingRequest = req.body;
    
    // Validation
    const validation = validateOnboardingRequest(request);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    // Check if client already exists
    const existingClient = Array.from(onboardingRecords.values())
      .find(r => r.email === request.email);
    
    if (existingClient) {
      return res.status(409).json({
        success: false,
        error: 'Client with this email already exists'
      });
    }
    
    // Get tier configuration
    const tierConfig = WARRANTY_TIERS[request.tier];
    
    // Generate client credentials
    const clientId = uuidv4();
    const apiKey = generateApiKey();
    
    // Create onboarding record
    const record: OnboardingRecord = {
      ...request,
      clientId,
      apiKey,
      createdAt: new Date(),
      status: 'active'
    };
    
    onboardingRecords.set(clientId, record);
    
    // Create daily scan schedule if enabled
    let scanSchedule;
    if (request.enableDailyScans) {
      scanSchedule = createDailyScanSchedule(
        clientId,
        request.websiteUrl,
        request.email,
        request.preferredScanTime || '02:00:00',
        request.timezone || 'UTC'
      );
    }
    
    // Calculate billing details
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + (request.billingCycle === 'annual' ? 12 : 1));
    
    // Prepare response
    const response: OnboardingResponse = {
      success: true,
      clientId,
      apiKey,
      message: `Successfully onboarded to ${tierConfig.name}`,
      nextSteps: {
        setupBilling: true,
        verifyWebsite: true,
        scheduleFirstScan: !request.enableDailyScans
      },
      billingInfo: {
        tier: request.tier,
        monthlyPrice: tierConfig.monthlyPrice,
        annualPrice: request.billingCycle === 'annual' ? tierConfig.annualPrice : undefined,
        nextBillingDate
      },
      scanSchedule
    };
    
    // TODO: In production:
    // 1. Store in database (Prisma)
    // 2. Create Stripe customer and subscription
    // 3. Send welcome email with API key
    // 4. Schedule first scan
    // 5. Create audit log entry
    
    return res.status(201).json(response);
    
  } catch (error) {
    console.error('Error during warranty onboarding:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding'
    });
  }
});

/**
 * GET /api/onboarding/tiers
 * Get all available warranty tiers with pricing and features
 */
router.get('/tiers', (req: Request, res: Response) => {
  const tiers = Object.values(WARRANTY_TIERS).map(tier => ({
    tier: tier.tier,
    name: tier.name,
    pricing: {
      monthly: tier.monthlyPrice,
      annual: tier.annualPrice,
      monthlySavings: tier.monthlyPrice * 12 - tier.annualPrice
    },
    features: {
      dailyScans: tier.dailyScansIncluded,
      scanFrequency: tier.scanFrequency,
      maxPages: tier.maxPagesPerScan,
      sla: `${tier.prioritySLA} minutes`,
      liabilityCoverage: `$${tier.liabilityCoverage.toLocaleString()}`,
      legalSupport: tier.legalSupportIncluded,
      vpatReports: tier.vpatReportIncluded,
      supportResponse: tier.supportResponseTime,
      accountManager: tier.dedicatedAccountManager,
      customIntegrations: tier.customIntegrations
    },
    warrantyTerms: tier.warrantyTerms,
    disclaimers: tier.disclaimers
  }));
  
  res.json({
    success: true,
    tiers
  });
});

/**
 * GET /api/onboarding/tier/:tierName
 * Get details for a specific tier
 */
router.get('/tier/:tierName', (req: Request, res: Response) => {
  const tierName = req.params.tierName as WarrantyTier;
  
  if (!WARRANTY_TIERS[tierName]) {
    return res.status(404).json({
      success: false,
      error: 'Invalid tier name'
    });
  }
  
  const tier = WARRANTY_TIERS[tierName];
  
  res.json({
    success: true,
    tier: {
      ...tier,
      pricing: {
        monthly: {
          amount: tier.monthlyPrice,
          formatted: `$${(tier.monthlyPrice / 100).toFixed(2)}`
        },
        annual: {
          amount: tier.annualPrice,
          formatted: `$${(tier.annualPrice / 100).toFixed(2)}`,
          monthlySavings: tier.monthlyPrice * 12 - tier.annualPrice,
          savingsFormatted: `$${((tier.monthlyPrice * 12 - tier.annualPrice) / 100).toFixed(2)}`
        }
      },
      sla: SLA_TERMS
    }
  });
});

/**
 * GET /api/onboarding/legal
 * Get all legal disclaimers and terms
 */
router.get('/legal', (req: Request, res: Response) => {
  res.json({
    success: true,
    legal: {
      disclaimers: ONBOARDING_LEGAL_DISCLAIMERS,
      slaTerms: SLA_TERMS,
      requiresAcceptance: ['generalWarranty', 'dataCollection', 'billingTerms']
    }
  });
});

/**
 * POST /api/onboarding/validate
 * Validate onboarding request without creating client
 */
router.post('/validate', (req: Request, res: Response) => {
  const request: OnboardingRequest = req.body;
  const validation = validateOnboardingRequest(request);
  
  res.json({
    success: validation.valid,
    error: validation.error,
    warnings: validation.warnings
  });
});

/**
 * GET /api/onboarding/client/:clientId
 * Get onboarding details for a client
 */
router.get('/client/:clientId', (req: Request, res: Response) => {
  const { clientId } = req.params;
  
  const record = onboardingRecords.get(clientId);
  if (!record) {
    return res.status(404).json({
      success: false,
      error: 'Client not found'
    });
  }
  
  // Don't expose sensitive fields
  const { apiKey, ...safeRecord } = record;
  
  res.json({
    success: true,
    client: safeRecord
  });
});

/**
 * POST /api/onboarding/cli-template/:tier
 * Generate CLI template for automated onboarding
 */
router.post('/cli-template/:tier', (req: Request, res: Response) => {
  const tier = req.params.tier as WarrantyTier;
  
  if (!WARRANTY_TIERS[tier]) {
    return res.status(400).json({
      success: false,
      error: 'Invalid tier specified'
    });
  }
  
  const tierConfig = WARRANTY_TIERS[tier];
  const { email, company, websiteUrl } = req.body;
  
  // Generate CLI template
  const cliTemplate = `
#!/bin/bash
# WCAG AI Platform - Automated Onboarding Template
# Tier: ${tierConfig.name}
# Generated: ${new Date().toISOString()}

# Configuration
API_ENDPOINT="https://api.wcag-ai.com/api/onboarding/warranty"
CLIENT_EMAIL="${email || 'client@example.com'}"
COMPANY_NAME="${company || 'Example Company'}"
WEBSITE_URL="${websiteUrl || 'https://example.com'}"
TIER="${tier}"
BILLING_CYCLE="monthly"

# Legal acceptance (must be explicitly set to true)
ACCEPT_TERMS=false
ACCEPT_PRIVACY=false
ACCEPT_WARRANTY=false

# Scanning preferences
ENABLE_DAILY_SCANS=true
SCAN_TIME="02:00:00"
TIMEZONE="UTC"

# Validate legal acceptance
if [ "$ACCEPT_TERMS" != "true" ] || [ "$ACCEPT_PRIVACY" != "true" ] || [ "$ACCEPT_WARRANTY" != "true" ]; then
  echo "ERROR: All legal terms must be accepted before onboarding"
  echo "Please review and set ACCEPT_TERMS, ACCEPT_PRIVACY, and ACCEPT_WARRANTY to true"
  exit 1
fi

# Create onboarding request
curl -X POST "$API_ENDPOINT" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"email\\": \\"$CLIENT_EMAIL\\",
    \\"company\\": \\"$COMPANY_NAME\\",
    \\"contactName\\": \\"Auto Onboard\\",
    \\"websiteUrl\\": \\"$WEBSITE_URL\\",
    \\"estimatedPages\\": 50,
    \\"tier\\": \\"$TIER\\",
    \\"billingCycle\\": \\"$BILLING_CYCLE\\",
    \\"acceptedTerms\\": $ACCEPT_TERMS,
    \\"acceptedPrivacy\\": $ACCEPT_PRIVACY,
    \\"acceptedWarrantyTerms\\": $ACCEPT_WARRANTY,
    \\"acceptanceTimestamp\\": \\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\\",
    \\"enableDailyScans\\": $ENABLE_DAILY_SCANS,
    \\"preferredScanTime\\": \\"$SCAN_TIME\\",
    \\"timezone\\": \\"$TIMEZONE\\"
  }"

# Pricing Information
echo ""
echo "Tier: ${tierConfig.name}"
echo "Monthly: $${(tierConfig.monthlyPrice / 100).toFixed(2)}"
echo "Annual: $${(tierConfig.annualPrice / 100).toFixed(2)} (saves $${((tierConfig.monthlyPrice * 12 - tierConfig.annualPrice) / 100).toFixed(2)}/year)"
echo "Liability Coverage: $${tierConfig.liabilityCoverage.toLocaleString()}"
echo "SLA: ${tierConfig.prioritySLA} minutes"
`;
  
  res.json({
    success: true,
    template: cliTemplate,
    tier: tierConfig,
    instructions: [
      '1. Save this template as onboard.sh',
      '2. Review and update the configuration variables',
      '3. Set legal acceptance flags to true after reviewing terms',
      '4. Run: chmod +x onboard.sh && ./onboard.sh',
      '5. Save the returned API key securely'
    ]
  });
});

/**
 * Validation helper
 */
function validateOnboardingRequest(request: Partial<OnboardingRequest>): {
  valid: boolean;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];
  
  // Required fields
  if (!request.email || !request.company || !request.contactName) {
    return {
      valid: false,
      error: 'Missing required fields: email, company, contactName'
    };
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(request.email)) {
    return {
      valid: false,
      error: 'Invalid email address format'
    };
  }
  
  // Website URL validation
  if (!request.websiteUrl) {
    return {
      valid: false,
      error: 'Website URL is required'
    };
  }
  
  try {
    new URL(request.websiteUrl);
  } catch {
    return {
      valid: false,
      error: 'Invalid website URL format'
    };
  }
  
  // Tier validation
  if (!request.tier || !WARRANTY_TIERS[request.tier]) {
    return {
      valid: false,
      error: 'Invalid or missing tier selection'
    };
  }
  
  // Legal acceptance validation
  if (!request.acceptedTerms || !request.acceptedPrivacy || !request.acceptedWarrantyTerms) {
    return {
      valid: false,
      error: 'All legal terms must be accepted'
    };
  }
  
  // Estimated pages validation
  if (request.estimatedPages) {
    const tierConfig = WARRANTY_TIERS[request.tier];
    if (request.estimatedPages > tierConfig.maxPagesPerScan) {
      warnings.push(
        `Website has ${request.estimatedPages} pages but tier limit is ${tierConfig.maxPagesPerScan}. ` +
        `Consider upgrading to a higher tier.`
      );
    }
  }
  
  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

export default router;
