import express, { Request, Response } from 'express';
import { ScreenshotService } from '../services/screenshot/ScreenshotService';
import { log } from '../utils/logger';

const router = express.Router();
const screenshotService = new ScreenshotService();

// Initialize browser pool on startup
screenshotService.initialize().catch((err) => {
  log.error('Failed to initialize screenshot service', err);
});

/**
 * POST /api/screenshot
 * Capture before/after screenshots of a website
 * Body: { url: string }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required',
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

    log.info('Screenshot request', { url });

    const result = await screenshotService.captureBeforeAndAfter(url);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    log.error('Screenshot generation failed', error as Error);
    res.status(500).json({
      error: 'Failed to generate screenshots',
      message: (error as Error).message,
    });
  }
});

export default router;
