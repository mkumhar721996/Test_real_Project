import { fireEvent, render, screen } from '@testing-library/react';
import { DefectForm } from './DefectForm';

test('renders fields for all information required to create a defect', () => {
  render(<DefectForm role="Reporter" onSubmit={jest.fn()} />);
  expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
});

test('blocks submission and shows a validation error when title is empty', () => {
  const handleSubmit = jest.fn();
  render(<DefectForm role="Reporter" onSubmit={handleSubmit} />);
  fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Repro steps' } });
  fireEvent.click(screen.getByRole('button', { name: /create defect/i }));
  expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  expect(handleSubmit).not.toHaveBeenCalled();
});

test('blocks submission and shows a validation error when description is empty', () => {
  const handleSubmit = jest.fn();
  render(<DefectForm role="Reporter" onSubmit={handleSubmit} />);
  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Bug' } });
  fireEvent.click(screen.getByRole('button', { name: /create defect/i }));
  expect(screen.getByText(/description is required/i)).toBeInTheDocument();
  expect(handleSubmit).not.toHaveBeenCalled();
});

test('submits a defect with status New once all required fields are filled', () => {
  const handleSubmit = jest.fn();
  render(<DefectForm role="Reporter" onSubmit={handleSubmit} />);
  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Bug' } });
  fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Repro steps' } });
  fireEvent.click(screen.getByRole('button', { name: /create defect/i }));
  expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: 'New' }));
});

test.each(['Reporter', 'Developer'] as const)(
  'does not render an assignee field for %s',
  (role) => {
    render(<DefectForm role={role} onSubmit={jest.fn()} />);
    expect(screen.queryByLabelText(/assignee/i)).not.toBeInTheDocument();
  }
);

test('renders an editable assignee field for Admin', () => {
  render(<DefectForm role="Admin" onSubmit={jest.fn()} />);
  const field = screen.getByLabelText(/assignee/i);
  expect(field).toBeInTheDocument();
  expect(field).toBeEnabled();
});
