import { memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { ChartContainer } from './ChartContainer';

interface TopProductData {
  product_name: string;
  total_sold: number;
  revenue: number;
  displayName?: string;
}

interface TopProductsChartProps {
  data: TopProductData[];
  period: string;
  loading?: boolean;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TopProductData;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-md max-w-xs">
        <p className="font-medium text-sm mb-1">{data.displayName || data.product_name}</p>
        <p className="text-primary text-sm">
          {`${data.total_sold} units sold`}
        </p>
        <p className="text-emerald-600 text-sm">
          {`$${typeof data.revenue === 'string' ? parseFloat(data.revenue).toFixed(2) : data.revenue.toFixed(2)} revenue`}
        </p>
      </div>
    );
  }
  return null;
};

// Format product names for display (truncate long names)
const formatProductName = (name: string) => {
  if (name.length > 20) {
    return name.substring(0, 17) + '...';
  }
  return name;
};

// Format Y-axis values
const formatYAxisLabel = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
};

export const TopProductsChart = memo<TopProductsChartProps>(({
  data,
  period,
  loading = false
}) => {
  // Transform data for better display
  const chartData = data.map(item => ({
    ...item,
    displayName: formatProductName(item.product_name),
    revenue: typeof item.revenue === 'string' ? parseFloat(item.revenue) : item.revenue
  }));

  return (
    <ChartContainer
      title={`Top Products (${period})`}
      loading={loading}
      height={350}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="displayName"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={formatYAxisLabel}
            className="text-muted-foreground"
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
          />
          <Bar
            dataKey="total_sold"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});

TopProductsChart.displayName = 'TopProductsChart';
