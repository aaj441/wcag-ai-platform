/**
 * Frontend Test Utilities
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

/**
 * Custom render function with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

/**
 * Create mock fetch response
 */
export function createMockFetchResponse(data: any, ok: boolean = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

/**
 * Wait for async updates
 */
export async function waitForAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create mock email draft
 */
export function createMockDraft(overrides: any = {}) {
  return {
    id: 'd_' + Math.random().toString(36).substr(2, 9),
    recipient: 'test@example.com',
    recipientName: 'Test User',
    company: 'Test Company',
    subject: 'Test Subject',
    body: 'Test body content',
    status: 'pending_review' as const,
    violations: [],
    keywords: [],
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock violation
 */
export function createMockViolation(overrides: any = {}) {
  return {
    id: 'v_' + Math.random().toString(36).substr(2, 9),
    wcagCriteria: '1.1.1',
    description: 'Test violation',
    severity: 'high' as const,
    wcagLevel: 'A' as const,
    ...overrides,
  };
}

/**
 * Create mock lead
 */
export function createMockLead(overrides: any = {}) {
  return {
    id: 'l_' + Math.random().toString(36).substr(2, 9),
    email: 'lead@example.com',
    company: {
      name: 'Test Company',
      website: 'example.com',
      industry: 'Technology',
      employeeCount: 100,
    },
    relevanceScore: 0.85,
    priorityTier: 'high',
    status: 'new',
    ...overrides,
  };
}
