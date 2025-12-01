/**
 * Test Utilities for Frontend Components
 * Provides helpers for React Testing Library
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock API responses
export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
};

// Mock scan data
export const mockScan = {
  id: 'scan-1',
  url: 'https://example.com',
  status: 'COMPLETED',
  wcagLevel: 'AA',
  complianceScore: 85.5,
  violationCount: 12,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock violation data
export const mockViolation = {
  id: 'violation-1',
  scanId: 'scan-1',
  wcagCriterion: '1.1.1',
  wcagLevel: 'A',
  severity: 'CRITICAL',
  element: '<img src="test.jpg">',
  description: 'Image missing alt text',
  context: 'Homepage hero section',
  confidence: 0.95,
  status: 'OPEN',
};

// Mock fix data
export const mockFix = {
  id: 'fix-1',
  violationId: 'violation-1',
  generatedCode: '<img src="test.jpg" alt="Company logo">',
  explanation: 'Added descriptive alt text to image',
  confidence: 0.92,
  status: 'PENDING_REVIEW',
  aiProvider: 'openai',
  aiModel: 'gpt-4',
};

// Mock client data
export const mockClient = {
  id: 'client-1',
  name: 'Test Client',
  domain: 'test.example.com',
  contactEmail: 'contact@example.com',
  contactName: 'John Doe',
};

// Wait for async updates
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));
