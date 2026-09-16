import { validateNewAttachments, type AttachmentFile, type RejectedAttachment } from '../shared/attachmentValidation.ts';

export class AttachmentFormController {
  private fileInput: HTMLInputElement;
  private errorContainer: HTMLElement;
  private listContainer: HTMLElement;
  private submitFn: (files: AttachmentFile[]) => Promise<void>;
  private queued: AttachmentFile[] = [];

  constructor(
    fileInput: HTMLInputElement,
    errorContainer: HTMLElement,
    listContainer: HTMLElement,
    submitFn: (files: AttachmentFile[]) => Promise<void>,
  ) {
    this.fileInput = fileInput;
    this.errorContainer = errorContainer;
    this.listContainer = listContainer;
    this.submitFn = submitFn;
  }

  getQueuedFiles(): AttachmentFile[] {
    return [...this.queued];
  }

  handleFilesSelected(incoming: AttachmentFile[]): void {
    const result = validateNewAttachments(this.queued.length, incoming);
    this.queued = [...this.queued, ...result.accepted];
    this.renderErrors(result.rejected);
    this.renderList();
  }

  async handleSubmit(): Promise<void> {
    this.clearErrors();
    try {
      await this.submitFn(this.getQueuedFiles());
      this.queued = [];
      this.fileInput.value = '';
      this.renderList();
    } catch (error) {
      this.renderSubmitError(error);
      throw error;
    }
  }

  private renderErrors(rejected: RejectedAttachment[]): void {
    this.errorContainer.textContent = rejected.map((r) => r.message).join(' ');
  }

  private renderSubmitError(error: unknown): void {
    this.errorContainer.textContent = error instanceof Error ? error.message : 'Submission failed.';
  }

  private clearErrors(): void {
    this.errorContainer.textContent = '';
  }

  private renderList(): void {
    this.listContainer.textContent = this.queued.map((f) => f.name).join(', ');
  }
}
