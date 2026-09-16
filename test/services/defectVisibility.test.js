import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getVisibleDefects } from '../../src/services/defectVisibility.js';

test('AC1: returns only defects submitted by the reporter', () => {
  const reporter = { id: 'u1', role: 'reporter' };
  const defects = [
    { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: null, status: 'open' },
    { id: 'd2', title: 'B', submittedBy: 'u2', assignedTo: null, status: 'open' },
  ];
  assert.deepEqual(getVisibleDefects(reporter, defects), [defects[0]]);
});

test('AC2: returns only defects assigned to the developer', () => {
  const developer = { id: 'u2', role: 'developer' };
  const defects = [
    { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u2', status: 'open' },
    { id: 'd2', title: 'B', submittedBy: 'u1', assignedTo: 'u3', status: 'open' },
    { id: 'd3', title: 'C', submittedBy: 'u1', assignedTo: null, status: 'open' },
  ];
  assert.deepEqual(getVisibleDefects(developer, defects), [defects[0]]);
});

test('AC3: returns every defect for an admin', () => {
  const admin = { id: 'u9', role: 'admin' };
  const defects = [
    { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u2', status: 'open' },
    { id: 'd2', title: 'B', submittedBy: 'u2', assignedTo: null, status: 'open' },
  ];
  assert.deepEqual(getVisibleDefects(admin, defects), defects);
});

test('AC4: returns an empty array when the reporter has submitted nothing', () => {
  const reporter = { id: 'u1', role: 'reporter' };
  const defects = [
    { id: 'd1', title: 'A', submittedBy: 'u2', assignedTo: null, status: 'open' },
  ];
  assert.deepEqual(getVisibleDefects(reporter, defects), []);
});

test('AC5: returns an empty array when the developer has no assigned defects', () => {
  const developer = { id: 'u2', role: 'developer' };
  const defects = [
    { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u3', status: 'open' },
    { id: 'd2', title: 'B', submittedBy: 'u1', assignedTo: null, status: 'open' },
  ];
  assert.deepEqual(getVisibleDefects(developer, defects), []);
});

test('AC6: returns an empty array for an admin when no defects exist', () => {
  const admin = { id: 'u9', role: 'admin' };
  assert.deepEqual(getVisibleDefects(admin, []), []);
});
