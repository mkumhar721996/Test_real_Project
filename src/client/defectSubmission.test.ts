import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDefectFormData, toQueuedAttachment } from './defectSubmission.ts';

test('AC5: builds form data from the queued files, not from whatever is currently selected in the input', () => {
  const queuedA = toQueuedAttachment(new File(['a'], 'a.pdf', { type: 'application/pdf' }));
  const queuedB = toQueuedAttachment(new File(['b'], 'b.txt', { type: 'text/plain' }));

  const formData = buildDefectFormData('Login button broken', [queuedA, queuedB]);

  const attachments = formData.getAll('attachments');
  assert.equal(formData.get('title'), 'Login button broken');
  assert.equal(attachments.length, 2);
  assert.equal((attachments[0] as File).name, 'a.pdf');
  assert.equal((attachments[1] as File).name, 'b.txt');
});

test('AC5/AC6: sends the exact queued File even if a file with the same name was reselected differently', () => {
  const originalFile = new File(['original-bytes'], 'same-name.txt', { type: 'text/plain' });
  const queued = toQueuedAttachment(originalFile);

  const formData = buildDefectFormData('Title', [queued]);

  const sent = formData.getAll('attachments')[0] as File;
  assert.equal(sent, originalFile);
});
