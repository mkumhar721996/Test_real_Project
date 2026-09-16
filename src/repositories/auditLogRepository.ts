import type { AuditLogEntry } from "../domain/types.ts";

let nextId = 1;

export class AuditLogRepository {
  private entries: AuditLogEntry[] = [];

  record(input: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
    const entry: AuditLogEntry = { id: `audit-${nextId++}`, timestamp: new Date(), ...input };
    this.entries.push(entry);
    return entry;
  }

  findByDefectId(defectId: string): AuditLogEntry[] {
    return this.entries.filter((entry) => entry.defectId === defectId);
  }
}
