import { useState } from 'react';
import { AuthUser, DefectFilters as DefectFiltersType } from '../../shared/types/defect';
import { useDefects } from '../hooks/useDefects';
import { DefectFilters } from './DefectFilters';

export interface DefectListProps {
  currentUser: AuthUser;
}

export function DefectList({ currentUser }: DefectListProps) {
  const [filters, setFilters] = useState<DefectFiltersType>({});
  const { defects, isLoading } = useDefects(currentUser, filters);

  return (
    <div>
      <DefectFilters value={filters} onChange={setFilters} />
      {isLoading ? (
        <div role="status" aria-label="Loading defects">
          Loading…
        </div>
      ) : defects.length === 0 ? (
        <p>No defects match the current filters.</p>
      ) : (
        <ul>
          {defects.map((d) => (
            <li key={d.id}>{d.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
