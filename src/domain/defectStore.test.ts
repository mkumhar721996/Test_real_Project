import { createDefect } from './defect';
import { addDefect, deleteDefect, getDefectById, listDefectsForReporter, _reset } from './defectStore';

beforeEach(() => _reset());

test('AC1: deleted defect is absent from the submitting reporter list', () => {
  const defect = createDefect({ title: 'Crash on save' }, 'Reporter');
  addDefect(defect, 'defect-1', 'reporter-1');

  deleteDefect('defect-1');

  const list = listDefectsForReporter('reporter-1');
  expect(list.find((d) => d.id === 'defect-1')).toBeUndefined();
});

test('AC2: direct access to a deleted defect resolves to not-found', () => {
  const defect = createDefect({ title: 'Crash on save' }, 'Reporter');
  addDefect(defect, 'defect-1', 'reporter-1');
  deleteDefect('defect-1');

  expect(getDefectById('defect-1')).toBeUndefined();
});

test('AC3: deleted-defect lookup reveals nothing and matches a never-existed lookup', () => {
  const defect = createDefect({ title: 'Crash on save' }, 'Reporter');
  addDefect(defect, 'defect-1', 'reporter-1');
  deleteDefect('defect-1');

  const deletedResult = getDefectById('defect-1');
  const neverExistedResult = getDefectById('does-not-exist');

  expect(deletedResult).toBeUndefined();
  expect(deletedResult).toEqual(neverExistedResult);
});
