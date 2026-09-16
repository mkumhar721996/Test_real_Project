import type { Comment, Defect, HistoryEntry } from "../domain/types.ts";

let nextId = 1;
function generateId(prefix: string): string {
  return `${prefix}-${nextId++}`;
}

export class DefectRepository {
  private defects = new Map<string, Defect>();
  private comments = new Map<string, Comment[]>();
  private history = new Map<string, HistoryEntry[]>();

  createDefect(input: { title: string; reporterId: string; assigneeId: string | null }): Defect {
    const defect: Defect = { id: generateId("defect"), ...input };
    this.defects.set(defect.id, defect);
    this.comments.set(defect.id, []);
    this.history.set(defect.id, []);
    return defect;
  }

  findById(defectId: string): Defect | undefined {
    return this.defects.get(defectId);
  }

  findAll(): Defect[] {
    return [...this.defects.values()];
  }

  updateAssignee(defectId: string, assigneeId: string | null): Defect | undefined {
    const defect = this.defects.get(defectId);
    if (!defect) return undefined;
    defect.assigneeId = assigneeId;
    return defect;
  }

  addComment(defectId: string, input: { authorId: string; body: string }): Comment | undefined {
    const list = this.comments.get(defectId);
    if (!list) return undefined;
    const comment: Comment = { id: generateId("comment"), defectId, ...input };
    list.push(comment);
    return comment;
  }

  findCommentsByDefectId(defectId: string): Comment[] | undefined {
    return this.comments.get(defectId);
  }

  addHistoryEntry(defectId: string, description: string): HistoryEntry | undefined {
    const list = this.history.get(defectId);
    if (!list) return undefined;
    const entry: HistoryEntry = { id: generateId("history"), defectId, description, timestamp: new Date() };
    list.push(entry);
    return entry;
  }

  findHistoryByDefectId(defectId: string): HistoryEntry[] | undefined {
    return this.history.get(defectId);
  }
}
