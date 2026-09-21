import { render, screen } from '@testing-library/react';
import { DefectForm } from './DefectForm';

test.each(['Reporter', 'Developer'] as const)(
  'does not render an assignee field for %s',
  (role) => {
    render(<DefectForm role={role} currentUserId="user-1" onSubmit={jest.fn()} />);
    expect(screen.queryByLabelText(/assignee/i)).not.toBeInTheDocument();
  }
);

test('renders an editable assignee field for Admin', () => {
  render(<DefectForm role="Admin" currentUserId="admin-1" onSubmit={jest.fn()} />);
  const field = screen.getByLabelText(/assignee/i);
  expect(field).toBeInTheDocument();
  expect(field).toBeEnabled();
});
