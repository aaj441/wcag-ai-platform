/**
 * API Service - Backend Integration
 * Connects frontend to REST API
 */

import { EmailDraft, EmailStatus, Violation } from '../types';

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
  // FIX ENDPOINTS - AI-Powered Remediation
  // ============================================================================

  async generateFix(violationId: string, context?: { framework?: string; language?: string }) {
    const response = await this.request('/fixes/generate', {
      method: 'POST',
      body: JSON.stringify({ violationId, type: 'manual', context }),
    });
    return response.data || null;
  }

  async generateBatchFixes(violationIds: string[]) {
    const response = await this.request('/fixes/batch', {
      method: 'POST',
      body: JSON.stringify({ violationIds }),
    });
    return response.data || null;
  }

  async generateRemediationPlan(filters?: { severity?: string; wcagLevel?: string }) {
    const response = await this.request('/fixes/plan', {
      method: 'POST',
      body: JSON.stringify(filters || {}),
    });
    return response.data || null;
  }

  async getFixRecommendations(violationId: string) {
    const response = await this.request<{ recommendations: string[] }>(`/fixes/recommendations/${violationId}`);
    return response.data?.recommendations || [];
  }

  async getFixStats() {
    const response = await this.request('/fixes/stats');
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
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
