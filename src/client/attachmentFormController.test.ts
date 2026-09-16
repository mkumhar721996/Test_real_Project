import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AttachmentFormController } from './attachmentFormController.ts';
import type { AttachmentFile } from '../shared/attachmentValidation.ts';

function createFakeInput(): HTMLInputElement {
  return { value: '' } as unknown as HTMLInputElement;
}

function createFakeElement(): HTMLElement {
  return { textContent: '' } as unknown as HTMLElement;
}

const validPdf: AttachmentFile = { name: 'a.pdf', sizeBytes: 100, mimeType: 'application/pdf' };
const validTxt: AttachmentFile = { name: 'b.txt', sizeBytes: 100, mimeType: 'text/plain' };

test('AC1: an allowed file is accepted and queued', () => {
  const controller = new AttachmentFormController(
    createFakeInput(),
    createFakeElement(),
    createFakeElement(),
    async () => {},
  );

  controller.handleFilesSelected([validPdf]);

  assert.deepEqual(controller.getQueuedFiles(), [validPdf]);
});

test('AC2: an unsupported type is rejected and not queued', () => {
  const errorContainer = createFakeElement();
  const controller = new AttachmentFormController(createFakeInput(), errorContainer, createFakeElement(), async () => {});
  const exe: AttachmentFile = { name: 'tool.exe', sizeBytes: 10, mimeType: 'application/x-msdownload' };

  controller.handleFilesSelected([exe]);

  assert.deepEqual(controller.getQueuedFiles(), []);
  assert.match(errorContainer.textContent ?? '', /tool\.exe/);
});

test('AC6: on submission failure, the already-attached files list is preserved', async () => {
  const failingSubmit = mock.fn(async () => {
    throw new Error('network error');
  });
  const controller = new AttachmentFormController(
    createFakeInput(),
    createFakeElement(),
    createFakeElement(),
    failingSubmit,
  );

  controller.handleFilesSelected([validPdf, validTxt]);
  await controller.handleSubmit().catch(() => {});

  assert.deepEqual(controller.getQueuedFiles(), [validPdf, validTxt]);
});

test('successful submission clears the queued files', async () => {
  const submitFn = mock.fn(async () => {});
  const controller = new AttachmentFormController(createFakeInput(), createFakeElement(), createFakeElement(), submitFn);

  controller.handleFilesSelected([validPdf]);
  await controller.handleSubmit();

  assert.deepEqual(controller.getQueuedFiles(), []);
  assert.equal(submitFn.mock.callCount(), 1);
  assert.deepEqual(submitFn.mock.calls[0].arguments[0], [validPdf]);
});
