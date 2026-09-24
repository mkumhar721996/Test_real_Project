import { useState } from 'react';
import {
  createEmployee,
  Employee,
  EmployeeInput,
  EmployeeRole,
  updateEmployee,
} from '../domain/employee';
import { EmployeeDetail } from './EmployeeDetail';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeList } from './EmployeeList';

export interface EmployeeManagerProps {
  role: EmployeeRole;
  initialEmployees?: Employee[];
}

type Screen = 'list' | 'add' | 'edit' | 'view';

interface AccessDeniedPanelProps {
  action: 'create' | 'edit';
  onBack: () => void;
}

function AccessDeniedPanel({ action, onBack }: AccessDeniedPanelProps): JSX.Element {
  return (
    <div className="access-denied visible">
      <span className="icon" aria-hidden="true">
        🚫
      </span>
      <h2>You don't have permission to {action} employee records</h2>
      <p>{action === 'create' ? 'Creating' : 'Editing'} employee records requires the HR Admin role.</p>
      <button type="button" className="btn btn-secondary" onClick={onBack}>
        Back to employee list
      </button>
    </div>
  );
}

export function EmployeeManager({ role, initialEmployees = [] }: EmployeeManagerProps): JSX.Element {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [screen, setScreen] = useState<Screen>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  function handleAdd(input: EmployeeInput) {
    const employee = createEmployee(input, role, employees);
    setEmployees((prev) => [employee, ...prev]);
    setScreen('list');
  }

  function handleEditSubmit(input: EmployeeInput) {
    const existing = employees.find((e) => e.id === editingId);
    if (!existing) return;
    const updated = updateEmployee(existing, input, role);
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setScreen('list');
  }

  if (screen === 'add') {
    if (role !== 'HR Admin') {
      return <AccessDeniedPanel action="create" onBack={() => setScreen('list')} />;
    }

    return <EmployeeForm mode="add" onSubmit={handleAdd} onCancel={() => setScreen('list')} />;
  }

  const viewingEmployee = screen === 'view' ? employees.find((e) => e.id === viewingId) : undefined;

  if (viewingEmployee) {
    return <EmployeeDetail employee={viewingEmployee} onBack={() => setScreen('list')} />;
  }

  const editingEmployee = screen === 'edit' ? employees.find((e) => e.id === editingId) : undefined;

  if (editingEmployee && role !== 'HR Admin') {
    return <AccessDeniedPanel action="edit" onBack={() => setScreen('list')} />;
  }

  if (editingEmployee) {
    const { id, badge, ...initialValues } = editingEmployee;
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
      onViewEmployee={(id) => {
        setViewingId(id);
        setScreen('view');
      }}
    />
  );
}
