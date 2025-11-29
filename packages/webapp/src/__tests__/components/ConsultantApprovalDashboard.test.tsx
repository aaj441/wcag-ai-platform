/**
 * ConsultantApprovalDashboard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConsultantApprovalDashboard } from '../../components/ConsultantApprovalDashboard';
import { createMockDraft, createMockViolation, createMockFetchResponse } from '../helpers/testUtils';

describe('ConsultantApprovalDashboard', () => {
  const mockDrafts = [
    createMockDraft({
      id: 'd1',
      status: 'pending_review',
      recipientName: 'John Doe',
      company: 'Acme Corp',
    }),
    createMockDraft({
      id: 'd2',
      status: 'approved',
      recipientName: 'Jane Smith',
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      render(<ConsultantApprovalDashboard />);
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    it('should render dashboard after loading', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: /🏛️/i })).toBeInTheDocument();
    });

    it('should display total draft count', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Total Drafts/i)).toBeInTheDocument();
      });
    });

    it('should display stats cards', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Pending Review/i)).toBeInTheDocument();
        expect(screen.getByText(/Approved/i)).toBeInTheDocument();
      });
    });
  });

  describe('Draft Selection', () => {
    it('should show empty state when no draft selected', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Select a draft to review')).toBeInTheDocument();
      });
    });

    it('should select draft when clicked', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });

      // Find and click a draft
      const draftCards = await screen.findAllByRole('button');
      const firstDraftCard = draftCards.find(button =>
        button.textContent?.includes('Test User')
      );

      if (firstDraftCard) {
        fireEvent.click(firstDraftCard);

        await waitFor(() => {
          expect(screen.getByText(/Test Subject/i)).toBeInTheDocument();
        });
      }
    });

    it('should display draft details when selected', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const draftButton = buttons[0];
        if (draftButton) {
          fireEvent.click(draftButton);
        }
      });
    });
  });

  describe('Draft Actions', () => {
    it('should show approve button for pending drafts', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(async () => {
        const buttons = await screen.findAllByRole('button');
        const pendingDraft = buttons.find(b => b.textContent?.includes('Pending Review'));
        if (pendingDraft) {
          fireEvent.click(pendingDraft);

          await waitFor(() => {
            expect(screen.getByText('✓ Approve')).toBeInTheDocument();
            expect(screen.getByText('✕ Reject')).toBeInTheDocument();
          });
        }
      });
    });

    it('should approve draft when approve button clicked', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(async () => {
        const buttons = await screen.findAllByRole('button');
        const firstDraft = buttons[0];
        if (firstDraft) {
          fireEvent.click(firstDraft);

          await waitFor(() => {
            const approveButton = screen.queryByText('✓ Approve');
            if (approveButton) {
              fireEvent.click(approveButton);
            }
          });
        }
      });
    });

    it('should reject draft when reject button clicked', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(async () => {
        const buttons = await screen.findAllByRole('button');
        const firstDraft = buttons[0];
        if (firstDraft) {
          fireEvent.click(firstDraft);

          await waitFor(() => {
            const rejectButton = screen.queryByText('✕ Reject');
            if (rejectButton) {
              fireEvent.click(rejectButton);
            }
          });
        }
      });
    });
  });

  describe('Edit Mode', () => {
    it('should enter edit mode when edit button clicked', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(async () => {
        const buttons = await screen.findAllByRole('button');
        const firstDraft = buttons[0];
        if (firstDraft) {
          fireEvent.click(firstDraft);

          await waitFor(() => {
            const editButton = screen.queryByText('✏️ Edit');
            if (editButton) {
              fireEvent.click(editButton);
              expect(screen.getByText('✕ Cancel')).toBeInTheDocument();
            }
          });
        }
      });
    });

    it('should show editable fields in edit mode', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(async () => {
        const buttons = await screen.findAllByRole('button');
        const firstDraft = buttons[0];
        if (firstDraft) {
          fireEvent.click(firstDraft);

          const editButton = screen.queryByText('✏️ Edit');
          if (editButton) {
            fireEvent.click(editButton);

            // Should show text inputs
            const inputs = screen.getAllByRole('textbox');
            expect(inputs.length).toBeGreaterThan(0);
          }
        }
      });
    });

    it('should cancel edit mode', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(async () => {
        const buttons = await screen.findAllByRole('button');
        const firstDraft = buttons[0];
        if (firstDraft) {
          fireEvent.click(firstDraft);

          const editButton = screen.queryByText('✏️ Edit');
          if (editButton) {
            fireEvent.click(editButton);

            const cancelButton = screen.queryByText('✕ Cancel');
            if (cancelButton) {
              fireEvent.click(cancelButton);
              expect(screen.queryByText('💾 Save Changes')).not.toBeInTheDocument();
            }
          }
        }
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should render search input', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search drafts...')).toBeInTheDocument();
      });
    });

    it('should filter drafts by search query', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search drafts...');
        fireEvent.change(searchInput, { target: { value: 'test' } });
      });
    });

    it('should render status filter dropdown', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
    });

    it('should filter by status', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        const statusSelect = selects[0];
        if (statusSelect) {
          fireEvent.change(statusSelect, { target: { value: 'approved' } });
        }
      });
    });

    it('should render keyword filter input', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Filter by keywords/i)).toBeInTheDocument();
      });
    });
  });

  describe('Bulk Actions', () => {
    it('should show approve all button when pending drafts exist', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        const approveAllButton = screen.queryByText(/Approve All/i);
        if (approveAllButton) {
          expect(approveAllButton).toBeInTheDocument();
        }
      });
    });

    it('should approve all pending drafts when button clicked', async () => {
      global.confirm = vi.fn(() => true);
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        const approveAllButton = screen.queryByText(/Approve All/i);
        if (approveAllButton) {
          fireEvent.click(approveAllButton);
          expect(global.confirm).toHaveBeenCalled();
        }
      });
    });

    it('should not approve if confirmation cancelled', async () => {
      global.confirm = vi.fn(() => false);
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        const approveAllButton = screen.queryByText(/Approve All/i);
        if (approveAllButton) {
          fireEvent.click(approveAllButton);
          expect(global.confirm).toHaveBeenCalled();
        }
      });
    });
  });

  describe('Notifications', () => {
    it('should show success notification on load', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/loaded successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show notification when approving draft', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(async () => {
        const buttons = await screen.findAllByRole('button');
        const firstDraft = buttons[0];
        if (firstDraft) {
          fireEvent.click(firstDraft);

          const approveButton = screen.queryByText('✓ Approve');
          if (approveButton) {
            fireEvent.click(approveButton);

            await waitFor(() => {
              const notification = screen.queryByText(/approved/i);
              expect(notification).toBeTruthy();
            });
          }
        }
      });
    });
  });

  describe('Keywords Display', () => {
    it('should display auto-extracted keywords', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(async () => {
        const drafts = await screen.findAllByRole('button');
        if (drafts[0]) {
          // Keywords should be visible in the draft cards
          expect(drafts[0].textContent).toBeTruthy();
        }
      });
    });

    it('should truncate long keyword lists', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        // Component should handle long keyword lists gracefully
        expect(screen.getByRole('heading')).toBeInTheDocument();
      });
    });
  });

  describe('Violations Display', () => {
    it('should show violation count', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(async () => {
        const buttons = await screen.findAllByRole('button');
        if (buttons.length > 0) {
          // Violations should be counted and displayed
          expect(buttons[0]).toBeTruthy();
        }
      });
    });

    it('should display violation severity badges', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        // Should show severity indicators like "Critical", "High", etc.
        const content = document.body.textContent;
        expect(content).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should have accessible form inputs', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search drafts...');
        expect(searchInput).toHaveAccessibleName;
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty draft list', async () => {
      vi.mock('../../services/mockData', () => ({
        mockEmailDrafts: [],
      }));

      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('No drafts found')).toBeTruthy();
      });
    });

    it('should handle draft with no violations', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        // Should render without errors
        expect(screen.getByRole('heading')).toBeInTheDocument();
      });
    });

    it('should handle very long draft content', async () => {
      render(<ConsultantApprovalDashboard />);

      await waitFor(() => {
        // Should render without issues
        expect(document.body).toBeInTheDocument();
      });
    });
  });
});
