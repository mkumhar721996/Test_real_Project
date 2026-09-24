import { fireEvent, render, screen } from '@testing-library/react';
import { EmployeeDetail } from './EmployeeDetail';
import { Employee } from '../domain/employee';

function jordanFixture(): Employee {
  return {
    id: 'EMP-1004',
    firstName: 'Jordan',
    lastName: 'Blake',
    email: 'jordan.blake@peoplehub.com',
    department: 'Customer Success',
    jobTitle: 'Support Specialist',
    startDate: '2026-09-21',
    employmentType: 'Full-time',
    manager: 'Dana Okafor',
    createdAt: '2026-09-21T10:00:00.000Z',
    badge: 'New',
  };
}

test('AC3: displays every entered employee detail accurately', () => {
  render(<EmployeeDetail employee={jordanFixture()} onBack={jest.fn()} />);
  expect(screen.getByRole('heading', { name: 'Jordan Blake' })).toBeInTheDocument();
  expect(screen.getByText('EMP-1004')).toBeInTheDocument();
  expect(screen.getByText('jordan.blake@peoplehub.com')).toBeInTheDocument();
  expect(screen.getByText('Customer Success')).toBeInTheDocument();
  expect(screen.getByText('Support Specialist')).toBeInTheDocument();
  expect(screen.getByText('Full-time')).toBeInTheDocument();
  expect(screen.getByText('2026-09-21')).toBeInTheDocument();
  expect(screen.getByText('Dana Okafor')).toBeInTheDocument();
});

test('AC3: shows "Not set" when the optional manager field was left blank', () => {
  render(<EmployeeDetail employee={{ ...jordanFixture(), manager: '' }} onBack={jest.fn()} />);
  expect(screen.getByText('Not set')).toBeInTheDocument();
});

test('calls onBack when "Back to employee list" is clicked', () => {
  const onBack = jest.fn();
  render(<EmployeeDetail employee={jordanFixture()} onBack={onBack} />);
  fireEvent.click(screen.getByRole('button', { name: /back to employee list/i }));
  expect(onBack).toHaveBeenCalled();
});
