import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AuthGuard } from './AuthGuard';
import { DefectForm } from './DefectForm';

function UnauthenticatedWithRerenderingParent({
  onUnauthenticated,
}: {
  onUnauthenticated: () => void;
}) {
  const [, forceRerender] = useState(0);
  return (
    <>
      <button onClick={() => forceRerender((n) => n + 1)}>rerender</button>
      <AuthGuard isAuthenticated={false} onUnauthenticated={() => onUnauthenticated()}>
        <DefectForm role="Reporter" onSubmit={jest.fn()} />
      </AuthGuard>
    </>
  );
}

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

test('does not redirect again when the parent rerenders with a new inline callback', () => {
  const onUnauthenticated = jest.fn();
  render(<UnauthenticatedWithRerenderingParent onUnauthenticated={onUnauthenticated} />);
  expect(onUnauthenticated).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: /rerender/i }));

  expect(onUnauthenticated).toHaveBeenCalledTimes(1);
});
