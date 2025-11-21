/**
 * Evidence Vault API Routes
 * Manages compliance evidence storage, metrics, and reporting
 */

import { Router, Request, Response } from 'express';
import {
  storeEvidence,
  getEvidenceRecords,
  getEvidenceById,
  deleteEvidence,
  getComplianceMetrics,
  storeCIScanResult,
  getCIScanResults,
  generateQuarterlyReport,
  getQuarterlyReports
} from '../data/evidenceVaultStore';
import { ApiResponse } from '../types';

const router = Router();

/**
 * POST /api/evidence/store
 * Store new evidence record
 */
router.post('/store', (req: Request, res: Response) => {
  try {
    const {
      scanId,
      url,
      complianceScore,
      violations,
      scanType = 'manual',
      scanTool = 'manual',
      clientId,
      projectId,
      retentionDays = 90,
      tags,
      metadata
    } = req.body;

    if (!scanId || !url || complianceScore === undefined || !violations) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: scanId, url, complianceScore, violations'
      } as ApiResponse);
    }

    // Validate complianceScore range
    if (typeof complianceScore !== 'number' || complianceScore < 0 || complianceScore > 100) {
      return res.status(400).json({
        success: false,
        error: 'complianceScore must be a number between 0 and 100'
      } as ApiResponse);
    }
    // Calculate violation counts
    const criticalCount = violations.filter((v: any) => v.severity === 'critical').length;
    const highCount = violations.filter((v: any) => v.severity === 'high').length;
    const mediumCount = violations.filter((v: any) => v.severity === 'medium').length;
    const lowCount = violations.filter((v: any) => v.severity === 'low').length;

    const evidence = storeEvidence({
      scanId,
      url,
      complianceScore,
      violationsCount: violations.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      scanType,
      scanTool,
      violations,
      clientId,
      projectId,
      retentionDays,
      tags,
      metadata
    });

    res.json({
      success: true,
      data: evidence,
      message: 'Evidence stored successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Error storing evidence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store evidence'
    } as ApiResponse);
  }
});

/**
 * GET /api/evidence
 * List all evidence records with optional filters
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      clientId,
      projectId,
      scanType,
      startDate,
      endDate,
      minComplianceScore,
      maxComplianceScore
    } = req.query;

    const filters: any = {};

    if (clientId) filters.clientId = clientId as string;
    if (projectId) filters.projectId = projectId as string;
    if (scanType) filters.scanType = scanType as string;
    if (startDate) {
      const parsedStartDate = new Date(startDate as string);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid startDate format'
        } as ApiResponse);
      }
      filters.startDate = parsedStartDate;
    }
    if (endDate) {
      const parsedEndDate = new Date(endDate as string);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid endDate format'
        } as ApiResponse);
      }
      filters.endDate = parsedEndDate;
    }
    if (minComplianceScore) filters.minComplianceScore = parseInt(minComplianceScore as string);
    if (maxComplianceScore) filters.maxComplianceScore = parseInt(maxComplianceScore as string);

    const records = getEvidenceRecords(filters);

    res.json({
      success: true,
      data: records,
      message: `Found ${records.length} evidence records`
    } as ApiResponse);
  } catch (error) {
    console.error('Error retrieving evidence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence'
    } as ApiResponse);
  }
});

/**
 * GET /api/evidence/:id
 * Get specific evidence record
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const evidence = getEvidenceById(id);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found'
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: evidence
    } as ApiResponse);
  } catch (error) {
    console.error('Error retrieving evidence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence'
    } as ApiResponse);
  }
});

/**
 * DELETE /api/evidence/:id
 * Delete evidence record
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = deleteEvidence(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Evidence record deleted successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete evidence'
    } as ApiResponse);
  }
});

/**
 * GET /api/evidence/metrics
 * Get compliance metrics for dashboard
 */
router.get('/metrics/dashboard', (req: Request, res: Response) => {
  try {
    const { period = 'monthly', clientId } = req.query;

    if (!['daily', 'weekly', 'monthly', 'quarterly'].includes(period as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be: daily, weekly, monthly, or quarterly'
      } as ApiResponse);
    }

    const metrics = getComplianceMetrics(
      period as 'daily' | 'weekly' | 'monthly' | 'quarterly',
      clientId as string | undefined
    );

    res.json({
      success: true,
      data: metrics
    } as ApiResponse);
  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate metrics'
    } as ApiResponse);
  }
});

/**
 * POST /api/evidence/ci-scan
 * Store CI/CD scan result
 */
router.post('/ci-scan', (req: Request, res: Response) => {
  try {
    const {
      prNumber,
      commitSha,
      branch,
      passed,
      complianceScore,
      violations,
      criticalBlockers,
      scanDurationMs,
      tool
    } = req.body;

    if (!commitSha || !branch || passed === undefined || !violations || !tool) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: commitSha, branch, passed, violations, tool'
      } as ApiResponse);
    }

    const result = storeCIScanResult({
      prNumber,
      commitSha,
      branch,
      passed,
      complianceScore,
      violations,
      criticalBlockers,
      scanDurationMs,
      tool
    });

    res.json({
      success: true,
      data: result,
      message: 'CI/CD scan result stored successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Error storing CI scan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store CI scan result'
    } as ApiResponse);
  }
});

/**
 * GET /api/evidence/ci-scans
 * Get CI/CD scan results
 */
router.get('/ci-scans/list', (req: Request, res: Response) => {
  try {
    const { branch, passed, limit } = req.query;

    const filters: any = {};
    if (branch) filters.branch = branch as string;
    if (passed !== undefined) filters.passed = passed === 'true';
    if (limit) filters.limit = parseInt(limit as string);

    const results = getCIScanResults(filters);

    res.json({
      success: true,
      data: results,
      message: `Found ${results.length} CI/CD scan results`
    } as ApiResponse);
  } catch (error) {
    console.error('Error retrieving CI scans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve CI scan results'
    } as ApiResponse);
  }
});

/**
 * POST /api/evidence/quarterly-report
 * Generate quarterly compliance report
 */
router.post('/quarterly-report', (req: Request, res: Response) => {
  try {
    const { quarter, clientId } = req.body;

    if (!quarter) {
      return res.status(400).json({
        success: false,
        error: 'Quarter is required (e.g., "Q1-2024")'
      } as ApiResponse);
    }

    const report = generateQuarterlyReport(quarter, clientId);

    res.json({
      success: true,
      data: report,
      message: 'Quarterly report generated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Error generating quarterly report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quarterly report'
    } as ApiResponse);
  }
});

/**
 * GET /api/evidence/quarterly-reports
 * Get all quarterly reports
 */
router.get('/quarterly-reports/list', (req: Request, res: Response) => {
  try {
    const { clientId } = req.query;
    const reports = getQuarterlyReports(clientId as string | undefined);

    res.json({
      success: true,
      data: reports,
      message: `Found ${reports.length} quarterly reports`
    } as ApiResponse);
  } catch (error) {
    console.error('Error retrieving quarterly reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve quarterly reports'
    } as ApiResponse);
  }
});

export default router;
