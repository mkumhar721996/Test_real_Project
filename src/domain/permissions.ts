import type { Defect, User } from './types.ts';

export function canViewDefect(user: User, defect: Defect): boolean {
  switch (user.role) {
    case 'Developer':
      return defect.assignedTo === user.id;
    case 'Reporter':
      return defect.submittedBy === user.id;
    case 'Admin':
      return true;
    default:
      return false;
  }
}

export function canEditDefect(user: User, defect: Defect): boolean {
  return canViewDefect(user, defect);
}
