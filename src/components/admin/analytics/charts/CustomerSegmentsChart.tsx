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

interface CustomerSegmentData {
  segment: string;
  customer_count: number;
  avg_spent: number;
  total_segment_revenue: number;
  avg_orders: number;
}

interface CustomerSegmentsChartProps {
  data: CustomerSegmentData[];
  period: string;
  loading?: boolean;
}

// Color mapping for customer segments
const SEGMENT_COLORS: Record<string, string> = {
  VIP: '#f59e0b',        // amber - gold for VIP
  Regular: '#3b82f6',    // blue - standard customers
  New: '#10b981',        // emerald - fresh customers
  Prospect: '#6b7280',   // gray - potential customers
};

// Custom tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CustomerSegmentData;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-md">
        <p className="font-medium text-sm capitalize">{data.segment} Customers</p>
        <p className="text-primary text-sm">
          {`${data.customer_count} customers`}
        </p>
        <p className="text-emerald-600 text-sm">
          {`Avg Order: $${data.avg_spent.toFixed(2)}`}
        </p>
        <p className="text-muted-foreground text-xs">
          {`Total Revenue: $${data.total_segment_revenue.toFixed(2)}`}
        </p>
      </div>
    );
  }
  return null;
};

// Custom label for pie slices - only show for significant slices
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name
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

export const CustomerSegmentsChart = memo<CustomerSegmentsChartProps>(({
  data,
  period,
  loading = false
}) => {
  // Transform data and ensure colors
  const chartData = data.map(item => ({
    ...item,
    name: item.segment,
    value: item.customer_count,
    color: SEGMENT_COLORS[item.segment] || '#6b7280'
  }));

  // Calculate total customers for percentage calculation
  const totalCustomers = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartContainer
      title={`Customer Segments (${period})`}
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
            innerRadius={60} // Donut shape
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
            formatter={(value, entry: any) => {
              const percentage = ((entry.payload.value / totalCustomers) * 100).toFixed(1);
              return (
                <span style={{ color: entry.color }}>
                  {value} ({entry.payload.value} customers - {percentage}%)
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});

CustomerSegmentsChart.displayName = 'CustomerSegmentsChart';
