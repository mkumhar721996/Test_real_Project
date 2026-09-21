import { useState } from 'react';
import {
  createEmployee,
  Employee,
  EmployeeInput,
  EmployeeRole,
  updateEmployee,
} from '../domain/employee';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeList } from './EmployeeList';

export interface EmployeeManagerProps {
  role: EmployeeRole;
  initialEmployees?: Employee[];
}

type Screen = 'list' | 'add' | 'edit';

export function EmployeeManager({ role, initialEmployees = [] }: EmployeeManagerProps): JSX.Element {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [screen, setScreen] = useState<Screen>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleAdd(input: EmployeeInput) {
    const employee = createEmployee(input, role, employees);
    setEmployees((prev) => [employee, ...prev]);
    setScreen('list');
  }

  function handleEditSubmit(input: EmployeeInput) {
    const existing = employees.find((e) => e.id === editingId);
    if (!existing) return;
    const updated = updateEmployee(existing, input);
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setScreen('list');
  }

  if (screen === 'add') {
    if (role !== 'HR Admin') {
      return (
        <div className="access-denied visible">
          <span className="icon" aria-hidden="true">
            🚫
          </span>
          <h2>You don't have permission to create employee records</h2>
          <p>Creating employee records requires the HR Admin role.</p>
          <button type="button" className="btn btn-secondary" onClick={() => setScreen('list')}>
            Back to employee list
          </button>
        </div>
      );
    }

    return <EmployeeForm mode="add" onSubmit={handleAdd} onCancel={() => setScreen('list')} />;
  }

  if (screen === 'edit') {
    const existing = employees.find((e) => e.id === editingId) as Employee;
    const { id, badge, ...initialValues } = existing;
    return (
      <EmployeeForm
        mode="edit"
        initialValues={initialValues}
        onSubmit={handleEditSubmit}
        onCancel={() => setScreen('list')}
      />
    );
  }

  return (
    <EmployeeList
      employees={employees}
      onAddEmployee={() => setScreen('add')}
      onEditEmployee={(id) => {
        setEditingId(id);
        setScreen('edit');
      }}
    />
  );
}
