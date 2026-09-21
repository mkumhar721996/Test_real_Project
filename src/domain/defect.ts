import { Role } from './roles';

export interface DefectInput {
  title: string;
  assigneeId?: string;
}

export type DefectStatus = 'New' | 'In Progress' | 'Fixed' | 'Closed' | "Won't Fix";

export interface Defect extends Omit<DefectInput, 'assigneeId'> {
  assigneeId?: string;
  status: DefectStatus;
}

export function createDefect(input: DefectInput, role: Role): Defect {
  const { title, assigneeId } = input;

  if (role === 'Admin') {
    return { title, assigneeId, status: 'New' };
  }

  return { title, status: 'New' };
}

export interface StatusChangeActor {
  role: Role;
  userId: string;
}

export class InvalidStatusTransitionError extends Error {}

function isTransitionAllowed(
  defect: Defect,
  targetStatus: DefectStatus,
  actor: StatusChangeActor
): boolean {
  const isAssignedDeveloper = actor.role === 'Developer' && defect.assigneeId === actor.userId;
  const isAdmin = actor.role === 'Admin';

  if (!isAssignedDeveloper && !isAdmin) return false;

  if (defect.status === "Won't Fix") return false;

  if (targetStatus === "Won't Fix") {
    return isAdmin && defect.status !== 'Closed';
  }

  switch (defect.status) {
    case 'New':
      return targetStatus === 'In Progress';
    case 'In Progress':
      return targetStatus === 'Fixed';
    case 'Fixed':
      return targetStatus === 'Closed' && isAdmin;
    case 'Closed':
      return targetStatus === 'New' && isAdmin;
    default:
      return false;
  }
}

export function changeDefectStatus(
  defect: Defect,
  targetStatus: DefectStatus,
  actor: StatusChangeActor
): Defect {
  if (!isTransitionAllowed(defect, targetStatus, actor)) {
    throw new InvalidStatusTransitionError(
      `Cannot change defect from "${defect.status}" to "${targetStatus}"`
    );
  }

  return { ...defect, status: targetStatus };
}
