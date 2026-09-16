import { Defect, DefectFilters } from '../../shared/types/defect';

export function applyDefectFilters(defects: Defect[], filters: DefectFilters): Defect[] {
  return defects.filter((d) => {
    if (filters.status && d.status !== filters.status) return false;
    if (filters.severity && d.severity !== filters.severity) return false;
    if (filters.assignee && d.assignee !== filters.assignee) return false;
    if (filters.dateFrom && d.createdAt < filters.dateFrom) return false;
    if (filters.dateTo && d.createdAt > filters.dateTo) return false;
    return true;
  });
}
