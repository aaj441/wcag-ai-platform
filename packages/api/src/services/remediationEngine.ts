/**
 * Remediation Engine Service
 * Orchestrates the AI-powered accessibility remediation workflow
 */

import { FixResult, LegacyViolation, ViolationSeverity } from '../types';
import { generateFix, generateBatchFixes } from './fixGenerator';
import { log } from '../utils/logger';

/**
 * Remediation priority based on severity and WCAG level
 */
interface RemediationPriority {
  severity: ViolationSeverity;
  order: number;
  autoFixable: boolean;
}

const PRIORITY_MAP: Record<ViolationSeverity, RemediationPriority> = {
  critical: { severity: 'critical', order: 1, autoFixable: true },
  high: { severity: 'high', order: 2, autoFixable: true },
  medium: { severity: 'medium', order: 3, autoFixable: false },
  low: { severity: 'low', order: 4, autoFixable: false },
};

/**
 * Remediation summary statistics
 */
export interface RemediationSummary {
  totalViolations: number;
  fixableViolations: number;
  fixesGenerated: number;
  estimatedTotalTime: string;
  priorityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  confidenceAverage: number;
}

/**
 * Sort violations by remediation priority
 */
export function prioritizeViolations(violations: LegacyViolation[]): LegacyViolation[] {
  return violations.sort((a, b) => {
    const priorityA = PRIORITY_MAP[a.severity].order;
    const priorityB = PRIORITY_MAP[b.severity].order;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Within same severity, sort by WCAG level (A > AA > AAA)
    const levelOrder = { A: 1, AA: 2, AAA: 3 };
    return levelOrder[a.wcagLevel] - levelOrder[b.wcagLevel];
  });
}

/**
 * Determine if a violation can be auto-fixed
 */
export function isAutoFixable(violation: LegacyViolation): boolean {
  const autoFixableCriteria = [
    '1.1.1', // Alt text
    '1.4.3', // Color contrast
    '2.1.1', // Keyboard access
    '2.4.4', // Link purpose
    '3.3.2', // Labels
    '4.1.2', // Name, Role, Value
  ];
  
  return autoFixableCriteria.includes(violation.wcagCriteria);
}

/**
 * Generate remediation plan for a set of violations
 */
export async function generateRemediationPlan(
  violations: LegacyViolation[]
): Promise<{
  summary: RemediationSummary;
  fixes: FixResult[];
  prioritizedViolations: LegacyViolation[];
}> {
  log.info(`Generating remediation plan for ${violations.length} violations`);

  // Prioritize violations
  const prioritizedViolations = prioritizeViolations(violations);

  // Filter fixable violations
  const fixableViolations = prioritizedViolations.filter(isAutoFixable);

  // Generate fixes
  const fixes = await generateBatchFixes(fixableViolations);

  // Calculate summary statistics
  const summary = calculateRemediationSummary(violations, fixes);

  log.info(`Remediation plan generated: ${fixes.length} fixes for ${fixableViolations.length} fixable violations`);

  return {
    summary,
    fixes,
    prioritizedViolations,
  };
}

/**
 * Calculate remediation summary statistics
 */
function calculateRemediationSummary(
  violations: LegacyViolation[],
  fixes: FixResult[]
): RemediationSummary {
  const fixableCount = violations.filter(isAutoFixable).length;

  // Calculate priority breakdown
  const priorityBreakdown = {
    critical: violations.filter(v => v.severity === 'critical').length,
    high: violations.filter(v => v.severity === 'high').length,
    medium: violations.filter(v => v.severity === 'medium').length,
    low: violations.filter(v => v.severity === 'low').length,
  };

  // Calculate average confidence
  const confidenceSum = fixes.reduce((sum, fix) => sum + fix.confidence, 0);
  const confidenceAverage = fixes.length > 0 ? confidenceSum / fixes.length : 0;

  // Estimate total time
  const totalMinutes = fixes.reduce((sum, fix) => {
    const minutes = parseInt(fix.estimatedEffort.split(' ')[0]) || 15;
    return sum + minutes;
  }, 0);
  
  const estimatedTotalTime = formatTime(totalMinutes);

  return {
    totalViolations: violations.length,
    fixableViolations: fixableCount,
    fixesGenerated: fixes.length,
    estimatedTotalTime,
    priorityBreakdown,
    confidenceAverage: Math.round(confidenceAverage * 100) / 100,
  };
}

/**
 * Format minutes into human-readable time
 */
function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
}

/**
 * Get remediation recommendations for a violation
 */
export function getRemediationRecommendations(violation: LegacyViolation): string[] {
  const recommendations: string[] = [];

  // Add severity-based recommendations
  if (violation.severity === 'critical') {
    recommendations.push('⚠️ CRITICAL: This issue may prevent users from accessing content or functionality');
    recommendations.push('🚀 Priority: Fix immediately before release');
  } else if (violation.severity === 'high') {
    recommendations.push('⚡ HIGH: This issue significantly impacts user experience');
    recommendations.push('📅 Priority: Fix within current sprint');
  }

  // Add auto-fix recommendation
  if (isAutoFixable(violation)) {
    recommendations.push('🤖 AI Fix Available: This violation can be automatically fixed');
  } else {
    recommendations.push('👤 Manual Fix Required: This violation requires developer review');
  }

  // Add WCAG level context
  recommendations.push(`📋 WCAG ${violation.wcagLevel} Requirement: ${violation.wcagCriteria}`);

  return recommendations;
}
