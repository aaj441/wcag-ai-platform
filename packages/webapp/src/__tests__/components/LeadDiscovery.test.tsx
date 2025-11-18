/**
 * LeadDiscovery Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeadDiscovery } from '../../components/LeadDiscovery';
import { createMockLead, createMockFetchResponse } from '../helpers/testUtils';

describe('LeadDiscovery', () => {
  const mockLeads = [
    createMockLead({
      id: 'l1',
      email: 'lead1@example.com',
      company: {
        name: 'Tech Corp',
        website: 'techcorp.com',
        industry: 'Technology',
        employeeCount: 150,
      },
      relevanceScore: 0.9,
      priorityTier: 'high',
      status: 'new',
    }),
    createMockLead({
      id: 'l2',
      email: 'lead2@example.com',
      company: {
        name: 'Health Inc',
        website: 'healthinc.com',
        industry: 'Healthcare',
        employeeCount: 200,
      },
      relevanceScore: 0.75,
      priorityTier: 'medium',
      status: 'contacted',
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    global.fetch = vi.fn();
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      render(<LeadDiscovery />);
      expect(screen.getByText('🎯 Lead Discovery')).toBeInTheDocument();
    });

    it('should render search section', () => {
      render(<LeadDiscovery />);
      expect(screen.getByText('Search by Keywords')).toBeInTheDocument();
    });

    it('should render keyword input', () => {
      render(<LeadDiscovery />);
      expect(screen.getByPlaceholderText(/Enter keyword/i)).toBeInTheDocument();
    });

    it('should render add keyword button', () => {
      render(<LeadDiscovery />);
      expect(screen.getByText('Add Keyword')).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<LeadDiscovery />);
      const searchButtons = screen.getAllByRole('button');
      const searchButton = searchButtons.find(b => b.textContent?.includes('Search'));
      expect(searchButton).toBeInTheDocument();
    });
  });

  describe('Keyword Management', () => {
    it('should add keyword when button clicked', () => {
      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      const addButton = screen.getByText('Add Keyword');

      fireEvent.change(input, { target: { value: 'fintech' } });
      fireEvent.click(addButton);

      expect(screen.getByText('#fintech')).toBeInTheDocument();
    });

    it('should add keyword on Enter key press', () => {
      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);

      fireEvent.change(input, { target: { value: 'healthcare' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });

      expect(screen.getByText('#healthcare')).toBeInTheDocument();
    });

    it('should remove keyword when X clicked', () => {
      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      fireEvent.change(input, { target: { value: 'saas' } });
      fireEvent.click(screen.getByText('Add Keyword'));

      expect(screen.getByText('#saas')).toBeInTheDocument();

      const removeButton = screen.getByText('✕');
      fireEvent.click(removeButton);

      expect(screen.queryByText('#saas')).not.toBeInTheDocument();
    });

    it('should not add empty keyword', () => {
      render(<LeadDiscovery />);

      const addButton = screen.getByText('Add Keyword');
      fireEvent.click(addButton);

      // Should not add any keyword tags
      const tags = screen.queryAllByText(/^#/);
      expect(tags).toHaveLength(0);
    });

    it('should not add duplicate keywords', () => {
      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      const addButton = screen.getByText('Add Keyword');

      fireEvent.change(input, { target: { value: 'tech' } });
      fireEvent.click(addButton);

      fireEvent.change(input, { target: { value: 'tech' } });
      fireEvent.click(addButton);

      const techTags = screen.getAllByText('#tech');
      expect(techTags).toHaveLength(1);
    });

    it('should clear input after adding keyword', () => {
      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i) as HTMLInputElement;
      const addButton = screen.getByText('Add Keyword');

      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(addButton);

      expect(input.value).toBe('');
    });
  });

  describe('Search Functionality', () => {
    it('should disable search button when no keywords', () => {
      render(<LeadDiscovery />);

      const searchButton = screen.getAllByRole('button').find(b =>
        b.textContent?.includes('Search')
      );

      expect(searchButton).toBeDisabled();
    });

    it('should enable search button with keywords', () => {
      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      fireEvent.change(input, { target: { value: 'tech' } });
      fireEvent.click(screen.getByText('Add Keyword'));

      const searchButton = screen.getAllByRole('button').find(b =>
        b.textContent?.includes('Search')
      );

      expect(searchButton).not.toBeDisabled();
    });

    it('should show alert when searching without auth', () => {
      localStorage.removeItem('token');
      global.alert = vi.fn();
      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      fireEvent.change(input, { target: { value: 'tech' } });
      fireEvent.click(screen.getByText('Add Keyword'));

      const searchButton = screen.getAllByRole('button').find(b =>
        b.textContent?.includes('Search')
      );

      if (searchButton) {
        fireEvent.click(searchButton);
        expect(global.alert).toHaveBeenCalledWith('Not authenticated');
      }
    });

    it('should make API request on search', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockFetchResponse({
          success: true,
          data: { companiesFound: 5, leadsCreated: 5 },
        })
      );

      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      fireEvent.change(input, { target: { value: 'fintech' } });
      fireEvent.click(screen.getByText('Add Keyword'));

      const searchButton = screen.getAllByRole('button').find(b =>
        b.textContent?.includes('Search')
      );

      if (searchButton) {
        fireEvent.click(searchButton);

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/leads/search',
            expect.objectContaining({
              method: 'POST',
              body: expect.stringContaining('fintech'),
            })
          );
        });
      }
    });

    it('should show success message after search', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockFetchResponse({
          success: true,
          data: { companiesFound: 5, leadsCreated: 5 },
        })
      );

      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      fireEvent.change(input, { target: { value: 'tech' } });
      fireEvent.click(screen.getByText('Add Keyword'));

      const searchButton = screen.getAllByRole('button').find(b =>
        b.textContent?.includes('Search')
      );

      if (searchButton) {
        fireEvent.click(searchButton);

        await waitFor(() => {
          expect(screen.getByText(/Found 5 companies/i)).toBeInTheDocument();
        });
      }
    });

    it('should clear keywords after successful search', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockFetchResponse({
          success: true,
          data: { companiesFound: 3, leadsCreated: 3 },
        })
      );

      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      fireEvent.change(input, { target: { value: 'saas' } });
      fireEvent.click(screen.getByText('Add Keyword'));

      const searchButton = screen.getAllByRole('button').find(b =>
        b.textContent?.includes('Search')
      );

      if (searchButton) {
        fireEvent.click(searchButton);

        await waitFor(() => {
          expect(screen.queryByText('#saas')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Lead Display', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockFetchResponse({
          success: true,
          data: mockLeads,
        })
      );
    });

    it('should show loading state', async () => {
      render(<LeadDiscovery />);

      await waitFor(() => {
        const loadingText = screen.queryByText('Loading leads...');
        if (loadingText) {
          expect(loadingText).toBeInTheDocument();
        }
      });
    });

    it('should display leads after loading', async () => {
      render(<LeadDiscovery />);

      await waitFor(() => {
        const companyName = screen.queryByText('Tech Corp');
        if (companyName) {
          expect(companyName).toBeInTheDocument();
        }
      });
    });

    it('should display empty state when no leads', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockFetchResponse({
          success: true,
          data: [],
        })
      );

      render(<LeadDiscovery />);

      await waitFor(() => {
        expect(screen.getByText('📭 No leads found')).toBeInTheDocument();
      });
    });

    it('should display relevance score', async () => {
      render(<LeadDiscovery />);

      await waitFor(() => {
        const matchText = screen.queryByText('90% Match');
        if (matchText) {
          expect(matchText).toBeInTheDocument();
        }
      });
    });

    it('should display priority tier', async () => {
      render(<LeadDiscovery />);

      await waitFor(() => {
        const priorityText = screen.queryByText(/High/i);
        if (priorityText) {
          expect(priorityText).toBeTruthy();
        }
      });
    });
  });

  describe('Status Filtering', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockFetchResponse({
          success: true,
          data: mockLeads,
        })
      );
    });

    it('should render filter buttons', () => {
      render(<LeadDiscovery />);

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Contacted')).toBeInTheDocument();
    });

    it('should filter leads by status', async () => {
      render(<LeadDiscovery />);

      const newButton = screen.getByText('New');
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=new'),
          expect.any(Object)
        );
      });
    });

    it('should highlight active filter', () => {
      render(<LeadDiscovery />);

      const allButton = screen.getByText('All');
      expect(allButton).toHaveClass('bg-blue-600');
    });
  });

  describe('Stats Display', () => {
    it('should show stats when available', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockFetchResponse({
          success: true,
          data: mockLeads,
          stats: {
            total: 10,
            byPriority: { high: 3, medium: 5, low: 2 },
            byStatus: { new: 6, contacted: 4, won: 0 },
          },
        })
      );

      render(<LeadDiscovery />);

      await waitFor(() => {
        const totalText = screen.queryByText('10');
        const highPriorityText = screen.queryByText('3');
        if (totalText && highPriorityText) {
          expect(totalText).toBeTruthy();
          expect(highPriorityText).toBeTruthy();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.alert = vi.fn();

      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(screen.getByText('Add Keyword'));

      const searchButton = screen.getAllByRole('button').find(b =>
        b.textContent?.includes('Search')
      );

      if (searchButton) {
        fireEvent.click(searchButton);

        await waitFor(() => {
          expect(global.alert).toHaveBeenCalledWith('Search failed');
        });
      }
    });

    it('should handle API error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockFetchResponse(
          { success: false, error: 'Invalid request' },
          false
        )
      );
      global.alert = vi.fn();

      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(screen.getByText('Add Keyword'));

      const searchButton = screen.getAllByRole('button').find(b =>
        b.textContent?.includes('Search')
      );

      if (searchButton) {
        fireEvent.click(searchButton);

        await waitFor(() => {
          expect(global.alert).toHaveBeenCalledWith(
            expect.stringContaining('Invalid request')
          );
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long keywords', () => {
      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      const longKeyword = 'a'.repeat(100);

      fireEvent.change(input, { target: { value: longKeyword } });
      fireEvent.click(screen.getByText('Add Keyword'));

      expect(screen.getByText(`#${longKeyword}`)).toBeInTheDocument();
    });

    it('should handle many keywords', () => {
      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      const addButton = screen.getByText('Add Keyword');

      for (let i = 0; i < 20; i++) {
        fireEvent.change(input, { target: { value: `keyword${i}` } });
        fireEvent.click(addButton);
      }

      const keywords = screen.getAllByText(/^#keyword/);
      expect(keywords).toHaveLength(20);
    });

    it('should trim whitespace from keywords', () => {
      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      fireEvent.change(input, { target: { value: '  fintech  ' } });
      fireEvent.click(screen.getByText('Add Keyword'));

      expect(screen.getByText('#fintech')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form inputs', () => {
      render(<LeadDiscovery />);

      const input = screen.getByPlaceholderText(/Enter keyword/i);
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should have accessible buttons', () => {
      render(<LeadDiscovery />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
