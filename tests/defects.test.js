const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const defectStore = require('../src/store/defectStore');

async function withServer(fn) {
  const server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test.beforeEach(() => {
  defectStore._reset();
});

test('deleted defect is absent from submitting reporter list', async () => {
  await withServer(async (baseUrl) => {
    defectStore.create({
      id: 'd1',
      title: 'Crash on save',
      description: 'x',
      reporterId: 'reporter-1',
    });

    await fetch(`${baseUrl}/defects/d1`, {
      method: 'DELETE',
      headers: { 'x-user-role': 'admin' },
    });

    const res = await fetch(`${baseUrl}/defects`, {
      headers: { 'x-user-id': 'reporter-1', 'x-user-role': 'reporter' },
    });
    const body = await res.json();

    assert.ok(!body.some((d) => d.id === 'd1'));
  });
});

test('direct access to a deleted defect 404s for reporter, other reporter, and admin', async () => {
  await withServer(async (baseUrl) => {
    defectStore.create({
      id: 'd1',
      title: 'Crash on save',
      description: 'x',
      reporterId: 'reporter-1',
    });

    await fetch(`${baseUrl}/defects/d1`, {
      method: 'DELETE',
      headers: { 'x-user-role': 'admin' },
    });

    for (const userId of ['reporter-1', 'reporter-2', 'admin-1']) {
      const res = await fetch(`${baseUrl}/defects/d1`, {
        headers: { 'x-user-id': userId },
      });
      assert.equal(res.status, 404, `expected 404 for ${userId}`);
    }
  });
});

test('DELETE is rejected with 404 for a non-admin caller and the defect is not removed', async () => {
  await withServer(async (baseUrl) => {
    defectStore.create({
      id: 'd1',
      title: 'Crash on save',
      description: 'x',
      reporterId: 'reporter-1',
    });

    for (const role of [undefined, 'reporter', 'developer']) {
      const headers = { 'x-user-id': 'reporter-1' };
      if (role) headers['x-user-role'] = role;

      const res = await fetch(`${baseUrl}/defects/d1`, {
        method: 'DELETE',
        headers,
      });

      assert.equal(res.status, 404, `expected 404 for role ${role}`);
    }

    const getRes = await fetch(`${baseUrl}/defects/d1`, {
      headers: { 'x-user-id': 'reporter-1', 'x-user-role': 'reporter' },
    });
    assert.equal(getRes.status, 200);
  });
});

test('deleted-defect response reveals nothing and matches never-existed response', async () => {
  await withServer(async (baseUrl) => {
    defectStore.create({
      id: 'd1',
      title: 'Crash on save',
      description: 'secret repro steps',
      reporterId: 'reporter-1',
    });

    await fetch(`${baseUrl}/defects/d1`, {
      method: 'DELETE',
      headers: { 'x-user-role': 'admin' },
    });

    const deletedRes = await fetch(`${baseUrl}/defects/d1`, {
      headers: { 'x-user-id': 'reporter-1' },
    });
    const neverExistedRes = await fetch(`${baseUrl}/defects/does-not-exist`, {
      headers: { 'x-user-id': 'reporter-1' },
    });

    const deletedBody = await deletedRes.json();
    const neverExistedBody = await neverExistedRes.json();

    assert.deepEqual(deletedBody, neverExistedBody);
    assert.deepEqual(deletedBody, { error: 'Not found' });
    assert.ok(!/secret repro steps|deletedAt|tombstone/i.test(JSON.stringify(deletedBody)));
  });
});
