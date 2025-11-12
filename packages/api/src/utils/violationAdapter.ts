/**
 * Violation Adapter
 * Converts between Prisma Violation and Legacy Violation formats
 */

import { Violation as PrismaViolation } from '@prisma/client';
import { LegacyViolation } from '../types';

/**
 * Convert Prisma Violation to Legacy format for report generation
 */
export function prismaToLegacyViolation(violation: PrismaViolation, scanUrl?: string): LegacyViolation {
  return {
    id: violation.id,
    url: scanUrl || 'Unknown URL',
    pageTitle: scanUrl ? `Page: ${scanUrl}` : 'Unknown Page',
    element: violation.elementSelector || 'Element not specified',
    wcagCriteria: violation.wcagCriteria,
    wcagLevel: inferWcagLevel(violation.wcagCriteria),
    severity: violation.severity as 'critical' | 'high' | 'medium' | 'low',
    description: violation.description,
    recommendation: `Fix the ${violation.severity} severity issue related to WCAG ${violation.wcagCriteria}`,
    technicalDetails: violation.codeSnippet || undefined,
    screenshot: violation.screenshot || undefined,
    codeSnippet: violation.codeSnippet || undefined,
    affectedUsers: `Users affected by ${violation.severity} severity issue`,
    priority: getPriorityFromSeverity(violation.severity),
  };
}

/**
 * Infer WCAG level from criteria number
 */
function inferWcagLevel(criteria: string): 'A' | 'AA' | 'AAA' {
  // Common AA criteria
  const aaCriteria = ['1.4.3', '1.4.5', '1.4.11', '2.4.5', '2.4.6', '2.4.7', '3.2.3', '3.2.4', '3.3.3', '3.3.4'];
  
  // Common AAA criteria (most are AA+)
  const aaaCriteria = ['1.4.6', '1.4.8', '1.4.9', '2.4.8', '2.4.9', '2.4.10', '2.5.5', '2.5.6', '3.3.5', '3.3.6'];
  
  if (aaaCriteria.includes(criteria)) {
    return 'AAA';
  }
  
  if (aaCriteria.includes(criteria)) {
    return 'AA';
  }
  
  return 'A';
}

/**
 * Get priority number from severity
 */
function getPriorityFromSeverity(severity: string): number {
  const severityMap: Record<string, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  return severityMap[severity] || 5;
}
