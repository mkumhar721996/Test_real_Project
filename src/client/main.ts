import { AttachmentFormController } from './attachmentFormController.ts';
import type { AttachmentFile } from '../shared/attachmentValidation.ts';

const fileInput = document.getElementById('attachments') as HTMLInputElement;
const errorContainer = document.getElementById('attachment-errors') as HTMLElement;
const listContainer = document.getElementById('attachment-list') as HTMLElement;
const form = document.getElementById('defect-form') as HTMLFormElement;

async function submitDefect(attachments: AttachmentFile[]): Promise<void> {
  const titleInput = document.getElementById('title') as HTMLInputElement;
  const formData = new FormData();
  formData.append('title', titleInput.value);
  for (const attachment of attachments) {
    const matchingFile = Array.from(fileInput.files ?? []).find((f) => f.name === attachment.name);
    if (matchingFile) formData.append('attachments', matchingFile);
  }

  const response = await fetch('/api/defects', { method: 'POST', body: formData });
  if (!response.ok) {
    throw new Error('Failed to submit defect. Please try again.');
  }
}

const controller = new AttachmentFormController(fileInput, errorContainer, listContainer, submitDefect);

fileInput.addEventListener('change', () => {
  const incoming: AttachmentFile[] = Array.from(fileInput.files ?? []).map((file) => ({
    name: file.name,
    sizeBytes: file.size,
    mimeType: file.type,
  }));
  controller.handleFilesSelected(incoming);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  controller.handleSubmit().catch(() => {
    // Error already rendered inline by the controller; queued files are preserved (AC6).
  });
});
