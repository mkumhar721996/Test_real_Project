import { canAccessDefect } from "../domain/authorization.ts";
import type { AuditLogRepository } from "../repositories/auditLogRepository.ts";
import type { DefectRepository } from "../repositories/defectRepository.ts";
import type { Comment, Defect, HistoryEntry, User } from "../domain/types.ts";

export class DefectService {
  private readonly defectRepository: DefectRepository;
  private readonly auditLogRepository: AuditLogRepository;

  constructor(defectRepository: DefectRepository, auditLogRepository: AuditLogRepository) {
    this.defectRepository = defectRepository;
    this.auditLogRepository = auditLogRepository;
  }

  unassignDeveloper(input: { defectId: string; actorId: string }): Defect | undefined {
    const defect = this.defectRepository.findById(input.defectId);
    if (!defect || !defect.assigneeId) return undefined;

    const unassignedUserId = defect.assigneeId;
    const updated = this.defectRepository.updateAssignee(input.defectId, null);

    this.auditLogRepository.record({
      action: "DEVELOPER_UNASSIGNED",
      actorId: input.actorId,
      defectId: input.defectId,
      unassignedUserId,
    });

    return updated;
  }

  listDefectsForUser(user: User): Defect[] {
    return this.defectRepository.findAll().filter((defect) => canAccessDefect(user, defect));
  }

  getDefectForUser(user: User, defectId: string): Defect | undefined {
    const defect = this.defectRepository.findById(defectId);
    if (!defect || !canAccessDefect(user, defect)) return undefined;
    return defect;
  }

  getCommentsForUser(user: User, defectId: string): Comment[] | undefined {
    const defect = this.defectRepository.findById(defectId);
    if (!defect || !canAccessDefect(user, defect)) return undefined;
    return this.defectRepository.findCommentsByDefectId(defectId);
  }

  getHistoryForUser(user: User, defectId: string): HistoryEntry[] | undefined {
    const defect = this.defectRepository.findById(defectId);
    if (!defect || !canAccessDefect(user, defect)) return undefined;
    return this.defectRepository.findHistoryByDefectId(defectId);
  }
}
