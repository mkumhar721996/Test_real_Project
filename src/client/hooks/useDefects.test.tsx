import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDefects } from './useDefects';
import * as defectsApi from '../api/defectsApi';
import { AuthUser, Defect } from '../../shared/types/defect';

const reporter: AuthUser = { id: 'u1', role: 'REPORTER' };

describe('useDefects', () => {
  it('starts in a loading state before the fetch resolves', () => {
    vi.spyOn(defectsApi, 'fetchDefects').mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useDefects(reporter, {}));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.defects).toEqual([]);
  });

  it('exposes fetched defects and stops loading once resolved', async () => {
    const fixture: Defect[] = [
      {
        id: 'd1',
        title: 'Login bug',
        status: 'OPEN',
        severity: 'HIGH',
        createdBy: 'u1',
        assignee: 'u2',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    vi.spyOn(defectsApi, 'fetchDefects').mockResolvedValue(fixture);

    const { result } = renderHook(() => useDefects(reporter, {}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.defects).toEqual(fixture);
  });

  it('stops loading and exposes an error when the fetch rejects', async () => {
    vi.spyOn(defectsApi, 'fetchDefects').mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useDefects(reporter, {}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.defects).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
