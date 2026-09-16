import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as dashboardApi from '../api/dashboardApi';
import DashboardPage from './DashboardPage.jsx';

describe('DashboardPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('shows a loading indicator while the summary request is in flight', () => {
    vi.spyOn(dashboardApi, 'fetchDashboardSummary').mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  test('renders zero counts instead of an error when there are no defects', async () => {
    vi.spyOn(dashboardApi, 'fetchDashboardSummary').mockResolvedValue({
      counts: { open: 0, closed: 0 },
      trend: [],
    });
    render(<DashboardPage />);
    expect(await screen.findByTestId('open-count')).toHaveTextContent('0');
    expect(screen.getByTestId('closed-count')).toHaveTextContent('0');
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  test('renders open and closed counts on success', async () => {
    vi.spyOn(dashboardApi, 'fetchDashboardSummary').mockResolvedValue({
      counts: { open: 3, closed: 5 },
      trend: [],
    });
    render(<DashboardPage />);
    expect(await screen.findByTestId('open-count')).toHaveTextContent('3');
    expect(screen.getByTestId('closed-count')).toHaveTextContent('5');
  });

  test('does not render a granularity control', async () => {
    vi.spyOn(dashboardApi, 'fetchDashboardSummary').mockResolvedValue({
      counts: { open: 1, closed: 1 },
      trend: [{ date: '2026-01-01', open: 1, closed: 1 }],
    });
    render(<DashboardPage />);
    await screen.findByTestId('trend-chart');
    expect(screen.queryByLabelText(/granularity/i)).not.toBeInTheDocument();
  });
});
