import { useEffect, useState } from 'react';
import { fetchDashboardSummary } from '../api/dashboardApi';
import TrendChart from '../components/TrendChart.jsx';

export default function DashboardPage() {
  const [status, setStatus] = useState('loading');
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchDashboardSummary()
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setStatus('success');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return <div data-testid="dashboard-loading">Loading dashboard...</div>;
  }

  if (status === 'error') {
    return <div role="alert">Failed to load dashboard: {error.message}</div>;
  }

  return (
    <div>
      <div>
        <span data-testid="open-count-label">Open</span>
        <span data-testid="open-count">{summary.counts.open}</span>
      </div>
      <div>
        <span data-testid="closed-count-label">Closed</span>
        <span data-testid="closed-count">{summary.counts.closed}</span>
      </div>
      <TrendChart trend={summary.trend} />
    </div>
  );
}
