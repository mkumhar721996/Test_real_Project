import { AuthUser, Defect, DefectFilters } from '../../shared/types/defect';

export async function fetchDefects(user: AuthUser, filters: DefectFilters): Promise<Defect[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.assignee) params.set('assignee', filters.assignee);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);

  const query = params.toString();
  const response = await fetch(`/api/defects${query ? `?${query}` : ''}`, {
    headers: {
      'x-user-id': user.id,
      'x-user-role': user.role,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch defects: ${response.status}`);
  }
  return response.json();
}
