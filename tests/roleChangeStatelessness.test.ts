import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { UserRepository } from '../src/domain/userRepository.ts';
import { DefectRepository } from '../src/domain/defectRepository.ts';
import { viewDefect, PermissionDeniedError } from '../src/domain/defectService.ts';
import type { Session } from '../src/domain/types.ts';

test('AC4a: viewDefect reflects a role change immediately with no cache-clear step', () => {
  const userRepo = new UserRepository();
  userRepo.addUser({ id: 'u1', role: 'Reporter' });
  const defectRepo = new DefectRepository();
  defectRepo.addDefect({ id: 'd4', submittedBy: 'other', assignedTo: 'u1' });
  const session: Session = { userId: 'u1' };

  assert.throws(() => viewDefect(session, 'd4', userRepo, defectRepo), PermissionDeniedError);

  userRepo.updateRole('u1', 'Developer');

  assert.equal(viewDefect(session, 'd4', userRepo, defectRepo).id, 'd4');
});

test('AC4b: viewDefect re-reads the role from the repository on every call (no memoization)', () => {
  const userRepo = new UserRepository();
  userRepo.addUser({ id: 'u1', role: 'Developer' });
  const defectRepo = new DefectRepository();
  defectRepo.addDefect({ id: 'd5', submittedBy: 'other', assignedTo: 'u1' });
  const session: Session = { userId: 'u1' };
  const getUserSpy = mock.method(userRepo, 'getUser');

  viewDefect(session, 'd5', userRepo, defectRepo);
  viewDefect(session, 'd5', userRepo, defectRepo);

  assert.equal(getUserSpy.mock.calls.length, 2);
});

test('AC5: a role change mid-session is enforced on the next action using the same session', () => {
  const userRepo = new UserRepository();
  userRepo.addUser({ id: 'u1', role: 'Reporter' });
  const defectRepo = new DefectRepository();
  defectRepo.addDefect({ id: 'd6', submittedBy: 'other', assignedTo: 'u1' });
  const session: Session = { userId: 'u1' };

  assert.throws(() => viewDefect(session, 'd6', userRepo, defectRepo), PermissionDeniedError);

  userRepo.updateRole('u1', 'Developer');

  assert.equal(viewDefect(session, 'd6', userRepo, defectRepo).id, 'd6');
});
