/**
 * Enhancement API Routes
 * All 5 enhancements in one comprehensive router
 */

import express, { Request, Response } from 'express';
import { log } from '../utils/logger';
import { ProspectDiscoveryServiceV2 } from '../services/ProspectDiscoveryServiceV2';
import { EmailPersonalizationService } from '../services/EmailPersonalizationService';
import { OutreachSequencingService } from '../services/OutreachSequencingService';
import { LawsuitTrackingService } from '../services/LawsuitTrackingService';
import { MLScoringService } from '../services/MLScoringService';

const router = express.Router();

// ============================================================================
// ENHANCEMENT 1: REAL DATA INTEGRATIONS
// ============================================================================

/**
 * POST /api/enhancements/discover-v2
 * Discover prospects using real APIs (Apollo, Google Maps, Hunter)
 */
router.post('/discover-v2', async (req: Request, res: Response) => {
  try {
    const { metro, industries, limit = 50, enrichData = true, useRealAPIs = true } = req.body;

    const prospects = await ProspectDiscoveryServiceV2.discoverProspects({
      metro,
      industries,
      limit,
      enrichData,
      useRealAPIs,
    });

    res.json({
      success: true,
      data: {
        discovered: prospects.length,
        prospects,
        dataSource: useRealAPIs ? 'real_apis' : 'mock',
      },
    });
  } catch (error) {
    log.error('V2 discovery failed', error as Error);
    res.status(500).json({ error: 'Discovery failed' });
  }
});

// ============================================================================
// ENHANCEMENT 2: AI-POWERED EMAIL PERSONALIZATION
// ============================================================================

/**
 * POST /api/enhancements/personalize-email
 * Generate AI-personalized email for prospect
 */
router.post('/personalize-email', async (req: Request, res: Response) => {
  try {
    const {
      prospectName,
      businessName,
      industry,
      website,
      metro,
      riskProfile,
      auditResults,
      localContext,
    } = req.body;

    const personalizedEmail = await EmailPersonalizationService.generatePersonalizedEmail({
      prospectName,
      businessName,
      industry,
      website,
      metro,
      riskProfile,
      auditResults,
      localContext,
    });

    res.json({
      success: true,
      data: personalizedEmail,
    });
  } catch (error) {
    log.error('Email personalization failed', error as Error);
    res.status(500).json({ error: 'Personalization failed' });
  }
});

/**
 * POST /api/enhancements/personalize-batch
 * Batch generate personalized emails
 */
router.post('/personalize-batch', async (req: Request, res: Response) => {
  try {
    const { contexts } = req.body;

    const emails = await EmailPersonalizationService.batchGenerateEmails(contexts);

    res.json({
      success: true,
      data: {
        generated: emails.length,
        emails,
        totalCost: emails.reduce((sum, e) => sum + e.generationCost, 0),
      },
    });
  } catch (error) {
    log.error('Batch personalization failed', error as Error);
    res.status(500).json({ error: 'Batch personalization failed' });
  }
});

// ============================================================================
// ENHANCEMENT 3: LAWSUIT TRACKING
// ============================================================================

/**
 * GET /api/enhancements/lawsuits/recent
 * Get recent ADA lawsuits
 */
router.get('/lawsuits/recent', async (req: Request, res: Response) => {
  try {
    const { metroId, state, industry, days = 30, limit = 50 } = req.query;

    const lawsuits = await LawsuitTrackingService.getRecentLawsuits({
      metroId: metroId as string,
      state: state as string,
      industry: industry as string,
      days: Number(days),
      limit: Number(limit),
    });

    res.json({
      success: true,
      data: {
        count: lawsuits.length,
        lawsuits,
      },
    });
  } catch (error) {
    log.error('Failed to get recent lawsuits', error as Error);
    res.status(500).json({ error: 'Failed to get lawsuits' });
  }
});

/**
 * GET /api/enhancements/lawsuits/trends
 * Get lawsuit trends by metro
 */
router.get('/lawsuits/trends', async (req: Request, res: Response) => {
  try {
    const { metroId, days = 30 } = req.query;

    const trends = await LawsuitTrackingService.getTrendsByMetro({
      metroId: metroId as string,
      days: Number(days),
    });

    res.json({
      success: true,
      data: {
        trends,
      },
    });
  } catch (error) {
    log.error('Failed to get lawsuit trends', error as Error);
    res.status(500).json({ error: 'Failed to get trends' });
  }
});

/**
 * GET /api/enhancements/lawsuits/statistics
 * Get overall lawsuit statistics
 */
