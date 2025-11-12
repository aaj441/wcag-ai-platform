/**
 * White-Label PDF Report Generator
 * Generates professional WCAG compliance reports with client branding
 */

import { LegacyViolation } from '../types';

export interface ClientBrand {
  companyName: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface ScanReport {
  id: string;
  url: string;
  complianceScore: number;
  violations: LegacyViolation[];
  createdAt: Date;
  workerId?: string;
  signature?: string;
  aiRemediationPlan?: string;
}

/**
 * Generate HTML report (can be converted to PDF with tools like puppeteer)
 */
export function generateHTMLReport(
  scan: ScanReport,
  clientBrand: ClientBrand
): string {
  const criticalViolations = scan.violations.filter(v => v.severity === 'critical');
  const highViolations = scan.violations.filter(v => v.severity === 'high');
  const mediumViolations = scan.violations.filter(v => v.severity === 'medium');
  const lowViolations = scan.violations.filter(v => v.severity === 'low');

  const primaryColor = clientBrand.primaryColor || '#2563eb';
  const secondaryColor = clientBrand.secondaryColor || '#64748b';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WCAG 2.2 AA Compliance Audit - ${clientBrand.companyName}</title>
  <style>
    @page { margin: 2cm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 21cm;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid ${primaryColor};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: ${primaryColor};
    }
    .report-info {
      text-align: right;
      color: ${secondaryColor};
      font-size: 14px;
    }
    h1 {
      color: ${primaryColor};
      font-size: 28px;
      margin-bottom: 10px;
    }
    h2 {
      color: ${primaryColor};
      font-size: 22px;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }
    h3 {
      color: #374151;
      font-size: 18px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .executive-summary {
      background: #f9fafb;
      border-left: 4px solid ${primaryColor};
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .score {
      font-size: 48px;
      font-weight: bold;
      color: ${scan.complianceScore > 90 ? '#10b981' : scan.complianceScore > 70 ? '#f59e0b' : '#ef4444'};
      text-align: center;
      margin: 20px 0;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 12px;
      color: ${secondaryColor};
      text-transform: uppercase;
    }
    .critical { color: #dc2626; }
    .high { color: #ea580c; }
    .medium { color: #d97706; }
    .low { color: #65a30d; }
    .violation {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 15px 0;
      page-break-inside: avoid;
    }
    .violation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .violation-title {
      font-weight: 600;
      font-size: 16px;
      color: #111827;
    }
    .severity-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .severity-critical {
      background: #fee2e2;
      color: #991b1b;
    }
    .severity-high {
      background: #ffedd5;
      color: #9a3412;
    }
    .severity-medium {
      background: #fef3c7;
      color: #92400e;
    }
    .severity-low {
      background: #d9f99d;
      color: #365314;
    }
    .violation-details {
      margin: 10px 0;
      font-size: 14px;
      color: #4b5563;
    }
    .code-snippet {
      background: #1f2937;
      color: #e5e7eb;
      padding: 15px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      overflow-x: auto;
      margin: 10px 0;
    }
    .recommendation {
      background: #f0fdf4;
      border-left: 3px solid #22c55e;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      font-size: 11px;
      color: ${secondaryColor};
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${clientBrand.logo || clientBrand.companyName}</div>
    <div class="report-info">
      <div><strong>WCAG 2.2 AA Compliance Audit</strong></div>
      <div>Generated: ${scan.createdAt.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</div>
    </div>
  </div>

  <h1>Executive Summary</h1>
  
  <div class="executive-summary">
    <div class="score">${scan.complianceScore}%</div>
    <p style="text-align: center; font-size: 18px; margin: 0;">
      Overall Compliance Score
    </p>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-number critical">${criticalViolations.length}</div>
      <div class="stat-label">Critical</div>
    </div>
    <div class="stat-card">
      <div class="stat-number high">${highViolations.length}</div>
      <div class="stat-label">High</div>
    </div>
    <div class="stat-card">
      <div class="stat-number medium">${mediumViolations.length}</div>
      <div class="stat-label">Medium</div>
    </div>
    <div class="stat-card">
      <div class="stat-number low">${lowViolations.length}</div>
      <div class="stat-label">Low</div>
    </div>
  </div>

  <h2>Scan Details</h2>
  <p><strong>URL:</strong> ${scan.url}</p>
  <p><strong>Total Violations Found:</strong> ${scan.violations.length}</p>
  <p><strong>Scan Date:</strong> ${scan.createdAt.toLocaleString()}</p>

  <h2>Violations Found</h2>
  
  ${scan.violations.map((violation, index) => `
    <div class="violation">
      <div class="violation-header">
        <div class="violation-title">${index + 1}. ${violation.wcagCriteria} - ${violation.description}</div>
        <div class="severity-badge severity-${violation.severity}">${violation.severity}</div>
      </div>
      
      <div class="violation-details">
        <p><strong>Element:</strong> ${violation.element}</p>
        <p><strong>Page:</strong> ${violation.pageTitle}</p>
        <p><strong>Impact:</strong> ${violation.affectedUsers || 'Not specified'}</p>
      </div>

      ${violation.codeSnippet ? `
        <div class="code-snippet">${escapeHtml(violation.codeSnippet)}</div>
      ` : ''}

      <div class="recommendation">
        <strong>Recommendation:</strong>
        <p>${violation.recommendation}</p>
      </div>

      ${violation.technicalDetails ? `
        <p style="font-size: 13px; color: #6b7280; margin-top: 10px;">
          <strong>Technical Details:</strong> ${violation.technicalDetails}
        </p>
      ` : ''}
    </div>
  `).join('')}

  ${scan.aiRemediationPlan ? `
    <h2>AI-Generated Remediation Plan</h2>
    <div style="background: #eff6ff; border-left: 4px solid ${primaryColor}; padding: 20px; border-radius: 4px;">
      ${scan.aiRemediationPlan.split('\n').map(line => `<p>${line}</p>`).join('')}
    </div>
  ` : ''}

  <div class="footer">
    <p>Report generated by WCAGAI Platform | Scanner Worker: ${scan.workerId || 'N/A'}</p>
    <p>Signature: ${scan.signature ? scan.signature.substring(0, 32) + '...' : 'N/A'}</p>
    <p>© ${new Date().getFullYear()} ${clientBrand.companyName}. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Generate markdown report for email/documentation
 */
export function generateMarkdownReport(
  scan: ScanReport,
  clientBrand: ClientBrand
): string {
  const criticalViolations = scan.violations.filter(v => v.severity === 'critical');
  const highViolations = scan.violations.filter(v => v.severity === 'high');

  return `
# WCAG 2.2 AA Compliance Audit

**Client:** ${clientBrand.companyName}  
**Scan Date:** ${scan.createdAt.toLocaleDateString()}  
**URL:** ${scan.url}

---

## Executive Summary

**Overall Compliance Score:** ${scan.complianceScore}/100

- **Critical Issues:** ${criticalViolations.length}
- **High Priority:** ${highViolations.length}
- **Total Violations:** ${scan.violations.length}

${scan.complianceScore < 70 ? '⚠️ **Action Required:** Critical accessibility issues detected that require immediate attention.' : ''}

---

## Key Findings

${scan.violations.slice(0, 5).map((v, i) => `
### ${i + 1}. ${v.wcagCriteria} - ${v.severity.toUpperCase()}

**Issue:** ${v.description}

**Location:** ${v.element} on "${v.pageTitle}"

**Recommendation:** ${v.recommendation}

---
`).join('')}

## Next Steps

1. Review all violations in the detailed report
2. Prioritize critical and high-severity issues
3. Implement recommended fixes
4. Schedule follow-up scan to verify compliance

---

*Report generated by WCAGAI Platform*
  `.trim();
}
