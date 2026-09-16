import { describe, test, expect } from 'vitest';
import { createDefect } from '../src/services/defectService.js';

describe('createDefect', () => {
  test('always sets status to New, ignoring any client-supplied status', () => {
    const defect = createDefect({
      title: 'Login fails',
      description: 'Cannot log in with valid creds',
      severity: 'High',
      priority: 'High',
      status: 'Draft',
    });

    expect(defect.status).toBe('New');
    expect(defect.id).toBeDefined();
  });

  test('throws a ValidationError when a required field is missing', () => {
    expect(() => createDefect({ title: '', description: 'd', severity: 'High', priority: 'High' })).toThrow();

    try {
      createDefect({ title: '', description: 'd', severity: 'High', priority: 'High' });
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.title).toMatch(/required/i);
    }
  });
});
