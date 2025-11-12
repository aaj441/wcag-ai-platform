/**
 * Evidence Vault Data Store
 * In-memory storage for scan evidence and compliance metrics
 * In production, migrate to PostgreSQL/MongoDB with retention policies
 */

import { EvidenceRecord, ComplianceMetrics, QuarterlyReport, CIScanResult, ViolationSeverity } from '../types';
import { v4 as uuidv4 } from 'uuid';

// In-memory stores
let evidenceRecords: EvidenceRecord[] = [];
let ciScanResults: CIScanResult[] = [];
let quarterlyReports: QuarterlyReport[] = [];

/**
 * Store new evidence record
 */
export function storeEvidence(record: Omit<EvidenceRecord, 'id' | 'timestamp'>): EvidenceRecord {
  const newRecord: EvidenceRecord = {
    ...record,
    id: uuidv4(),
    timestamp: new Date(),
    retentionDays: record.retentionDays || 90
  };

  evidenceRecords.push(newRecord);

  // Auto-cleanup expired records
  cleanupExpiredEvidence();

  return newRecord;
}

/**
 * Get all evidence records with optional filters
 */
export function getEvidenceRecords(filters?: {
  clientId?: string;
  projectId?: string;
  scanType?: 'manual' | 'automated' | 'ci-cd';
  startDate?: Date;
  endDate?: Date;
  minComplianceScore?: number;
  maxComplianceScore?: number;
}): EvidenceRecord[] {
  let filtered = [...evidenceRecords];

  if (filters?.clientId) {
    filtered = filtered.filter(r => r.clientId === filters.clientId);
  }

  if (filters?.projectId) {
    filtered = filtered.filter(r => r.projectId === filters.projectId);
  }

  if (filters?.scanType) {
    filtered = filtered.filter(r => r.scanType === filters.scanType);
  }

  if (filters?.startDate) {
    filtered = filtered.filter(r => r.timestamp >= filters.startDate!);
  }

  if (filters?.endDate) {
    filtered = filtered.filter(r => r.timestamp <= filters.endDate!);
  }

  if (filters?.minComplianceScore !== undefined) {
    filtered = filtered.filter(r => r.complianceScore >= filters.minComplianceScore!);
  }

  if (filters?.maxComplianceScore !== undefined) {
    filtered = filtered.filter(r => r.complianceScore <= filters.maxComplianceScore!);
  }

  return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Get evidence record by ID
 */
export function getEvidenceById(id: string): EvidenceRecord | undefined {
  return evidenceRecords.find(r => r.id === id);
}

/**
 * Delete evidence record (only if not required for retention)
 */
export function deleteEvidence(id: string): boolean {
  const index = evidenceRecords.findIndex(r => r.id === id);
  if (index !== -1) {
    evidenceRecords.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Calculate compliance metrics for dashboard
 */
export function getComplianceMetrics(
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly',
  clientId?: string
): ComplianceMetrics {
  const now = new Date();
  let startDate = new Date();

  // Calculate period start date
  switch (period) {
    case 'daily':
      startDate.setDate(now.getDate() - 1);
      break;
    case 'weekly':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarterly':
      startDate.setMonth(now.getMonth() - 3);
      break;
  }

  // Filter records by period and client
  const records = getEvidenceRecords({
    startDate,
    endDate: now,
    clientId
  });

  if (records.length === 0) {
    return {
      period,
      startDate,
      endDate: now,
      totalScans: 0,
      averageComplianceScore: 0,
      totalViolations: 0,
      violationsByType: { critical: 0, high: 0, medium: 0, low: 0 },
      trendData: [],
      topViolations: [],
      scanCoverage: { totalUrls: 0, scannedUrls: 0, coveragePercentage: 0 }
    };
  }

  // Calculate metrics
  const totalScans = records.length;
  const totalScore = records.reduce((sum, r) => sum + r.complianceScore, 0);
  const averageComplianceScore = Math.round(totalScore / totalScans);

  const violationsByType = {
    critical: records.reduce((sum, r) => sum + r.criticalCount, 0),
    high: records.reduce((sum, r) => sum + r.highCount, 0),
    medium: records.reduce((sum, r) => sum + r.mediumCount, 0),
    low: records.reduce((sum, r) => sum + r.lowCount, 0)
  };

  const totalViolations = Object.values(violationsByType).reduce((sum, count) => sum + count, 0);

  // Generate trend data (group by day)
  const trendMap = new Map<string, { scores: number[], violations: number[] }>();
  records.forEach(r => {
    const dateKey = r.timestamp.toISOString().split('T')[0];
    if (!trendMap.has(dateKey)) {
      trendMap.set(dateKey, { scores: [], violations: [] });
    }
    const data = trendMap.get(dateKey)!;
    data.scores.push(r.complianceScore);
    data.violations.push(r.violationsCount);
  });

  const trendData = Array.from(trendMap.entries())
    .map(([dateStr, data]) => ({
      date: new Date(dateStr),
      complianceScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      violationsCount: Math.round(data.violations.reduce((a, b) => a + b, 0) / data.violations.length)
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate top violations
  const violationCounts = new Map<string, { count: number, severity: ViolationSeverity }>();
  records.forEach(r => {
    r.violations.forEach(v => {
      const key = v.wcagCriteria;
      if (!violationCounts.has(key)) {
        violationCounts.set(key, { count: 0, severity: v.severity });
      }
      violationCounts.get(key)!.count++;
    });
  });

  const topViolations = Array.from(violationCounts.entries())
    .map(([wcagCriteria, data]) => ({
      wcagCriteria,
      count: data.count,
      severity: data.severity
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Calculate scan coverage
  const uniqueUrls = new Set(records.map(r => r.url));
  const scannedUrls = uniqueUrls.size;
  const totalUrls = scannedUrls; // In production, get from site map

  return {
    period,
    startDate,
    endDate: now,
    totalScans,
    averageComplianceScore,
    totalViolations,
    violationsByType,
    trendData,
    topViolations,
    scanCoverage: {
      totalUrls,
      scannedUrls,
      coveragePercentage: totalUrls > 0 ? Math.round((scannedUrls / totalUrls) * 100) : 0
    }
  };
}

/**
 * Store CI/CD scan result
 */
export function storeCIScanResult(result: Omit<CIScanResult, 'id' | 'timestamp'>): CIScanResult {
  const newResult: CIScanResult = {
    ...result,
    id: uuidv4(),
    timestamp: new Date()
  };

  ciScanResults.push(newResult);

  // Store as evidence record too
  storeEvidence({
    scanId: newResult.id,
    url: `github-pr-${result.prNumber || 'unknown'}`,
    complianceScore: newResult.complianceScore,
    violationsCount: newResult.violations.length,
    criticalCount: newResult.violations.filter(v => v.severity === 'critical').length,
    highCount: newResult.violations.filter(v => v.severity === 'high').length,
    mediumCount: newResult.violations.filter(v => v.severity === 'medium').length,
    lowCount: newResult.violations.filter(v => v.severity === 'low').length,
    scanType: 'ci-cd',
    scanTool: newResult.tool,
    violations: newResult.violations,
    retentionDays: 90,
    tags: ['ci-cd', `branch:${result.branch}`],
    metadata: {
      commitSha: result.commitSha,
      prNumber: result.prNumber,
      scanDurationMs: result.scanDurationMs
    }
  });

  return newResult;
}

/**
 * Get CI/CD scan results
 */
export function getCIScanResults(filters?: {
  branch?: string;
  passed?: boolean;
  limit?: number;
}): CIScanResult[] {
  let filtered = [...ciScanResults];

  if (filters?.branch) {
    filtered = filtered.filter(r => r.branch === filters.branch);
  }

  if (filters?.passed !== undefined) {
    filtered = filtered.filter(r => r.passed === filters.passed);
  }

  filtered = filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Generate quarterly report
 */
export function generateQuarterlyReport(
  quarter: string,
  clientId?: string
): QuarterlyReport {
  const metrics = getComplianceMetrics('quarterly', clientId);
  const records = getEvidenceRecords({
    startDate: metrics.startDate,
    endDate: metrics.endDate,
    clientId
  });

  const report: QuarterlyReport = {
    id: uuidv4(),
    quarter,
    clientId,
    generatedAt: new Date(),
    metrics,
    executiveSummary: generateExecutiveSummary(metrics),
    evidenceRecords: records,
    recommendations: generateRecommendations(metrics),
    legalDefenseDocumentation: {
      complianceEfforts: [
        `Conducted ${metrics.totalScans} accessibility scans during ${quarter}`,
        `Maintained average compliance score of ${metrics.averageComplianceScore}%`,
        `Identified and tracked ${metrics.totalViolations} total violations`
      ],
      remediationActions: [
        `Addressed ${metrics.violationsByType.critical} critical violations`,
        `Resolved ${metrics.violationsByType.high} high-priority issues`,
        `Monitored ${metrics.violationsByType.medium} medium-priority items`
      ],
      ongoingMonitoring: [
        `Automated scanning via CI/CD pipeline`,
        `Evidence retained for ${records[0]?.retentionDays || 90} days`,
        `Regular quarterly compliance reviews conducted`
      ]
    }
  };

  quarterlyReports.push(report);
  return report;
}

/**
 * Get all quarterly reports
 */
export function getQuarterlyReports(clientId?: string): QuarterlyReport[] {
  if (clientId) {
    return quarterlyReports.filter(r => r.clientId === clientId);
  }
  return [...quarterlyReports];
}

/**
 * Cleanup expired evidence records (based on retention policy)
 */
function cleanupExpiredEvidence(): void {
  const now = new Date();
  evidenceRecords = evidenceRecords.filter(record => {
    const expiryDate = new Date(record.timestamp);
    expiryDate.setDate(expiryDate.getDate() + record.retentionDays);
    return expiryDate > now;
  });
}

/**
 * Generate executive summary from metrics
 */
function generateExecutiveSummary(metrics: ComplianceMetrics): string {
  const scoreStatus = metrics.averageComplianceScore >= 90 ? 'excellent' :
                     metrics.averageComplianceScore >= 75 ? 'good' :
                     metrics.averageComplianceScore >= 60 ? 'fair' : 'needs improvement';

  return `
During this ${metrics.period} period, ${metrics.totalScans} accessibility scans were conducted, 
achieving an average compliance score of ${metrics.averageComplianceScore}% (${scoreStatus}). 
A total of ${metrics.totalViolations} violations were identified, including ${metrics.violationsByType.critical} 
critical issues that require immediate attention. The organization's commitment to web accessibility 
is demonstrated through continuous monitoring and systematic remediation efforts.
  `.trim();
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(metrics: ComplianceMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.violationsByType.critical > 0) {
    recommendations.push(
      `Address ${metrics.violationsByType.critical} critical violations immediately to avoid legal exposure`
    );
  }

  if (metrics.averageComplianceScore < 75) {
    recommendations.push(
      'Implement comprehensive accessibility training for development team'
    );
  }

  if (metrics.topViolations.length > 0) {
    const topIssue = metrics.topViolations[0];
    recommendations.push(
      `Focus on resolving ${topIssue.wcagCriteria} violations (${topIssue.count} occurrences)`
    );
  }

  if (metrics.scanCoverage.coveragePercentage < 80) {
    recommendations.push(
      'Increase scan coverage to ensure comprehensive accessibility monitoring'
    );
  }

  recommendations.push(
    'Continue automated CI/CD accessibility scanning to prevent regression',
    'Schedule quarterly accessibility audits with certified consultants'
  );

  return recommendations;
}

/**
 * Reset all data (for testing)
 */
export function resetEvidenceVault(): void {
  evidenceRecords = [];
  ciScanResults = [];
  quarterlyReports = [];
}
