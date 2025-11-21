/**
 * Pitch Package API - Your "Overnight Expert" Endpoints
 *
 * Generate before/after screenshots with violations highlighted
 * Perfect for sales pitches and closing deals
 *
 * SETUP:
 * 1. Get free Browserless token: https://browserless.io
 * 2. Set env: BROWSERLESS_TOKEN=your_token
 * 3. Test: curl -X POST .../api/pitch/quick-demo?url=https://example.com
 */

import { Router, Request, Response } from 'express';
import { screenshotService } from '../services/ScreenshotService';
import { SiteTransformationService } from '../services/SiteTransformationService';
import { log } from '../utils/logger';

const router = Router();
const transformationService = new SiteTransformationService();

/**
 * GET /api/pitch/quick-demo
 *
 * ONE-CLICK MAGIC: Scan + Screenshot + Composite
 * Perfect for tonight's demo
 *
 * Query params:
 * - url: Website to scan
 * - format: "before" | "after" | "composite" (default: composite)
 *
 * Example:
 * /api/pitch/quick-demo?url=https://example.com&format=composite
 */
router.get('/quick-demo', async (req: Request, res: Response) => {
  try {
    const { url, format = 'composite' } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Missing required parameter: url',
        example: '/api/pitch/quick-demo?url=https://example.com',
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: 'Invalid URL format',
      });
    }

    log.info('🎯 Quick demo request', { url, format });

    // Step 1: Scan the site for violations (using existing service)
    const transformation = await transformationService.transformSite({
      url,
      wcagLevel: 'AA',
      preserveDesign: true,
    });

    if (transformation.violations.length === 0) {
      return res.status(200).json({
        message: 'No violations found - site is already compliant!',
        complianceScore: transformation.complianceScore,
      });
    }

    // Convert violations to screenshot format
    const violations = transformation.violations.slice(0, 5).map(v => ({
      selector: v.elementSelector || 'body',
      wcagCriteria: v.wcagCriteria,
      severity: v.severity as 'critical' | 'high' | 'medium' | 'low',
      description: v.description,
      fix: {
        type: this.inferFixType(v.wcagCriteria),
        suggestedFix: this.generateSuggestedFix(v.wcagCriteria, v.description),
      },
    }));

    // Step 2: Generate screenshots
    const pitchPackage = await screenshotService.generatePitchPackage({
      url,
      violations,
      fullPage: false, // Faster for demos
    });

    // Step 3: Return the requested format
    let imageBuffer: Buffer;
    let formatType: string;

    switch (format) {
      case 'before':
        imageBuffer = pitchPackage.before;
        formatType = 'BEFORE (Violations)';
        break;
      case 'after':
        imageBuffer = pitchPackage.after;
        formatType = 'AFTER (Fixed)';
        break;
      case 'composite':
      default:
        imageBuffer = pitchPackage.composite;
        formatType = 'BEFORE/AFTER Composite';
        break;
    }

    log.info('✅ Quick demo generated', {
      url,
      format: formatType,
      violationCount: violations.length,
    });

    // Return image
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="${format}-${Date.now()}.png"`);
    res.send(imageBuffer);
  } catch (error) {
    log.error('Quick demo failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to generate demo',
      message: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Make sure BROWSERLESS_TOKEN is set in your .env file',
    });
  }
});

/**
 * POST /api/pitch/custom
 *
 * Generate pitch package with custom violations
 * Use this when you already have scan results
 *
 * Body:
 * {
 *   "url": "https://example.com",
 *   "violations": [
 *     {
 *       "selector": "img.logo",
 *       "wcagCriteria": "1.1.1",
 *       "severity": "critical",
 *       "description": "Image missing alt text",
 *       "fix": {
 *         "type": "alt-text",
 *         "suggestedFix": "Company logo"
 *       }
 *     }
 *   ],
 *   "format": "composite"
 * }
 */
router.post('/custom', async (req: Request, res: Response) => {
  try {
    const { url, violations, format = 'composite', fullPage = false } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Missing required field: url',
      });
    }

    if (!violations || !Array.isArray(violations)) {
      return res.status(400).json({
        error: 'Missing required field: violations (array)',
      });
    }

    log.info('Custom pitch package request', {
      url,
      violationCount: violations.length,
      format,
    });

    const pitchPackage = await screenshotService.generatePitchPackage({
      url,
      violations,
      fullPage,
    });

    let imageBuffer: Buffer;

    switch (format) {
      case 'before':
        imageBuffer = pitchPackage.before;
        break;
      case 'after':
        imageBuffer = pitchPackage.after;
        break;
      case 'composite':
      default:
        imageBuffer = pitchPackage.composite;
        break;
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="pitch-${format}-${Date.now()}.png"`);
    res.send(imageBuffer);
  } catch (error) {
    log.error('Custom pitch package failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to generate pitch package',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/pitch/test
 *
 * Test endpoint - verifies Browserless.io is working
 */
router.get('/test', async (_req: Request, res: Response) => {
  try {
    const testUrl = 'https://example.com';

    // Try to capture a simple screenshot
    const result = await screenshotService.captureViolations({
      url: testUrl,
      violations: [{
        selector: 'h1',
        wcagCriteria: 'TEST',
        severity: 'low',
        description: 'Test violation',
      }],
    });

    res.json({
      success: true,
      message: 'Browserless.io connection working!',
      screenshotSize: result.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Browserless.io connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Set BROWSERLESS_TOKEN in your .env file. Get free token at browserless.io',
    });
  }
});

/**
 * Helper: Infer fix type from WCAG criteria
 */
function inferFixType(wcagCriteria: string): 'alt-text' | 'color-contrast' | 'label' | 'aria' | 'heading' | 'focus-indicator' {
  const criteriaMap: Record<string, any> = {
    '1.1.1': 'alt-text',
    '1.3.1': 'label',
    '1.4.3': 'color-contrast',
    '1.4.11': 'color-contrast',
    '2.1.1': 'focus-indicator',
    '2.4.6': 'heading',
    '3.3.2': 'label',
    '4.1.2': 'aria',
  };

  return criteriaMap[wcagCriteria] || 'aria';
}

/**
 * Helper: Generate suggested fix based on WCAG criteria
 */
function generateSuggestedFix(wcagCriteria: string, description: string): string {
  const fixes: Record<string, string> = {
    '1.1.1': 'Descriptive alt text',
    '1.3.1': 'Field label',
    '1.4.3': '#000000',
    '1.4.11': '#000000',
    '2.1.1': 'outline: 3px solid #4A90E2',
    '2.4.6': 'Section heading',
    '3.3.2': 'Input label',
    '4.1.2': 'role="button" aria-label="Action"',
  };

  return fixes[wcagCriteria] || description;
}

export default router;
