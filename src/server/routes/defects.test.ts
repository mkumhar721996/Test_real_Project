import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { Defect } from '../../shared/types/defect';

describe('GET /api/defects', () => {
  it('rejects requests with no authenticated user', async () => {
    const app = createApp();
    const res = await request(app).get('/api/defects');
    expect(res.status).toBe(401);
  });

  it('rejects requests with an arbitrary, non-allowlisted role value', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/defects')
      .set('x-user-id', 'u1')
      .set('x-user-role', 'SUPER_ADMIN');

    expect(res.status).toBe(401);
  });

  it('scopes results to the reporter who created them', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/defects')
      .set('x-user-id', 'u1')
      .set('x-user-role', 'REPORTER');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((d: Defect) => d.createdBy === 'u1')).toBe(true);
  });

  it('scopes results to the developer assigned to them', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/defects')
      .set('x-user-id', 'u2')
      .set('x-user-role', 'DEVELOPER');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((d: Defect) => d.assignee === 'u2')).toBe(true);
  });

  it('returns all defects for an admin', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/defects')
      .set('x-user-id', 'u9')
      .set('x-user-role', 'ADMIN');

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(4);
  });

  it('applies status/severity/assignee/date-range filters within role scope', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/defects?status=OPEN&severity=CRITICAL&assignee=u2&dateFrom=2026-01-01&dateTo=2026-12-31')
      .set('x-user-id', 'u2')
      .set('x-user-role', 'DEVELOPER');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(
      res.body.every(
        (d: Defect) => d.status === 'OPEN' && d.severity === 'CRITICAL' && d.assignee === 'u2'
      )
    ).toBe(true);
  });

  it('returns an empty array when filters match nothing in scope', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/defects?status=CLOSED')
      .set('x-user-id', 'u2')
      .set('x-user-role', 'DEVELOPER');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
