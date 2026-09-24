import { fireEvent, render, screen } from '@testing-library/react';
import { EmployeeList } from './EmployeeList';
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

function jordanFixture(): Employee {
  return {
    id: 'EMP-1004',
    firstName: 'Jordan',
    lastName: 'Blake',
    email: 'jordan.blake@peoplehub.com',
    department: 'Customer Success',
    jobTitle: 'Support Specialist',
    startDate: '2026-09-21',
  };
}

test('AC3: renders every employee passed in, including a newly created one', () => {
  const employees = [priyaFixture(), { ...jordanFixture(), badge: 'New' as const }];
  render(
    <EmployeeList
      employees={employees}
      onAddEmployee={jest.fn()}
      onEditEmployee={jest.fn()}
      onViewEmployee={jest.fn()}
    />
  );
  expect(screen.getByText('Jordan Blake')).toBeInTheDocument();
  expect(screen.getByText('Priya Natarajan')).toBeInTheDocument();
});

test('AC3: shows a "New" chip next to a newly created employee', () => {
  const employees = [{ ...jordanFixture(), badge: 'New' as const }];
  render(
    <EmployeeList
      employees={employees}
      onAddEmployee={jest.fn()}
      onEditEmployee={jest.fn()}
      onViewEmployee={jest.fn()}
    />
  );
  expect(screen.getByText('New')).toBeInTheDocument();
});

test('AC5: shows an "Updated" chip next to a just-edited employee', () => {
  const employees = [{ ...priyaFixture(), badge: 'Updated' as const }];
  render(
    <EmployeeList
      employees={employees}
      onAddEmployee={jest.fn()}
      onEditEmployee={jest.fn()}
      onViewEmployee={jest.fn()}
    />
  );
  expect(screen.getByText('Updated')).toBeInTheDocument();
});

test('renders the table columns for each employee', () => {
  render(
    <EmployeeList
      employees={[priyaFixture()]}
      onAddEmployee={jest.fn()}
      onEditEmployee={jest.fn()}
      onViewEmployee={jest.fn()}
    />
  );
  expect(screen.getByText('EMP-1001')).toBeInTheDocument();
  expect(screen.getByText('People Operations')).toBeInTheDocument();
  expect(screen.getByText('HR Coordinator')).toBeInTheDocument();
  expect(screen.getByText('2023-03-06')).toBeInTheDocument();
});

test('calls onAddEmployee when "+ Add employee" is clicked', () => {
  const onAddEmployee = jest.fn();
  render(
    <EmployeeList
      employees={[]}
      onAddEmployee={onAddEmployee}
      onEditEmployee={jest.fn()}
      onViewEmployee={jest.fn()}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
  expect(onAddEmployee).toHaveBeenCalled();
});

test('calls onEditEmployee with the row id when Edit is clicked', () => {
  const onEditEmployee = jest.fn();
  render(
    <EmployeeList
      employees={[priyaFixture()]}
      onAddEmployee={jest.fn()}
      onEditEmployee={onEditEmployee}
      onViewEmployee={jest.fn()}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /edit/i }));
  expect(onEditEmployee).toHaveBeenCalledWith('EMP-1001');
});

test('calls onViewEmployee with the row id when View is clicked', () => {
  const onViewEmployee = jest.fn();
  render(
    <EmployeeList
      employees={[priyaFixture()]}
      onAddEmployee={jest.fn()}
      onEditEmployee={jest.fn()}
      onViewEmployee={onViewEmployee}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'View' }));
  expect(onViewEmployee).toHaveBeenCalledWith('EMP-1001');
});
