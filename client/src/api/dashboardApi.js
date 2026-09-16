export async function fetchDashboardSummary() {
  const response = await fetch('/api/dashboard/summary');
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard summary: ${response.status}`);
  }
  return response.json();
}
