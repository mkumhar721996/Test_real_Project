import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DefectForm } from './DefectForm.jsx';

describe('DefectForm', () => {
  test('renders a field for every piece of information required to create a defect', () => {
    render(<DefectForm onSubmitSuccess={() => {}} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/severity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  test('blocks submission and shows a validation error when title is left empty', async () => {
    const onSubmitSuccess = vi.fn();
    render(<DefectForm onSubmitSuccess={onSubmitSuccess} />);

    await userEvent.type(screen.getByLabelText(/description/i), 'Cannot log in');
    await userEvent.selectOptions(screen.getByLabelText(/severity/i), 'High');
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'High');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    expect(onSubmitSuccess).not.toHaveBeenCalled();
  });

  test('submits successfully when all required fields are filled', async () => {
    const onSubmitSuccess = vi.fn();
    const createdDefect = { id: '1', title: 'Login fails', status: 'New' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => createdDefect,
    });

    render(<DefectForm onSubmitSuccess={onSubmitSuccess} />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Login fails');
    await userEvent.type(screen.getByLabelText(/description/i), 'Cannot log in');
    await userEvent.selectOptions(screen.getByLabelText(/severity/i), 'High');
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'High');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmitSuccess).toHaveBeenCalledWith(createdDefect);
  });
});
