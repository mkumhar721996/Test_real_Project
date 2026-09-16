import { useState } from 'react';
import { createDefect } from '../api/defectsApi.js';

const REQUIRED_FIELDS = ['title', 'description', 'severity', 'priority'];
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

const INITIAL_VALUES = { title: '', description: '', severity: '', priority: '' };

function validate(values) {
  const errors = {};
  for (const field of REQUIRED_FIELDS) {
    if (!values[field]?.trim()) {
      errors[field] = `${field} is required`;
    }
  }
  return errors;
}

export function DefectForm({ onSubmitSuccess }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  function handleChange(field) {
    return (event) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setSubmitError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      const defect = await createDefect(values);
      onSubmitSuccess(defect);
      setValues(INITIAL_VALUES);
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setSubmitError('Failed to submit defect. Please try again.');
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="defect-title">Title</label>
        <input id="defect-title" value={values.title} onChange={handleChange('title')} />
        {errors.title && <span role="alert">{errors.title}</span>}
      </div>

      <div>
        <label htmlFor="defect-description">Description</label>
        <textarea id="defect-description" value={values.description} onChange={handleChange('description')} />
        {errors.description && <span role="alert">{errors.description}</span>}
      </div>

      <div>
        <label htmlFor="defect-severity">Severity</label>
        <select id="defect-severity" value={values.severity} onChange={handleChange('severity')}>
          <option value="">Select severity</option>
          {SEVERITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.severity && <span role="alert">{errors.severity}</span>}
      </div>

      <div>
        <label htmlFor="defect-priority">Priority</label>
        <select id="defect-priority" value={values.priority} onChange={handleChange('priority')}>
          <option value="">Select priority</option>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.priority && <span role="alert">{errors.priority}</span>}
      </div>

      {submitError && <span role="alert">{submitError}</span>}

      <button type="submit">Submit</button>
    </form>
  );
}
