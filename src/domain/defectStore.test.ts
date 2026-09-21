import { createDefect } from './defect';
import { addDefect, deleteDefect, getDefectById, listDefectsForReporter, _reset } from './defectStore';

beforeEach(() => _reset());

test('AC1: deleted defect is absent from the submitting reporter list', () => {
  const defect = createDefect({ title: 'Crash on save' }, 'Reporter');
  addDefect(defect, 'defect-1', 'reporter-1');

  deleteDefect('defect-1', 'Admin');

  const list = listDefectsForReporter('reporter-1');
  expect(list.find((d) => d.id === 'defect-1')).toBeUndefined();
});

test('AC2: direct access to a deleted defect resolves to not-found', () => {
  const defect = createDefect({ title: 'Crash on save' }, 'Reporter');
  addDefect(defect, 'defect-1', 'reporter-1');
  deleteDefect('defect-1', 'Admin');

  expect(getDefectById('defect-1')).toBeUndefined();
});

test('AC3: deleted-defect lookup reveals nothing and matches a never-existed lookup', () => {
  const defect = createDefect({ title: 'Crash on save' }, 'Reporter');
  addDefect(defect, 'defect-1', 'reporter-1');
  deleteDefect('defect-1', 'Admin');

  const deletedResult = getDefectById('defect-1');
  const neverExistedResult = getDefectById('does-not-exist');

  expect(deletedResult).toBeUndefined();
  expect(deletedResult).toEqual(neverExistedResult);
});

test('non-Admin role cannot delete a defect', () => {
  const defect = createDefect({ title: 'Crash on save' }, 'Reporter');
  addDefect(defect, 'defect-1', 'reporter-1');

  expect(() => deleteDefect('defect-1', 'Reporter')).toThrow();
  expect(getDefectById('defect-1')).toBeDefined();
});
