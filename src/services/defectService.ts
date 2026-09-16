import { db, type Defect } from '../db/store.ts';

export function listDefects(): Defect[] {
  return db.defect.findMany();
}

export function getDefect(id: string): Defect | null {
  return db.defect.findUnique({ where: { id } });
}

export function deleteDefect(id: string): boolean {
  return db.defect.delete({ where: { id } });
}
