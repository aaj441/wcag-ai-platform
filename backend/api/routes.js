// backend/api/routes.js - Production SaaS API Layer
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Import services (queue integration ready)
const ScanService = require('../services/scanner');

// Rate limiters
const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 scans per 15min per IP
  message: { error: 'Too many scan requests. Please try again later.' }
});

const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests' }
});

// Validation middleware
const validateScan = [
  body('url')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Valid HTTPS/HTTP URL required'),
  body('maxPages')
    .optional()
    .isInt({ min: 1, max: 5000 })
    .withMessage('maxPages must be between 1 and 5000'),
  body('maxDepth')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('maxDepth must be between 1 and 5'),
  body('standards')
    .optional()
    .isArray()
    .withMessage('standards must be an array')
];

// POST /api/scan - Start new accessibility scan
router.post('/scan', scanLimiter, validateScan, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { url, maxPages = 50, maxDepth = 3, standards = ['WCAG2.2'] } = req.body;

    // TODO: Queue integration (Phase 1B)
    // const job = await ScanQueue.add('scan', { url, maxPages, maxDepth, standards });
    // return res.json({
    //   success: true,
    //   scanId: job.id,
    //   status: 'queued',
    //   eta: '30-90s',
    //   statusUrl: `/api/scan/${job.id}`
    // });

    // Temporary: Direct execution (will be replaced with queue)
    console.log(`[API] Starting scan for ${url} (maxPages: ${maxPages}, maxDepth: ${maxDepth})`);
    
    const scanner = new ScanService({ url, maxPages, maxDepth, standards });
    const results = await scanner.scan();

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('[API] Scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Scan failed',
      message: error.message
    });
  }
});

// GET /api/scan/:scanId - Get scan status/results
router.get('/scan/:scanId', param('scanId').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { scanId } = req.params;

    // TODO: Queue + DB integration (Phase 1B + 1C)
    // const job = await ScanQueue.getJob(scanId);
    // if (!job) {
    //   return res.status(404).json({ 
    //     success: false,
    //     error: 'Scan not found' 
    //   });
    // }

    // const status = await job.getState();
    // const progress = job.progress();
    
    // return res.json({
    //   success: true,
    //   scanId: job.id,
    //   status: status,
    //   progress: progress,
    //   result: job.returnvalue,
    //   createdAt: job.timestamp,
    //   completedAt: job.finishedOn
    // });

    // Placeholder response
    res.status(501).json({
      success: false,
      error: 'Queue integration pending',
      message: 'This endpoint requires Redis + BullMQ (Phase 1B)'
    });

  } catch (error) {
    console.error('[API] Scan retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve scan',
      message: error.message
    });
  }
});

// GET /api/health - Service health check
router.get('/health', healthLimiter, (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      scanner: 'operational',
      queue: 'not_configured', // Will change in Phase 1B
      database: 'not_configured' // Will change in Phase 1C
    },
    uptime: `${Math.floor(uptime)}s`,
    memory: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
  });
});

// Error handler for this router
router.use((error, req, res, next) => {
  console.error('[API] Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = router;
