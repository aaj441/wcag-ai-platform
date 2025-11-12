/**
 * API Type Definitions - Shared with Frontend & Prisma Models
 */

import type { Scan as PrismaScan, Violation as PrismaViolation, ReviewLog as PrismaReviewLog } from "@prisma/client";

export type ViolationSeverity = 'critical' | 'high' | 'medium' | 'low';
export type EmailStatus = 'draft' | 'pending_review' | 'approved' | 'sent' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'disputed' | 'rejected';
export type WCAGLevel = 'A' | 'AA' | 'AAA';

/**
 * Scan - Main auditable unit
 */
export interface Scan extends PrismaScan {
  violations?: Violation[];
  reviewLogs?: ReviewLog[];
}

/**
 * Violation - Individual WCAG violation
 */
export interface Violation extends PrismaViolation {}

/**
 * ReviewLog - Audit trail entry
 */
export interface ReviewLog extends PrismaReviewLog {}

/**
 * Legacy types for backward compatibility
 */
export interface LegacyViolation {
  id: string;
  url: string;
  pageTitle: string;
  element: string;
  wcagCriteria: string;
  wcagLevel: WCAGLevel;
  severity: ViolationSeverity;
  description: string;
  recommendation: string;
  technicalDetails?: string;
  screenshot?: string;
  codeSnippet?: string;
  affectedUsers?: string;
  priority: number;
}

export interface EmailDraft {
  id: string;
  recipient: string;
  recipientName?: string;
  company?: string;
  subject: string;
  body: string;
  violations: LegacyViolation[];
  createdAt: Date;
  updatedAt: Date;
  status: EmailStatus;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  tags?: string[];
  keywords?: string[];
  keywordTags?: string[];
}

export interface ConsultantProfile {
  id: string;
  name: string;
  email: string;
  wcagCertified: boolean;
  yearsExperience: number;
  specialization?: string;
  isActive: boolean;
  totalAuditsReviewed: number;
  accuracyScore: number; // 0.0-1.0
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Consultant {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: string;
  phone?: string;
  website?: string;
  hubspotContactId?: string;
  lastContacted?: Date;
  responseRate?: number;
}
