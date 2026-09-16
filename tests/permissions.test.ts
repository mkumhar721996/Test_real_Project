import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserRepository } from '../src/domain/userRepository.ts';
import { canViewDefect } from '../src/domain/permissions.ts';
import type { Defect } from '../src/domain/types.ts';

test('AC1: Reporter promoted to Developer gains visibility to defects assigned to them', () => {
  const userRepo = new UserRepository();
  userRepo.addUser({ id: 'u1', role: 'Reporter' });
  const defect: Defect = { id: 'd1', submittedBy: 'other', assignedTo: 'u1' };

  assert.equal(canViewDefect(userRepo.getUser('u1'), defect), false);

  userRepo.updateRole('u1', 'Developer');

  assert.equal(canViewDefect(userRepo.getUser('u1'), defect), true);
});

test('AC2: Reporter promoted to Developer loses visibility to defects submitted but not assigned to them', () => {
  const userRepo = new UserRepository();
  userRepo.addUser({ id: 'u1', role: 'Reporter' });
  const defect: Defect = { id: 'd2', submittedBy: 'u1', assignedTo: 'other' };

  assert.equal(canViewDefect(userRepo.getUser('u1'), defect), true);

  userRepo.updateRole('u1', 'Developer');

  assert.equal(canViewDefect(userRepo.getUser('u1'), defect), false);
});

test('AC3: Developer demoted to Reporter loses visibility to defects assigned to (not submitted by) them', () => {
  const userRepo = new UserRepository();
  userRepo.addUser({ id: 'u1', role: 'Developer' });
  const defect: Defect = { id: 'd3', submittedBy: 'other', assignedTo: 'u1' };

  assert.equal(canViewDefect(userRepo.getUser('u1'), defect), true);

  userRepo.updateRole('u1', 'Reporter');

  assert.equal(canViewDefect(userRepo.getUser('u1'), defect), false);
});
