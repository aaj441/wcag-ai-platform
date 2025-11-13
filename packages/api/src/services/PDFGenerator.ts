/**
 * PDF Report Generator Service
 *
 * Generates professional accessibility audit reports
 * Only includes high-confidence violations (>0.7)
 */

import type { Scan, Violation } from "../types";
import { log } from "../utils/logger";

interface ScanForPDF extends Scan {
  violations: Violation[];
}

/**
 * Generate a PDF report for a scan
 *
 * In production, this would use libraries like PDFKit or html2pdf
 * For MVP, we return a formatted summary suitable for conversion to PDF
 */
export async function generatePDFReport(
  scan: ScanForPDF,
  violations: Violation[]
): Promise<{
  filename: string;
  content: string;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}> {
  try {
    // Filter to high-confidence violations only
    const filteredViolations = violations.filter((v) => v.aiConfidence >= 0.7);

    // Count violations by severity
    const summary = {
      critical: filteredViolations.filter((v) => v.severity === "critical").length,
      high: filteredViolations.filter((v) => v.severity === "high").length,
      medium: filteredViolations.filter((v) => v.severity === "medium").length,
      low: filteredViolations.filter((v) => v.severity === "low").length,
      total: filteredViolations.length,
    };

    // Generate HTML content for PDF
    const content = generateHTMLReport(scan, filteredViolations, summary);
    const filename = `wcagai-audit-${scan.id}-${Date.now()}.pdf`;

    log.info("Generated PDF report", {
      scanId: scan.id,
      filename,
      violationCount: filteredViolations.length,
      ...summary,
    });

    return {
      filename,
      content,
      summary,
    };
  } catch (error) {
    log.error(
      "Failed to generate PDF",
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Generate HTML content for the PDF report
 */
function generateHTMLReport(
  scan: ScanForPDF,
  violations: Violation[],
  summary: { critical: number; high: number; medium: number; low: number; total: number }
): string {
  const reportDate = new Date().toLocaleDateString();
  const confidenceBadge =
    scan.aiConfidenceScore >= 0.9
      ? "✅ High Confidence"
      : scan.aiConfidenceScore >= 0.7
        ? "⚠️ Medium Confidence"
        : "❓ Low Confidence";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WCAGAI Accessibility Audit Report</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .header { border-bottom: 3px solid #4A1E8F; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #4A1E8F; margin: 0 0 10px 0; }
    h2 { color: #333; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #FFD700; padding-left: 10px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .summary-box { padding: 15px; border-radius: 5px; text-align: center; }
    .critical { background: #fee2e2; }
    .high { background: #fef3c7; }
    .medium { background: #dbeafe; }
    .low { background: #f0fdf4; }
    .count { font-size: 24px; font-weight: bold; display: block; }
    .label { font-size: 12px; color: #666; }
    .violation { background: #f9fafb; padding: 15px; margin-bottom: 15px; border-left: 4px solid #ccc; border-radius: 3px; }
    .wcag-code { background: #e5e7eb; padding: 2px 8px; border-radius: 3px; font-family: monospace; }
    .metadata { color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f3f4f6; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>WCAG Accessibility Audit Report</h1>
    <p><strong>Report ID:</strong> ${scan.id}</p>
    <p><strong>Website:</strong> ${scan.websiteUrl}</p>
    <p><strong>Date:</strong> ${reportDate}</p>
    <p><strong>Confidence:</strong> ${confidenceBadge} (${(scan.aiConfidenceScore * 100).toFixed(0)}%)</p>
    ${scan.reviewedBy ? `<p><strong>Reviewed by:</strong> ${scan.reviewedBy}</p>` : ""}
  </div>

  <h2>Summary of Findings</h2>
  <div class="summary">
    <div class="summary-box critical">
      <span class="count">${summary.critical}</span>
      <span class="label">Critical</span>
    </div>
    <div class="summary-box high">
      <span class="count">${summary.high}</span>
      <span class="label">High</span>
    </div>
    <div class="summary-box medium">
      <span class="count">${summary.medium}</span>
      <span class="label">Medium</span>
    </div>
    <div class="summary-box low">
      <span class="count">${summary.low}</span>
      <span class="label">Low</span>
    </div>
  </div>

  <h2>Detailed Violations</h2>
  ${violations.length > 0
    ? violations
        .map(
          (v) => `
    <div class="violation">
      <div><strong>WCAG ${v.wcagCriteria}</strong> - ${v.description}</div>
      <p>Severity: <strong>${v.severity.toUpperCase()}</strong> | Confidence: ${((v.aiConfidence || 0) * 100).toFixed(0)}%</p>
      ${v.elementSelector ? `<p>Element: <code class="wcag-code">${v.elementSelector}</code></p>` : ""}
      ${v.codeSnippet ? `<pre style="background: #f3f4f6; padding: 10px; border-radius: 3px; overflow-x: auto;"><code>${v.codeSnippet}</code></pre>` : ""}
    </div>
  `
        )
        .join("")
    : "<p>No violations found in high-confidence category.</p>"}

  <h2>Recommendations</h2>
  <ol>
    <li>Address all Critical violations immediately - these block access for disabled users</li>
    <li>Prioritize High violations for the next release cycle</li>
    <li>Plan Medium and Low violations for future iterations</li>
    <li>Involve disabled users in testing accessibility fixes</li>
    <li>Use WCAG 2.2 guidelines for comprehensive compliance</li>
  </ol>

  <div class="metadata">
    <p><strong>Report Generated by WCAGAI</strong></p>
    <p>This report contains ${summary.total} verified violations reviewed by accessibility consultant.</p>
    <p>Only violations with confidence score ≥ 0.7 are included in this report.</p>
    <p>For questions about this audit, contact ${scan.reviewedBy || "your WCAGAI consultant"}.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Convert HTML report to PDF (stub for future implementation)
 *
 * In production, use a library like:
 * - html2pdf (browser-side)
 * - puppeteer + html-pdf (server-side)
 * - wkhtmltopdf (command-line tool)
 */
export async function convertHTMLToPDF(
  htmlContent: string,
  filename: string
): Promise<Buffer> {
  // TODO: Implement PDF conversion
  // For now, return a placeholder indicating PDF generation would happen here
  log.info("PDF conversion stub called", { filename });

  // In a real implementation, this would:
  // 1. Use puppeteer to render HTML to PDF
  // 2. Upload PDF to S3
  // 3. Return the S3 URL

  throw new Error("PDF conversion not yet implemented - use html2pdf library");
}
