import { useEffect, useRef, useState } from 'react';
import { Role } from '../domain/roles';
import { countByStatus, dailyTrend, DefectRecord, visibleDefects } from '../domain/summary';

export interface SummaryDashboardProps {
  role: Role;
  currentUserId: string;
  loadDefects: () => Promise<DefectRecord[]>;
}

export function SummaryDashboard({
  role,
  currentUserId,
  loadDefects,
}: SummaryDashboardProps): JSX.Element {
  const [defects, setDefects] = useState<DefectRecord[] | null>(null);
  const [error, setError] = useState(false);

  const loadDefectsRef = useRef(loadDefects);
  loadDefectsRef.current = loadDefects;

  useEffect(() => {
    let cancelled = false;

    loadDefectsRef.current().then(
      (loaded) => {
        if (!cancelled) {
          setDefects(loaded);
        }
      },
      (loadError) => {
        if (!cancelled) {
          console.error('Failed to load summary dashboard defects', loadError);
          setError(true);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [role, currentUserId]);

  if (error) {
    return <p role="alert">Unable to load defect summary. Please try again later.</p>;
  }

  if (defects === null) {
    return <p role="status">Loading summary…</p>;
  }

  const visible = visibleDefects(defects, role, currentUserId);
  const counts = countByStatus(visible);
  const trend = dailyTrend(visible);

  return (
    <div>
      <p>Open: {counts.open}</p>
      <p>Closed: {counts.closed}</p>

      {trend.length === 0 ? (
        <p>No defect activity to show yet.</p>
      ) : (
        <ul aria-label="Defect trend">
          {trend.map((point) => (
            <li key={point.date}>
              {point.date}: {point.count}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
