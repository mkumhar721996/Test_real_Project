import type { Defect } from './types.ts';

export class DefectRepository {
  private defects = new Map<string, Defect>();

  addDefect(defect: Defect): void {
    this.defects.set(defect.id, { ...defect });
  }

  getDefect(id: string): Defect {
    const defect = this.defects.get(id);
    if (!defect) {
      throw new Error(`Unknown defect ${id}`);
    }
    return defect;
  }

  updateDefect(id: string, changes: Partial<Pick<Defect, 'assignedTo'>>): Defect {
    const defect = this.getDefect(id);
    Object.assign(defect, changes);
    return defect;
  }
}
