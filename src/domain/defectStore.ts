import { Defect } from './defect';

export interface StoredDefect extends Defect {
  id: string;
  reporterId: string;
}

let defects: StoredDefect[] = [];

export function addDefect(defect: Defect, id: string, reporterId: string): StoredDefect {
  const stored: StoredDefect = { ...defect, id, reporterId };
  defects.push(stored);
  return stored;
}

export function listDefectsForReporter(reporterId: string): StoredDefect[] {
  return defects.filter((d) => d.reporterId === reporterId);
}

export function getDefectById(id: string): StoredDefect | undefined {
  return defects.find((d) => d.id === id);
}

export function deleteDefect(id: string): void {
  defects = defects.filter((d) => d.id !== id);
}

export function _reset(): void {
  defects = [];
}
