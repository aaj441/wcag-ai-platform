/**
 * Demo Generation API Routes
 *
 * Endpoints for generating before/after compliance demos for sales pitches
 */

import { Router, Request, Response } from 'express';
import { SiteTransformationService } from '../services/SiteTransformationService';
import { demoGeneratorService } from '../services/DemoGeneratorService';
import { log } from '../utils/logger';

const router = Router();
const transformationService = new SiteTransformationService();

/**
 * POST /api/demo/generate
 * Generate a before/after compliance demo from a URL
 *
 * Request body:
 * {
 *   "url": "https://example.com",
 *   "wcagLevel": "AA",
 *   "customBranding": {
 *     "primaryColor": "#4CAF50",
 *     "companyName": "Your Company"
 *   }
 * }
 *
 * Response:
 * - 200: HTML demo as text/html
 * - 400: Invalid request
 * - 500: Server error
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { url, wcagLevel = 'AA', customBranding } = req.body;

    // Validate input
    if (!url) {
      return res.status(400).json({
        error: 'Missing required field: url',
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid URL format',
      });
    }

    // Validate WCAG level
    if (!['A', 'AA', 'AAA'].includes(wcagLevel)) {
      return res.status(400).json({
        error: 'Invalid WCAG level. Must be A, AA, or AAA',
      });
    }

    log.info('Generating demo for URL', { url, wcagLevel });

    // Step 1: Transform the site (scan + fix)
    const transformation = await transformationService.transformSite({
      url,
      wcagLevel: wcagLevel as 'A' | 'AA' | 'AAA',
      preserveDesign: true,
      generateReport: true,
    });

    if (transformation.status === 'failed') {
      return res.status(500).json({
        error: 'Failed to scan and transform site',
        transformationId: transformation.id,
      });
    }

    // Step 2: Generate the demo HTML
    const demoHtml = await demoGeneratorService.generateDemo(transformation, {
      customBranding,
    });

    // Step 3: Return the HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(demoHtml);

    log.info('Demo generated successfully', {
      transformationId: transformation.id,
      violationCount: transformation.violations.length,
    });
  } catch (error) {
    log.error(
      'Error generating demo',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/demo/generate-json
 * Generate a demo but return JSON with transformation data instead of HTML
 *
 * Useful for custom frontends that want to build their own demo UI
 */
router.post('/generate-json', async (req: Request, res: Response) => {
  try {
    const { url, wcagLevel = 'AA' } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Missing required field: url',
      });
    }

    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid URL format',
      });
    }

    if (!['A', 'AA', 'AAA'].includes(wcagLevel)) {
      return res.status(400).json({
        error: 'Invalid WCAG level. Must be A, AA, or AAA',
      });
    }

    log.info('Generating demo data for URL', { url, wcagLevel });

    const transformation = await transformationService.transformSite({
      url,
      wcagLevel: wcagLevel as 'A' | 'AA' | 'AAA',
      preserveDesign: true,
      generateReport: true,
    });

    res.json({
      success: transformation.status === 'complete',
      transformation: {
        id: transformation.id,
        url: transformation.url,
        status: transformation.status,
        violations: transformation.violations,
        complianceScore: transformation.complianceScore,
        createdAt: transformation.createdAt,
        completedAt: transformation.completedAt,
      },
    });
  } catch (error) {
    log.error(
      'Error generating demo data',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/demo/example
 * Returns the static example demo (the one we built manually)
 */
router.get('/example', (_req: Request, res: Response) => {
  res.sendFile('compliance-demo.html', {
    root: '../webapp',
  });
});

export default router;
