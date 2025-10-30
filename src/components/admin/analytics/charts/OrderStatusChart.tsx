import { memo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  TooltipProps
} from 'recharts';
import { ChartContainer } from './ChartContainer';

interface OrderStatusData {
  status: string;
  count: number;
  total_revenue: number;
}

interface OrderStatusChartProps {
  data: OrderStatusData[];
  period: string;
  loading?: boolean;
}

// Color mapping for order statuses
const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',     // amber
  processing: '#3b82f6',  // blue
  shipped: '#8b5cf6',     // violet
  delivered: '#10b981',   // emerald
  cancelled: '#ef4444',   // red
  refunded: '#6b7280',    // gray
};

// Custom tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as OrderStatusData;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-md">
        <p className="font-medium text-sm capitalize">{data.status}</p>
        <p className="text-primary text-sm">
          {`${data.count} orders`}
        </p>
        <p className="text-muted-foreground text-xs">
          {`$${data.total_revenue.toFixed(2)} revenue`}
        </p>
      </div>
    );
  }
  return null;
};

// Custom label for pie slices
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent
}: any) => {
  if (percent < 0.05) return null; // Don't show labels for slices smaller than 5%

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const OrderStatusChart = memo<OrderStatusChartProps>(({
  data,
  period,
  loading = false
}) => {
  // Transform data and ensure colors
  const chartData = data.map(item => ({
    ...item,
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    color: STATUS_COLORS[item.status] || '#6b7280'
  }));

  return (
    <ChartContainer
      title={`Order Status Distribution (${period})`}
      loading={loading}
      height={350}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>
                {value} ({entry.payload.count})
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});

OrderStatusChart.displayName = 'OrderStatusChart';
