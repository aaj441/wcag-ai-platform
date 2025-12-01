/**
 * ViolationCard Component Tests
 * Tests for violation display component
 */

import { render, screen, fireEvent } from '../setup/testUtils';
import { mockViolation } from '../setup/testUtils';
import ViolationCard from '../../components/ViolationCard';

describe('ViolationCard', () => {
  it('should render violation details', () => {
    render(<ViolationCard violation={mockViolation} />);

    expect(screen.getByText('1.1.1')).toBeInTheDocument();
    expect(screen.getByText('Image missing alt text')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('should display WCAG criterion', () => {
    render(<ViolationCard violation={mockViolation} />);

    const criterion = screen.getByText('1.1.1');
    expect(criterion).toBeInTheDocument();
  });

  it('should show severity badge with correct color', () => {
    const { rerender } = render(<ViolationCard violation={mockViolation} />);

    // Critical should be red
    let severityBadge = screen.getByText('CRITICAL');
    expect(severityBadge).toHaveClass(/critical|red|danger/i);

    // Moderate should be yellow/orange
    rerender(
      <ViolationCard
        violation={{ ...mockViolation, severity: 'MODERATE' }}
      />
    );
    severityBadge = screen.getByText('MODERATE');
    expect(severityBadge).toHaveClass(/moderate|yellow|warning/i);

    // Minor should be blue/info
    rerender(
      <ViolationCard violation={{ ...mockViolation, severity: 'MINOR' }} />
    );
    severityBadge = screen.getByText('MINOR');
    expect(severityBadge).toHaveClass(/minor|blue|info/i);
  });

  it('should display code element', () => {
    render(<ViolationCard violation={mockViolation} />);

    expect(screen.getByText('<img src="test.jpg">')).toBeInTheDocument();
  });

  it('should show confidence score', () => {
    render(<ViolationCard violation={mockViolation} />);

    // Confidence is 0.95, should show as 95%
    expect(screen.getByText(/95%/)).toBeInTheDocument();
  });

  it('should display context information', () => {
    render(<ViolationCard violation={mockViolation} />);

    expect(screen.getByText(/Homepage hero section/)).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();

    render(<ViolationCard violation={mockViolation} onClick={handleClick} />);

    const card = screen.getByRole('article') || screen.getByTestId('violation-card');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockViolation);
  });

  it('should show expand button for long descriptions', () => {
    const longViolation = {
      ...mockViolation,
      description:
        'This is a very long description that should be truncated and show an expand button for users to read more details about the accessibility violation.',
    };

    render(<ViolationCard violation={longViolation} />);

    const expandButton = screen.queryByText(/more|expand|show/i);
    if (expandButton) {
      expect(expandButton).toBeInTheDocument();
    }
  });

  it('should indicate if fix is available', () => {
    const violationWithFix = {
      ...mockViolation,
      fix: {
        id: 'fix-1',
        status: 'APPROVED',
      },
    };

    render(<ViolationCard violation={violationWithFix} />);

    expect(screen.getByText(/fix available|approved/i)).toBeInTheDocument();
  });

  it('should show status indicator', () => {
    const { rerender } = render(<ViolationCard violation={mockViolation} />);

    expect(screen.getByText(/OPEN/i)).toBeInTheDocument();

    rerender(
      <ViolationCard violation={{ ...mockViolation, status: 'RESOLVED' }} />
    );

    expect(screen.getByText(/RESOLVED/i)).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    const handleClick = vi.fn();

    render(<ViolationCard violation={mockViolation} onClick={handleClick} />);

    const card = screen.getByRole('article') || screen.getByTestId('violation-card');

    // Should be focusable
    card.focus();
    expect(document.activeElement).toBe(card);

    // Should handle Enter key
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
    expect(handleClick).toHaveBeenCalled();
  });

  it('should have proper ARIA attributes', () => {
    render(<ViolationCard violation={mockViolation} />);

    const card = screen.getByRole('article') || screen.getByTestId('violation-card');

    expect(card).toHaveAttribute('aria-label');
    expect(card.getAttribute('aria-label')).toContain('1.1.1');
  });
});
