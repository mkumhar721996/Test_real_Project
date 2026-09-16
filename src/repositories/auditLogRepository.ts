import type { AuditLogEntry } from "../domain/auditLogEntry.ts";

export class AuditLogRepository {
  private entries: AuditLogEntry[] = [];

  record(entry: AuditLogEntry): void {
    this.entries.push(entry);
  }

  getAll(): AuditLogEntry[] {
    return [...this.entries];
  }
}
