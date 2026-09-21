import { FormEvent, useState } from 'react';
import { Role } from '../domain/roles';
import { Defect, DefectValidationErrors, createDefect, validateDefectInput } from '../domain/defect';

export interface DefectFormProps {
  role: Role;
  onSubmit: (defect: Defect) => void;
}

export function DefectForm({ role, onSubmit }: DefectFormProps): JSX.Element {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [errors, setErrors] = useState<DefectValidationErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { title, description, assigneeId: assigneeId || undefined };
    const validationErrors = validateDefectInput(input);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    onSubmit(createDefect(input, role));
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="title">Title</label>
      <input
        id="title"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      {errors.title && <span>{errors.title}</span>}

      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      {errors.description && <span>{errors.description}</span>}

      {role === 'Admin' && (
        <>
          <label htmlFor="assignee">Assignee</label>
          <select
            id="assignee"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
          >
            <option value="">Unassigned</option>
          </select>
        </>
      )}

      <button type="submit">Create Defect</button>
    </form>
  );
}
