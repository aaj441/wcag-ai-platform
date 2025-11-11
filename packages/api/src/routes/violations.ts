/**
 * Violations Routes - WCAG Violation Management
 */

import { Router, Request, Response } from 'express';
import { getAllViolations } from '../data/store';
import { ApiResponse, Violation } from '../types';

const router = Router();

/**
 * GET /api/violations
 * Get all violations with optional filtering
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { severity, wcagLevel } = req.query;
    let violations = getAllViolations();

    // Filter by severity
    if (severity) {
      violations = violations.filter(v => v.severity === severity);
    }

    // Filter by WCAG level
    if (wcagLevel) {
      violations = violations.filter(v => v.wcagLevel === wcagLevel);
    }

    const response: ApiResponse<Violation[]> = {
      success: true,
      data: violations,
      message: `Retrieved ${violations.length} violation(s)`,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve violations',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/violations/stats
 * Get violation statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const violations = getAllViolations();

    const stats = {
      total: violations.length,
      bySeverity: {
        critical: violations.filter(v => v.severity === 'critical').length,
        high: violations.filter(v => v.severity === 'high').length,
        medium: violations.filter(v => v.severity === 'medium').length,
        low: violations.filter(v => v.severity === 'low').length,
      },
      byLevel: {
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
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve statistics',
    };
    res.status(500).json(response);
  }
});

export default router;
