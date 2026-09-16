export interface AttachmentFile {
  name: string;
  sizeBytes: number;
  mimeType: string;
}

export type RejectionReason = 'unsupported_type' | 'file_too_large' | 'max_count_exceeded';

export interface RejectedAttachment {
  file: AttachmentFile;
  reason: RejectionReason;
  message: string;
}

export interface ValidationResult {
  accepted: AttachmentFile[];
  rejected: RejectedAttachment[];
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 5;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export function validateNewAttachments(existingCount: number, incoming: AttachmentFile[]): ValidationResult {
  const accepted: AttachmentFile[] = [];
  const rejected: RejectedAttachment[] = [];
  let count = existingCount;

  for (const file of incoming) {
    if (count >= MAX_ATTACHMENT_COUNT) {
      rejected.push({
        file,
        reason: 'max_count_exceeded',
        message: `Cannot attach "${file.name}": a maximum of ${MAX_ATTACHMENT_COUNT} files is allowed per submission.`,
      });
      continue;
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
      rejected.push({
        file,
        reason: 'unsupported_type',
        message: `"${file.name}" has an unsupported file type. Allowed types are PDF, PNG, JPG, DOCX, and TXT.`,
      });
      continue;
    }

    if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
      rejected.push({
        file,
        reason: 'file_too_large',
        message: `"${file.name}" exceeds the 10 MB per-file size limit.`,
      });
      continue;
    }

    accepted.push(file);
    count += 1;
  }

  return { accepted, rejected };
}
