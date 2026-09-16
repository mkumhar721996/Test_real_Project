import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import TrendChart from './TrendChart.jsx';

describe('TrendChart', () => {
  test('shows an empty state instead of a chart when there is no trend data', () => {
    render(<TrendChart trend={[]} />);
    expect(screen.getByTestId('trend-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('trend-chart')).not.toBeInTheDocument();
  });

  test('renders the chart when trend data is present', () => {
    render(
      <TrendChart
        trend={[
          { date: '2026-01-01', open: 2, closed: 0 },
          { date: '2026-01-02', open: 1, closed: 1 },
        ]}
      />,
    );
    expect(screen.getByTestId('trend-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('trend-empty-state')).not.toBeInTheDocument();
  });
});
