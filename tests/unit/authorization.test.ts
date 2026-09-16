import { test } from "node:test";
import assert from "node:assert/strict";
import { canAccessDefect } from "../../src/domain/authorization.ts";
import type { Defect, User } from "../../src/domain/types.ts";

const admin: User = { id: "admin-1", name: "Ada Min", role: "ADMIN" };
const reporter: User = { id: "reporter-1", name: "Rita Reporter", role: "REPORTER" };
const developer: User = { id: "dev-1", name: "Dana Developer", role: "DEVELOPER" };
const otherDeveloper: User = { id: "dev-2", name: "Diego Developer", role: "DEVELOPER" };

const defect: Defect = {
  id: "defect-1",
  title: "Crash on save",
  reporterId: reporter.id,
  assigneeId: developer.id,
};

test("admin can always access a defect", () => {
  assert.equal(canAccessDefect(admin, defect), true);
});

test("reporter can access a defect they reported", () => {
  assert.equal(canAccessDefect(reporter, defect), true);
});

test("developer can access a defect currently assigned to them", () => {
  assert.equal(canAccessDefect(developer, defect), true);
});

test("developer cannot access a defect assigned to someone else", () => {
  assert.equal(canAccessDefect(otherDeveloper, defect), false);
});

test("unassigned developer loses access immediately once assigneeId no longer matches", () => {
  const unassigned: Defect = { ...defect, assigneeId: null };
  assert.equal(canAccessDefect(developer, unassigned), false);
});