router.get('/lawsuits/statistics', async (req: Request, res: Response) => {
  try {
    const stats = await LawsuitTrackingService.getStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    log.error('Failed to get lawsuit statistics', error as Error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * POST /api/enhancements/lawsuits/scrape
 * Manually trigger lawsuit scraping
 */
router.post('/lawsuits/scrape', async (req: Request, res: Response) => {
  try {
    // Run scrape job
    await LawsuitTrackingService.dailyLawsuitScrapeJob();

    res.json({
      success: true,
      message: 'Scrape job initiated',
    });
  } catch (error) {
    log.error('Scrape job failed', error as Error);
    res.status(500).json({ error: 'Scrape failed' });
  }
});

// ============================================================================
// ENHANCEMENT 4: OUTREACH SEQUENCING
// ============================================================================

/**
 * POST /api/enhancements/sequences/create
 * Create new outreach sequence
 */
router.post('/sequences/create', async (req: Request, res: Response) => {
  try {
    const sequenceId = await OutreachSequencingService.createSequence(req.body);

    res.json({
      success: true,
      data: {
        sequenceId,
      },
    });
  } catch (error) {
    log.error('Sequence creation failed', error as Error);
    res.status(500).json({ error: 'Failed to create sequence' });
  }
});

/**
 * POST /api/enhancements/sequences/enroll
 * Enroll prospect in sequence
 */
router.post('/sequences/enroll', async (req: Request, res: Response) => {
  try {
    const { prospectId, sequenceId, startImmediately = false } = req.body;

    const enrollmentId = await OutreachSequencingService.enrollProspect({
      prospectId,
      sequenceId,
      startImmediately,
    });

    res.json({
      success: true,
      data: {
        enrollmentId,
      },
    });
  } catch (error) {
    log.error('Enrollment failed', error as Error);
    res.status(500).json({ error: 'Failed to enroll prospect' });
  }
});

/**
 * POST /api/enhancements/sequences/process
 * Process scheduled outreach (called by cron)
 */
router.post('/sequences/process', async (req: Request, res: Response) => {
  try {
    const result = await OutreachSequencingService.processScheduledOutreach();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Outreach processing failed', error as Error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

/**
 * GET /api/enhancements/sequences/:sequenceId/analytics
 * Get sequence performance analytics
 */
router.get('/sequences/:sequenceId/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await OutreachSequencingService.getSequenceAnalytics(req.params.sequenceId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    log.error('Failed to get analytics', error as Error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * POST /api/enhancements/sequences/:enrollmentId/pause
 * Pause enrollment
 */
router.post('/sequences/:enrollmentId/pause', async (req: Request, res: Response) => {
  try {
    await OutreachSequencingService.pauseEnrollment(req.params.enrollmentId);

    res.json({
      success: true,
      message: 'Enrollment paused',
    });
  } catch (error) {
    log.error('Failed to pause enrollment', error as Error);
    res.status(500).json({ error: 'Failed to pause' });
  }
});

/**
 * POST /api/enhancements/sequences/:enrollmentId/resume
 * Resume enrollment
 */
router.post('/sequences/:enrollmentId/resume', async (req: Request, res: Response) => {
  try {
    await OutreachSequencingService.resumeEnrollment(req.params.enrollmentId);

    res.json({
      success: true,
      message: 'Enrollment resumed',
    });
  } catch (error) {
    log.error('Failed to resume enrollment', error as Error);
    res.status(500).json({ error: 'Failed to resume' });
  }
});

// ============================================================================
// ENHANCEMENT 5: ML LEAD SCORING
// ============================================================================

/**
 * POST /api/enhancements/ml/predict
 * Predict conversion probability for prospect
 */
router.post('/ml/predict', async (req: Request, res: Response) => {
  try {
    const { prospectId } = req.body;

    const prediction = await MLScoringService.predictConversion(prospectId);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    log.error('ML prediction failed', error as Error);
    res.status(500).json({ error: 'Prediction failed' });
  }
});

/**
 * POST /api/enhancements/ml/train
 * Train new ML model
 */
router.post('/ml/train', async (req: Request, res: Response) => {
  try {
    const { name, algorithm = 'logistic_regression' } = req.body;

    const result = await MLScoringService.trainModel({
      name,
      algorithm,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Model training failed', error as Error);
    res.status(500).json({ error: 'Training failed' });
  }
});

/**
 * POST /api/enhancements/ml/activate/:modelId
 * Activate model for production use
 */
router.post('/ml/activate/:modelId', async (req: Request, res: Response) => {
  try {
    await MLScoringService.activateModel(req.params.modelId);

    res.json({
      success: true,
      message: 'Model activated',
    });
  } catch (error) {
    log.error('Model activation failed', error as Error);
    res.status(500).json({ error: 'Activation failed' });
  }
});

/**
 * GET /api/enhancements/ml/metrics/:modelId
 * Get model performance metrics
 */
router.get('/ml/metrics/:modelId', async (req: Request, res: Response) => {
  try {
    const metrics = await MLScoringService.getModelMetrics(req.params.modelId);

    if (!metrics) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    log.error('Failed to get metrics', error as Error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

export default router;
