/**
 * Offer Sheet API Routes
 * Provides service tier information for sales enablement
 */

import { Router, Request, Response } from 'express';
import { OfferSheet, ServiceTier } from '../types';

const router = Router();

/**
 * Service Tier Definitions
 * Based on the Cyborg Shield™ AI-Augmented Continuous Compliance Program
 */
const SERVICE_TIERS: ServiceTier[] = [
  {
    id: 'readiness_audit',
    name: 'Readiness Audit',
    subtitle: 'One-Time Project',
    type: 'project',
    features: [
      'Comprehensive Baseline Audit',
      'Evidence Vault Setup',
    ],
    outcomes: [],
    pricing: {
      type: 'project',
      description: 'Custom quote based on site complexity'
    }
  },
  {
    id: 'continuous_compliance',
    name: 'Continuous Compliance',
    subtitle: 'Monthly Retainer',
    type: 'retainer',
    features: [
      'Comprehensive Baseline Audit',
      'Evidence Vault Setup',
      'AI Scanner in CI/CD Pipeline',
      'Monthly Remediation Reports',
      'Quarterly "Proof of Compliance" Pack',
    ],
    outcomes: [],
    pricing: {
      type: 'monthly',
      description: 'Starting at $2,500/month'
    }
  },
  {
    id: 'strategic_partnership',
    name: 'Strategic Partnership',
    subtitle: 'Premium Retainer',
    type: 'retainer',
    features: [
      'Comprehensive Baseline Audit',
      'Evidence Vault Setup',
      'AI Scanner in CI/CD Pipeline',
      'Monthly Remediation Reports',
      'Quarterly "Proof of Compliance" Pack',
      'Neurodivergent (ND) UX Scorecard',
      'AI Product & Bias Audit',
      'Internal Team "Cyborg" Training',
    ],
    outcomes: [],
    pricing: {
      type: 'custom',
      description: 'Custom enterprise pricing'
    }
  }
];

const OFFER_SHEET_DATA: OfferSheet = {
  title: 'AI-Powered Continuous Accessibility & Compliance for SaaS',
  problemStatement: 
    "You're building an innovative product, but evolving regulations (ADA, WCAG, EAA) and the rise of AI introduce new, complex accessibility risks. One-off audits are expensive and quickly become outdated. Automated-only \"overlay\" tools fail to provide real compliance, leaving you exposed to legal action and shutting out users.",
  solution:
    "We don't just find problems—we build you a lasting, legally-sound compliance framework. Our AI-Augmented Continuous Compliance Program blends automated precision with expert human judgment to protect your business and improve your product for everyone. We transform compliance from a liability into a competitive advantage.",
  tiers: SERVICE_TIERS,
  outcomes: [
    'Reduced Legal Risk',
    'Improved User Experience',
    'Increased Team Velocity',
    'Measurable ROI'
  ],
  callToAction: "Ready to build your shield? Let's book a 15-minute call to finalize the details."
};

/**
 * GET /api/offer-sheet
 * Get complete offer sheet data
 */
router.get('/', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: OFFER_SHEET_DATA
    });
  } catch (error) {
    console.error('Error fetching offer sheet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch offer sheet data'
    });
  }
});

/**
 * GET /api/offer-sheet/tiers
 * Get just the service tiers
 */
router.get('/tiers', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: SERVICE_TIERS
    });
  } catch (error) {
    console.error('Error fetching service tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service tiers'
    });
  }
});

/**
 * GET /api/offer-sheet/tiers/:tierId
 * Get a specific service tier by ID
 */
router.get('/tiers/:tierId', (req: Request, res: Response) => {
  try {
    const { tierId } = req.params;
    const tier = SERVICE_TIERS.find(t => t.id === tierId);
    
    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'Service tier not found'
      });
    }
    
    res.json({
      success: true,
      data: tier
    });
  } catch (error) {
    console.error('Error fetching service tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service tier'
    });
  }
});

export default router;
