import { AuthUser, Defect } from '../../shared/types/defect';

export function visibleDefectsFor(user: AuthUser, defects: Defect[]): Defect[] {
  switch (user.role) {
    case 'ADMIN':
      return defects;
    case 'DEVELOPER':
      return defects.filter((d) => d.assignee === user.id);
    case 'REPORTER':
      return defects.filter((d) => d.createdBy === user.id);
  }
}
