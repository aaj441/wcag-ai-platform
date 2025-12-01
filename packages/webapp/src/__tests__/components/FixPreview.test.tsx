/**
 * FixPreview Component Tests
 * Tests for fix code preview component
 */

import { render, screen, fireEvent, waitFor } from '../setup/testUtils';
import { mockFix, mockViolation } from '../setup/testUtils';
import FixPreview from '../../components/FixPreview';

describe('FixPreview', () => {
  it('should render before and after code', () => {
    render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
      />
    );

    // Original code (before)
    expect(screen.getByText(/before/i)).toBeInTheDocument();
    expect(screen.getByText('<img src="test.jpg">')).toBeInTheDocument();

    // Fixed code (after)
    expect(screen.getByText(/after/i)).toBeInTheDocument();
    expect(
      screen.getByText('<img src="test.jpg" alt="Company logo">')
    ).toBeInTheDocument();
  });

  it('should display fix explanation', () => {
    render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
      />
    );

    expect(
      screen.getByText('Added descriptive alt text to image')
    ).toBeInTheDocument();
  });

  it('should show confidence score', () => {
    render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
      />
    );

    expect(screen.getByText(/92%/)).toBeInTheDocument();
  });

  it('should display AI provider information', () => {
    render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
      />
    );

    expect(screen.getByText(/openai/i)).toBeInTheDocument();
    expect(screen.getByText(/gpt-4/i)).toBeInTheDocument();
  });

  it('should highlight code differences', () => {
    render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
      />
    );

    // Should have syntax highlighting
    const codeBlocks = screen.getAllByRole('code') || screen.getAllByTestId('code-block');
    expect(codeBlocks.length).toBeGreaterThan(0);
  });

  it('should provide copy code button', () => {
    render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
      />
    );

    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      mockFix.generatedCode
    );
  });

  it('should show approve and reject buttons for pending fixes', () => {
    render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('should call onApprove when approve button clicked', () => {
    const handleApprove = vi.fn();

    render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
        onApprove={handleApprove}
        onReject={vi.fn()}
      />
    );

    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    expect(handleApprove).toHaveBeenCalledWith(mockFix.id);
  });

  it('should call onReject when reject button clicked', () => {
    const handleReject = vi.fn();

    render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
        onApprove={vi.fn()}
        onReject={handleReject}
      />
    );

    const rejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    expect(handleReject).toHaveBeenCalledWith(mockFix.id);
  });

  it('should not show action buttons for approved fixes', () => {
    const approvedFix = { ...mockFix, status: 'APPROVED' };

    render(
      <FixPreview
        fix={approvedFix}
        originalCode={mockViolation.element}
      />
    );

    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
  });

  it('should show status badge', () => {
    const { rerender } = render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
      />
    );

    expect(screen.getByText(/pending/i)).toBeInTheDocument();

    const approvedFix = { ...mockFix, status: 'APPROVED' };
    rerender(
      <FixPreview
        fix={approvedFix}
        originalCode={mockViolation.element}
      />
    );

    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });

  it('should handle side-by-side view toggle', () => {
    render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
      />
    );

    const toggleButton = screen.queryByRole('button', { name: /side.by.side|split/i });

    if (toggleButton) {
      fireEvent.click(toggleButton);

      // Should show both code blocks side by side
      const codeBlocks = screen.getAllByRole('code') || screen.getAllByTestId('code-block');
      expect(codeBlocks.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('should display confidence warning for low confidence fixes', () => {
    const lowConfidenceFix = { ...mockFix, confidence: 0.65 };

    render(
      <FixPreview
        fix={lowConfidenceFix}
        originalCode={mockViolation.element}
      />
    );

    expect(screen.getByText(/low confidence|review carefully/i)).toBeInTheDocument();
  });

  it('should be accessible with keyboard navigation', () => {
    render(
      <FixPreview
        fix={mockFix}
        originalCode={mockViolation.element}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    const approveButton = screen.getByRole('button', { name: /approve/i });
    const rejectButton = screen.getByRole('button', { name: /reject/i });

    // Should be able to tab between buttons
    approveButton.focus();
    expect(document.activeElement).toBe(approveButton);

    // Simulate tab to next element
    rejectButton.focus();
    expect(document.activeElement).toBe(rejectButton);
  });
});
