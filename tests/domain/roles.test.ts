import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Role, Permission, hasPermission } from '../../src/domain/roles.ts';

test('Role has exactly Reporter, Developer, Admin', () => {
  assert.deepEqual(Object.values(Role).sort(), ['Admin', 'Developer', 'Reporter']);
});

test('Reporter may submit and view only own defects', () => {
  assert.equal(hasPermission(Role.Reporter, Permission.SubmitDefect), true);
  assert.equal(hasPermission(Role.Reporter, Permission.ViewOwnDefects), true);
  assert.equal(hasPermission(Role.Reporter, Permission.ViewAnyDefect), false);
});

test('Developer may view/update status of assigned defects only', () => {
  assert.equal(hasPermission(Role.Developer, Permission.ViewAssignedDefects), true);
  assert.equal(hasPermission(Role.Developer, Permission.UpdateAssignedDefectStatus), true);
  assert.equal(hasPermission(Role.Developer, Permission.DeleteDefect), false);
});

test('Admin may create/view/edit/reassign/delete/comment on any defect', () => {
  for (const p of [
    Permission.CreateDefect,
    Permission.ViewAnyDefect,
    Permission.EditDefect,
    Permission.ReassignDefect,
    Permission.DeleteDefect,
    Permission.CommentOnDefect,
  ]) {
    assert.equal(hasPermission(Role.Admin, p), true);
  }
});
