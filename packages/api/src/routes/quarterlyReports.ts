/**
 * Quarterly Compliance Reports API Routes
 * Handles quarterly compliance and evidence report generation
 */

import { Router, Request, Response } from 'express';
import { 
  getAllQuarterlyReports, 
  getQuarterlyReportById,
  getQuarterlyReportsByClient,
  createQuarterlyReport 
} from '../data/fintechStore';
import { QuarterlyReport } from '../types';

const router = Router();

/**
 * GET /api/quarterly-reports
 * Get all quarterly reports
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.query;
    
    let reports: QuarterlyReport[];
    
    if (clientId && typeof clientId === 'string') {
      reports = getQuarterlyReportsByClient(clientId);
    } else {
      reports = getAllQuarterlyReports();
    }
    
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching quarterly reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quarterly reports'
    });
  }
});

/**
 * GET /api/quarterly-reports/:id
 * Get a specific quarterly report by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const report = getQuarterlyReportById(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Quarterly report not found'
      });
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching quarterly report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quarterly report'
    });
  }
});

/**
 * POST /api/quarterly-reports
 * Create a new quarterly report
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const reportData = req.body;
    
    // Validate required fields
    if (!reportData.quarter || !reportData.year) {
      return res.status(400).json({
        success: false,
        error: 'quarter and year are required'
      });
    }
    
    const newReport = createQuarterlyReport(reportData);
    
    res.status(201).json({
      success: true,
      data: newReport
    });
  } catch (error) {
    console.error('Error creating quarterly report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create quarterly report'
    });
  }
});

/**
 * GET /api/quarterly-reports/:id/export
 * Export quarterly report as markdown template
 */
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'markdown' } = req.query;
    
    const report = getQuarterlyReportById(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Quarterly report not found'
      });
    }
    
    if (format === 'markdown') {
      const markdown = generateMarkdownReport(report);
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${report.quarter.replace(/\s+/g, '-')}-compliance-report.md"`);
      res.send(markdown);
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported format. Only "markdown" is currently supported.'
      });
    }
  } catch (error) {
    console.error('Error exporting quarterly report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export quarterly report'
    });
  }
});

/**
 * Generate markdown report from quarterly data
 */
function generateMarkdownReport(report: QuarterlyReport): string {
  return `# ${report.quarter} Quarterly Compliance & Evidence Report
${report.clientName ? `**Client:** ${report.clientName}` : ''}
**Report Period:** ${report.startDate.toLocaleDateString()} - ${report.endDate.toLocaleDateString()}

---

## Executive Summary
- **Overall Compliance Score:** ${report.overallComplianceScore}%
- **Critical Issues Resolved:** ${report.criticalIssuesResolved}
- **Automated Scans Performed:** ${report.automatedScansPerformed}
- **Manual Reviews Completed:** ${report.manualReviewsCompleted}
- **Legal Risk Snapshot:** ${report.legalRiskSnapshot}

---

## Performance Metrics (Quarter-over-Quarter)

| Metric | Last Quarter | This Quarter | Change |
| ------ | :----------: | :----------: | :-----: |
${report.metrics.map(m => `| ${m.metric} | ${m.lastQuarter} | ${m.thisQuarter} | ${m.change} |`).join('\n')}

---

## Evidence Vault Summary
- **Dated Scans Logged:** ${report.evidenceVault.datedScans}
- **Remediation Tickets Logged:** ${report.evidenceVault.remediationTickets}
- **Manual Attestations & Policy Updates:**
${report.evidenceVault.manualAttestations.map(a => `  - ${a}`).join('\n')}

---

## Key Improvements & Next Steps

### Key Wins This Quarter
${report.keyImprovements.map(i => `- ${i}`).join('\n')}

### Next Focus: Roadmap for Next Quarter
${report.nextSteps.map(s => `- ${s}`).join('\n')}

---

*Report Generated: ${new Date().toLocaleDateString()}*
*This quarterly dashboard serves as proof of diligence and continuous improvement in accessibility compliance.*
`;
}

export default router;
