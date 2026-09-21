import { Employee } from '../domain/employee';

export interface EmployeeListProps {
  employees: Employee[];
  onAddEmployee: () => void;
  onEditEmployee: (id: string) => void;
}

export function EmployeeList({ employees, onAddEmployee, onEditEmployee }: EmployeeListProps): JSX.Element {
  return (
    <div>
      <div className="screen-heading">
        <div>
          <h1>Employees</h1>
          <p className="screen-subtitle">Employee records at PeopleHub HR.</p>
        </div>
        <div>
          <button type="button" className="btn btn-primary" onClick={onAddEmployee}>
            + Add employee
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table className="employee-table">
          <caption className="visually-hidden">Employee records</caption>
          <thead>
            <tr>
              <th scope="col">Employee ID</th>
              <th scope="col">Name</th>
              <th scope="col">Department</th>
              <th scope="col">Job title</th>
              <th scope="col">Start date</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.id}</td>
                <td>
                  <div className="name-cell">
                    <span>
                      {employee.firstName} {employee.lastName}
                    </span>
                    {employee.badge && <span className="chip chip-primary">{employee.badge}</span>}
                  </div>
                </td>
                <td>{employee.department}</td>
                <td>{employee.jobTitle}</td>
                <td>{employee.startDate}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onEditEmployee(employee.id)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
