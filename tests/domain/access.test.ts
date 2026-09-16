import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Role, Permission } from '../../src/domain/roles.ts';
import { createAccount } from '../../src/domain/accounts.ts';
import { checkAccess } from '../../src/domain/access.ts';

test("denies an action not listed under the role's permissions", () => {
  const reporter = createAccount({ id: 'u5', role: Role.Reporter });
  const result = checkAccess(reporter, Permission.DeleteDefect, () => ({ id: 'defect-1' }));
  assert.equal(result.allowed, false);
});

test('exposes no resource data when denied', () => {
  const reporter = createAccount({ id: 'u6', role: Role.Reporter });
  const result = checkAccess(reporter, Permission.ViewAnyDefect, () => ({
    secret: 'classified',
  }));
  assert.equal(result.allowed, false);
  assert.equal((result as { data?: unknown }).data, undefined);
});

test('denies access when the permission check/resolver throws (backend error/timeout)', () => {
  const admin = createAccount({ id: 'admin2', role: Role.Admin });
  const result = checkAccess(admin, Permission.ViewAnyDefect, () => {
    throw new Error('backend timeout');
  });
  assert.equal(result.allowed, false);
});

test('allows access and returns data when the role has the permission', () => {
  const admin = createAccount({ id: 'admin3', role: Role.Admin });
  const result = checkAccess(admin, Permission.ViewAnyDefect, () => ({ id: 'defect-2' }));
  assert.equal(result.allowed, true);
  assert.deepEqual((result as { data?: unknown }).data, { id: 'defect-2' });
});
