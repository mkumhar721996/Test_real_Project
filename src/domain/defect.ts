import { Role } from './roles';

export interface DefectInput {
  title: string;
  assigneeId?: string;
}

export interface Defect extends Omit<DefectInput, 'assigneeId'> {
  assigneeId?: string;
}

export function createDefect(input: DefectInput, role: Role): Defect {
  const { title, assigneeId } = input;

  if (role === 'Admin') {
    return { title, assigneeId };
  }

  return { title };
}
