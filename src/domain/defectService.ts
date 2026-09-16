import type { Defect, Session } from './types.ts';
import { UserRepository } from './userRepository.ts';
import { DefectRepository } from './defectRepository.ts';
import { canEditDefect, canViewDefect } from './permissions.ts';

export class PermissionDeniedError extends Error {}

export function viewDefect(
  session: Session,
  defectId: string,
  userRepo: UserRepository,
  defectRepo: DefectRepository
): Defect {
  const user = userRepo.getUser(session.userId);
  const defect = defectRepo.getDefect(defectId);
  if (!canViewDefect(user, defect)) {
    throw new PermissionDeniedError(`User ${user.id} cannot view defect ${defect.id}`);
  }
  return defect;
}

export function editDefect(
  session: Session,
  defectId: string,
  changes: Partial<Pick<Defect, 'assignedTo'>>,
  userRepo: UserRepository,
  defectRepo: DefectRepository
): Defect {
  const user = userRepo.getUser(session.userId);
  const defect = defectRepo.getDefect(defectId);
  if (!canEditDefect(user, defect)) {
    throw new PermissionDeniedError(`User ${user.id} cannot edit defect ${defect.id}`);
  }
  return defectRepo.updateDefect(defectId, changes);
}
