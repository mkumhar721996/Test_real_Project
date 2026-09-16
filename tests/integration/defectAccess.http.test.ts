import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { DefectRepository } from "../../src/repositories/defectRepository.ts";
import { AuditLogRepository } from "../../src/repositories/auditLogRepository.ts";
import { DefectService } from "../../src/services/defectService.ts";
import { createRequestListener } from "../../src/http/app.ts";
import type { User } from "../../src/domain/types.ts";

function setup() {
  const defectRepository = new DefectRepository();
  const auditLogRepository = new AuditLogRepository();
  const defectService = new DefectService(defectRepository, auditLogRepository);

  const admin: User = { id: "admin-1", name: "Ada Min", role: "ADMIN" };
  const reporter: User = { id: "reporter-1", name: "Rita Reporter", role: "REPORTER" };
  const dev: User = { id: "dev-1", name: "Dana Developer", role: "DEVELOPER" };
  const users = [admin, reporter, dev];

  const defect = defectRepository.createDefect({
    title: "Crash on save",
    reporterId: reporter.id,
    assigneeId: dev.id,
  });
  defectRepository.addComment(defect.id, { authorId: dev.id, body: "Investigating now." });
  defectRepository.addHistoryEntry(defect.id, "Assigned to Dana Developer");

  const listener = createRequestListener({ defectService, users });
  const server = http.createServer(listener);

  return { server, admin, reporter, dev, defect };
}

async function withServer<T>(server: http.Server, fn: (baseUrl: string) => Promise<T>): Promise<T> {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("AC2+AC3: denies saved-link direct access to an unassigned developer without exposing defect data", async () => {
  const { server, admin, dev, defect } = setup();

  await withServer(server, async (baseUrl) => {
    const unassignRes = await fetch(`${baseUrl}/defects/${defect.id}/unassign`, {
      method: "PATCH",
      headers: { "x-user-id": admin.id },
    });
    assert.equal(unassignRes.status, 200);

    const res = await fetch(`${baseUrl}/defects/${defect.id}`, {
      headers: { "x-user-id": dev.id },
    });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "Defect not found" });
  });
});

test("AC4+AC5: denies access to prior comments after unassignment and returns no comment data", async () => {
  const { server, admin, dev, defect } = setup();

  await withServer(server, async (baseUrl) => {
    await fetch(`${baseUrl}/defects/${defect.id}/unassign`, {
      method: "PATCH",
      headers: { "x-user-id": admin.id },
    });

    const res = await fetch(`${baseUrl}/defects/${defect.id}/comments`, {
      headers: { "x-user-id": dev.id },
    });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "Defect not found" });
  });
});

test("AC4+AC5: denies access to defect history after unassignment and returns no history data", async () => {
  const { server, admin, dev, defect } = setup();

  await withServer(server, async (baseUrl) => {
    await fetch(`${baseUrl}/defects/${defect.id}/unassign`, {
      method: "PATCH",
      headers: { "x-user-id": admin.id },
    });

    const res = await fetch(`${baseUrl}/defects/${defect.id}/history`, {
      headers: { "x-user-id": dev.id },
    });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "Defect not found" });
  });
});

test("developer retains access to comments and history while still assigned", async () => {
  const { server, dev, defect } = setup();

  await withServer(server, async (baseUrl) => {
    const commentsRes = await fetch(`${baseUrl}/defects/${defect.id}/comments`, {
      headers: { "x-user-id": dev.id },
    });
    assert.equal(commentsRes.status, 200);
    const comments = await commentsRes.json();
    assert.equal(comments.length, 1);

    const historyRes = await fetch(`${baseUrl}/defects/${defect.id}/history`, {
      headers: { "x-user-id": dev.id },
    });
    assert.equal(historyRes.status, 200);
    const history = await historyRes.json();
    assert.equal(history.length, 1);
  });
});
