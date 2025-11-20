import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ConsultantApprovalDashboard } from './ConsultantApprovalDashboard';

expect.extend(toHaveNoViolations);

test('dashboard has no critical a11y violations', async () => {
  const { container } = render(<ConsultantApprovalDashboard />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
