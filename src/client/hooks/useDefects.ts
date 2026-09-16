import { useEffect, useState } from 'react';
import { AuthUser, Defect, DefectFilters } from '../../shared/types/defect';
import { fetchDefects } from '../api/defectsApi';

export interface UseDefectsResult {
  defects: Defect[];
  isLoading: boolean;
}

export function useDefects(user: AuthUser, filters: DefectFilters): UseDefectsResult {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchDefects(user, filters).then((result) => {
      if (!cancelled) {
        setDefects(result);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user.id, user.role, JSON.stringify(filters)]);

  return { defects, isLoading };
}
