import { Role } from './roles';

export interface DeletableDefect {
  id: string;
  status: string;
}

export interface DeletableComment {
  id: string;
  defectId: string;
}

export class NotAuthorizedError extends Error {}

export function deleteDefect(
  defects: DeletableDefect[],
  comments: DeletableComment[],
  defectId: string,
  role: Role
): { defects: DeletableDefect[]; comments: DeletableComment[] } {
  if (role !== 'Admin') {
    throw new NotAuthorizedError('Only Admins can permanently delete defects.');
  }

  return {
    defects: defects.filter((defect) => defect.id !== defectId),
    comments: comments.filter((comment) => comment.defectId !== defectId),
  };
}
