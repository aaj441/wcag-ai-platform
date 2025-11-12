/**
 * Alerts Routes - RESTful API Endpoints for Alerting System
 */

import { Router, Request, Response } from 'express';
import {
  getAlertSummary,
  getUnacknowledgedAlerts,
  acknowledgeAlert,
  getAlertsByPriority,
  getAlertsByType,
  getAlertStatistics,
  sendPendingNotifications,
} from '../services/alertService';
import { ApiResponse } from '../types';

const router = Router();

/**
 * GET /api/alerts
 * Get all unacknowledged alerts
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const alerts = getUnacknowledgedAlerts();

    const response: ApiResponse<typeof alerts> = {
      success: true,
      data: alerts,
      message: `Retrieved ${alerts.length} unacknowledged alert(s)`,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve alerts',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/alerts/summary
 * Get alert summary with counts by priority
 */
router.get('/summary', (req: Request, res: Response) => {
  try {
    const summary = getAlertSummary();

    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve alert summary',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/alerts/statistics
 * Get alert statistics
 */
router.get('/statistics', (req: Request, res: Response) => {
  try {
    const stats = getAlertStatistics();

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve alert statistics',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/alerts/priority/:priority
 * Get alerts by priority level
 */
router.get('/priority/:priority', (req: Request, res: Response) => {
  try {
    const priority = req.params.priority as 'critical' | 'high' | 'medium' | 'low';

    if (!['critical', 'high', 'medium', 'low'].includes(priority)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid priority. Must be: critical, high, medium, or low',
      };
      return res.status(400).json(response);
    }

    const alerts = getAlertsByPriority(priority);

    const response: ApiResponse<typeof alerts> = {
      success: true,
      data: alerts,
      message: `Retrieved ${alerts.length} ${priority} priority alert(s)`,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve alerts',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/alerts/type/:type
 * Get alerts by type
 */
router.get('/type/:type', (req: Request, res: Response) => {
  try {
    const type = req.params.type as 'lawsuit_risk' | 'critical_severity' | 'immediate_action' | 'compliance_issue';

    if (!['lawsuit_risk', 'critical_severity', 'immediate_action', 'compliance_issue'].includes(type)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid type. Must be: lawsuit_risk, critical_severity, immediate_action, or compliance_issue',
      };
      return res.status(400).json(response);
    }

    const alerts = getAlertsByType(type);

    const response: ApiResponse<typeof alerts> = {
      success: true,
      data: alerts,
      message: `Retrieved ${alerts.length} ${type} alert(s)`,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve alerts',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/:id/acknowledge', (req: Request, res: Response) => {
  try {
    const { acknowledgedBy } = req.body;

    if (!acknowledgedBy) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required field: acknowledgedBy',
      };
      return res.status(400).json(response);
    }

    const alert = acknowledgeAlert(req.params.id, acknowledgedBy);

    if (!alert) {
      const response: ApiResponse = {
        success: false,
        error: 'Alert not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<typeof alert> = {
      success: true,
      data: alert,
      message: 'Alert acknowledged successfully',
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to acknowledge alert',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/alerts/notify
 * Send pending notifications
 */
router.post('/notify', async (req: Request, res: Response) => {
  try {
    const result = await sendPendingNotifications();

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: `Sent ${result.sent} notification(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to send notifications',
    };
    res.status(500).json(response);
  }
});

export default router;
