export type EmployeeRole = 'HR Admin' | 'Manager';

export interface EmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  jobTitle: string;
  startDate: string;
  employmentType?: string;
  manager?: string;
}

export interface Employee extends EmployeeInput {
  id: string;
  badge?: 'New' | 'Updated';
}

export const REQUIRED_EMPLOYEE_FIELDS: (keyof EmployeeInput)[] = [
  'firstName',
  'lastName',
  'email',
  'department',
  'jobTitle',
  'startDate',
];

export function validateEmployeeInput(input: Partial<EmployeeInput>): (keyof EmployeeInput)[] {
  return REQUIRED_EMPLOYEE_FIELDS.filter((field) => (input[field] ?? '').trim() === '');
}

export class EmployeeValidationError extends Error {
  constructor(public fields: (keyof EmployeeInput)[]) {
    super(`Missing required field(s): ${fields.join(', ')}`);
  }
}

export class EmployeeAccessDeniedError extends Error {}

function nextEmployeeId(existingEmployees: Employee[]): string {
  const highest = existingEmployees.reduce((max, employee) => {
    const match = /^EMP-(\d+)$/.exec(employee.id);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 1000);

  return `EMP-${highest + 1}`;
}

export function createEmployee(
  input: EmployeeInput,
  role: EmployeeRole,
  existingEmployees: Employee[]
): Employee {
  if (role !== 'HR Admin') {
    throw new EmployeeAccessDeniedError('Creating employee records requires the HR Admin role.');
  }

  const errors = validateEmployeeInput(input);
  if (errors.length > 0) {
    throw new EmployeeValidationError(errors);
  }

  return { ...input, id: nextEmployeeId(existingEmployees), badge: 'New' };
}

export function updateEmployee(existing: Employee, input: EmployeeInput, role: EmployeeRole): Employee {
  if (role !== 'HR Admin') {
    throw new EmployeeAccessDeniedError('Editing employee records requires the HR Admin role.');
  }

  const errors = validateEmployeeInput(input);
  if (errors.length > 0) {
    throw new EmployeeValidationError(errors);
  }

  return { ...existing, ...input, badge: 'Updated' };
}
