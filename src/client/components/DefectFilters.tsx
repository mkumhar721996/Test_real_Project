import { DefectFilters as DefectFiltersType, DefectSeverity, DefectStatus } from '../../shared/types/defect';

const STATUSES: DefectStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const SEVERITIES: DefectSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export interface DefectFiltersProps {
  value: DefectFiltersType;
  onChange: (filters: DefectFiltersType) => void;
}

export function DefectFilters({ value, onChange }: DefectFiltersProps) {
  return (
    <form aria-label="Defect filters">
      <label>
        Status
        <select
          value={value.status ?? ''}
          onChange={(e) =>
            onChange({ ...value, status: (e.target.value || undefined) as DefectStatus | undefined })
          }
        >
          <option value="">All</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label>
        Severity
        <select
          value={value.severity ?? ''}
          onChange={(e) =>
            onChange({ ...value, severity: (e.target.value || undefined) as DefectSeverity | undefined })
          }
        >
          <option value="">All</option>
          {SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {severity}
            </option>
          ))}
        </select>
      </label>
      <label>
        Assignee
        <input
          type="text"
          value={value.assignee ?? ''}
          onChange={(e) => onChange({ ...value, assignee: e.target.value || undefined })}
        />
      </label>
      <label>
        From
        <input
          type="date"
          value={value.dateFrom ?? ''}
          onChange={(e) => onChange({ ...value, dateFrom: e.target.value || undefined })}
        />
      </label>
      <label>
        To
        <input
          type="date"
          value={value.dateTo ?? ''}
          onChange={(e) => onChange({ ...value, dateTo: e.target.value || undefined })}
        />
      </label>
    </form>
  );
}
