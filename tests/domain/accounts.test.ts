import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Role } from '../../src/domain/roles.ts';
import { createAccount, changeRole, NotAuthorizedError } from '../../src/domain/accounts.ts';

test('an account carries exactly one role', () => {
  const account = createAccount({ id: 'u1', role: Role.Developer });
  assert.equal(account.role, Role.Developer);
  assert.equal(typeof account.role, 'string');
});

test('assigns Reporter when no role is specified', () => {
  const account = createAccount({ id: 'u2' });
  assert.equal(account.role, Role.Reporter);
});

test("lets an Admin change another account's role", () => {
  const admin = createAccount({ id: 'admin1', role: Role.Admin });
  const target = createAccount({ id: 'u3', role: Role.Reporter });
  const updated = changeRole(admin, target, Role.Developer);
  assert.equal(updated.role, Role.Developer);
});

test("denies a non-Admin attempting to change any account's role", () => {
  const developer = createAccount({ id: 'dev1', role: Role.Developer });
  const target = createAccount({ id: 'u4', role: Role.Reporter });
  assert.throws(() => changeRole(developer, target, Role.Admin), NotAuthorizedError);
  assert.equal(target.role, Role.Reporter);
});
