import type { Role } from "./role.ts";

export type AuditLogType = "ROLE_CHANGED" | "PERMISSION_DENIED";

export interface RoleChangedDetails {
  oldRole: Role;
  newRole: Role;
}

export interface PermissionDeniedDetails {
  attemptedAction: string;
  attemptedRole: Role;
}

export interface AuditLogEntry {
  timestamp: string;
  actorId: string;
  targetId: string;
  type: AuditLogType;
  details: RoleChangedDetails | PermissionDeniedDetails;
}
