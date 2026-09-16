import { Defect } from '../../shared/types/defect';

const defects: Defect[] = [
  {
    id: 'd1',
    title: 'Login button broken on Safari',
    status: 'OPEN',
    severity: 'HIGH',
    createdBy: 'u1',
    assignee: 'u2',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'd2',
    title: 'Typo on homepage hero',
    status: 'CLOSED',
    severity: 'LOW',
    createdBy: 'u1',
    assignee: 'u3',
    createdAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: 'd3',
    title: 'Crash on checkout submit',
    status: 'OPEN',
    severity: 'CRITICAL',
    createdBy: 'u4',
    assignee: 'u2',
    createdAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'd4',
    title: 'Slow report export',
    status: 'RESOLVED',
    severity: 'MEDIUM',
    createdBy: 'u4',
    assignee: null,
    createdAt: '2026-04-20T00:00:00.000Z',
  },
];

export const defectsStore = {
  all(): Defect[] {
    return defects;
  },
};
