/**
 * Outreach API Routes
 *
 * Endpoints for managing cold outreach campaigns across multiple channels
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import OutreachCampaignService from '../services/outreach/OutreachCampaignService';
import EmailTemplateService from '../services/outreach/EmailTemplateService';
import PersonalizationEngine from '../services/outreach/PersonalizationEngine';
import LinkedInOutreachService from '../services/outreach/LinkedInOutreachService';
import ColdCallScriptGenerator from '../services/outreach/ColdCallScriptGenerator';
import MultiChannelCoordinator from '../services/outreach/MultiChannelCoordinator';

const router = express.Router();
const prisma = new PrismaClient();

const campaignService = new OutreachCampaignService(prisma);
const personalizationEngine = new PersonalizationEngine();
const linkedInService = new LinkedInOutreachService();
const callScriptGenerator = new ColdCallScriptGenerator();
const multiChannelCoordinator = new MultiChannelCoordinator(prisma);

/**
 * GET /api/outreach/campaigns
 * Get all available campaign sequences
 */
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const sequences = OutreachCampaignService.getDefaultSequences();
    res.json({ success: true, campaigns: sequences });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns' });
  }
});

/**
 * POST /api/outreach/campaigns/enroll
 * Enroll a prospect in a campaign
 */
router.post('/campaigns/enroll', async (req: Request, res: Response) => {
  try {
    const { prospectId, campaignId } = req.body;

    if (!prospectId || !campaignId) {
      return res.status(400).json({
        success: false,
        error: 'prospectId and campaignId are required',
      });
    }

    await campaignService.enrollProspect(prospectId, campaignId);

    res.json({
      success: true,
      message: `Prospect enrolled in campaign ${campaignId}`,
    });
  } catch (error) {
    console.error('Error enrolling prospect:', error);
    res.status(500).json({ success: false, error: 'Failed to enroll prospect' });
  }
});

/**
 * GET /api/outreach/campaigns/:campaignId/stats
 * Get campaign statistics
 */
