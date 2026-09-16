import { AttachmentFormController } from './attachmentFormController.ts';
import type { AttachmentFile } from '../shared/attachmentValidation.ts';
import { buildDefectFormData, toQueuedAttachment, type QueuedAttachment } from './defectSubmission.ts';

const fileInput = document.getElementById('attachments') as HTMLInputElement;
const errorContainer = document.getElementById('attachment-errors') as HTMLElement;
const listContainer = document.getElementById('attachment-list') as HTMLElement;
const form = document.getElementById('defect-form') as HTMLFormElement;

async function submitDefect(attachments: AttachmentFile[]): Promise<void> {
  const titleInput = document.getElementById('title') as HTMLInputElement;
  const formData = buildDefectFormData(titleInput.value, attachments as QueuedAttachment[]);

  const response = await fetch('/api/defects', {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('authToken') ?? ''}` },
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to submit defect. Please try again.');
  }
}

const controller = new AttachmentFormController(fileInput, errorContainer, listContainer, submitDefect);

fileInput.addEventListener('change', () => {
  const incoming: QueuedAttachment[] = Array.from(fileInput.files ?? []).map(toQueuedAttachment);
  controller.handleFilesSelected(incoming);
  fileInput.value = '';
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  controller.handleSubmit().catch(() => {
    // Error already rendered inline by the controller; queued files are preserved (AC6).
  });
});
