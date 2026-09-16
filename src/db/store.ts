import { randomUUID } from 'node:crypto';

export type Role = 'ADMIN' | 'DEVELOPER' | 'REPORTER';

export interface Defect {
  id: string;
  title: string;
  status: string;
}

export interface Comment {
  id: string;
  defectId: string;
  body: string;
}

const defects = new Map<string, Defect>();
const comments = new Map<string, Comment>();

export const db = {
  defect: {
    create({ data }: { data: Omit<Defect, 'id'> }): Defect {
      const record: Defect = { id: randomUUID(), ...data };
      defects.set(record.id, record);
      return record;
    },
    findMany(): Defect[] {
      return Array.from(defects.values());
    },
    findUnique({ where: { id } }: { where: { id: string } }): Defect | null {
      return defects.get(id) ?? null;
    },
    delete({ where: { id } }: { where: { id: string } }): boolean {
      if (!defects.has(id)) return false;
      defects.delete(id);
      for (const comment of comments.values()) {
        if (comment.defectId === id) comments.delete(comment.id);
      }
      return true;
    },
  },
  comment: {
    create({ data }: { data: Omit<Comment, 'id'> }): Comment {
      const record: Comment = { id: randomUUID(), ...data };
      comments.set(record.id, record);
      return record;
    },
    findMany({ where: { defectId } }: { where: { defectId: string } }): Comment[] {
      return Array.from(comments.values()).filter((c) => c.defectId === defectId);
    },
  },
};
