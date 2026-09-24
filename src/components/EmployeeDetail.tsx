import { Employee } from '../domain/employee';

export interface EmployeeDetailProps {
  employee: Employee;
  onBack: () => void;
}

export function EmployeeDetail({ employee, onBack }: EmployeeDetailProps): JSX.Element {
  const initials = (employee.firstName[0] + employee.lastName[0]).toUpperCase();
  const manager = employee.manager && employee.manager.trim() !== '' ? employee.manager : 'Not set';

  return (
    <div>
      <p className="breadcrumb">
        <button type="button" className="linklike" onClick={onBack}>
          ← Employees
        </button>
      </p>
      <div className="detail-card">
        <div className="detail-header">
          <div className="detail-avatar" aria-hidden="true">
            {initials}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="screen-subtitle">{employee.id}</p>
          </div>
        </div>
        <dl className="detail-grid">
          <div>
            <dt>Work email</dt>
            <dd>{employee.email}</dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{employee.department}</dd>
          </div>
          <div>
            <dt>Job title</dt>
            <dd>{employee.jobTitle}</dd>
          </div>
          <div>
            <dt>Employment type</dt>
            <dd>{employee.employmentType}</dd>
          </div>
          <div>
            <dt>Start date</dt>
            <dd>{employee.startDate}</dd>
          </div>
          <div>
            <dt>Manager</dt>
            <dd>{manager}</dd>
          </div>
          <div className="full-width">
            <dt>Record created</dt>
            <dd>{employee.createdAt}</dd>
          </div>
        </dl>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back to employee list
          </button>
        </div>
      </div>
    </div>
  );
}
