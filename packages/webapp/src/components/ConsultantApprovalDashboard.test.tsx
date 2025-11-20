import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConsultantApprovalDashboard } from './ConsultantApprovalDashboard';

test('renders dashboard', () => {
  render(<ConsultantApprovalDashboard />);
  // Look for a common heading/label present in the component
  expect(screen.getByText(/Email/i)).toBeInTheDocument();
});
