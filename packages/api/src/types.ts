/**
 * API Type Definitions - Shared with Frontend
 */

export type ViolationSeverity = 'critical' | 'high' | 'medium' | 'low';
export type EmailStatus = 'draft' | 'pending_review' | 'approved' | 'sent' | 'rejected';
export type WCAGLevel = 'A' | 'AA' | 'AAA';

export interface Violation {
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
  violations: Violation[];
  createdAt: Date;
  updatedAt: Date;
  status: EmailStatus;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  tags?: string[];
}

export interface Consultant {
  id: string;
  name: string;
  email: string;
  company: string;
  website: string;
  phone: string;
  hubspotContactId: string;
  lastContacted: Date;
  responseRate: number;
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
