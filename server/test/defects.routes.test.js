import { describe, test, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('POST /api/defects', () => {
  test('creates a defect with status New immediately', async () => {
    const res = await request(app).post('/api/defects').send({
      title: 'Login fails',
      description: 'Cannot log in with valid creds',
      severity: 'High',
      priority: 'High',
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('New');
  });

  test('returns a 400 with field errors when a required field is missing', async () => {
    const res = await request(app).post('/api/defects').send({
      title: '',
      description: 'Cannot log in with valid creds',
      severity: 'High',
      priority: 'High',
    });

    expect(res.status).toBe(400);
    expect(res.body.errors.title).toMatch(/required/i);
  });
});
