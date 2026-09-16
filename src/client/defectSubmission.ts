import type { AttachmentFile } from '../shared/attachmentValidation.ts';

export interface QueuedAttachment extends AttachmentFile {
  file: File;
}

export function toQueuedAttachment(file: File): QueuedAttachment {
  return { name: file.name, sizeBytes: file.size, mimeType: file.type, file };
}

export function buildDefectFormData(title: string, attachments: QueuedAttachment[]): FormData {
  const formData = new FormData();
  formData.append('title', title);
  for (const attachment of attachments) {
    formData.append('attachments', attachment.file);
  }
  return formData;
}
