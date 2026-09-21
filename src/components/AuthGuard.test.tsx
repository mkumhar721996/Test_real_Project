import { render, screen } from '@testing-library/react';
import { AuthGuard } from './AuthGuard';
import { DefectForm } from './DefectForm';

test('redirects to login and does not render the defect creation form when not authenticated', () => {
  const onUnauthenticated = jest.fn();
  render(
    <AuthGuard isAuthenticated={false} onUnauthenticated={onUnauthenticated}>
      <DefectForm role="Reporter" onSubmit={jest.fn()} />
    </AuthGuard>
  );
  expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: /create defect/i })).not.toBeInTheDocument();
});

test('renders the defect creation form and does not redirect when authenticated', () => {
  const onUnauthenticated = jest.fn();
  render(
    <AuthGuard isAuthenticated onUnauthenticated={onUnauthenticated}>
      <DefectForm role="Reporter" onSubmit={jest.fn()} />
    </AuthGuard>
  );
  expect(onUnauthenticated).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /create defect/i })).toBeInTheDocument();
});
