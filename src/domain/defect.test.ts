import {
  changeDefectStatus,
  createDefect,
  Defect,
  DefectStatus,
  InvalidStatusTransitionError,
} from './defect';

test('keeps assigneeId when created by an Admin', () => {
  const defect = createDefect({ title: 'Bug', assigneeId: 'user-42' }, 'Admin');
  expect(defect.assigneeId).toBe('user-42');
});

test.each(['Reporter', 'Developer'] as const)(
  'drops assigneeId when created by a %s',
  (role) => {
    const defect = createDefect({ title: 'Bug', assigneeId: 'user-42' }, role);
    expect(defect.assigneeId).toBeUndefined();
  }
);

test.each(['Reporter', 'Developer', 'Admin'] as const)(
  'keeps reporterId regardless of creator role (%s)',
  (role) => {
    const defect = createDefect({ title: 'Bug', reporterId: 'user-7' }, role);
    expect(defect.reporterId).toBe('user-7');
  }
);

test('new defects start in New status', () => {
  const defect = createDefect({ title: 'Bug' }, 'Reporter');
  expect(defect.status).toBe('New');
});

function defectAt(status: DefectStatus, assigneeId?: string): Defect {
  return { title: 'Bug', status, assigneeId };
}

test.each([
  { role: 'Developer', userId: 'dev-1' },
  { role: 'Admin', userId: 'admin-1' },
] as const)('AC1: New -> In Progress allowed for assigned $role', (actor) => {
  const defect = defectAt('New', 'dev-1');
  const result = changeDefectStatus(defect, 'In Progress', actor);
  expect(result.status).toBe('In Progress');
});

test.each([
  { role: 'Developer', userId: 'dev-1' },
  { role: 'Admin', userId: 'admin-1' },
] as const)('AC2: In Progress -> Fixed allowed for assigned $role', (actor) => {
  const defect = defectAt('In Progress', 'dev-1');
  const result = changeDefectStatus(defect, 'Fixed', actor);
  expect(result.status).toBe('Fixed');
});

test('AC3: Fixed -> Closed allowed for Admin', () => {
  const defect = defectAt('Fixed', 'dev-1');
  const result = changeDefectStatus(defect, 'Closed', { role: 'Admin', userId: 'admin-1' });
  expect(result.status).toBe('Closed');
});

test.each(['New', 'In Progress', 'Fixed'] as const)(
  "AC4: %s -> Won't Fix allowed for Admin",
  (status) => {
    const defect = defectAt(status, 'dev-1');
    const result = changeDefectStatus(defect, "Won't Fix", { role: 'Admin', userId: 'admin-1' });
    expect(result.status).toBe("Won't Fix");
  }
);

test('AC5: Closed -> New allowed for Admin', () => {
  const defect = defectAt('Closed', 'dev-1');
  const result = changeDefectStatus(defect, 'New', { role: 'Admin', userId: 'admin-1' });
  expect(result.status).toBe('New');
});

test.each([
  { role: 'Admin', userId: 'admin-1' },
  { role: 'Developer', userId: 'dev-1' },
  { role: 'Reporter', userId: 'rep-1' },
] as const)("AC6: Won't Fix rejects any change attempt by $role", (actor) => {
  const defect = defectAt("Won't Fix", 'dev-1');
  expect(() => changeDefectStatus(defect, 'New', actor)).toThrow(InvalidStatusTransitionError);
  expect(defect.status).toBe("Won't Fix");
});

test('AC7: unassigned Developer cannot change status', () => {
  const defect = defectAt('New', 'dev-1');
  expect(() =>
    changeDefectStatus(defect, 'In Progress', { role: 'Developer', userId: 'dev-2' })
  ).toThrow(InvalidStatusTransitionError);
  expect(defect.status).toBe('New');
});

test('AC8: Reporter cannot change status', () => {
  const defect = defectAt('New', 'dev-1');
  expect(() =>
    changeDefectStatus(defect, 'In Progress', { role: 'Reporter', userId: 'rep-1' })
  ).toThrow(InvalidStatusTransitionError);
  expect(defect.status).toBe('New');
});

test('AC9: assigned Developer cannot change status from Fixed', () => {
  const defect = defectAt('Fixed', 'dev-1');
  expect(() =>
    changeDefectStatus(defect, 'Closed', { role: 'Developer', userId: 'dev-1' })
  ).toThrow(InvalidStatusTransitionError);
  expect(defect.status).toBe('Fixed');
});

test("AC10: assigned Developer cannot mark a non-terminal defect Won't Fix", () => {
  const defect = defectAt('In Progress', 'dev-1');
  expect(() =>
    changeDefectStatus(defect, "Won't Fix", { role: 'Developer', userId: 'dev-1' })
  ).toThrow(InvalidStatusTransitionError);
  expect(defect.status).toBe('In Progress');
});

test('AC11: assigned Developer cannot reopen a Closed defect', () => {
  const defect = defectAt('Closed', 'dev-1');
  expect(() =>
    changeDefectStatus(defect, 'New', { role: 'Developer', userId: 'dev-1' })
  ).toThrow(InvalidStatusTransitionError);
  expect(defect.status).toBe('Closed');
});

test("AC12: Admin cannot mark a Closed defect Won't Fix", () => {
  const defect = defectAt('Closed', 'dev-1');
  expect(() =>
    changeDefectStatus(defect, "Won't Fix", { role: 'Admin', userId: 'admin-1' })
  ).toThrow(InvalidStatusTransitionError);
  expect(defect.status).toBe('Closed');
});

test.each([
  { role: 'Developer', userId: 'dev-1' },
  { role: 'Admin', userId: 'admin-1' },
] as const)('AC13: New cannot move directly to Fixed for $role', (actor) => {
  const defect = defectAt('New', 'dev-1');
  expect(() => changeDefectStatus(defect, 'Fixed', actor)).toThrow(InvalidStatusTransitionError);
  expect(defect.status).toBe('New');
});
