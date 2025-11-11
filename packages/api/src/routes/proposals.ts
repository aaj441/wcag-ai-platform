/**
 * Proposals API Routes
 * Handles automated proposal generation
 */

import { Router, Request, Response } from 'express';
import {
  generateProposal,
  generateHTMLProposal,
  recommendTier,
  ProposalData
} from '../services/proposalGenerator';

const router = Router();

/**
 * POST /api/proposals/generate
 * Generate a proposal for a potential client
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      clientName,
      consultantName,
      url,
      violationCount,
      criticalViolations,
      userImpact,
      recommendedTier,
      format = 'markdown'
    } = req.body;

    // Validation
    if (!clientName || !url || violationCount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: clientName, url, violationCount'
      });
    }

    const proposalData: ProposalData = {
      clientName,
      consultantName: consultantName || 'WCAGAI Accessibility Team',
      url,
      violationCount,
      criticalViolations: criticalViolations || 0,
      userImpact: userImpact || 10000,
      recommendedTier: recommendedTier || recommendTier(
        violationCount,
        criticalViolations || 0,
        false
      ),
      scanDate: new Date()
    };

    let proposal: string;
    let contentType: string;

    if (format === 'html') {
      proposal = generateHTMLProposal(proposalData);
      contentType = 'text/html';
    } else {
      proposal = generateProposal(proposalData);
      contentType = 'text/markdown';
    }

    res.setHeader('Content-Type', contentType);
    res.send(proposal);
  } catch (error) {
    console.error('Error generating proposal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate proposal'
    });
  }
});

/**
 * POST /api/proposals/recommend-tier
 * Recommend a tier based on client needs
 */
router.post('/recommend-tier', async (req: Request, res: Response) => {
  try {
    const {
      violationCount,
      criticalViolations = 0,
      needsMonitoring = false
    } = req.body;

    if (violationCount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'violationCount is required'
      });
    }

    const tier = recommendTier(
      violationCount,
      criticalViolations,
      needsMonitoring
    );

    res.json({
      success: true,
      data: {
        recommendedTier: tier,
        reason: getTierReason(violationCount, criticalViolations, needsMonitoring)
      }
    });
  } catch (error) {
    console.error('Error recommending tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recommend tier'
    });
  }
});

function getTierReason(
  violationCount: number,
  criticalViolations: number,
  needsMonitoring: boolean
): string {
  if (violationCount > 50 || needsMonitoring) {
    return 'High violation count or monitoring needs suggest Enterprise tier for unlimited scans and dedicated support';
  }

  if (criticalViolations > 5 || violationCount > 20) {
    return 'Multiple critical violations or significant issue count recommends Professional tier for ongoing monitoring';
  }

  return 'Basic tier is suitable for one-time audit and remediation';
}

export default router;
