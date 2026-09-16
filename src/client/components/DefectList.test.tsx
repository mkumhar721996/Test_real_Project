import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DefectList } from './DefectList';
import * as defectsApi from '../api/defectsApi';
import { AuthUser, Defect } from '../../shared/types/defect';

const reporter: AuthUser = { id: 'u1', role: 'REPORTER' };

describe('DefectList', () => {
  it('shows a loading indicator while defects are being fetched', () => {
    vi.spyOn(defectsApi, 'fetchDefects').mockReturnValue(new Promise(() => {}));
    render(<DefectList currentUser={reporter} />);
    expect(screen.getByRole('status', { name: /loading defects/i })).toBeInTheDocument();
  });

  it('shows an empty-state message when no defects match the filters', async () => {
    vi.spyOn(defectsApi, 'fetchDefects').mockResolvedValue([]);
    render(<DefectList currentUser={reporter} />);
    expect(await screen.findByText(/no defects match the current filters/i)).toBeInTheDocument();
  });

  it('renders the fetched defects once loaded', async () => {
    const fixture: Defect[] = [
      {
        id: 'd1',
        title: 'Login button broken',
        status: 'OPEN',
        severity: 'HIGH',
        createdBy: 'u1',
        assignee: 'u2',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    vi.spyOn(defectsApi, 'fetchDefects').mockResolvedValue(fixture);
    render(<DefectList currentUser={reporter} />);
    expect(await screen.findByText('Login button broken')).toBeInTheDocument();
  });

  it('shows an error message and clears the loading state when the fetch fails', async () => {
    vi.spyOn(defectsApi, 'fetchDefects').mockRejectedValue(new Error('network down'));
    render(<DefectList currentUser={reporter} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load defects/i);
    expect(screen.queryByRole('status', { name: /loading defects/i })).not.toBeInTheDocument();
  });
});
