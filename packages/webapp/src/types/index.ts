/**
 * WCAG AI Platform - Type Definitions
 * Architectural Foundation: Complete domain model with hierarchical structure
 */

// ============================================================================
// DOMAIN MODELS - Foundation Level
// ============================================================================

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

// Alias for backend compatibility - identical to backend's LegacyViolation type
export type LegacyViolation = Violation;

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
  website?: string;
  phone?: string;
  hubspotContactId?: string;
  lastContacted?: Date;
  responseRate?: number;
}

export interface ScanResult {
  id: string;
  url: string;
  scannedAt: Date;
  totalViolations: number;
  violationsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  violations: Violation[];
}

// ============================================================================
// APPLICATION STATE - Organizational Level
// ============================================================================

export interface DashboardState {
  emailDrafts: EmailDraft[];
  selectedDraft: EmailDraft | null;
  editMode: boolean;
  isLoading: boolean;
  error: string | null;
  filterStatus: EmailStatus | 'all';
  searchQuery: string;
  sortBy: 'date' | 'priority' | 'severity';
  sortOrder: 'asc' | 'desc';
}

export interface UIState {
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
  showNotifications: boolean;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  read: boolean;
}

// ============================================================================
// SERVICE CONTRACTS - Integration Level
// ============================================================================

export interface HubSpotContact {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  website?: string;
  phone?: string;
}

export interface EmailActivity {
  draftId: string;
  recipient: string;
  subject: string;
  sentAt: Date;
  hubspotContactId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// ============================================================================
// COMPONENT PROPS - Presentation Level
// ============================================================================

export interface ViolationCardProps {
  violation: Violation;
  index: number;
}

export interface EmailDraftListProps {
  drafts: EmailDraft[];
  selectedId: string | null;
  onSelect: (draft: EmailDraft) => void;
  filterStatus: EmailStatus | 'all';
  onFilterChange: (status: EmailStatus | 'all') => void;
}

export interface EmailPreviewProps {
  draft: EmailDraft | null;
  editMode: boolean;
  onToggleEdit: () => void;
  onSave: (draft: EmailDraft) => void;
  onApprove: (draft: EmailDraft) => void;
  onReject: (draft: EmailDraft) => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type SeverityConfig = {
  [K in ViolationSeverity]: {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
  };
};

export type StatusConfig = {
  [K in EmailStatus]: {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  };
};

// ============================================================================
// EVIDENCE VAULT - Compliance Tracking & Legal Defense
// ============================================================================

export interface EvidenceRecord {
  id: string;
  scanId: string;
  url: string;
  timestamp: Date;
  complianceScore: number;
  violationsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  scanType: 'manual' | 'automated' | 'ci-cd';
  scanTool: string;
  violations: LegacyViolation[]; // Matches backend LegacyViolation type
  screenshotUrl?: string;
  reportUrl?: string;
  clientId?: string;
  projectId?: string;
  retentionDays: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ComplianceMetrics {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  startDate: Date;
  endDate: Date;
  totalScans: number;
  averageComplianceScore: number;
  totalViolations: number;
  violationsByType: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  trendData: Array<{
    date: Date;
    complianceScore: number;
    violationsCount: number;
  }>;
  topViolations: Array<{
    wcagCriteria: string;
    count: number;
    severity: ViolationSeverity;
  }>;
  scanCoverage: {
    totalUrls: number;
    scannedUrls: number;
    coveragePercentage: number;
  };
}

export interface QuarterlyReport {
  id: string;
  quarter: string;
  clientId?: string;
  generatedAt: Date;
  metrics: ComplianceMetrics;
  executiveSummary: string;
  evidenceRecords: EvidenceRecord[];
  recommendations: string[];
  legalDefenseDocumentation: {
    complianceEfforts: string[];
    remediationActions: string[];
    ongoingMonitoring: string[];
  };
}

export interface CIScanResult {
  id: string;
  prNumber?: number;
  commitSha: string;
  branch: string;
  timestamp: Date;
  passed: boolean;
  complianceScore: number;
  violations: Violation[];
  criticalBlockers: number;
  scanDurationMs: number;
  tool: string;
}
