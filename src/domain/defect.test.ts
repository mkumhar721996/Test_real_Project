import { createDefect, validateDefectInput } from './defect';

test('keeps assigneeId when created by an Admin', () => {
  const defect = createDefect({ title: 'Bug', description: 'Repro steps', assigneeId: 'user-42' }, 'Admin');
  expect(defect.assigneeId).toBe('user-42');
});

test.each(['Reporter', 'Developer'] as const)(
  'drops assigneeId when created by a %s',
  (role) => {
    const defect = createDefect({ title: 'Bug', description: 'Repro steps', assigneeId: 'user-42' }, role);
    expect(defect.assigneeId).toBeUndefined();
  }
);

test('flags an empty title and an empty description', () => {
  expect(validateDefectInput({ title: '', description: 'x' })).toEqual({
    title: 'Title is required.',
  });
  expect(validateDefectInput({ title: 'x', description: '' })).toEqual({
    description: 'Description is required.',
  });
});

test('returns no errors when both required fields are filled', () => {
  expect(validateDefectInput({ title: 'x', description: 'y' })).toEqual({});
});

test.each(['Admin', 'Reporter', 'Developer'] as const)(
  'always sets status to New regardless of role (%s)',
  (role) => {
    const defect = createDefect({ title: 'Bug', description: 'Repro steps' }, role);
    expect(defect.status).toBe('New');
  }
);
