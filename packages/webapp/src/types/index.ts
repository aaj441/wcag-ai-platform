/**
 * Type definitions for WCAG AI Platform Consultant Approval Dashboard
 */

export interface Violation {
  id: string;
  url: string;
  element: string;
  wcagCriteria: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  screenshot?: string;
}

export interface EmailDraft {
  id: string;
  recipient: string;  // Recipient email address
  subject: string;
  body: string;
  violations: Violation[];
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'pending' | 'approved' | 'sent';
}

export interface Consultant {
  id: string;
  name: string;
  email: string;
  company: string;
  hubspotContactId?: string;
}

export interface DashboardState {
  emailDrafts: EmailDraft[];
  selectedDraft: EmailDraft | null;
  editMode: boolean;
  isLoading: boolean;
  error: string | null;
}
