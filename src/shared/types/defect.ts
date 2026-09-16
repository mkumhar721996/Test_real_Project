export type Role = 'REPORTER' | 'DEVELOPER' | 'ADMIN';

export interface AuthUser {
  id: string;
  role: Role;
}

export type DefectStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type DefectSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Defect {
  id: string;
  title: string;
  status: DefectStatus;
  severity: DefectSeverity;
  createdBy: string;
  assignee: string | null;
  createdAt: string;
}

export interface DefectFilters {
  status?: DefectStatus;
  severity?: DefectSeverity;
  assignee?: string;
  dateFrom?: string;
  dateTo?: string;
}
