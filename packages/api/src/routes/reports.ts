/**
 * Reports API Routes
 * Handles PDF and markdown report generation
 */

import { Router, Request, Response } from 'express';
import {
  generateHTMLReport,
  generateMarkdownReport,
  ClientBrand,
  ScanReport
} from '../services/reportGenerator';
import { getAllDrafts } from '../data/fintechStore';

const router = Router();

/**
 * POST /api/reports/generate
 * Generate a report for a scan
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { scanId, format = 'html', clientBrand } = req.body;

    if (!scanId) {
      return res.status(400).json({
        success: false,
        error: 'scanId is required'
      });
    }

    // Mock scan data (in production, fetch from database)
    const mockScan: ScanReport = {
      id: scanId,
      url: 'https://example.com',
      complianceScore: 75,
      violations: [], // Would be populated from actual data
      createdAt: new Date(),
      workerId: 'worker-123',
      signature: 'abc123def456',
      aiRemediationPlan: 'Fix critical issues first, then address high-priority items.'
    };

    const brand: ClientBrand = clientBrand || {
      companyName: 'Client Company',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b'
    };

    let report: string;
    let contentType: string;

    if (format === 'markdown') {
      report = generateMarkdownReport(mockScan, brand);
      contentType = 'text/markdown';
    } else {
      report = generateHTMLReport(mockScan, brand);
      contentType = 'text/html';
    }

    res.setHeader('Content-Type', contentType);
    res.send(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

/**
 * POST /api/reports/draft/:draftId
 * Generate a report from an email draft
 */
router.post('/draft/:draftId', async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const { format = 'html', clientBrand } = req.body;

    // Fetch draft from store
    const drafts = getAllDrafts();
    const draft = drafts.find(d => d.id === draftId);

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }

    // Convert draft violations to scan report
    const scanReport: ScanReport = {
      id: draftId,
      url: draft.violations[0]?.url || 'https://example.com',
      complianceScore: calculateComplianceScore(draft.violations),
      violations: draft.violations,
      createdAt: draft.createdAt,
      aiRemediationPlan: draft.notes || 'Review and fix all violations in priority order.'
    };

    const brand: ClientBrand = clientBrand || {
      companyName: draft.company || 'Client Company',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b'
    };

    let report: string;
    let contentType: string;

    if (format === 'markdown') {
      report = generateMarkdownReport(scanReport, brand);
      contentType = 'text/markdown';
    } else {
      report = generateHTMLReport(scanReport, brand);
      contentType = 'text/html';
    }

    res.setHeader('Content-Type', contentType);
    res.send(report);
  } catch (error) {
    console.error('Error generating report from draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report from draft'
    });
  }
});

/**
 * Calculate compliance score based on violations
 */
function calculateComplianceScore(violations: any[]): number {
  if (violations.length === 0) return 100;

  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const highCount = violations.filter(v => v.severity === 'high').length;
  const mediumCount = violations.filter(v => v.severity === 'medium').length;
  const lowCount = violations.filter(v => v.severity === 'low').length;

  // Weight violations by severity
  const penalty = (criticalCount * 15) + (highCount * 8) + (mediumCount * 4) + (lowCount * 2);
  const score = Math.max(0, 100 - penalty);

  return Math.round(score);
}

export default router;
