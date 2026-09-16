const request = require('supertest');
const app = require('../src/app');
const defectsRepository = require('../src/data/defectsRepository');

describe('GET /api/dashboard/summary', () => {
  afterEach(() => {
    defectsRepository.__setAll([]);
  });

  test("scopes counts to the requesting user's team", async () => {
    defectsRepository.__setAll([
      { id: 1, teamId: 'team-a', status: 'open', reportedAt: '2026-01-01', closedAt: null },
      { id: 2, teamId: 'team-b', status: 'open', reportedAt: '2026-01-01', closedAt: null },
    ]);

    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('x-user-role', 'member')
      .set('x-user-team', 'team-a');

    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ open: 1, closed: 0 });
  });

  test('returns zero counts when there are no defects', async () => {
    defectsRepository.__setAll([]);

    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('x-user-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ open: 0, closed: 0 });
    expect(res.body.trend).toEqual([]);
  });
});
