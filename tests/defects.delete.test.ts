import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db/store.ts';
import { startTestServer } from './helpers/testServer.ts';

test('AC1: permanently removes the defect and its comments', async () => {
  const server = await startTestServer();
  try {
    const defect = db.defect.create({ data: { title: 'Bug', status: 'OPEN' } });
    db.comment.create({ data: { body: 'note', defectId: defect.id } });

    const response = await fetch(`${server.baseUrl}/defects/${defect.id}`, {
      method: 'DELETE',
      headers: { 'x-user-role': 'ADMIN' },
    });

    assert.equal(response.status, 204);
    assert.equal(db.defect.findUnique({ where: { id: defect.id } }), null);
    assert.deepEqual(db.comment.findMany({ where: { defectId: defect.id } }), []);
  } finally {
    await server.close();
  }
});

test('AC2: no longer appears in list or detail views', async () => {
  const server = await startTestServer();
  try {
    const defect = db.defect.create({ data: { title: 'Bug', status: 'OPEN' } });

    const deleteResponse = await fetch(`${server.baseUrl}/defects/${defect.id}`, {
      method: 'DELETE',
      headers: { 'x-user-role': 'ADMIN' },
    });
    assert.equal(deleteResponse.status, 204);

    const listResponse = await fetch(`${server.baseUrl}/defects`, {
      headers: { 'x-user-role': 'ADMIN' },
    });
    const list = (await listResponse.json()) as Array<{ id: string }>;
    assert.equal(
      list.find((d) => d.id === defect.id),
      undefined,
    );

    const detailResponse = await fetch(`${server.baseUrl}/defects/${defect.id}`, {
      headers: { 'x-user-role': 'ADMIN' },
    });
    assert.equal(detailResponse.status, 404);
  } finally {
    await server.close();
  }
});

for (const status of ['WONT_FIX', 'CLOSED']) {
  test(`AC3: allows deleting a defect in terminal status ${status}`, async () => {
    const server = await startTestServer();
    try {
      const defect = db.defect.create({ data: { title: 'Bug', status } });

      const response = await fetch(`${server.baseUrl}/defects/${defect.id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'ADMIN' },
      });

      assert.equal(response.status, 204);
      assert.equal(db.defect.findUnique({ where: { id: defect.id } }), null);
    } finally {
      await server.close();
    }
  });
}

for (const role of ['DEVELOPER', 'REPORTER']) {
  test(`AC4: rejects deletion by ${role}`, async () => {
    const server = await startTestServer();
    try {
      const defect = db.defect.create({ data: { title: 'Bug', status: 'OPEN' } });

      const response = await fetch(`${server.baseUrl}/defects/${defect.id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': role },
      });

      assert.equal(response.status, 403);
      assert.notEqual(db.defect.findUnique({ where: { id: defect.id } }), null);
    } finally {
      await server.close();
    }
  });
}
