import { describe, test, expect } from 'vitest';
import { validateDefectInput } from '../src/validation/validateDefectInput.js';

describe('validateDefectInput', () => {
  test('reports an error for each missing required field', () => {
    const { valid, errors } = validateDefectInput({
      title: '',
      description: 'd',
      severity: '',
      priority: 'Low',
    });

    expect(valid).toBe(false);
    expect(errors.title).toMatch(/required/i);
    expect(errors.severity).toMatch(/required/i);
  });

  test('is valid when every required field is present', () => {
    const { valid, errors } = validateDefectInput({
      title: 'Login fails',
      description: 'Cannot log in with valid creds',
      severity: 'High',
      priority: 'High',
    });

    expect(valid).toBe(true);
    expect(errors).toEqual({});
  });
});
