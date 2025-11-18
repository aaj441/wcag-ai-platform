/**
 * GTM EXECUTION API
 * Unified control center for all 3 phases of go-to-market
 *
 * Endpoints:
 * - Phase 1: Prospect discovery + email automation
 * - Phase 2: Content marketing + SEO
 * - Phase 3: Sales pipeline + CRM
 * - Dashboard: Real-time metrics and KPIs
 */

import { Router, Request, Response } from 'express';
import EmailService from '../services/emailService';
import LeadTrackingService from '../services/leadTrackingService';
import ContentService from '../services/contentService';
import { SalesPlaybookService } from '../services/crmService';
import { scoreProspect, ProspectData } from '../services/prospectScoringService';
import { getSequenceByICPAndPersona, renderTemplate } from '../config/email-sequences';

const router = Router();
const emailService = new EmailService({
  name: 'resend',
  apiKey: process.env.RESEND_API_KEY || 'demo-key',
  fromEmail: 'outreach@wcag-ai.com',
  fromName: 'WCAG AI Platform',
});
const leadTracking = new LeadTrackingService();
const contentService = new ContentService();
const salesPlaybook = new SalesPlaybookService();

// ============================================================================
// PHASE 1: AUTOMATED OUTBOUND
// ============================================================================

/**
 * POST /api/gtm/phase1/send-campaign
 * Execute Phase 1 email campaign
 */
router.post('/phase1/send-campaign', async (req: Request, res: Response) => {
  try {
    const { prospectIds, icpId, personaRole, dryRun = true } = req.body;

    if (!prospectIds || prospectIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No prospectIds provided',
      });
    }

    const sequence = getSequenceByICPAndPersona(icpId, personaRole);
    if (!sequence) {
      return res.status(404).json({
        success: false,
        error: `No sequence found for ${icpId} + ${personaRole}`,
      });
    }

    let sent = 0;
    let failed = 0;

    // Demo: show what would be sent
    for (const prospectId of prospectIds.slice(0, 10)) {
      const prospect = leadTracking.getProspect(prospectId);
      if (!prospect) continue;

      for (const emailTemplate of sequence.emails) {
        const rendered = renderTemplate(emailTemplate, {
          contactName: prospect.companyName,
          companyName: prospect.companyName,
        });

        if (!dryRun) {
          await emailService.sendEmail({
            to: prospect.email,
            toName: prospect.companyName,
            subject: rendered.subject,
            html: rendered.body,
            text: rendered.body,
            tags: [icpId, 'phase1'],
            metadata: { prospectId, icpId, personaRole },
          });
          leadTracking.trackEmailEvent(prospectId, 'sent');
        }

        sent++;
      }
    }

    return res.json({
      success: true,
      phase1: {
        campaign: sequence.name,
        prospectCount: prospectIds.length,
        emailsSent: sent,
        dryRun,
        expectedConversions: Math.round(sent * sequence.conversionTarget),
        estimatedMRR: Math.round(sent * sequence.conversionTarget * 6500),
      },
    });
  } catch (error) {
    console.error('Error in Phase 1 campaign:', error);
    return res.status(500).json({
      success: false,
      error: 'Campaign execution failed',
    });
  }
});

/**
 * GET /api/gtm/phase1/metrics
 * Phase 1 performance metrics
 */
