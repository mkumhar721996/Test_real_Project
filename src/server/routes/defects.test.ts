import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../app.ts';
import { resetDefectStore } from '../storage/defectStore.ts';

function buildRequest(
  fields: Record<string, string>,
  files: { filename: string; content: string; type: string }[],
  options: { authenticated?: boolean } = {},
) {
  const { authenticated = true } = options;
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  for (const file of files) {
    formData.append('attachments', new File([file.content], file.filename, { type: file.type }));
  }
  const headers = authenticated ? { Authorization: 'Bearer test-session-token' } : undefined;
  return new Request('http://localhost/api/defects', { method: 'POST', body: formData, headers });
}

test.beforeEach(() => {
  resetDefectStore();
});

test('AC5: between 0 and 5 valid files are saved with the defect record on submit', async () => {
  const request = buildRequest(
    { title: 'Login button broken' },
    [
      { filename: 'a.pdf', content: 'pdf-bytes', type: 'application/pdf' },
      { filename: 'b.txt', content: 'txt-bytes', type: 'text/plain' },
    ],
  );

  const response = await handleRequest(request);
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(
    body.attachments.map((a: { name: string }) => a.name),
    ['a.pdf', 'b.txt'],
  );
});

test('AC5: a defect with no attachments is still saved successfully', async () => {
  const request = buildRequest({ title: 'No attachments here' }, []);
  const response = await handleRequest(request);
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(body.attachments, []);
});

test('rejects an unauthenticated submission with 401', async () => {
  const request = buildRequest({ title: 'Sneaky defect' }, [], { authenticated: false });

  const response = await handleRequest(request);

  assert.equal(response.status, 401);
});

test('rejects a submission with an unsupported attachment type (defense in depth)', async () => {
  const request = buildRequest(
    { title: 'Bad attachment' },
    [{ filename: 'virus.exe', content: 'x', type: 'application/x-msdownload' }],
  );

  const response = await handleRequest(request);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.rejected[0].reason, 'unsupported_type');
});
