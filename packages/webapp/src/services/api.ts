/**
 * API Service - Backend Integration
 * Connects frontend to REST API
 */

import { EmailDraft, EmailStatus, Violation, Fix, FixReviewStatus } from '../types';

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
  // FIX GENERATION ENDPOINTS (Phase 1 MVP)
  // ============================================================================

  /**
   * Generate AI fix for a WCAG violation
   */
  async generateFix(params: {
    violationId: string;
    wcagCriteria: string;
    issueType: string;
    description: string;
    codeLanguage?: string;
  }): Promise<Fix | null> {
    const response = await this.request<Fix>('/fixes/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response.data || null;
  }

  /**
   * Get a specific fix by ID
   */
  async getFix(fixId: string): Promise<Fix | null> {
    const response = await this.request<Fix>(`/fixes/${fixId}`);
    return response.data || null;
  }

  /**
   * Get all fixes for a scan
   */
  async getFixesByScan(scanId: string): Promise<{
    fixes: Fix[];
    stats: {
      totalViolations: number;
      fixesGenerated: number;
      fixesApproved: number;
      fixesApplied: number;
      averageConfidence: string;
    };
  } | null> {
    const response = await this.request<{
      fixes: Fix[];
      stats: {
        totalViolations: number;
        fixesGenerated: number;
        fixesApproved: number;
        fixesApplied: number;
        averageConfidence: string;
      };
    }>(`/fixes/scan/${scanId}`);
    return response.data || null;
  }

  /**
   * Review a fix (approve/reject)
   */
  async reviewFix(
    fixId: string,
    reviewStatus: 'approved' | 'rejected',
    reviewNotes?: string
  ): Promise<Fix | null> {
    const response = await this.request<Fix>(`/fixes/${fixId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ reviewStatus, reviewNotes }),
    });
    return response.data || null;
  }

  /**
   * Apply a fix (Phase 1: just logs, Phase 2: creates PR)
   */
  async applyFix(
    fixId: string,
    params: {
      filePath?: string;
      repository?: string;
      branch?: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    const response = await this.request<{ message?: string }>(`/fixes/${fixId}/apply`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return {
      success: response.success,
      message: response.message || response.error,
    };
  }

  /**
   * Get remediation engine metrics
   */
  async getFixMetrics(): Promise<{
    totalFixes: number;
    approvedFixes: number;
    averageConfidence: string;
    totalApplications: number;
    successfulApplications: number;
    successRate: string;
    totalGenerationCost: string;
  } | null> {
    const response = await this.request<{
      totalFixes: number;
      approvedFixes: number;
      averageConfidence: string;
      totalApplications: number;
      successfulApplications: number;
      successRate: string;
      totalGenerationCost: string;
    }>('/fixes/metrics');
    return response.data || null;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
