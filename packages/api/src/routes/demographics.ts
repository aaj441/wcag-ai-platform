/**
 * Nationwide Demographics & Targeting API Routes
 * Metro selection, prospect discovery, risk scoring, batch auditing
 */

import express, { Request, Response } from 'express';
import { log } from '../utils/logger';
import { ProspectDiscoveryService } from '../services/ProspectDiscoveryService';
import { RiskScoringService } from '../services/RiskScoringService';
import { BatchAuditService } from '../services/BatchAuditService';
import { NATIONAL_METROS, INDUSTRY_VERTICALS, getMetroById, searchMetros } from '../data/nationalMetros';

const router = express.Router();

// ============================================================================
// METRO ENDPOINTS
// ============================================================================

/**
 * GET /api/demographics/metros
 * List all available metro areas
 */
router.get('/metros', (req: Request, res: Response) => {
  try {
    const state = (req.query.state as string)?.toUpperCase();
    const search = req.query.search as string;

    let metros = NATIONAL_METROS;

    // Filter by state
    if (state) {
      metros = metros.filter(m => m.state === state);
    }

    // Search by name/id
    if (search) {
      metros = searchMetros(search);
    }

    res.json({
      success: true,
      data: {
        metros,
        totalCount: metros.length,
        uniqueStates: [...new Set(NATIONAL_METROS.map(m => m.state))],
      },
    });
  } catch (error) {
    log.error('Failed to list metros', error as Error);
    res.status(500).json({ error: 'Failed to list metros' });
  }
});

/**
 * GET /api/demographics/metros/:metroId
 * Get detailed metro information
 */
router.get('/metros/:metroId', (req: Request, res: Response) => {
  try {
    const metro = getMetroById(req.params.metroId);

    if (!metro) {
      return res.status(404).json({ error: 'Metro not found' });
    }

    // Get industries for this metro
    const industries = INDUSTRY_VERTICALS.map(ind => ({
      ...ind,
      estimatedProspectsInMetro: ind.estimatedProspectsInMetro,
    }));

    res.json({
      success: true,
      data: {
        metro,
        industries,
        estimatedTotalProspects: industries.reduce((sum, i) => sum + i.estimatedProspectsInMetro, 0),
      },
    });
  } catch (error) {
    log.error('Failed to get metro details', error as Error);
    res.status(500).json({ error: 'Failed to get metro details' });
  }
});

/**
 * GET /api/demographics/industries
 * List all industry verticals
 */
router.get('/industries', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        industries: INDUSTRY_VERTICALS,
        totalVerticals: INDUSTRY_VERTICALS.length,
      },
    });
  } catch (error) {
    log.error('Failed to list industries', error as Error);
    res.status(500).json({ error: 'Failed to list industries' });
  }
});

// ============================================================================
// PROSPECT DISCOVERY ENDPOINTS
// ============================================================================

/**
 * POST /api/demographics/discover
 * Discover prospects for a metro and industries
 */
