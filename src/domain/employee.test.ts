import {
  createEmployee,
  Employee,
  EmployeeAccessDeniedError,
  EmployeeInput,
  EmployeeValidationError,
  updateEmployee,
  validateEmployeeInput,
} from './employee';

function validInput(): EmployeeInput {
  return {
    firstName: 'Jordan',
    lastName: 'Blake',
    email: 'jordan.blake@peoplehub.com',
    department: 'Customer Success',
    jobTitle: 'Support Specialist',
    startDate: '2026-09-21',
  };
}

test('AC1: HR Admin creates an employee with all required fields', () => {
  const employee = createEmployee(validInput(), 'HR Admin', []);
  expect(employee).toMatchObject(validInput());
  expect(employee.id).toMatch(/^EMP-\d+$/);
  expect(employee.badge).toBe('New');
});

test('AC1: id increments past the highest existing numeric suffix', () => {
  const existing: Employee[] = [
    { id: 'EMP-1001', ...validInput() },
    { id: 'EMP-1042', ...validInput() },
  ];
  const employee = createEmployee(validInput(), 'HR Admin', existing);
  expect(employee.id).toBe('EMP-1043');
});

test('AC1: id defaults to EMP-1001 when there are no existing employees', () => {
  const employee = createEmployee(validInput(), 'HR Admin', []);
  expect(employee.id).toBe('EMP-1001');
});

test('AC2: missing required field is rejected with the missing field name', () => {
  const input = { ...validInput(), lastName: '' };
  expect(() => createEmployee(input, 'HR Admin', [])).toThrow(EmployeeValidationError);
});

test('AC2: validateEmployeeInput flags blank and whitespace-only required fields', () => {
  const errors = validateEmployeeInput({ ...validInput(), lastName: '   ', email: '' });
  expect(errors).toEqual(expect.arrayContaining(['lastName', 'email']));
  expect(errors).toHaveLength(2);
});

test('AC2: validateEmployeeInput returns an empty array when all required fields are present', () => {
  expect(validateEmployeeInput(validInput())).toEqual([]);
});

test('AC4: a non-HR-Admin cannot create an employee record', () => {
  expect(() => createEmployee(validInput(), 'Manager', [])).toThrow(EmployeeAccessDeniedError);
});

test('AC4: access is denied before validation runs for a non-HR-Admin', () => {
  const invalidInput = { ...validInput(), lastName: '' };
  expect(() => createEmployee(invalidInput, 'Manager', [])).toThrow(EmployeeAccessDeniedError);
});

test('AC5: editing an existing employee persists the updated fields', () => {
  const existing: Employee = { id: 'EMP-1001', ...validInput(), badge: undefined };
  const updated = updateEmployee(
    existing,
    { ...validInput(), jobTitle: 'Senior Support Specialist' },
    'HR Admin'
  );
  expect(updated.jobTitle).toBe('Senior Support Specialist');
  expect(updated.id).toBe('EMP-1001');
  expect(updated.badge).toBe('Updated');
});

test('AC5: updateEmployee rejects a missing required field', () => {
  const existing: Employee = { id: 'EMP-1001', ...validInput() };
  expect(() =>
    updateEmployee(existing, { ...validInput(), firstName: '' }, 'HR Admin')
  ).toThrow(EmployeeValidationError);
});

test('security: a non-HR-Admin cannot update an existing employee record', () => {
  const existing: Employee = { id: 'EMP-1001', ...validInput() };
  expect(() =>
    updateEmployee(existing, { ...validInput(), jobTitle: 'Hacked Title' }, 'Manager')
  ).toThrow(EmployeeAccessDeniedError);
});

test('security: access is denied before validation runs for a non-HR-Admin update', () => {
  const existing: Employee = { id: 'EMP-1001', ...validInput() };
  const invalidInput = { ...validInput(), firstName: '' };
  expect(() => updateEmployee(existing, invalidInput, 'Manager')).toThrow(
    EmployeeAccessDeniedError
  );
});
