export type Role = "ADMIN" | "REPORTER" | "DEVELOPER";

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Defect {
  id: string;
  title: string;
  reporterId: string;
  assigneeId: string | null;
}

export interface Comment {
  id: string;
  defectId: string;
  authorId: string;
  body: string;
}

export interface HistoryEntry {
  id: string;
  defectId: string;
  description: string;
  timestamp: Date;
}

export interface AuditLogEntry {
  id: string;
  action: "DEVELOPER_UNASSIGNED";
  actorId: string;
  defectId: string;
  unassignedUserId: string;
  timestamp: Date;
}
