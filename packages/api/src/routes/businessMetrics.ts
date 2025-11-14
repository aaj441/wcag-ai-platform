/**
 * BUSINESS METRICS API
 * Real-time KPI dashboard for business planning and growth
 *
 * Endpoints:
 * - GET /api/business-metrics/overview - Overall metrics
 * - GET /api/business-metrics/icps - ICP statistics
 * - GET /api/business-metrics/funnel - Sales funnel
 * - GET /api/business-metrics/projections - Revenue projections
 * - GET /api/business-metrics/market-analysis - Market opportunity
 * - POST /api/business-metrics/prospect-score - Score a prospect
 */

import { Router, Request, Response } from 'express';
import {
  ALL_ICPS,
  getICPsByTier,
  getICPStats,
} from '../config/icp-profiles';
import { ALL_SEQUENCES, getSequenceMetrics } from '../config/email-sequences';
import {
  scoreProspect,
  getScoringStats,
  ProspectData,
} from '../services/prospectScoringService';

const router = Router();

// ============================================================================
// BUSINESS METRICS OVERVIEW
// ============================================================================

/**
 * GET /api/business-metrics/overview
 * Overall business metrics and KPIs
 */
router.get('/overview', (req: Request, res: Response) => {
  try {
    const icpStats = getICPStats();

    // Conservative Year 1 projection (based on business plan)
    const projections = {
      q1: {
        customers: 3,
        mrr: 3000,
        revenue: 9000,
        grossProfit: 7000,
      },
      q2: {
        customers: 8,
        mrr: 8000,
        revenue: 24000,
        grossProfit: 20000,
      },
      q3: {
        customers: 15,
        mrr: 15000,
        revenue: 45000,
        grossProfit: 38000,
      },
      q4: {
        customers: 25,
        mrr: 25000,
        revenue: 75000,
        grossProfit: 62000,
      },
    };

    const avgMonthlyGrowth = 0.20; // 20% MoM growth
    const currentMRR = 25000; // Year-end projection
    const avgDealSize = icpStats.avgDealSize;
    const avgCAC = icpStats.avgCAC;
    const ltv = avgDealSize * 24; // 24-month average

    return res.json({
      success: true,
      metrics: {
        // ICP Statistics
        icps: {
          total: icpStats.totalICPs,
          tier1: icpStats.tier1,
          tier2: icpStats.tier2,
          tier3: icpStats.tier3,
          totalAnnualPotential: icpStats.totalAnnualPotential,
        },

        // Financial projections
        projections,

        // Key metrics
        keyMetrics: {
          monthlyGrowthRate: `${(avgMonthlyGrowth * 100).toFixed(0)}%`,
          avgDealSize: `$${avgDealSize.toLocaleString()}`,
          avgCAC: `$${avgCAC}`,
          lifetimeValue: `$${ltv.toLocaleString()}`,
          lcvToCAC: `${(ltv / avgCAC).toFixed(1)}:1`,
          targetMRRYear1: `$${currentMRR.toLocaleString()}`,
          targetARRYear1: `$${(currentMRR * 12).toLocaleString()}`,
        },

        // Sales funnel targets
        funnel: {
          prospectsScanned: 52000, // 1000/week × 52 weeks
          emailsSent: 10400, // 20% engagement rate
          freAuditRequests: 520, // 5% of emails
          freAuditCompleted: 416, // 80% completion
          paidConversions: 60, // 15% of completed audits
        },

        // Email sequence metrics
        emailSequences: ALL_SEQUENCES.length,
        avgOpenRate: '25%',
        avgCTRate: '5%',
        avgConversionRate: '15%',
      },

      meta: {
        timestamp: new Date().toISOString(),
        documentation: '/docs/BUSINESS_PLAN.md',
      },
    });
  } catch (error) {
    console.error('Error in business metrics overview:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate business metrics',
    });
  }
});

// ============================================================================
// ICP STATISTICS
// ============================================================================

/**
 * GET /api/business-metrics/icps
 * Detailed ICP statistics and performance
 */
router.get('/icps', (req: Request, res: Response) => {
  try {
    const icpStats = getICPStats();

    // Group by tier with details
    const byTier = {
      tier1: getICPsByTier('tier-1').map(icp => ({
        id: icp.id,
        name: icp.name,
        priority: icp.priority,
        avgDealSize: icp.avgDealSize,
        avgCAC: icp.estimatedCAC,
        conversionRate: `${(icp.conversionRate * 100).toFixed(0)}%`,
        annualPotential: icp.annualPotentialValue,
      })),
      tier2: getICPsByTier('tier-2').map(icp => ({
        id: icp.id,
        name: icp.name,
        priority: icp.priority,
        avgDealSize: icp.avgDealSize,
        avgCAC: icp.estimatedCAC,
        conversionRate: `${(icp.conversionRate * 100).toFixed(0)}%`,
        annualPotential: icp.annualPotentialValue,
      })),
      tier3: getICPsByTier('tier-3').map(icp => ({
        id: icp.id,
        name: icp.name,
        priority: icp.priority,
        avgDealSize: icp.avgDealSize,
        avgCAC: icp.estimatedCAC,
        conversionRate: `${(icp.conversionRate * 100).toFixed(0)}%`,
        annualPotential: icp.annualPotentialValue,
      })),
    };

    return res.json({
      success: true,
      data: {
        summary: icpStats,
        byTier,
        topByPriority: ALL_ICPS.slice(0, 5).map(icp => ({
          id: icp.id,
          name: icp.name,
          priority: icp.priority,
          tier: icp.tier,
          avgDealSize: icp.avgDealSize,
          likelySalesCycle: `${icp.likelySalesCycle} days`,
        })),
      },
    });
  } catch (error) {
    console.error('Error in ICP statistics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate ICP statistics',
    });
  }
});

