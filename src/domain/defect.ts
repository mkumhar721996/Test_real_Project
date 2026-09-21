import { Role } from './roles';

export type DefectStatus = 'New';

export interface DefectInput {
  title: string;
  description: string;
  assigneeId?: string;
}

export interface Defect {
  title: string;
  description: string;
  status: DefectStatus;
  assigneeId?: string;
}

export type DefectValidationErrors = Partial<Record<'title' | 'description', string>>;

export function validateDefectInput(input: DefectInput): DefectValidationErrors {
  const errors: DefectValidationErrors = {};

  if (!input.title.trim()) {
    errors.title = 'Title is required.';
  }

  if (!input.description.trim()) {
    errors.description = 'Description is required.';
  }

  return errors;
}

export function createDefect(input: DefectInput, role: Role): Defect {
  const { title, description, assigneeId } = input;

  if (role === 'Admin') {
    return { title, description, status: 'New', assigneeId };
  }

  return { title, description, status: 'New' };
}
