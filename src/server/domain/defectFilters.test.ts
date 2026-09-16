import { describe, expect, it } from 'vitest';
import { applyDefectFilters } from './defectFilters';
import { Defect } from '../../shared/types/defect';

const fixtureDefects: Defect[] = [
  {
    id: 'd1',
    title: 'Login button broken',
    status: 'OPEN',
    severity: 'HIGH',
    createdBy: 'u1',
    assignee: 'u2',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'd2',
    title: 'Typo on homepage',
    status: 'CLOSED',
    severity: 'LOW',
    createdBy: 'u4',
    assignee: 'u2',
    createdAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: 'd3',
    title: 'Crash on checkout',
    status: 'OPEN',
    severity: 'CRITICAL',
    createdBy: 'u1',
    assignee: 'u3',
    createdAt: '2026-03-15T00:00:00.000Z',
  },
];

describe('applyDefectFilters', () => {
  it('filters by status', () => {
    const result = applyDefectFilters(fixtureDefects, { status: 'OPEN' });
    expect(result.map((d) => d.id)).toEqual(['d1', 'd3']);
  });

  it('filters by severity', () => {
    const result = applyDefectFilters(fixtureDefects, { severity: 'CRITICAL' });
    expect(result.map((d) => d.id)).toEqual(['d3']);
  });

  it('filters by assignee', () => {
    const result = applyDefectFilters(fixtureDefects, { assignee: 'u2' });
    expect(result.map((d) => d.id)).toEqual(['d1', 'd2']);
  });

  it('filters by inclusive date range', () => {
    const result = applyDefectFilters(fixtureDefects, {
      dateFrom: '2026-02-01T00:00:00.000Z',
      dateTo: '2026-02-28T00:00:00.000Z',
    });
    expect(result.map((d) => d.id)).toEqual(['d2']);
  });

  it('combines multiple filters with AND semantics', () => {
    const result = applyDefectFilters(fixtureDefects, {
      status: 'OPEN',
      assignee: 'u3',
    });
    expect(result.map((d) => d.id)).toEqual(['d3']);
  });

  it('returns all defects when no filters are provided', () => {
    expect(applyDefectFilters(fixtureDefects, {})).toEqual(fixtureDefects);
  });
});
