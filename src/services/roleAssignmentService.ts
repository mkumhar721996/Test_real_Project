import type { Role } from "../domain/role.ts";
import type { User } from "../domain/user.ts";
import { UserRepository } from "../repositories/userRepository.ts";
import { AuditLogRepository } from "../repositories/auditLogRepository.ts";
import { PermissionDeniedError } from "../errors/permissionDeniedError.ts";

const ASSIGN_ROLE_ACTION = "ASSIGN_ROLE";

export class RoleAssignmentService {
  private readonly userRepository: UserRepository;
  private readonly auditLogRepository: AuditLogRepository;

  constructor(userRepository: UserRepository, auditLogRepository: AuditLogRepository) {
    this.userRepository = userRepository;
    this.auditLogRepository = auditLogRepository;
  }

  assignRole(actor: User, targetUserId: string, newRole: Role): void {
    if (actor.role !== "Admin" || actor.id === targetUserId) {
      this.auditLogRepository.record({
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        targetId: targetUserId,
        type: "PERMISSION_DENIED",
        details: { attemptedAction: ASSIGN_ROLE_ACTION, attemptedRole: newRole },
      });
      const reason =
        actor.id === targetUserId
          ? `User ${actor.id} is not permitted to change their own role`
          : `User ${actor.id} with role ${actor.role} is not permitted to assign roles`;
      throw new PermissionDeniedError(reason);
    }

    const target = this.userRepository.getUser(targetUserId);
    if (!target) {
      throw new Error(`User not found: ${targetUserId}`);
    }
    const oldRole = target.role;

    this.userRepository.updateUserRole(targetUserId, newRole);

    this.auditLogRepository.record({
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      targetId: targetUserId,
      type: "ROLE_CHANGED",
      details: { oldRole, newRole },
    });
  }
}
