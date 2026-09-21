import { countByStatus, dailyTrend, DefectRecord, visibleDefects } from './summary';

test('counts open and closed defects', () => {
  const counts = countByStatus([
    { title: 'A', status: 'Open', createdAt: '2026-09-18' },
    { title: 'B', status: 'Open', createdAt: '2026-09-19' },
    { title: 'C', status: 'Closed', createdAt: '2026-09-19' },
  ]);
  expect(counts).toEqual({ open: 2, closed: 1 });
});

test('reports zero counts for an empty defect list', () => {
  expect(countByStatus([])).toEqual({ open: 0, closed: 0 });
});

test('buckets defects into daily trend points, sorted by date', () => {
  const trend = dailyTrend([
    { title: 'A', status: 'Open', createdAt: '2026-09-19' },
    { title: 'B', status: 'Open', createdAt: '2026-09-18' },
    { title: 'C', status: 'Closed', createdAt: '2026-09-18' },
  ]);
  expect(trend).toEqual([
    { date: '2026-09-18', count: 2 },
    { date: '2026-09-19', count: 1 },
  ]);
});

test('returns no trend points for an empty defect list', () => {
  expect(dailyTrend([])).toEqual([]);
});

test('Admin sees all defects; other roles see only their assigned defects', () => {
  const defects: DefectRecord[] = [
    { title: 'Mine', assigneeId: 'user-1', status: 'Open', createdAt: '2026-09-18' },
    { title: 'Not mine', assigneeId: 'user-2', status: 'Closed', createdAt: '2026-09-18' },
  ];
  expect(visibleDefects(defects, 'Admin', 'user-1')).toHaveLength(2);
  expect(visibleDefects(defects, 'Developer', 'user-1')).toEqual([defects[0]]);
  expect(visibleDefects(defects, 'Reporter', 'user-1')).toEqual([defects[0]]);
});

test('non-Admins see defects they reported even when unassigned', () => {
  const defects: DefectRecord[] = [
    { title: 'Reported by me', reporterId: 'user-1', status: 'Open', createdAt: '2026-09-18' },
    {
      title: 'Reported by someone else',
      reporterId: 'user-2',
      status: 'Open',
      createdAt: '2026-09-18',
    },
  ];
  expect(visibleDefects(defects, 'Reporter', 'user-1')).toEqual([defects[0]]);
  expect(visibleDefects(defects, 'Developer', 'user-1')).toEqual([defects[0]]);
});
