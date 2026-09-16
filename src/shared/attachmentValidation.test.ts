import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateNewAttachments, type AttachmentFile } from './attachmentValidation.ts';

const pdfFile: AttachmentFile = { name: 'report.pdf', sizeBytes: 1024, mimeType: 'application/pdf' };
const pngFile: AttachmentFile = { name: 'screenshot.png', sizeBytes: 2048, mimeType: 'image/png' };
const jpgFile: AttachmentFile = { name: 'photo.jpg', sizeBytes: 2048, mimeType: 'image/jpeg' };
const docxFile: AttachmentFile = {
  name: 'notes.docx',
  sizeBytes: 4096,
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const txtFile: AttachmentFile = { name: 'log.txt', sizeBytes: 512, mimeType: 'text/plain' };

test('AC1: allowed file types are accepted and queued', () => {
  const files = [pdfFile, pngFile, jpgFile, docxFile, txtFile];
  const result = validateNewAttachments(0, files);
  assert.deepEqual(result.accepted, files);
  assert.equal(result.rejected.length, 0);
});

test('AC2: an unsupported file type is rejected with an inline error identifying it', () => {
  const exe: AttachmentFile = { name: 'tool.exe', sizeBytes: 1000, mimeType: 'application/x-msdownload' };
  const result = validateNewAttachments(0, [exe]);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected[0].reason, 'unsupported_type');
  assert.match(result.rejected[0].message, /tool\.exe/);
});

test('AC3: a file over 10 MB is rejected with an error stating the per-file size limit', () => {
  const big: AttachmentFile = { name: 'scan.pdf', sizeBytes: 11 * 1024 * 1024, mimeType: 'application/pdf' };
  const result = validateNewAttachments(0, [big]);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected[0].reason, 'file_too_large');
  assert.match(result.rejected[0].message, /10 MB/);
});

test('AC4: a 6th file after 5 already attached is rejected with an error stating the max count', () => {
  const sixth: AttachmentFile = { name: 'f6.txt', sizeBytes: 10, mimeType: 'text/plain' };
  const result = validateNewAttachments(5, [sixth]);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected[0].reason, 'max_count_exceeded');
  assert.match(result.rejected[0].message, /5/);
});

test('AC7: multi-select with some valid/some invalid accepts the valid ones', () => {
  const badExe: AttachmentFile = { name: 'virus.exe', sizeBytes: 100, mimeType: 'application/x-msdownload' };
  const result = validateNewAttachments(0, [pdfFile, badExe, pngFile]);
  assert.deepEqual(result.accepted, [pdfFile, pngFile]);
});

test('AC8: multi-select with some valid/some invalid rejects each invalid one with its own violation', () => {
  const badExe: AttachmentFile = { name: 'virus.exe', sizeBytes: 100, mimeType: 'application/x-msdownload' };
  const oversizedPng: AttachmentFile = { name: 'huge.png', sizeBytes: 12 * 1024 * 1024, mimeType: 'image/png' };
  const result = validateNewAttachments(0, [pdfFile, badExe, oversizedPng]);
  assert.equal(result.rejected.length, 2);
  assert.deepEqual(
    result.rejected.map((r) => r.reason),
    ['unsupported_type', 'file_too_large'],
  );
});

test('AC9: with 3 already attached, selecting 4 more valid files accepts only enough to reach 5', () => {
  const f1: AttachmentFile = { name: 'f1.txt', sizeBytes: 10, mimeType: 'text/plain' };
  const f2: AttachmentFile = { name: 'f2.txt', sizeBytes: 10, mimeType: 'text/plain' };
  const f3: AttachmentFile = { name: 'f3.txt', sizeBytes: 10, mimeType: 'text/plain' };
  const f4: AttachmentFile = { name: 'f4.txt', sizeBytes: 10, mimeType: 'text/plain' };
  const result = validateNewAttachments(3, [f1, f2, f3, f4]);
  assert.deepEqual(result.accepted, [f1, f2]);
});

test('AC10: with 3 already attached, files beyond the max of 5 are rejected stating the max count', () => {
  const f1: AttachmentFile = { name: 'f1.txt', sizeBytes: 10, mimeType: 'text/plain' };
  const f2: AttachmentFile = { name: 'f2.txt', sizeBytes: 10, mimeType: 'text/plain' };
  const f3: AttachmentFile = { name: 'f3.txt', sizeBytes: 10, mimeType: 'text/plain' };
  const f4: AttachmentFile = { name: 'f4.txt', sizeBytes: 10, mimeType: 'text/plain' };
  const result = validateNewAttachments(3, [f1, f2, f3, f4]);
  assert.equal(result.rejected.length, 2);
  assert.equal(result.rejected[0].file, f3);
  assert.equal(result.rejected[0].reason, 'max_count_exceeded');
  assert.equal(result.rejected[1].file, f4);
  assert.equal(result.rejected[1].reason, 'max_count_exceeded');
  assert.match(result.rejected[0].message, /5/);
});
