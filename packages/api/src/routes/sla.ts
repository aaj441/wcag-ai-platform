/**
 * SLA Monitoring API Routes
 */

import { Router, Request, Response } from 'express';
import {
  checkSLACompliance,
  getSLAStatistics,
  getCustomerScans,
  registerScan,
  completeScan,
  notifySLABreach,
  applySLACredit
} from '../services/slaMonitor';

const router = Router();

/**
 * GET /api/sla/report
 * Get SLA compliance report for a time window
 */
router.get('/report', async (req: Request, res: Response) => {
  try {
    const hoursAgo = parseInt(req.query.hours as string) || 1;
    const report = checkSLACompliance(hoursAgo);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating SLA report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate SLA report'
    });
  }
});

/**
 * GET /api/sla/statistics
 * Get overall SLA statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const stats = getSLAStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching SLA statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SLA statistics'
    });
  }
});

/**
 * GET /api/sla/customer/:customerId
 * Get scans for a specific customer
 */
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const scans = getCustomerScans(customerId);

    res.json({
      success: true,
      data: scans
    });
  } catch (error) {
    console.error('Error fetching customer scans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer scans'
    });
  }
});

/**
 * POST /api/sla/scan/register
 * Register a new scan for SLA tracking
 */
router.post('/scan/register', async (req: Request, res: Response) => {
  try {
    const { id, url, tier, customerId } = req.body;

    if (!id || !url || !tier || !customerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, url, tier, customerId'
      });
    }

    const scan = registerScan(id, url, tier, customerId);

    res.status(201).json({
      success: true,
      data: scan
    });
  } catch (error) {
    console.error('Error registering scan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register scan'
    });
  }
});

/**
 * POST /api/sla/scan/:scanId/complete
 * Mark a scan as completed
 */
router.post('/scan/:scanId/complete', async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;
    const scan = completeScan(scanId);

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found'
      });
    }

    res.json({
      success: true,
      data: scan
    });
  } catch (error) {
    console.error('Error completing scan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete scan'
    });
  }
});

export default router;
