import { test } from "node:test";
import assert from "node:assert/strict";
import { DefectRepository } from "../../src/repositories/defectRepository.ts";
import { AuditLogRepository } from "../../src/repositories/auditLogRepository.ts";
import { DefectService } from "../../src/services/defectService.ts";
import type { User } from "../../src/domain/types.ts";

function setup() {
  const defectRepository = new DefectRepository();
  const auditLogRepository = new AuditLogRepository();
  const defectService = new DefectService(defectRepository, auditLogRepository);

  const admin: User = { id: "admin-1", name: "Ada Min", role: "ADMIN" };
  const reporter: User = { id: "reporter-1", name: "Rita Reporter", role: "REPORTER" };
  const dev: User = { id: "dev-1", name: "Dana Developer", role: "DEVELOPER" };

  const defect = defectRepository.createDefect({
    title: "Crash on save",
    reporterId: reporter.id,
    assigneeId: dev.id,
  });

  return { defectRepository, auditLogRepository, defectService, admin, reporter, dev, defect };
}

test("AC1: excludes a defect from a developer's list after they are unassigned", () => {
  const { defectService, admin, dev, defect } = setup();

  defectService.unassignDeveloper({ defectId: defect.id, actorId: admin.id });
  const list = defectService.listDefectsForUser(dev);

  assert.equal(list.some((d) => d.id === defect.id), false);
});

test("AC6: records an audit log entry when a developer is unassigned", () => {
  const { defectService, auditLogRepository, admin, dev, defect } = setup();

  defectService.unassignDeveloper({ defectId: defect.id, actorId: admin.id });
  const entries = auditLogRepository.findByDefectId(defect.id);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].action, "DEVELOPER_UNASSIGNED");
  assert.equal(entries[0].actorId, admin.id);
  assert.equal(entries[0].defectId, defect.id);
  assert.equal(entries[0].unassignedUserId, dev.id);
  assert.ok(entries[0].timestamp instanceof Date);
});