// ============================================================================
// SALES FUNNEL
// ============================================================================

/**
 * GET /api/business-metrics/funnel
 * Sales funnel metrics
 */
router.get('/funnel', (req: Request, res: Response) => {
  try {
    // Typical sales funnel metrics
    const funnel = {
      prospectDiscovery: {
        weekly: 1000,
        monthly: 4000,
        description: 'Businesses scanned for compliance issues',
      },
      emailOutreach: {
        weekly: 500,
        monthly: 2000,
        rate: '50%', // Of discovered prospects
        description: 'Targeted email campaigns sent',
      },
      freeAuditRequests: {
        weekly: 25,
        monthly: 100,
        rate: '5%', // Of emails sent
        description: 'Free compliance audit requests',
      },
      freeAuditCompleted: {
        weekly: 20,
        monthly: 80,
        rate: '80%', // Of requests
        description: 'Completed free audits delivered',
      },
      paidConversions: {
        weekly: 3,
        monthly: 12,
        rate: '15%', // Of completed audits
        description: 'Conversion to paying customers',
        avgDealSize: 6000,
      },
      contractedArr: {
        weekly: 18000,
        monthly: 72000,
        description: 'Monthly recurring revenue per week',
      },
    };

    // Calculate conversion rates at each stage
    const conversionRates = {
      prospectsToEmails: '50%',
      emailsToAuditRequests: '5%',
      auditRequestsToCompleted: '80%',
      completedToPayingCustomers: '15%',
      overallProspectToPayingCustomer: '0.30%',
    };

    // Month 1 Year 1 example
    const exampleMonth = {
      prospectsDiscovered: 4000,
      emailsSent: 2000,
      auditRequests: 100,
      auditCompleted: 80,
      payingCustomers: 12,
      mrr: 72000,
    };

    return res.json({
      success: true,
      funnel,
      conversionRates,
      exampleMonth,
      note: 'Based on conservative business plan projections',
    });
  } catch (error) {
    console.error('Error in funnel metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate funnel metrics',
    });
  }
});

// ============================================================================
// REVENUE PROJECTIONS
// ============================================================================

/**
 * GET /api/business-metrics/projections
 * Revenue projections and growth scenarios
 */
router.get('/projections', (req: Request, res: Response) => {
  try {
    const scenarios = {
      conservative: {
        name: 'Conservative Case',
        assumption: '10% monthly growth, high churn',
        year1: {
          customers: 25,
          mrr: 25000,
          arr: 300000,
          revenue: 150000,
          profit: 105000,
        },
        year2: {
          customers: 50,
          mrr: 60000,
          arr: 720000,
          revenue: 1800000,
          profit: 1440000,
        },
        year3: {
          customers: 100,
          mrr: 120000,
          arr: 1440000,
          revenue: 3600000,
          profit: 2880000,
        },
      },

      realistic: {
        name: 'Realistic Case',
        assumption: '20% monthly growth, 5% churn',
        year1: {
          customers: 60,
          mrr: 60000,
          arr: 720000,
          revenue: 380000,
          profit: 260000,
        },
        year2: {
          customers: 300,
          mrr: 380000,
          arr: 4560000,
          revenue: 6800000,
          profit: 5440000,
        },
        year3: {
          customers: 900,
          mrr: 1200000,
          arr: 14400000,
          revenue: 21600000,
          profit: 17280000,
        },
      },

      optimistic: {
        name: 'Optimistic Case',
        assumption: '30% monthly growth, 3% churn',
        year1: {
          customers: 150,
          mrr: 180000,
          arr: 2160000,
          revenue: 972000,
          profit: 655000,
        },
        year2: {
          customers: 750,
          mrr: 1000000,
          arr: 12000000,
          revenue: 18000000,
          profit: 14400000,
        },
        year3: {
          customers: 2500,
          mrr: 3500000,
          arr: 42000000,
          revenue: 63000000,
          profit: 50400000,
        },
      },
    };

    return res.json({
      success: true,
      projections: scenarios,
      note: 'Projections based on business plan assumptions. Actual results may vary.',
      keyAssumptions: {
        grossMargin: '80%',
        avgDealSize: '$6000 monthly',
        cashFlow: 'Positive by month 4-6',
        breakEven: 'Month 8-12 (depending on scenario)',
      },
    });
  } catch (error) {
    console.error('Error in revenue projections:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate revenue projections',
    });
  }
});

