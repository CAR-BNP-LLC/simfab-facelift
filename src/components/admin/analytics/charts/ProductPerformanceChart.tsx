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

interface ProductPerformanceData {
  id: number;
  product_name: string;
  sku: string;
  total_sold: number;
  total_revenue: number;
  performance_score: number;
  current_stock: number;
}

interface ProductPerformanceChartProps {
  data: ProductPerformanceData[];
  period: string;
  loading?: boolean;
  metric?: 'revenue' | 'sold' | 'score';
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ProductPerformanceData;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-md max-w-xs">
        <p className="font-medium text-sm mb-1">{data.product_name}</p>
        <p className="text-muted-foreground text-xs mb-1">SKU: {data.sku}</p>
        {metric === 'revenue' && (
          <p className="text-primary text-sm">
            Revenue: ${data.total_revenue.toFixed(2)}
          </p>
        )}
        {metric === 'sold' && (
          <p className="text-primary text-sm">
            Units Sold: {data.total_sold}
          </p>
        )}
        {metric === 'score' && (
          <p className="text-primary text-sm">
            Performance Score: {data.performance_score.toFixed(1)}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          Stock: {data.current_stock} units
        </p>
      </div>
    );
  }
  return null;
};

// Format product names for display (truncate long names)
const formatProductName = (name: string) => {
  if (name.length > 15) {
    return name.substring(0, 12) + '...';
  }
  return name;
};

// Format Y-axis values based on metric
const formatYAxisLabel = (value: number, metric: string) => {
  switch (metric) {
    case 'revenue':
      if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}k`;
      }
      return `$${value.toFixed(0)}`;
    case 'sold':
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
      }
      return value.toString();
    case 'score':
      return value.toFixed(1);
    default:
      return value.toString();
  }
};

export const ProductPerformanceChart = memo<ProductPerformanceChartProps>(({
  data,
  period,
  loading = false,
  metric = 'revenue'
}) => {
  // Transform data for better display
  const chartData = data.map(item => ({
    ...item,
    displayName: formatProductName(item.product_name),
    value: metric === 'revenue' ? item.total_revenue :
           metric === 'sold' ? item.total_sold :
           item.performance_score
  }));

  const getMetricLabel = () => {
    switch (metric) {
      case 'revenue': return 'Revenue';
      case 'sold': return 'Units Sold';
      case 'score': return 'Performance Score';
      default: return 'Value';
    }
  };

  return (
    <ChartContainer
      title={`Top Products by ${getMetricLabel()} (${period})`}
      loading={loading}
      height={400}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 80,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="displayName"
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatYAxisLabel(value, metric)}
            className="text-muted-foreground"
          />
          <Tooltip content={<CustomTooltip metric={metric} />} />
          <Bar
            dataKey="value"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});

ProductPerformanceChart.displayName = 'ProductPerformanceChart';