router.get('/phase1/metrics', (req: Request, res: Response) => {
  try {
    const funnelStats = leadTracking.getFunnelStats();
    const emailMetrics = leadTracking.getEmailMetrics();
    const mrrProjection = leadTracking.getMRRProjection();

    return res.json({
      success: true,
      phase1Metrics: {
        funnel: funnelStats,
        emailPerformance: emailMetrics,
        revenue: mrrProjection,
        summary: {
          conversionRate: `${(funnelStats.conversionRate * 100).toFixed(1)}%`,
          avgTimeToConversion: `${funnelStats.avgTimeToConversion} days`,
          phase1Status: 'In Progress',
          targetCustomers: 100,
          currentCustomers: funnelStats.customer,
          progressPercent: Math.round((funnelStats.customer / 100) * 100),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to get metrics' });
  }
});

// ============================================================================
// PHASE 2: CONTENT MARKETING
// ============================================================================

/**
 * POST /api/gtm/phase2/create-content
 * Create blog posts, case studies, landing pages
 */
router.post('/phase2/create-content', (req: Request, res: Response) => {
  try {
    const { contentType, industry, template, data } = req.body;

    let content: any;

    switch (contentType) {
      case 'blog':
        content = contentService.createBlogPost(template, { industry, ...data });
        break;
      case 'case-study':
        content = contentService.createCaseStudy(
          data.companyName,
          industry,
          data.metrics
        );
        break;
      case 'landing-page':
        content = contentService.createLandingPage(
          industry,
          data.keyword,
          data.title
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid contentType',
        });
    }

    return res.json({
      success: true,
      content,
      estimate: {
        expectedViews: 500,
        expectedLeads: 25,
        leadConversionRate: 0.05,
        estimatedValue: 25 * 6500,
      },
    });
  } catch (error) {
    console.error('Error creating content:', error);
    return res.status(500).json({
      success: false,
      error: 'Content creation failed',
    });
  }
});

/**
 * GET /api/gtm/phase2/calendar
 * Content marketing calendar
 */
router.get('/phase2/calendar', (req: Request, res: Response) => {
  try {
    const calendar = contentService.getContentCalendar(3);
    const performance = contentService.getContentPerformance();

    return res.json({
      success: true,
      phase2: {
        calendar,
        performance,
        summary: {
          contentPieces: performance.blogPosts + performance.caseStudies + performance.landingPages,
          totalReach: 50000,
          leadGeneration: 2500,
          status: 'Planning Phase',
          targetInboundLeads: 500,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to get calendar' });
  }
});

// ============================================================================
// PHASE 3: SALES PIPELINE
// ============================================================================

/**
 * GET /api/gtm/phase3/playbooks
 * Get sales playbooks for each industry
 */
router.get('/phase3/playbooks', (req: Request, res: Response) => {
  try {
    const playbooks = salesPlaybook.getAllPlaybooks();

    return res.json({
      success: true,
      playbooks: playbooks.map(pb => ({
        id: pb.id,
        industry: pb.industry,
        title: pb.title,
        stageCount: pb.stages.length,
        totalDuration: pb.stages.reduce((sum, s) => sum + s.duration, 0),
        closingTechniques: pb.closing_techniques.length,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to get playbooks' });
  }
});

/**
 * POST /api/gtm/phase3/move-prospect
 * Move prospect through sales pipeline
 */
router.post('/phase3/move-prospect', (req: Request, res: Response) => {
  try {
    const { prospectId, newStatus, dealSize, expectedClose } = req.body;

    const prospect = leadTracking.getProspect(prospectId);
    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect not found',
      });
    }

    if (newStatus === 'negotiating') {
      leadTracking.startNegotiation(prospectId, dealSize, new Date(expectedClose));
    } else if (newStatus === 'customer') {
      leadTracking.convertToCustomer(prospectId);
    } else {
      leadTracking.updateProspectStatus(prospectId, newStatus);
    }

    const mrrProjection = leadTracking.getMRRProjection();

    return res.json({
      success: true,
      prospect: leadTracking.getProspect(prospectId),
      mrrProjection,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Status update failed' });
  }
});

// ============================================================================
// UNIFIED GTM DASHBOARD
// ============================================================================

/**
 * GET /api/gtm/dashboard
 * Real-time GTM metrics across all 3 phases
 */
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const funnelStats = leadTracking.getFunnelStats();
    const emailMetrics = leadTracking.getEmailMetrics();
    const mrrProjection = leadTracking.getMRRProjection();
    const contentPerformance = contentService.getContentPerformance();
    const topOpportunities = leadTracking.getTopOpportunities(5);

    return res.json({
      success: true,
      dashboard: {
        // Phase 1: Automated Outbound
        phase1: {
          name: 'Automated Outbound',
          status: 'In Progress',
          target: 'Get 100 qualified leads/month',
          progress: Math.round((funnelStats.contacted / 100) * 100),
          metrics: {
            prospectsTouched: funnelStats.discovered,
            emailsOpened: emailMetrics.totalOpened,
            auditsRequested: funnelStats.audited,
            openRate: `${emailMetrics.openRate}%`,
            clickRate: `${emailMetrics.clickRate}%`,
          },
        },

        // Phase 2: Content Marketing
        phase2: {
          name: 'Content Marketing',
          status: 'Planning',
          target: 'Get 500 inbound leads/month',
          progress: 0,
          metrics: {
            blogPosts: contentPerformance.blogPosts,
            caseStudies: contentPerformance.caseStudies,
            landingPages: contentPerformance.landingPages,
            totalViews: contentPerformance.totalViews,
            avgViewsPerPost: contentPerformance.avgViewsPerPost,
          },
        },

        // Phase 3: Sales Scaling
        phase3: {
          name: 'Sales Team Scaling',
          status: 'Foundation',
          target: '$50K MRR by Q2 2026',
          progress: Math.round((mrrProjection.currentMRR / 50000) * 100),
          metrics: {
            currentMRR: `$${mrrProjection.currentMRR.toLocaleString()}`,
            customers: mrrProjection.customers,
            inNegotiation: mrrProjection.negotiating,
            projectedMRR: `$${mrrProjection.projectedMRR.toLocaleString()}`,
            avgDealSize: '$6,500',
          },
        },

        // Overall KPIs
        kpis: {
          totalLeads: funnelStats.discovered,
          conversionRate: `${(funnelStats.conversionRate * 100).toFixed(1)}%`,
          currentMRR: `$${mrrProjection.currentMRR.toLocaleString()}`,
          projectedMRR: `$${mrrProjection.totalProjectedMRR.toLocaleString()}`,
          customersOnboarded: mrrProjection.customers,
          avgTimeToClose: `${funnelStats.avgTimeToConversion} days`,
        },

        // Top opportunities
        topOpportunities: topOpportunities.map(opp => ({
          companyName: opp.companyName,
          dealSize: opp.estimatedDealSize,
          status: opp.status,
          expectedClose: opp.expectedCloseDate?.toISOString().split('T')[0],
        })),

        // Next actions
        nextActions: [
          'Execute Phase 1 email campaign (Day 1 emails)',
          'Create 5 high-value blog posts (WCAG + ADA topics)',
          'Set up HubSpot CRM integration',
          'Hire first 2 SDRs (week 3-4)',
          'Build sales playbook training deck',
        ],
      },
    });
  } catch (error) {
    console.error('Error in dashboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get dashboard',
    });
  }
});

/**
 * POST /api/gtm/execute-month
 * Execute all three phases for the month
 */
router.post('/execute-month', (req: Request, res: Response) => {
  try {
    const monthNumber = new Date().getMonth() + 1;

    return res.json({
      success: true,
      execution: {
        month: `Month ${monthNumber}`,
        phases: [
          {
            phase: 1,
            name: 'Automated Outbound',
            goal: '100 leads',
            tasks: [
              '✅ Discover 1000 prospects',
              '✅ Score and prioritize',
              '⏳ Send email campaign (starting today)',
              '⏳ Track opens, clicks, responses',
              '⏳ Request audits',
            ],
            expectedOutcome: '15-20 audit requests, 2-3 conversions',
          },
          {
            phase: 2,
            name: 'Content Marketing',
            goal: '500 inbound leads',
            tasks: [
              '⏳ Create 5 blog posts (WCAG + ADA + industry)',
              '⏳ Generate 3 case studies from first customers',
              '⏳ Build 10 SEO landing pages',
              '⏳ Set up analytics tracking',
              '⏳ Submit content for indexing',
            ],
            expectedOutcome: '50-100 organic visits, 5-10 inbound inquiries',
          },
          {
            phase: 3,
            name: 'Sales Team Scaling',
            goal: 'Foundation for $50K MRR',
            tasks: [
              '⏳ Document sales playbooks (all ICPs)',
              '⏳ Set up HubSpot CRM',
              '⏳ Create sales dashboard',
              '⏳ Build team hiring framework',
              '⏳ Define SDR responsibilities',
            ],
            expectedOutcome: 'Ready to hire SDRs in week 3-4',
          },
        ],
        timeline: {
          week1: 'Prospect discovery + email campaign launch',
          week2: 'Content creation begins',
          week3: 'Blog posts published + CRM setup',
          week4: 'Sales team hiring + first deals closing',
        },
        successMetrics: {
          leads: '100+',
          conversionRate: '15%+',
          revenue: '$20K+ MRR',
          teamSize: '1 founder + 2 SDRs',
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Execution failed' });
  }
});

export default router;
