/**
 * Utility Functions - The Tools of the Craft
 * Helper functions for common operations throughout the application
 */

import { EmailDraft, Violation, ViolationSeverity } from '../types';
import { SEVERITY_CONFIG } from '../config/constants';

// ============================================================================
// DATE UTILITIES
// ============================================================================

export function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// VIOLATION UTILITIES
// ============================================================================

export function getSeverityOrder(severity: ViolationSeverity): number {
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return order[severity];
}

export function sortViolationsBySeverity(violations: Violation[]): Violation[] {
  return [...violations].sort((a, b) => {
    const severityDiff = getSeverityOrder(a.severity) - getSeverityOrder(b.severity);
    if (severityDiff !== 0) return severityDiff;
    return a.priority - b.priority;
  });
}

export function getViolationStats(violations: Violation[]) {
  return {
    total: violations.length,
    critical: violations.filter(v => v.severity === 'critical').length,
    high: violations.filter(v => v.severity === 'high').length,
    medium: violations.filter(v => v.severity === 'medium').length,
    low: violations.filter(v => v.severity === 'low').length,
  };
}

export function getHighestSeverity(violations: Violation[]): ViolationSeverity | null {
  if (violations.length === 0) return null;
  const sorted = sortViolationsBySeverity(violations);
  return sorted[0].severity;
}

// ============================================================================
// EMAIL UTILITIES
// ============================================================================

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function getEmailPreview(body: string, maxLength: number = 100): string {
  const clean = body.replace(/\n+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return clean.substring(0, maxLength) + '...';
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

export function estimateReadTime(text: string): number {
  const words = countWords(text);
  const wpm = 200; // Average reading speed
  return Math.ceil(words / wpm);
}

// ============================================================================
// SEARCH & FILTER UTILITIES
// ============================================================================

export function searchDrafts(drafts: EmailDraft[], query: string): EmailDraft[] {
  if (!query.trim()) return drafts;

  const lowerQuery = query.toLowerCase();
  return drafts.filter(draft =>
    draft.recipient.toLowerCase().includes(lowerQuery) ||
    draft.recipientName?.toLowerCase().includes(lowerQuery) ||
    draft.company?.toLowerCase().includes(lowerQuery) ||
    draft.subject.toLowerCase().includes(lowerQuery) ||
    draft.body.toLowerCase().includes(lowerQuery) ||
    draft.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function sortDrafts(
  drafts: EmailDraft[],
  sortBy: 'date' | 'priority' | 'severity',
  order: 'asc' | 'desc'
): EmailDraft[] {
  const sorted = [...drafts].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
        break;
      case 'priority':
        const aPriority = Math.min(...a.violations.map(v => v.priority));
        const bPriority = Math.min(...b.violations.map(v => v.priority));
        comparison = aPriority - bPriority;
        break;
      case 'severity':
        const aSeverity = getHighestSeverity(a.violations);
        const bSeverity = getHighestSeverity(b.violations);
        if (aSeverity && bSeverity) {
          comparison = getSeverityOrder(aSeverity) - getSeverityOrder(bSeverity);
        }
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function validateDraft(draft: EmailDraft): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!validateEmail(draft.recipient)) {
    errors.push('Invalid recipient email address');
  }

  if (draft.subject.length < 5) {
    errors.push('Subject must be at least 5 characters');
  }

  if (draft.subject.length > 200) {
    errors.push('Subject must be less than 200 characters');
  }

  if (draft.body.length < 20) {
    errors.push('Email body must be at least 20 characters');
  }

  if (draft.body.length > 10000) {
    errors.push('Email body must be less than 10,000 characters');
  }

  if (draft.violations.length === 0) {
    errors.push('Email must include at least one violation');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

export function getSeverityColor(severity: ViolationSeverity): string {
  return SEVERITY_CONFIG[severity].color;
}

export function getSeverityBadgeClasses(severity: ViolationSeverity): string {
  const config = SEVERITY_CONFIG[severity];
  return `${config.color} ${config.bgColor} ${config.borderColor} border px-2 py-1 rounded text-xs font-medium`;
}

// ============================================================================
// ID GENERATION
// ============================================================================

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// CLIPBOARD UTILITIES
// ============================================================================

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

// ============================================================================
// DEBOUNCE UTILITY
// ============================================================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function(this: unknown, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
