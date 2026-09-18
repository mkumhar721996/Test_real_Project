import { FormEvent, useState } from 'react';
import { Role } from '../domain/roles';
import { Defect, createDefect } from '../domain/defect';

export interface DefectFormProps {
  role: Role;
  onSubmit: (defect: Defect) => void;
}

export function DefectForm({ role, onSubmit }: DefectFormProps): JSX.Element {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(createDefect({ title, assigneeId: assigneeId || undefined }, role));
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
