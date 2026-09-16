import { createDefect } from './defect';

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
