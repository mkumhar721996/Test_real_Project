export type DeleteDefectButtonState = 'idle' | 'confirming';

export interface DeleteDefectButtonOptions {
  onDelete: () => void;
}

export class DeleteDefectButtonController {
  state: DeleteDefectButtonState = 'idle';

  private readonly options: DeleteDefectButtonOptions;

  constructor(options: DeleteDefectButtonOptions) {
    this.options = options;
  }

  clickDelete(): void {
    this.state = 'confirming';
  }

  confirm(): void {
    if (this.state !== 'confirming') return;
    this.state = 'idle';
    this.options.onDelete();
  }

  cancel(): void {
    this.state = 'idle';
  }
}