router.get('/campaigns/:campaignId/stats', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const stats = await campaignService.getCampaignStats(campaignId);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/outreach/templates
 * Get all email templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = EmailTemplateService.getAllTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

/**
 * POST /api/outreach/templates/personalize
 * Personalize an email template
 */
router.post('/templates/personalize', async (req: Request, res: Response) => {
  try {
    const { templateId, prospectData, additionalData } = req.body;

    const template = EmailTemplateService.getAllTemplates().find(t => t.id === templateId);

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const personalized = EmailTemplateService.personalizeTemplate(
      template,
      prospectData,
      additionalData
    );

    res.json({ success: true, email: personalized });
  } catch (error) {
    console.error('Error personalizing template:', error);
    res.status(500).json({ success: false, error: 'Failed to personalize template' });
  }
});

/**
 * POST /api/outreach/ai/generate-email
 * Generate AI-personalized email
 */
router.post('/ai/generate-email', async (req: Request, res: Response) => {
  try {
    const { context, templateType, hook } = req.body;

    if (!context || !context.prospect) {
      return res.status(400).json({
        success: false,
        error: 'context.prospect is required',
      });
    }

    const email = await personalizationEngine.generatePersonalizedEmail(
      context,
      templateType || 'initial',
      hook || 'lawsuit_risk'
    );

    res.json({ success: true, email });
  } catch (error) {
    console.error('Error generating AI email:', error);
    res.status(500).json({ success: false, error: 'Failed to generate email' });
  }
});

/**
 * POST /api/outreach/ai/subject-lines
 * Generate multiple subject line variants
 */
router.post('/ai/subject-lines', async (req: Request, res: Response) => {
  try {
    const { context, count } = req.body;

    const subjectLines = await personalizationEngine.generateSubjectLines(
      context,
      count || 3
    );

    res.json({ success: true, subjectLines });
  } catch (error) {
    console.error('Error generating subject lines:', error);
    res.status(500).json({ success: false, error: 'Failed to generate subject lines' });
  }
});

/**
 * POST /api/outreach/linkedin/connection-request
 * Generate LinkedIn connection request
 */
router.post('/linkedin/connection-request', async (req: Request, res: Response) => {
  try {
    const { profile, context } = req.body;

    const message = await linkedInService.generateConnectionRequest(profile, context);

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error generating connection request:', error);
    res.status(500).json({ success: false, error: 'Failed to generate request' });
  }
});

/**
 * POST /api/outreach/linkedin/inmail
 * Generate LinkedIn InMail
 */
router.post('/linkedin/inmail', async (req: Request, res: Response) => {
  try {
    const { profile, context } = req.body;

    const message = await linkedInService.generateInMail(profile, context);

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error generating InMail:', error);
    res.status(500).json({ success: false, error: 'Failed to generate InMail' });
  }
});

/**
 * POST /api/outreach/linkedin/comment
 * Generate LinkedIn post comment
 */
router.post('/linkedin/comment', async (req: Request, res: Response) => {
  try {
    const { post } = req.body;

    const comment = await linkedInService.generatePostComment(post);

    res.json({ success: true, comment });
  } catch (error) {
    console.error('Error generating comment:', error);
    res.status(500).json({ success: false, error: 'Failed to generate comment' });
  }
});

/**
 * POST /api/outreach/linkedin/post
 * Generate thought leadership post
 */
router.post('/linkedin/post', async (req: Request, res: Response) => {
  try {
    const { topic, details } = req.body;

    const result = await linkedInService.generateThoughtLeadershipPost(topic, details);

    res.json({ success: true, post: result });
  } catch (error) {
    console.error('Error generating post:', error);
    res.status(500).json({ success: false, error: 'Failed to generate post' });
  }
});

/**
 * POST /api/outreach/linkedin/strategy
 * Get LinkedIn outreach strategy
 */
router.post('/linkedin/strategy', async (req: Request, res: Response) => {
  try {
    const { profile, context } = req.body;

    const strategy = await linkedInService.getOutreachStrategy(profile, context);

    res.json({ success: true, strategy });
  } catch (error) {
    console.error('Error getting strategy:', error);
    res.status(500).json({ success: false, error: 'Failed to get strategy' });
  }
});

/**
 * POST /api/outreach/call/script
 * Generate cold call script
 */
router.post('/call/script', async (req: Request, res: Response) => {
  try {
    const { context } = req.body;

    const script = await callScriptGenerator.generateScript(context);

    res.json({ success: true, script });
  } catch (error) {
    console.error('Error generating script:', error);
    res.status(500).json({ success: false, error: 'Failed to generate script' });
  }
});

/**
 * POST /api/outreach/call/gatekeeper
 * Get gatekeeper bypass scripts
 */
router.post('/call/gatekeeper', async (req: Request, res: Response) => {
  try {
    const { company, decisionMakerTitle } = req.body;

    const scripts = await callScriptGenerator.generateGatekeeperScript(
      company,
      decisionMakerTitle
    );

    res.json({ success: true, scripts });
  } catch (error) {
    console.error('Error generating gatekeeper scripts:', error);
    res.status(500).json({ success: false, error: 'Failed to generate scripts' });
  }
});

/**
 * GET /api/outreach/call/timing/:industry
 * Get call timing recommendations
 */
router.get('/call/timing/:industry?', async (req: Request, res: Response) => {
  try {
    const { industry } = req.params;

    const recommendations = callScriptGenerator.getCallTimingRecommendations(industry);

    res.json({ success: true, recommendations });
  } catch (error) {
    console.error('Error getting timing recommendations:', error);
    res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
});

/**
 * GET /api/outreach/multi-channel/strategies
 * Get all multi-channel strategies
 */
router.get('/multi-channel/strategies', async (req: Request, res: Response) => {
  try {
    const strategies = MultiChannelCoordinator.getPrebuiltStrategies();

    res.json({ success: true, strategies });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch strategies' });
  }
});

/**
 * POST /api/outreach/multi-channel/execute
 * Execute multi-channel strategy
 */
router.post('/multi-channel/execute', async (req: Request, res: Response) => {
  try {
    const { prospectId, strategyName, preferences } = req.body;

    if (!prospectId || !strategyName) {
      return res.status(400).json({
        success: false,
        error: 'prospectId and strategyName are required',
      });
    }

    await multiChannelCoordinator.executeStrategy(prospectId, strategyName, preferences);

    res.json({
      success: true,
      message: `Executing ${strategyName} strategy for prospect`,
    });
  } catch (error) {
    console.error('Error executing strategy:', error);
    res.status(500).json({ success: false, error: 'Failed to execute strategy' });
  }
});

/**
 * GET /api/outreach/multi-channel/next-action/:prospectId
 * Get next recommended action
 */
router.get('/multi-channel/next-action/:prospectId', async (req: Request, res: Response) => {
  try {
    const { prospectId } = req.params;

    const nextAction = await multiChannelCoordinator.getNextAction(prospectId);

    res.json({ success: true, nextAction });
  } catch (error) {
    console.error('Error getting next action:', error);
    res.status(500).json({ success: false, error: 'Failed to get next action' });
  }
});

/**
 * GET /api/outreach/multi-channel/engagement/:prospectId
 * Get engagement score
 */
router.get('/multi-channel/engagement/:prospectId', async (req: Request, res: Response) => {
  try {
    const { prospectId } = req.params;

    const engagement = await multiChannelCoordinator.getEngagementScore(prospectId);

    res.json({ success: true, engagement });
  } catch (error) {
    console.error('Error getting engagement score:', error);
    res.status(500).json({ success: false, error: 'Failed to get engagement score' });
  }
});

/**
 * POST /api/outreach/multi-channel/pause
 * Pause outreach for a prospect
 */
router.post('/multi-channel/pause', async (req: Request, res: Response) => {
  try {
    const { prospectId } = req.body;

    await multiChannelCoordinator.pauseAllOutreach(prospectId);

    res.json({ success: true, message: 'Outreach paused' });
  } catch (error) {
    console.error('Error pausing outreach:', error);
    res.status(500).json({ success: false, error: 'Failed to pause outreach' });
  }
});

/**
 * POST /api/outreach/multi-channel/resume
 * Resume outreach for a prospect
 */
router.post('/multi-channel/resume', async (req: Request, res: Response) => {
  try {
    const { prospectId } = req.body;

    await multiChannelCoordinator.resumeOutreach(prospectId);

    res.json({ success: true, message: 'Outreach resumed' });
  } catch (error) {
    console.error('Error resuming outreach:', error);
    res.status(500).json({ success: false, error: 'Failed to resume outreach' });
  }
});

/**
 * POST /api/outreach/webhooks/sendgrid
 * Handle SendGrid webhooks (opens, clicks, bounces)
 */
router.post('/webhooks/sendgrid', async (req: Request, res: Response) => {
  try {
    const events = req.body;

    for (const event of events) {
      const { event: eventType, email_id: emailId } = event;

      switch (eventType) {
        case 'open':
          await campaignService.trackEmailOpen(emailId);
          break;
        case 'click':
          await campaignService.trackEmailClick(emailId);
          break;
        case 'bounce':
          // Handle bounce
          break;
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error');
  }
});

export default router;
