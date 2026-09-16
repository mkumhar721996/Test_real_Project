import { useEffect, useState } from 'react';
import { AuthUser, Defect, DefectFilters } from '../../shared/types/defect';
import { fetchDefects } from '../api/defectsApi';

export interface UseDefectsResult {
  defects: Defect[];
  isLoading: boolean;
  error: Error | null;
}

export function useDefects(user: AuthUser, filters: DefectFilters): UseDefectsResult {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchDefects(user, filters)
      .then((result) => {
        if (!cancelled) {
          setDefects(result);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch defects'));
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user.id, user.role, JSON.stringify(filters)]);

  return { defects, isLoading, error };
}
