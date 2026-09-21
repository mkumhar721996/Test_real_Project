import { FormEvent, useState } from 'react';
import { EmployeeInput, validateEmployeeInput } from '../domain/employee';

export interface EmployeeFormProps {
  mode: 'add' | 'edit';
  initialValues?: EmployeeInput;
  onSubmit: (input: EmployeeInput) => void;
  onCancel: () => void;
}

const EMPTY_VALUES: EmployeeInput = {
  firstName: '',
  lastName: '',
  email: '',
  department: '',
  jobTitle: '',
  startDate: '',
  employmentType: 'Full-time',
  manager: '',
};

const FIELD_LABELS: Record<keyof EmployeeInput, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Work email',
  department: 'Department',
  jobTitle: 'Job title',
  startDate: 'Start date',
  employmentType: 'Employment type',
  manager: 'Manager',
};

const DEPARTMENTS = [
  'People Operations',
  'Engineering',
  'Finance',
  'Sales',
  'Marketing',
  'Customer Success',
];

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract'];

export function EmployeeForm({ mode, initialValues, onSubmit, onCancel }: EmployeeFormProps): JSX.Element {
  const [values, setValues] = useState<EmployeeInput>({ ...EMPTY_VALUES, ...initialValues });
  const [errorFields, setErrorFields] = useState<(keyof EmployeeInput)[]>([]);

  function setField(field: keyof EmployeeInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateEmployeeInput(values);
    setErrorFields(errors);
    if (errors.length > 0) return;
    onSubmit(values);
  }

  function hasError(field: keyof EmployeeInput) {
    return errorFields.includes(field);
  }

  function requiredLabel(field: keyof EmployeeInput) {
    return (
      <>
        {FIELD_LABELS[field]} <span className="required-mark">*</span>
      </>
    );
  }

  const bannerHeading = mode === 'add' ? "Couldn't create employee" : "Couldn't save changes";
  const submitLabel = mode === 'add' ? 'Create employee' : 'Save changes';

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorFields.length > 0 && (
        <div className="form-error-banner visible">
          <h2>{bannerHeading}</h2>
          <p>Fix the highlighted field(s) below and try again.</p>
        </div>
      )}

      <div className="form-grid">
        <div className={`form-field${hasError('firstName') ? ' has-error' : ''}`}>
          <label className="form-label" htmlFor="firstName">
            {requiredLabel('firstName')}
          </label>
          <input
            className="form-input"
            id="firstName"
            type="text"
            autoComplete="given-name"
            value={values.firstName}
            onChange={(event) => setField('firstName', event.target.value)}
          />
          {hasError('firstName') && <span className="field-error-text">First name is required.</span>}
        </div>

        <div className={`form-field${hasError('lastName') ? ' has-error' : ''}`}>
          <label className="form-label" htmlFor="lastName">
            {requiredLabel('lastName')}
          </label>
          <input
            className="form-input"
            id="lastName"
            type="text"
            autoComplete="family-name"
            value={values.lastName}
            onChange={(event) => setField('lastName', event.target.value)}
          />
          {hasError('lastName') && <span className="field-error-text">Last name is required.</span>}
        </div>

        <div className={`form-field full-width${hasError('email') ? ' has-error' : ''}`}>
          <label className="form-label" htmlFor="email">
            {requiredLabel('email')}
          </label>
          <input
            className="form-input"
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => setField('email', event.target.value)}
          />
          {hasError('email') && <span className="field-error-text">Work email is required.</span>}
        </div>

        <div className={`form-field${hasError('department') ? ' has-error' : ''}`}>
          <label className="form-label" htmlFor="department">
            {requiredLabel('department')}
          </label>
          <select
            className="form-input"
            id="department"
            value={values.department}
            onChange={(event) => setField('department', event.target.value)}
          >
            <option value="">Select a department</option>
            {DEPARTMENTS.map((department) => (
              <option key={department}>{department}</option>
            ))}
          </select>
          {hasError('department') && <span className="field-error-text">Department is required.</span>}
        </div>

        <div className={`form-field${hasError('jobTitle') ? ' has-error' : ''}`}>
          <label className="form-label" htmlFor="jobTitle">
            {requiredLabel('jobTitle')}
          </label>
          <input
            className="form-input"
            id="jobTitle"
            type="text"
            value={values.jobTitle}
            onChange={(event) => setField('jobTitle', event.target.value)}
          />
          {hasError('jobTitle') && <span className="field-error-text">Job title is required.</span>}
        </div>

        <div className={`form-field${hasError('startDate') ? ' has-error' : ''}`}>
          <label className="form-label" htmlFor="startDate">
            {requiredLabel('startDate')}
          </label>
          <input
            className="form-input"
            id="startDate"
            type="date"
            value={values.startDate}
            onChange={(event) => setField('startDate', event.target.value)}
          />
          {hasError('startDate') && <span className="field-error-text">Start date is required.</span>}
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="employmentType">
            {FIELD_LABELS.employmentType}
          </label>
          <select
            className="form-input"
            id="employmentType"
            value={values.employmentType}
            onChange={(event) => setField('employmentType', event.target.value)}
          >
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="manager">
            {FIELD_LABELS.manager}
          </label>
          <input
            className="form-input"
            id="manager"
            type="text"
            value={values.manager}
            onChange={(event) => setField('manager', event.target.value)}
          />
          <span className="field-hint">Optional</span>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
