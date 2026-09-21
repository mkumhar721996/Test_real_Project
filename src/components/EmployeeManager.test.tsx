import { fireEvent, render, screen } from '@testing-library/react';
import { EmployeeManager } from './EmployeeManager';
import { Employee } from '../domain/employee';

function priyaFixture(): Employee {
  return {
    id: 'EMP-1001',
    firstName: 'Priya',
    lastName: 'Natarajan',
    email: 'priya.natarajan@peoplehub.com',
    department: 'People Operations',
    jobTitle: 'HR Coordinator',
    startDate: '2023-03-06',
  };
}

function fillAddForm() {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jordan' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Blake' } });
  fireEvent.change(screen.getByLabelText(/work email/i), {
    target: { value: 'jordan.blake@peoplehub.com' },
  });
  fireEvent.change(screen.getByLabelText(/^department/i), { target: { value: 'Customer Success' } });
  fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Support Specialist' } });
  fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-09-21' } });
}

test('AC1: HR Admin creates an employee and it appears in the employee list', () => {
  render(<EmployeeManager role="HR Admin" />);
  fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
  fillAddForm();
  fireEvent.click(screen.getByRole('button', { name: /create employee/i }));
  expect(screen.getByText('Jordan Blake')).toBeInTheDocument();
});

test('AC2: submitting the add form with a required field blank keeps the HR Admin on the form', () => {
  render(<EmployeeManager role="HR Admin" />);
  fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
  fillAddForm();
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: /create employee/i }));
  expect(screen.getByText('Last name is required.')).toBeVisible();
  expect(screen.queryByText('Jordan Blake')).not.toBeInTheDocument();
});

test('AC4: a non-HR-Admin sees an access-denied panel instead of the add form', () => {
  render(<EmployeeManager role="Manager" />);
  fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
  expect(screen.getByText(/you don't have permission to create employee records/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
});

test('AC4: the access-denied panel can navigate back to the employee list', () => {
  render(<EmployeeManager role="Manager" initialEmployees={[priyaFixture()]} />);
  fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
  fireEvent.click(screen.getByRole('button', { name: /back to employee list/i }));
  expect(screen.getByText('Priya Natarajan')).toBeInTheDocument();
});

test('AC5: editing an existing employee updates the list', () => {
  render(<EmployeeManager role="HR Admin" initialEmployees={[priyaFixture()]} />);
  fireEvent.click(screen.getByRole('button', { name: /edit/i }));
  fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Senior HR Coordinator' } });
  fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
  expect(screen.getByText('Senior HR Coordinator')).toBeInTheDocument();
});
