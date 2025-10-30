import { memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { ChartContainer } from './ChartContainer';

interface RevenueDataPoint {
  date: string;
  revenue: number;
  order_count: number;
}

interface RevenueTrendChartProps {
  data: RevenueDataPoint[];
  period: string;
  loading?: boolean;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as RevenueDataPoint;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-md">
        <p className="font-medium text-sm">{`Date: ${label}`}</p>
        <p className="text-primary text-sm">
          {`Revenue: $${data.revenue.toFixed(2)}`}
        </p>
        <p className="text-muted-foreground text-xs">
          {`${data.order_count} orders`}
        </p>
      </div>
    );
  }
  return null;
};

// Format date labels based on period
const formatXAxisLabel = (tickItem: string, period: string) => {
  const date = new Date(tickItem);

  switch (period) {
    case '7d':
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    case '30d':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '90d':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '1y':
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    default:
      return tickItem;
  }
};

// Format Y-axis values as currency
const formatYAxisLabel = (value: number) => {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
};

export const RevenueTrendChart = memo<RevenueTrendChartProps>(({
  data,
  period,
  loading = false
}) => {
  // Transform data for better display
  const chartData = data.map(item => ({
    ...item,
    displayDate: formatXAxisLabel(item.date, period)
  }));

  return (
    <ChartContainer
      title="Revenue Trend"
      loading={loading}
      height={350}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatXAxisLabel(value, period)}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={formatYAxisLabel}
            className="text-muted-foreground"
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});

RevenueTrendChart.displayName = 'RevenueTrendChart';
