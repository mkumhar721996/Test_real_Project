import { randomUUID } from 'node:crypto';
import { validateDefectInput } from '../validation/validateDefectInput.js';
import { save } from '../repositories/defectRepository.js';

export function createDefect(input) {
  const { valid, errors } = validateDefectInput(input);
  if (!valid) {
    const error = new Error('Defect input validation failed');
    error.name = 'ValidationError';
    error.errors = errors;
    throw error;
  }

  const defect = {
    id: randomUUID(),
    title: input.title,
    description: input.description,
    severity: input.severity,
    priority: input.priority,
    status: 'New',
  };

  return save(defect);
}
