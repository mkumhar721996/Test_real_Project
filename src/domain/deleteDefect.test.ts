import { deleteDefect, NotAuthorizedError } from './deleteDefect';
import { Role } from './roles';

test('permanently removes the defect and its comments', () => {
  const defects = [{ id: 'DEF-1', status: 'Open' }];
  const comments = [
    { id: 'C-1', defectId: 'DEF-1' },
    { id: 'C-2', defectId: 'DEF-2' },
  ];
  const result = deleteDefect(defects, comments, 'DEF-1', 'Admin');
  expect(result.defects.find((d) => d.id === 'DEF-1')).toBeUndefined();
  expect(result.comments.filter((c) => c.defectId === 'DEF-1')).toHaveLength(0);
});

test('the returned defect collection no longer contains the deleted defect', () => {
  const defects = [
    { id: 'DEF-1', status: 'Open' },
    { id: 'DEF-2', status: 'Open' },
  ];
  const result = deleteDefect(defects, [], 'DEF-1', 'Admin');
  expect(result.defects.map((d) => d.id)).toEqual(['DEF-2']);
});

test.each(["Won't Fix", 'Closed'])(
  'allows deleting a defect in terminal status %s',
  (status) => {
    const result = deleteDefect([{ id: 'DEF-1', status }], [], 'DEF-1', 'Admin');
    expect(result.defects).toHaveLength(0);
  }
);

test.each(['Reporter', 'Developer'] as const)(
  'rejects deletion attempted by a %s',
  (role) => {
    expect(() =>
      deleteDefect([{ id: 'DEF-1', status: 'Open' }], [], 'DEF-1', role)
    ).toThrow(NotAuthorizedError);
  }
);

test.each(['admin', 'ADMIN', '', 'SuperAdmin'] as unknown as Role[])(
  'rejects a forged or malformed role value %p at the domain boundary',
  (role) => {
    expect(() =>
      deleteDefect([{ id: 'DEF-1', status: 'Open' }], [], 'DEF-1', role)
    ).toThrow(NotAuthorizedError);
  }
);

test('leaves the original defects and comments arrays untouched when rejected', () => {
  const defects = [{ id: 'DEF-1', status: 'Open' }];
  const comments = [{ id: 'C-1', defectId: 'DEF-1' }];
  expect(() => deleteDefect(defects, comments, 'DEF-1', 'Reporter')).toThrow(
    NotAuthorizedError
  );
  expect(defects).toHaveLength(1);
  expect(comments).toHaveLength(1);
});

test('does not remove defects or comments belonging to a different defect id', () => {
  const defects = [
    { id: 'DEF-1', status: 'Open' },
    { id: 'DEF-2', status: 'Open' },
  ];
  const comments = [
    { id: 'C-1', defectId: 'DEF-1' },
    { id: 'C-2', defectId: 'DEF-2' },
  ];
  const result = deleteDefect(defects, comments, 'DEF-1', 'Admin');
  expect(result.defects.map((d) => d.id)).toEqual(['DEF-2']);
  expect(result.comments.map((c) => c.id)).toEqual(['C-2']);
});
