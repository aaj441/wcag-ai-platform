/**
 * Violations Routes - WCAG Violation Management
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiResponse } from '../types';

const router = Router();

/**
 * GET /api/violations
 * Get all violations with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { severity, scanId } = req.query;
    
    const where: any = {};

    // Filter by severity
    if (severity) {
      where.severity = severity;
    }

    // Filter by scan
    if (scanId && typeof scanId === 'string') {
      where.scanId = scanId;
    }

    const violations = await prisma.violation.findMany({
      where,
      include: {
        scan: {
          select: {
            websiteUrl: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const response: ApiResponse<typeof violations> = {
      success: true,
      data: violations,
      message: `Retrieved ${violations.length} violation(s)`,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching violations:', error);
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
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const violations = await prisma.violation.findMany();

    const stats = {
      total: violations.length,
      bySeverity: {
        critical: violations.filter(v => v.severity === 'critical').length,
        high: violations.filter(v => v.severity === 'high').length,
        medium: violations.filter(v => v.severity === 'medium').length,
        low: violations.filter(v => v.severity === 'low').length,
      },
    };

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching violation stats:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve statistics',
    };
    res.status(500).json(response);
  }
});

export default router;
