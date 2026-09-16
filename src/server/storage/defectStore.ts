import type { AttachmentFile } from '../../shared/attachmentValidation.ts';

export interface Defect {
  id: string;
  title: string;
  attachments: AttachmentFile[];
}

let defects = new Map<string, Defect>();
let nextId = 1;

export function createDefect(title: string, attachments: AttachmentFile[]): Defect {
  const defect: Defect = { id: String(nextId), title, attachments };
  nextId += 1;
  defects.set(defect.id, defect);
  return defect;
}

export function getDefect(id: string): Defect | undefined {
  return defects.get(id);
}

export function resetDefectStore(): void {
  defects = new Map<string, Defect>();
  nextId = 1;
}
