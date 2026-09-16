const { getDashboardSummary, buildDailyTrend } = require('../src/services/dashboardService');

describe('getDashboardSummary', () => {
  test('counts visible open and closed defects', () => {
    const user = { role: 'admin', teamId: null };
    const defects = [
      { id: 1, teamId: 'a', status: 'open', reportedAt: '2026-01-01', closedAt: null },
      { id: 2, teamId: 'a', status: 'closed', reportedAt: '2026-01-01', closedAt: '2026-01-02' },
    ];
    const { counts } = getDashboardSummary(user, defects);
    expect(counts).toEqual({ open: 1, closed: 1 });
  });

  test('returns zero counts when no defects are visible', () => {
    const { counts } = getDashboardSummary({ role: 'admin' }, []);
    expect(counts).toEqual({ open: 0, closed: 0 });
  });

  test('trend is empty when there are no defects', () => {
    const { trend } = getDashboardSummary({ role: 'admin' }, []);
    expect(trend).toEqual([]);
  });

  test('a non-admin only sees defects from their own team', () => {
    const user = { role: 'member', teamId: 'team-a' };
    const defects = [
      { id: 1, teamId: 'team-a', status: 'open', reportedAt: '2026-01-01', closedAt: null },
      { id: 2, teamId: 'team-b', status: 'open', reportedAt: '2026-01-01', closedAt: null },
    ];
    const { counts, trend } = getDashboardSummary(user, defects);
    expect(counts).toEqual({ open: 1, closed: 0 });
    expect(trend).toEqual([{ date: '2026-01-01', open: 1, closed: 0 }]);
  });
});

describe('buildDailyTrend', () => {
  test('returns one cumulative snapshot per day in range', () => {
    const defects = [
      { id: 1, teamId: 'a', status: 'open', reportedAt: '2026-01-01', closedAt: null },
      { id: 2, teamId: 'a', status: 'closed', reportedAt: '2026-01-01', closedAt: '2026-01-02' },
    ];
    const { trend } = getDashboardSummary({ role: 'admin' }, defects);
    expect(trend).toEqual([
      { date: '2026-01-01', open: 2, closed: 0 },
      { date: '2026-01-02', open: 1, closed: 1 },
    ]);
  });

  test('returns an empty array for no defects', () => {
    expect(buildDailyTrend([])).toEqual([]);
  });
});
