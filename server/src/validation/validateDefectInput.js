export const REQUIRED_DEFECT_FIELDS = ['title', 'description', 'severity', 'priority'];

export function validateDefectInput(input) {
  const errors = {};

  for (const field of REQUIRED_DEFECT_FIELDS) {
    const value = input?.[field];
    if (typeof value !== 'string' || value.trim() === '') {
      errors[field] = `${field} is required`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
