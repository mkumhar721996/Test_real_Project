import { Defect } from './defect';
import { Role } from './roles';

export type DefectStatus = 'Open' | 'Closed';

export interface DefectRecord extends Defect {
  status: DefectStatus;
  createdAt: string;
}

export interface DefectCounts {
  open: number;
  closed: number;
}

export interface DailyTrendPoint {
  date: string;
  count: number;
}

export function visibleDefects(
  defects: DefectRecord[],
  role: Role,
  currentUserId: string
): DefectRecord[] {
  if (role === 'Admin') {
    return defects;
  }

  return defects.filter((defect) => defect.assigneeId === currentUserId);
}

export function countByStatus(defects: DefectRecord[]): DefectCounts {
  return defects.reduce<DefectCounts>(
    (counts, defect) => {
      if (defect.status === 'Open') {
        return { ...counts, open: counts.open + 1 };
      }
      return { ...counts, closed: counts.closed + 1 };
    },
    { open: 0, closed: 0 }
  );
}

export function dailyTrend(defects: DefectRecord[]): DailyTrendPoint[] {
  const countsByDate = new Map<string, number>();

  for (const defect of defects) {
    countsByDate.set(defect.createdAt, (countsByDate.get(defect.createdAt) ?? 0) + 1);
  }

  return Array.from(countsByDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
