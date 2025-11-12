/**
 * API Service - Backend Integration
 * Connects frontend to REST API
 */

import { EmailDraft, EmailStatus, Violation, EvidenceRecord, ComplianceMetrics, QuarterlyReport, CIScanResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // DRAFT ENDPOINTS
  // ============================================================================

  async getAllDrafts(filters?: { status?: EmailStatus; search?: string }): Promise<EmailDraft[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString();
    const endpoint = `/drafts${query ? `?${query}` : ''}`;

    const response = await this.request<EmailDraft[]>(endpoint);
    return response.data || [];
  }

  async getDraftById(id: string): Promise<EmailDraft | null> {
    const response = await this.request<EmailDraft>(`/drafts/${id}`);
    return response.data || null;
  }

  async createDraft(draft: Partial<EmailDraft>): Promise<EmailDraft | null> {
    const response = await this.request<EmailDraft>('/drafts', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    return response.data || null;
  }

  async updateDraft(id: string, updates: Partial<EmailDraft>): Promise<EmailDraft | null> {
    const response = await this.request<EmailDraft>(`/drafts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data || null;
  }

  async approveDraft(id: string, approvedBy?: string): Promise<EmailDraft | null> {
    const response = await this.request<EmailDraft>(`/drafts/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ approvedBy }),
    });
    return response.data || null;
  }

  async rejectDraft(id: string): Promise<EmailDraft | null> {
    const response = await this.request<EmailDraft>(`/drafts/${id}/reject`, {
      method: 'PATCH',
    });
    return response.data || null;
  }

  async markDraftAsSent(id: string): Promise<EmailDraft | null> {
    const response = await this.request<EmailDraft>(`/drafts/${id}/send`, {
      method: 'PATCH',
    });
    return response.data || null;
  }

  async deleteDraft(id: string): Promise<boolean> {
    const response = await this.request(`/drafts/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  // ============================================================================
  // VIOLATION ENDPOINTS
  // ============================================================================

  async getAllViolations(filters?: { severity?: string; wcagLevel?: string }): Promise<Violation[]> {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.wcagLevel) params.append('wcagLevel', filters.wcagLevel);

    const query = params.toString();
    const endpoint = `/violations${query ? `?${query}` : ''}`;

    const response = await this.request<Violation[]>(endpoint);
    return response.data || [];
  }

  async getViolationStats(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byLevel: Record<string, number>;
  } | null> {
    const response = await this.request<{
      total: number;
      bySeverity: Record<string, number>;
      byLevel: Record<string, number>;
    }>('/violations/stats');
    return response.data || null;
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // EVIDENCE VAULT ENDPOINTS
  // ============================================================================

  async storeEvidence(evidence: Partial<EvidenceRecord>): Promise<EvidenceRecord | null> {
    const response = await this.request<EvidenceRecord>('/evidence/store', {
      method: 'POST',
      body: JSON.stringify(evidence),
    });
    return response.data || null;
  }

  async getAllEvidence(filters?: {
    clientId?: string;
    projectId?: string;
    scanType?: 'manual' | 'automated' | 'ci-cd';
    startDate?: Date;
    endDate?: Date;
    minComplianceScore?: number;
    maxComplianceScore?: number;
  }): Promise<EvidenceRecord[]> {
    const params = new URLSearchParams();
    if (filters?.clientId) params.append('clientId', filters.clientId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.scanType) params.append('scanType', filters.scanType);
    if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters?.minComplianceScore !== undefined) params.append('minComplianceScore', filters.minComplianceScore.toString());
    if (filters?.maxComplianceScore !== undefined) params.append('maxComplianceScore', filters.maxComplianceScore.toString());

    const query = params.toString();
    const endpoint = `/evidence${query ? `?${query}` : ''}`;

    const response = await this.request<EvidenceRecord[]>(endpoint);
    return response.data || [];
  }

  async getEvidenceById(id: string): Promise<EvidenceRecord | null> {
    const response = await this.request<EvidenceRecord>(`/evidence/${id}`);
    return response.data || null;
  }

  async deleteEvidence(id: string): Promise<boolean> {
    const response = await this.request(`/evidence/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  async getComplianceMetrics(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' = 'monthly',
    clientId?: string
  ): Promise<ComplianceMetrics | null> {
    const params = new URLSearchParams();
    params.append('period', period);
    if (clientId) params.append('clientId', clientId);

    const response = await this.request<ComplianceMetrics>(`/evidence/metrics/dashboard?${params.toString()}`);
    return response.data || null;
  }

  async storeCIScanResult(result: Partial<CIScanResult>): Promise<CIScanResult | null> {
    const response = await this.request<CIScanResult>('/evidence/ci-scan', {
      method: 'POST',
      body: JSON.stringify(result),
    });
    return response.data || null;
  }

  async getCIScanResults(filters?: {
    branch?: string;
    passed?: boolean;
    limit?: number;
  }): Promise<CIScanResult[]> {
    const params = new URLSearchParams();
    if (filters?.branch) params.append('branch', filters.branch);
    if (filters?.passed !== undefined) params.append('passed', filters.passed.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const query = params.toString();
    const endpoint = `/evidence/ci-scans/list${query ? `?${query}` : ''}`;

    const response = await this.request<CIScanResult[]>(endpoint);
    return response.data || [];
  }

  async generateQuarterlyReport(quarter: string, clientId?: string): Promise<QuarterlyReport | null> {
    const response = await this.request<QuarterlyReport>('/evidence/quarterly-report', {
      method: 'POST',
      body: JSON.stringify({ quarter, clientId }),
    });
    return response.data || null;
  }

  async getQuarterlyReports(clientId?: string): Promise<QuarterlyReport[]> {
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);

    const query = params.toString();
    const endpoint = `/evidence/quarterly-reports/list${query ? `?${query}` : ''}`;

    const response = await this.request<QuarterlyReport[]>(endpoint);
    return response.data || [];
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