// ============================================================================
// MARKET ANALYSIS
// ============================================================================

/**
 * GET /api/business-metrics/market-analysis
 * Market opportunity analysis
 */
router.get('/market-analysis', (req: Request, res: Response) => {
  try {
    const marketAnalysis = {
      tam: {
        value: 52000000000, // $52B
        description: 'Total Addressable Market (accessibility market by 2034)',
        source: 'Industry research',
      },
      sam: {
        value: 8200000000, // $8.2B
        description: 'Serviceable Addressable Market (US mid-market)',
        source: 'SMB market analysis',
      },
      som: {
        value: 82000000, // $82M
        description: 'Serviceable Obtainable Market (0.1% penetration)',
        calculation: '10,000 customers × $999/mo × 12 = $119.88M ARR',
      },

      competitors: [
        {
          name: 'accessiBe',
          approach: 'AI overlay (not real fixes)',
          pricing: '$500-5K/mo',
          weakness: 'Lawsuit risk, not compliant',
          marketShare: 'Estimated 30%',
        },
        {
          name: 'UserWay',
          approach: 'AI overlay',
          pricing: '$500-10K/mo',
          weakness: 'Same as accessiBe',
          marketShare: 'Estimated 25%',
        },
        {
          name: 'Siteimprove',
          approach: 'Enterprise platform',
          pricing: '$50K+/year',
          weakness: 'Too expensive for SMB',
          marketShare: 'Estimated 20% (enterprise only)',
        },
        {
          name: 'Level Access',
          approach: 'Manual audits',
          pricing: '$5-20K per project',
          weakness: 'Slow, one-time',
          marketShare: 'Estimated 10%',
        },
        {
          name: 'WCAG AI Platform (Us)',
          approach: 'Automated code fixes + monitoring',
          pricing: '$999-$9,999/mo',
          advantage: 'Only true code-level fixes + ongoing compliance',
          marketShare: 'Target 5% by Year 3',
        },
      ],

      ourAdvantages: [
        '✅ Automated code fixes (not overlays - real compliance)',
        '✅ Mid-market pricing ($999-$9,999 sweet spot)',
        '✅ Fast delivery (72-hour initial fixes)',
        '✅ Ongoing monitoring (competitors are one-time)',
        '✅ Legal protection (compliance certificates, audit trail)',
        '✅ Better ROI (customers see traffic/conversion gains)',
      ],

      industryTrends: [
        'ADA litigation up 310% for dental (2020-2024)',
        'Domino\'s lawsuit precedent (2021) = increased awareness',
        'WCAG 2.1 AA becoming baseline expectation',
        'Generational shift: Millennials avoid non-accessible sites',
        'Enterprise pushing compliance down to vendors',
        'Insurance premium increases driving compliance investment',
      ],

      growthDrivers: [
        'Increased ADA litigation (drives urgency)',
        'Mobile-first consumer behavior (drives modernization)',
        'Remote work (drives digital transformation)',
        'Supply chain compliance requirements',
        'ESG (Environmental, Social, Governance) focus',
      ],
    };

    return res.json({
      success: true,
      marketAnalysis,
    });
  } catch (error) {
    console.error('Error in market analysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform market analysis',
    });
  }
});

// ============================================================================
// PROSPECT SCORING
// ============================================================================

/**
 * POST /api/business-metrics/prospect-score
 * Score a prospect using the comprehensive algorithm
 */
router.post('/prospect-score', async (req: Request, res: Response) => {
  try {
    const prospectData: ProspectData = req.body;

    if (!prospectData.prospectId || !prospectData.companyName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: prospectId, companyName',
      });
    }

    const score = scoreProspect(prospectData);

    return res.json({
      success: true,
      score,
      nextSteps: {
        immediate: 'Call/email today',
        'this-week': 'Schedule call',
        'this-month': 'Send email sequence',
        backlog: 'Add to nurture list',
      }[score.recommendation],
    });
  } catch (error) {
    console.error('Error in prospect scoring:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to score prospect',
    });
  }
});

// ============================================================================
// EMAIL SEQUENCE METRICS
// ============================================================================

/**
 * GET /api/business-metrics/email-sequences
 * Email sequence performance metrics
 */
router.get('/email-sequences', (req: Request, res: Response) => {
  try {
    const sequences = ALL_SEQUENCES.map(seq => getSequenceMetrics(seq));

    return res.json({
      success: true,
      sequences,
      summary: {
        totalSequences: sequences.length,
        avgOpenRate: '25%',
        avgClickRate: '5%',
        avgConversionRate: '15%',
      },
    });
  } catch (error) {
    console.error('Error in email sequences:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get email sequences',
    });
  }
});

export default router;
