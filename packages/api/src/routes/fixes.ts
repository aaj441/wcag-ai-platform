/**
 * Fixes Routes - AI-Powered Remediation Endpoints
 * Strategic Pivot: From Scanner to Fixer
 */

import { Router, Request, Response } from 'express';
import { generateFix } from '../services/fixGenerator';
import { generateRemediationPlan, getRemediationRecommendations } from '../services/remediationEngine';
import { getAllViolations } from '../data/store';
import { ApiResponse, FixRequest, FixResult, LegacyViolation } from '../types';
import { log } from '../utils/logger';

const router = Router();

/**
 * POST /api/fixes/generate
 * Generate AI-powered fix for a specific violation
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { violationId, type, context } = req.body;

    if (!violationId) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required field: violationId',
      };
      return res.status(400).json(response);
    }

    // Find the violation
    const violations = getAllViolations();
    const violation = violations.find(v => v.id === violationId);

    if (!violation) {
      const response: ApiResponse = {
        success: false,
        error: `Violation not found: ${violationId}`,
      };
      return res.status(404).json(response);
    }

    // Generate fix
    const request: FixRequest = {
      violationId,
      type: type || 'manual',
      context,
    };

    const fix = await generateFix(request, violation);

    const response: ApiResponse<FixResult> = {
      success: true,
      data: fix,
      message: 'Fix generated successfully',
    };

    log.info(`Generated fix for violation ${violationId}`);
    res.json(response);
  } catch (error) {
    log.error('Error generating fix', error as Error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate fix',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/fixes/batch
 * Generate fixes for multiple violations
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { violationIds } = req.body;

    if (!violationIds || !Array.isArray(violationIds)) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing or invalid field: violationIds (must be an array)',
      };
      return res.status(400).json(response);
    }

    // Find violations
    const allViolations = getAllViolations();
    const violations = allViolations.filter(v => violationIds.includes(v.id));

    if (violations.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'No matching violations found',
      };
      return res.status(404).json(response);
    }

    // Generate remediation plan
    const plan = await generateRemediationPlan(violations);

    const response: ApiResponse<typeof plan> = {
      success: true,
      data: plan,
      message: `Generated ${plan.fixes.length} fixes for ${violations.length} violations`,
    };

    log.info(`Generated batch fixes: ${plan.fixes.length} fixes`);
    res.json(response);
  } catch (error) {
    log.error('Error generating batch fixes', error as Error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate batch fixes',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/fixes/recommendations/:violationId
 * Get remediation recommendations for a violation
 */
router.get('/recommendations/:violationId', (req: Request, res: Response) => {
  try {
    const { violationId } = req.params;

    // Find the violation
    const violations = getAllViolations();
    const violation = violations.find(v => v.id === violationId);

    if (!violation) {
      const response: ApiResponse = {
        success: false,
        error: `Violation not found: ${violationId}`,
      };
      return res.status(404).json(response);
    }

    const recommendations = getRemediationRecommendations(violation);

    const response: ApiResponse<{ recommendations: string[] }> = {
      success: true,
      data: { recommendations },
    };

    res.json(response);
  } catch (error) {
    log.error('Error getting recommendations', error as Error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get recommendations',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/fixes/plan
 * Generate complete remediation plan for all violations
 */
router.post('/plan', async (req: Request, res: Response) => {
  try {
    const { severity, wcagLevel } = req.body;

    // Get all violations with optional filters
    let violations = getAllViolations();

    if (severity) {
      violations = violations.filter(v => v.severity === severity);
    }

    if (wcagLevel) {
      violations = violations.filter(v => v.wcagLevel === wcagLevel);
    }

    if (violations.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'No violations found',
      };
      return res.status(404).json(response);
    }

    // Generate remediation plan
    const plan = await generateRemediationPlan(violations);

    const response: ApiResponse<typeof plan> = {
      success: true,
      data: plan,
      message: `Generated remediation plan for ${violations.length} violations`,
    };

    log.info(`Generated remediation plan: ${plan.fixes.length} fixes`);
    res.json(response);
  } catch (error) {
    log.error('Error generating remediation plan', error as Error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate remediation plan',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/fixes/stats
 * Get fix generation statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const violations = getAllViolations();

    const stats = {
      totalViolations: violations.length,
      autoFixable: violations.filter(v => {
        const autoFixableCriteria = ['1.1.1', '1.4.3', '2.1.1', '2.4.4', '3.3.2', '4.1.2'];
        return autoFixableCriteria.includes(v.wcagCriteria);
      }).length,
      bySeverity: {
        critical: violations.filter(v => v.severity === 'critical').length,
        high: violations.filter(v => v.severity === 'high').length,
        medium: violations.filter(v => v.severity === 'medium').length,
        low: violations.filter(v => v.severity === 'low').length,
      },
      byWCAGLevel: {
        A: violations.filter(v => v.wcagLevel === 'A').length,
        AA: violations.filter(v => v.wcagLevel === 'AA').length,
        AAA: violations.filter(v => v.wcagLevel === 'AAA').length,
      },
    };

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    };

    res.json(response);
  } catch (error) {
    log.error('Error getting fix stats', error as Error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get fix statistics',
    };
    res.status(500).json(response);
  }
});

export default router;
