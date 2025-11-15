/**
 * Site Transformation Routes
 * 
 * API endpoints for AI-powered site transformation and remediation
 */

import express, { Request, Response } from 'express';
import { siteTransformationService } from '../services/SiteTransformationService';
import { log } from '../utils/logger';

const router = express.Router();

/**
 * POST /api/transform
 * Start a new site transformation
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { url, wcagLevel = 'AA', preserveDesign = true, generateReport = true } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
      });
    }

    // Validate WCAG level
    if (!['A', 'AA', 'AAA'].includes(wcagLevel)) {
      return res.status(400).json({
        success: false,
        error: 'WCAG level must be A, AA, or AAA',
      });
    }

    log.info('Transformation request received', { url, wcagLevel });

    const transformation = await siteTransformationService.transformSite({
      url,
      wcagLevel,
      preserveDesign,
      generateReport,
    });

    res.json({
      success: true,
      data: transformation,
    });
  } catch (error) {
    log.error('Transformation request failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Transformation failed',
    });
  }
});

/**
 * POST /api/transform/:id/deploy/github
 * Create GitHub PR with transformation fixes
 */
router.post('/:id/deploy/github', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { repoUrl, branchName } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Repository URL is required',
      });
    }

    // In production, retrieve transformation from database
    const mockTransformation = {
      id,
      url: 'https://example.com',
      status: 'complete' as const,
      originalSite: null,
      transformedSite: { html: '', css: '' },
      violations: [],
      complianceScore: { before: 60, after: 95, improvement: 35 },
      createdAt: new Date(),
    };

    const result = await siteTransformationService.createGitHubPR(
      mockTransformation,
      repoUrl,
      branchName
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('GitHub PR creation failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create PR',
    });
  }
});

/**
 * POST /api/transform/:id/deploy/package
 * Generate deployment package
 */
router.post('/:id/deploy/package', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // In production, retrieve transformation from database
    const mockTransformation = {
      id,
      url: 'https://example.com',
      status: 'complete' as const,
      originalSite: null,
      transformedSite: { html: '', css: '' },
      violations: [
        { wcagCriteria: '1.1.1', severity: 'critical', description: 'Missing alt', fixed: true },
        { wcagCriteria: '1.4.3', severity: 'medium', description: 'Low contrast', fixed: true },
      ],
      complianceScore: { before: 60, after: 95, improvement: 35 },
      createdAt: new Date(),
    };

    const packageData = await siteTransformationService.generateDeploymentPackage(
      mockTransformation
    );

    res.json({
      success: true,
      data: packageData,
    });
  } catch (error) {
    log.error('Package generation failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate package',
    });
  }
});

/**
 * GET /api/transform/:id/status
 * Get transformation status
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // In production, retrieve from database
    const mockStatus = {
      id,
      status: 'complete',
      progress: 100,
      currentStep: 'Verification complete',
      estimatedTimeRemaining: 0,
      complianceScore: {
        before: 60,
        after: 95,
        improvement: 35,
      },
    };

    res.json({
      success: true,
      data: mockStatus,
    });
  } catch (error) {
    log.error('Status check failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check status',
    });
  }
});

/**
 * GET /api/transform/:id
 * Get transformation details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // In production, retrieve from database
    const mockTransformation = {
      id,
      url: 'https://example.com',
      status: 'complete',
      originalSite: {
        url: 'https://example.com',
        html: '<html>...</html>',
        css: 'body { ... }',
        metadata: {
          title: 'Example Site',
          description: 'An example',
          viewport: 'width=device-width',
        },
        assets: {
          images: ['/logo.png'],
          fonts: [],
          scripts: [],
        },
      },
      transformedSite: {
        html: '<html>...transformed...</html>',
        css: 'body { ... } /* accessibility enhancements */',
      },
      violations: [
        {
          wcagCriteria: '1.1.1',
          severity: 'critical',
          description: 'Image missing alt text',
          fixed: true,
        },
        {
          wcagCriteria: '1.4.3',
          severity: 'medium',
          description: 'Insufficient color contrast',
          fixed: true,
        },
      ],
      complianceScore: {
        before: 60,
        after: 95,
        improvement: 35,
      },
      screenshotUrls: {
        before: 'https://storage.example.com/before.png',
        after: 'https://storage.example.com/after.png',
      },
      createdAt: new Date(),
      completedAt: new Date(),
    };

    res.json({
      success: true,
      data: mockTransformation,
    });
  } catch (error) {
    log.error('Transformation retrieval failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve transformation',
    });
  }
});

export default router;
