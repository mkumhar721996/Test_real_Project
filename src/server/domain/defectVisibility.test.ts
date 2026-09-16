import { describe, expect, it } from 'vitest';
import { visibleDefectsFor } from './defectVisibility';
import { AuthUser, Defect } from '../../shared/types/defect';

const fixtureDefects: Defect[] = [
  {
    id: 'd1',
    title: 'Login button broken',
    status: 'OPEN',
    severity: 'HIGH',
    createdBy: 'u1',
    assignee: 'u2',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'd2',
    title: 'Typo on homepage',
    status: 'CLOSED',
    severity: 'LOW',
    createdBy: 'u4',
    assignee: 'u2',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'd3',
    title: 'Crash on checkout',
    status: 'IN_PROGRESS',
    severity: 'CRITICAL',
    createdBy: 'u1',
    assignee: null,
    createdAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'd4',
    title: 'Slow report export',
    status: 'RESOLVED',
    severity: 'MEDIUM',
    createdBy: 'u5',
    assignee: 'u6',
    createdAt: '2026-04-01T00:00:00.000Z',
  },
];

describe('visibleDefectsFor', () => {
  it('returns only defects created by the reporter', () => {
    const reporter: AuthUser = { id: 'u1', role: 'REPORTER' };
    const result = visibleDefectsFor(reporter, fixtureDefects);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((d) => d.createdBy === 'u1')).toBe(true);
  });

  it('returns only defects assigned to the developer', () => {
    const developer: AuthUser = { id: 'u2', role: 'DEVELOPER' };
    const result = visibleDefectsFor(developer, fixtureDefects);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((d) => d.assignee === 'u2')).toBe(true);
  });

  it('returns all defects for an admin', () => {
    const admin: AuthUser = { id: 'u3', role: 'ADMIN' };
    expect(visibleDefectsFor(admin, fixtureDefects)).toEqual(fixtureDefects);
  });
});
