import { fireEvent, render, screen } from '@testing-library/react';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeInput } from '../domain/employee';

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jordan' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Blake' } });
  fireEvent.change(screen.getByLabelText(/work email/i), {
    target: { value: 'jordan.blake@peoplehub.com' },
  });
  fireEvent.change(screen.getByLabelText(/^department/i), { target: { value: 'Customer Success' } });
  fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Support Specialist' } });
  fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-09-21' } });
}

test('AC1: submitting with every required field filled calls onSubmit with the entered values', () => {
  const onSubmit = jest.fn();
  render(<EmployeeForm mode="add" onSubmit={onSubmit} onCancel={jest.fn()} />);
  fillRequiredFields();
  fireEvent.click(screen.getByRole('button', { name: /create employee/i }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining<Partial<EmployeeInput>>({
      firstName: 'Jordan',
      lastName: 'Blake',
      email: 'jordan.blake@peoplehub.com',
      department: 'Customer Success',
      jobTitle: 'Support Specialist',
      startDate: '2026-09-21',
    })
  );
});

test('AC2: submitting with a required field blank shows an inline error and does not call onSubmit', () => {
  const onSubmit = jest.fn();
  render(<EmployeeForm mode="add" onSubmit={onSubmit} onCancel={jest.fn()} />);
  fillRequiredFields();
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: /create employee/i }));

  expect(screen.getByText('Last name is required.')).toBeVisible();
  expect(screen.getByText("Couldn't create employee")).toBeVisible();
  expect(onSubmit).not.toHaveBeenCalled();
});

test('AC2: edit mode shows the "Couldn\'t save changes" banner heading', () => {
  const onSubmit = jest.fn();
  render(
    <EmployeeForm
      mode="edit"
      onSubmit={onSubmit}
      onCancel={jest.fn()}
      initialValues={{
        firstName: 'Priya',
        lastName: 'Natarajan',
        email: 'priya.natarajan@peoplehub.com',
        department: 'People Operations',
        jobTitle: 'HR Coordinator',
        startDate: '2023-03-06',
      }}
    />
  );
  fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

  expect(screen.getByText("Couldn't save changes")).toBeVisible();
  expect(screen.getByText('Work email is required.')).toBeVisible();
  expect(onSubmit).not.toHaveBeenCalled();
});

test('renders initial values in edit mode and submits the edited value', () => {
  const onSubmit = jest.fn();
  render(
    <EmployeeForm
      mode="edit"
      onSubmit={onSubmit}
      onCancel={jest.fn()}
      initialValues={{
        firstName: 'Priya',
        lastName: 'Natarajan',
        email: 'priya.natarajan@peoplehub.com',
        department: 'People Operations',
        jobTitle: 'HR Coordinator',
        startDate: '2023-03-06',
      }}
    />
  );
  expect(screen.getByLabelText(/first name/i)).toHaveValue('Priya');
  fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Senior HR Coordinator' } });
  fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ jobTitle: 'Senior HR Coordinator' })
  );
});

test('required fields carry a required marker, optional fields do not', () => {
  render(<EmployeeForm mode="add" onSubmit={jest.fn()} onCancel={jest.fn()} />);
  expect(screen.getByText(/first name/i).textContent).toContain('*');
  expect(screen.getByText(/^manager$/i).textContent).not.toContain('*');
});

test('calls onCancel when Cancel is clicked', () => {
  const onCancel = jest.fn();
  render(<EmployeeForm mode="add" onSubmit={jest.fn()} onCancel={onCancel} />);
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
  expect(onCancel).toHaveBeenCalled();
});
