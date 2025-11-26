import { memo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { ChartContainer } from './ChartContainer';

interface CustomerGrowthData {
  date: string;
  new_customers: number;
  returning_customers: number;
  total_orders: number;
  cumulative_customers: number;
}

interface CustomerGrowthChartProps {
  data: CustomerGrowthData[];
  period: string;
  loading?: boolean;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CustomerGrowthData;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-md">
        <p className="font-medium text-sm">{`Date: ${label}`}</p>
        <p className="text-primary text-sm">
          {`New Customers: ${data.new_customers}`}
        </p>
        <p className="text-blue-600 text-sm">
          {`Returning: ${data.returning_customers}`}
        </p>
        <p className="text-muted-foreground text-xs">
          {`Total Customers: ${data.cumulative_customers}`}
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

export const CustomerGrowthChart = memo<CustomerGrowthChartProps>(({
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
      title="Customer Growth Trend"
      loading={loading}
      height={350}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <defs>
            <linearGradient id="newCustomersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="returningCustomersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatXAxisLabel(value, period)}
            angle={-45}
            textAnchor="end"
            height={80}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="new_customers"
            stackId="1"
            stroke="#3b82f6"
            fill="url(#newCustomersGradient)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="returning_customers"
            stackId="1"
            stroke="#10b981"
            fill="url(#returningCustomersGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});

CustomerGrowthChart.displayName = 'CustomerGrowthChart';

