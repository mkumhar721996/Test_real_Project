import { test } from "node:test";
import assert from "node:assert/strict";
import type { User } from "../src/domain/user.ts";
import { UserRepository } from "../src/repositories/userRepository.ts";
import { AuditLogRepository } from "../src/repositories/auditLogRepository.ts";
import { RoleAssignmentService } from "../src/services/roleAssignmentService.ts";
import { PermissionDeniedError } from "../src/errors/permissionDeniedError.ts";

function setup() {
  const userRepository = new UserRepository();
  const auditLogRepository = new AuditLogRepository();
  const service = new RoleAssignmentService(userRepository, auditLogRepository);
  return { userRepository, auditLogRepository, service };
}

test("saves the role change when an Admin changes another user's role", () => {
  const { userRepository, service } = setup();
  const admin: User = { id: "admin-1", name: "Ada", role: "Admin" };
  const target: User = { id: "user-1", name: "Bob", role: "Reporter" };
  userRepository.seed([admin, target]);

  service.assignRole(admin, target.id, "Developer");

  assert.equal(userRepository.getUser(target.id)?.role, "Developer");
});

test("reflects the new role immediately for the target user", () => {
  const { userRepository, service } = setup();
  const admin: User = { id: "admin-1", name: "Ada", role: "Admin" };
  const target: User = { id: "user-1", name: "Bob", role: "Reporter" };
  userRepository.seed([admin, target]);

  service.assignRole(admin, target.id, "Admin");

  assert.equal(userRepository.getUser(target.id)?.role, "Admin");
});

test("denies a Developer attempting to change any user's role, including their own", () => {
  const { userRepository, service } = setup();
  const developer: User = { id: "dev-1", name: "Dev", role: "Developer" };
  userRepository.seed([developer]);

  assert.throws(
    () => service.assignRole(developer, developer.id, "Admin"),
    PermissionDeniedError,
  );
  assert.equal(userRepository.getUser(developer.id)?.role, "Developer");
});

test("denies a Reporter attempting to change another user's role", () => {
  const { userRepository, service } = setup();
  const reporter: User = { id: "rep-1", name: "Rita", role: "Reporter" };
  const target: User = { id: "user-2", name: "Carl", role: "Reporter" };
  userRepository.seed([reporter, target]);

  assert.throws(
    () => service.assignRole(reporter, target.id, "Admin"),
    PermissionDeniedError,
  );
  assert.equal(userRepository.getUser(target.id)?.role, "Reporter");
});

test("creates an audit log entry with actor, target, old role, new role, and timestamp", () => {
  const { userRepository, auditLogRepository, service } = setup();
  const admin: User = { id: "admin-1", name: "Ada", role: "Admin" };
  const target: User = { id: "user-1", name: "Bob", role: "Reporter" };
  userRepository.seed([admin, target]);

  service.assignRole(admin, target.id, "Developer");

  const entries = auditLogRepository.getAll();
  assert.equal(entries.length, 1);
  assert.match(entries[0].timestamp, /\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(
    { actorId: entries[0].actorId, targetId: entries[0].targetId, type: entries[0].type, details: entries[0].details },
    {
      actorId: "admin-1",
      targetId: "user-1",
      type: "ROLE_CHANGED",
      details: { oldRole: "Reporter", newRole: "Developer" },
    },
  );
});

test("creates an audit log entry recording actor, attempted action, target resource, and timestamp on denial", () => {
  const { userRepository, auditLogRepository, service } = setup();
  const developer: User = { id: "dev-1", name: "Dev", role: "Developer" };
  const target: User = { id: "user-2", name: "Carl", role: "Reporter" };
  userRepository.seed([developer, target]);

  assert.throws(
    () => service.assignRole(developer, target.id, "Admin"),
    PermissionDeniedError,
  );

  const entries = auditLogRepository.getAll();
  assert.equal(entries.length, 1);
  assert.match(entries[0].timestamp, /\d{4}-\d{2}-\d{2}T/);
  assert.equal(entries[0].actorId, "dev-1");
  assert.equal(entries[0].targetId, "user-2");
  assert.equal(entries[0].type, "PERMISSION_DENIED");
  assert.deepEqual(entries[0].details, {
    attemptedAction: "ASSIGN_ROLE",
    attemptedRole: "Admin",
  });
});
