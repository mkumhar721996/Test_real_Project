import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserRepository } from '../src/domain/userRepository.ts';
import { DefectRepository } from '../src/domain/defectRepository.ts';
import { editDefect, PermissionDeniedError } from '../src/domain/defectService.ts';
import type { Session } from '../src/domain/types.ts';

test('AC6: Reporter promoted to Developer can immediately edit a defect now assigned to them', () => {
  const userRepo = new UserRepository();
  userRepo.addUser({ id: 'u1', role: 'Reporter' });
  const defectRepo = new DefectRepository();
  defectRepo.addDefect({ id: 'd7', submittedBy: 'other', assignedTo: 'u1' });
  const session: Session = { userId: 'u1' };
  userRepo.updateRole('u1', 'Developer');

  const updated = editDefect(session, 'd7', { assignedTo: 'u1' }, userRepo, defectRepo);

  assert.equal(updated.assignedTo, 'u1');
});

test('AC7: Developer demoted to Reporter is immediately rejected editing a defect previously assigned to them', () => {
  const userRepo = new UserRepository();
  userRepo.addUser({ id: 'u1', role: 'Developer' });
  const defectRepo = new DefectRepository();
  defectRepo.addDefect({ id: 'd8', submittedBy: 'other', assignedTo: 'u1' });
  const session: Session = { userId: 'u1' };
  userRepo.updateRole('u1', 'Reporter');

  assert.throws(
    () => editDefect(session, 'd8', { assignedTo: 'u1' }, userRepo, defectRepo),
    PermissionDeniedError
  );
});
