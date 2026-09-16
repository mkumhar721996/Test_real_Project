import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function TrendChart({ trend }) {
  if (trend.length === 0) {
    return <div data-testid="trend-empty-state">No trend data yet</div>;
  }

  return (
    <div data-testid="trend-chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="open" stroke="#d97706" name="Open" />
          <Line type="monotone" dataKey="closed" stroke="#16a34a" name="Closed" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
