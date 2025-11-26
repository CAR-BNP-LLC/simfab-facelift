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

interface ProductCategoryData {
  category: string;
  total_products: number;
  total_orders: number;
  total_units_sold: number;
  total_revenue: number;
  avg_order_value: number;
}

interface ProductCategoriesChartProps {
  data: ProductCategoryData[];
  period: string;
  loading?: boolean;
  metric?: 'revenue' | 'orders' | 'units';
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ProductCategoryData;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-md max-w-xs">
        <p className="font-medium text-sm mb-1 capitalize">{label}</p>
        {metric === 'revenue' && (
          <>
            <p className="text-primary text-sm">
              Revenue: ${data.total_revenue.toFixed(2)}
            </p>
            <p className="text-muted-foreground text-xs">
              Avg Order: ${data.avg_order_value.toFixed(2)}
            </p>
          </>
        )}
        {metric === 'orders' && (
          <>
            <p className="text-primary text-sm">
              Orders: {data.total_orders}
            </p>
            <p className="text-muted-foreground text-xs">
              Products: {data.total_products}
            </p>
          </>
        )}
        {metric === 'units' && (
          <>
            <p className="text-primary text-sm">
              Units Sold: {data.total_units_sold}
            </p>
            <p className="text-muted-foreground text-xs">
              Orders: {data.total_orders}
            </p>
          </>
        )}
      </div>
    );
  }
  return null;
};

// Format category names for display
const formatCategoryName = (name: string) => {
  // Handle JSON array format or plain string
  if (name.startsWith('[') && name.endsWith(']')) {
    try {
      const categories = JSON.parse(name);
      return categories.length > 0 ? categories[0] : 'Uncategorized';
    } catch {
      return name;
    }
  }
  return name === 'uncategorized' ? 'Uncategorized' : name;
};

// Format Y-axis values based on metric
const formatYAxisLabel = (value: number, metric: string) => {
  switch (metric) {
    case 'revenue':
      if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}k`;
      }
      return `$${value.toFixed(0)}`;
    case 'orders':
    case 'units':
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
      }
      return value.toString();
    default:
      return value.toString();
  }
};

export const ProductCategoriesChart = memo<ProductCategoriesChartProps>(({
  data,
  period,
  loading = false,
  metric = 'revenue'
}) => {
  // Transform data for better display
  const chartData = data.map(item => ({
    ...item,
    displayName: formatCategoryName(item.category),
    value: metric === 'revenue' ? item.total_revenue :
           metric === 'orders' ? item.total_orders :
           item.total_units_sold
  }));

  const getMetricLabel = () => {
    switch (metric) {
      case 'revenue': return 'Revenue';
      case 'orders': return 'Orders';
      case 'units': return 'Units Sold';
      default: return 'Value';
    }
  };

  return (
    <ChartContainer
      title={`Category Performance by ${getMetricLabel()} (${period})`}
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
            height={70}
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
            fill="#10b981"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});

ProductCategoriesChart.displayName = 'ProductCategoriesChart';

