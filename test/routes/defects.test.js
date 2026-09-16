import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import * as defectRepository from '../../src/repositories/defectRepository.js';
import * as userRepository from '../../src/repositories/userRepository.js';

const server = createApp();
let baseUrl = '';

await new Promise((resolve) => {
  server.listen(0, () => {
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
    resolve();
  });
});

after(() => {
  server.close();
});

beforeEach(() => {
  defectRepository.clear();
  userRepository.seed([
    { id: 'u1', role: 'reporter' },
    { id: 'u2', role: 'developer' },
    { id: 'u3', role: 'developer' },
    { id: 'u9', role: 'admin' },
  ]);
});

function getDefects(userId) {
  return fetch(`${baseUrl}/defects`, {
    headers: { 'x-user-id': userId },
  });
}

test('AC1: reporter sees only their own submitted defects, in list and count', async () => {
  const d1 = { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: null, status: 'open' };
  const d2 = { id: 'd2', title: 'B', submittedBy: 'u2', assignedTo: null, status: 'open' };
  defectRepository.seed([d1, d2]);

  const res = await getDefects('u1');
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(body, { defects: [d1], count: 1 });
});

test('AC2: developer sees only defects assigned to them, no unassigned or others', async () => {
  const d1 = { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u2', status: 'open' };
  const d2 = { id: 'd2', title: 'B', submittedBy: 'u1', assignedTo: 'u3', status: 'open' };
  const d3 = { id: 'd3', title: 'C', submittedBy: 'u1', assignedTo: null, status: 'open' };
  defectRepository.seed([d1, d2, d3]);

  const res = await getDefects('u2');
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(body, { defects: [d1], count: 1 });
});

test('AC3: admin sees every defect in the system', async () => {
  const d1 = { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u2', status: 'open' };
  const d2 = { id: 'd2', title: 'B', submittedBy: 'u2', assignedTo: null, status: 'open' };
  defectRepository.seed([d1, d2]);

  const res = await getDefects('u9');
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(body, { defects: [d1, d2], count: 2 });
});

test('AC4: reporter with no submissions gets an empty response with no hidden hints', async () => {
  defectRepository.seed([
    { id: 'd1', title: 'A', submittedBy: 'u2', assignedTo: null, status: 'open' },
  ]);

  const res = await getDefects('u1');
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(body, { defects: [], count: 0 });
});

test('AC5: developer with nothing assigned gets an empty response with no hidden hints', async () => {
  defectRepository.seed([
    { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u3', status: 'open' },
    { id: 'd2', title: 'B', submittedBy: 'u1', assignedTo: null, status: 'open' },
  ]);

  const res = await getDefects('u2');
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(body, { defects: [], count: 0 });
});

test('AC6: admin sees an empty response when no defects exist system-wide', async () => {
  const res = await getDefects('u9');
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(body, { defects: [], count: 0 });
});