router.post('/discover', async (req: Request, res: Response) => {
  try {
    const { metro, industries, limit = 50, enrichData = true } = req.body;

    if (!metro || !industries || !Array.isArray(industries)) {
      return res.status(400).json({
        error: 'Missing required fields: metro, industries (array)',
      });
    }

    log.info('Starting prospect discovery', { metro, industries, limit });

    const prospects = await ProspectDiscoveryService.discoverProspects({
      metro,
      industries,
      limit,
      enrichData,
    });

    res.json({
      success: true,
      data: {
        metro,
        industries,
        discovered: prospects.length,
        auditable: Math.floor(prospects.length * 0.85), // Estimate 85% pass screening
        ready: Math.floor(prospects.length * 0.7), // Estimate 70% ready for outreach
        prospects,
      },
    });
  } catch (error) {
    log.error('Prospect discovery failed', error as Error);
    res.status(500).json({
      error: 'Prospect discovery failed',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/demographics/discover-batch
 * Discover prospects across multiple metros (bulk operation)
 */
router.post('/discover-batch', async (req: Request, res: Response) => {
  try {
    const { metros, industries, limit = 25 } = req.body;

    if (!metros || !industries || !Array.isArray(metros)) {
      return res.status(400).json({
        error: 'Missing required fields: metros (array), industries (array)',
      });
    }

    log.info('Starting batch prospect discovery', { metros: metros.length, industries });

    const results = await ProspectDiscoveryService.batchDiscover(metros, industries);
    const totalProspects = Array.from(results.values()).reduce((sum, p) => sum + p.length, 0);

    res.json({
      success: true,
      data: {
        metros: metros.length,
        industries,
        totalDiscovered: totalProspects,
        byMetro: Object.fromEntries(results),
      },
    });
  } catch (error) {
    log.error('Batch discovery failed', error as Error);
    res.status(500).json({ error: 'Batch discovery failed' });
  }
});

// ============================================================================
// RISK SCORING ENDPOINTS
// ============================================================================

/**
 * POST /api/demographics/score-risk
 * Calculate risk profile for a prospect
 */
router.post('/score-risk', (req: Request, res: Response) => {
  try {
    const {
      complianceScore = 0,
      violationCount = 0,
      industry,
      employeeCount,
      revenue,
      redFlags = [],
      websiteAge,
      hasHttps,
      mobileResponsive,
    } = req.body;

    if (!industry) {
      return res.status(400).json({ error: 'Industry is required' });
    }

    const riskProfile = RiskScoringService.calculateRiskProfile({
      complianceScore,
      violationCount,
      industry,
      employeeCount,
      revenue,
      redFlags,
      websiteAge,
      hasHttps,
      mobileResponsive,
    });

    res.json({
      success: true,
      data: riskProfile,
    });
  } catch (error) {
    log.error('Risk scoring failed', error as Error);
    res.status(500).json({ error: 'Risk scoring failed' });
  }
});

/**
 * POST /api/demographics/recommendations
 * Generate batch recommendations for outreach
 */
router.post('/recommendations', (req: Request, res: Response) => {
  try {
    const { prospects } = req.body;

    if (!Array.isArray(prospects)) {
      return res.status(400).json({ error: 'Prospects must be an array' });
    }

    const recommendations = RiskScoringService.generateBatchRecommendations(prospects);

    // Sort by priority
    const prioritized = recommendations
      .sort((a, b) => a.profile.priority - b.profile.priority)
      .slice(0, 20); // Top 20

    res.json({
      success: true,
      data: {
        totalAnalyzed: prospects.length,
        recommendations: prioritized.map(r => ({
          industry: r.prospect.industry,
          riskScore: r.profile.riskScore,
          priority: r.profile.priority,
          suggestedHook: r.profile.suggestedHook,
          reasoning: r.profile.reasoning,
          emailPreview: r.emailTemplate.substring(0, 100) + '...',
        })),
      },
    });
  } catch (error) {
    log.error('Recommendations failed', error as Error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// ============================================================================
// BATCH AUDIT ENDPOINTS
// ============================================================================

/**
 * POST /api/demographics/batch-audit
 * Start a batch accessibility audit
 */
router.post('/batch-audit', (req: Request, res: Response) => {
  try {
    const { websites } = req.body;

    if (!Array.isArray(websites) || websites.length === 0) {
      return res.status(400).json({ error: 'Websites array is required' });
    }

    if (websites.length > 100) {
      return res.status(400).json({
        error: 'Maximum 100 websites per batch',
      });
    }

    // Validate URLs
    const validWebsites = websites.filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (validWebsites.length === 0) {
      return res.status(400).json({ error: 'No valid URLs provided' });
    }

    log.info('Creating batch audit job', { count: validWebsites.length });

    const job = BatchAuditService.createAuditJob(validWebsites);

    res.json({
      success: true,
      data: {
        jobId: job.jobId,
        status: job.status,
        websites: validWebsites.length,
        estimatedTime: `${Math.ceil(validWebsites.length / 4) * 3} minutes`,
      },
    });
  } catch (error) {
    log.error('Batch audit creation failed', error as Error);
    res.status(500).json({ error: 'Failed to create batch audit' });
  }
});

/**
 * GET /api/demographics/batch-audit/:jobId
 * Get batch audit job status
 */
router.get('/batch-audit/:jobId', (req: Request, res: Response) => {
  try {
    const job = BatchAuditService.getJobStatus(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const summary = BatchAuditService.getJobSummary(req.params.jobId);

    res.json({
      success: true,
      data: {
        ...summary,
        progress: job.progress,
      },
    });
  } catch (error) {
    log.error('Failed to get batch status', error as Error);
    res.status(500).json({ error: 'Failed to get batch status' });
  }
});

/**
 * GET /api/demographics/batch-audit/:jobId/results
 * Get detailed audit results
 */
router.get('/batch-audit/:jobId/results', (req: Request, res: Response) => {
  try {
    const job = BatchAuditService.getJobStatus(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const results = Array.from(job.results.entries()).map(([, result]) => result);

    // Sort by compliance score (lowest first = highest priority)
    const sorted = results.sort((a, b) => a.complianceScore - b.complianceScore);

    res.json({
      success: true,
      data: {
        jobId: job.jobId,
        totalResults: results.length,
        results: sorted,
      },
    });
  } catch (error) {
    log.error('Failed to get audit results', error as Error);
    res.status(500).json({ error: 'Failed to get audit results' });
  }
});

/**
 * GET /api/demographics/batch-audit/:jobId/export
 * Export audit results as CSV
 */
router.get('/batch-audit/:jobId/export', (req: Request, res: Response) => {
  try {
    const csv = BatchAuditService.exportJobResults(req.params.jobId);

    if (!csv) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-${req.params.jobId}.csv"`);
    res.send(csv);
  } catch (error) {
    log.error('Failed to export results', error as Error);
    res.status(500).json({ error: 'Failed to export results' });
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/demographics/analytics/top-metros
 * Get top metros by lawsuit trend
 */
router.get('/analytics/top-metros', (req: Request, res: Response) => {
  try {
    const topMetros = NATIONAL_METROS
      .filter(m => m.adaLawsuitTrend === 'increasing')
      .sort((a, b) => b.population - a.population)
      .slice(0, 20);

    res.json({
      success: true,
      data: {
        topMetros,
        totalIncreasing: NATIONAL_METROS.filter(m => m.adaLawsuitTrend === 'increasing').length,
      },
    });
  } catch (error) {
    log.error('Failed to get analytics', error as Error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * GET /api/demographics/analytics/high-risk-industries
 * Get industries with highest lawsuit trends
 */
router.get('/analytics/high-risk-industries', (req: Request, res: Response) => {
  try {
    const highRisk = INDUSTRY_VERTICALS
      .filter(i => i.adaRiskLevel === 'critical' || i.adaRiskLevel === 'high')
      .sort((a, b) => b.recentLawsuitCount - a.recentLawsuitCount);

    res.json({
      success: true,
      data: {
        highRiskIndustries: highRisk,
      },
    });
  } catch (error) {
    log.error('Failed to get industry analytics', error as Error);
    res.status(500).json({ error: 'Failed to get industry analytics' });
  }
});

export default router;
