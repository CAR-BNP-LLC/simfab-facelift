import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, Calendar } from 'lucide-react';
import { TimePeriodSelector } from '../filters/TimePeriodSelector';
import { ExportButton } from '../export/ExportButton';
import { useRealTimeAnalytics } from '../hooks/useRealTimeAnalytics';
import { useComparativeGrowth } from '../hooks/useAnalyticsData';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

interface GrowthData {
  current: number;
  previous: number;
  growth: number;
  direction: 'up' | 'down';
}

interface ComparativeData {
  period: string;
  comparison: string;
  growth: {
    orders: GrowthData;
    customers: GrowthData;
    revenue: GrowthData;
    avgOrderValue: GrowthData;
  };
}

interface ComparativeAnalyticsProps {
  className?: string;
  initialData?: ComparativeData;
}

export const ComparativeAnalytics = ({ className, initialData }: ComparativeAnalyticsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Fetch real comparative data from API
  const comparativeData = useComparativeGrowth(selectedPeriod);

  const realTimeAnalytics = useRealTimeAnalytics(
    () => {
      comparativeData.refetch();
    },
    {
      enabled: true,
      interval: 300000, // 5 minutes for comparative data
      showNotifications: false
    }
  );

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const handleRefresh = () => {
    realTimeAnalytics.refresh();
  };

  // Calculate if any data is loading
  const isLoading = comparativeData.loading || realTimeAnalytics.isRefreshing;

  // Transform API data to match UI expectations - API returns complete structure
  const apiData = comparativeData.data;
  
  const data = initialData || apiData || {
    period: selectedPeriod,
    comparison: 'previous',
    growth: {
      revenue: { current: 0, previous: 0, growth: 0, direction: 'up' },
      orders: { current: 0, previous: 0, growth: 0, direction: 'up' },
      customers: { current: 0, previous: 0, growth: 0, direction: 'up' },
      avgOrderValue: { current: 0, previous: 0, growth: 0, direction: 'up' }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getGrowthColor = (direction: 'up' | 'down') => {
    return direction === 'up' ? 'text-green-600' : 'text-red-600';
  };

  const getGrowthIcon = (direction: 'up' | 'down') => {
    return direction === 'up' ? TrendingUp : TrendingDown;
  };

  const GrowthIndicator = ({
    title,
    data,
    formatValue
  }: {
    title: string;
    data: GrowthData;
    formatValue: (value: number) => string;
  }) => {
    const Icon = getGrowthIcon(data.direction);

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Current Period</div>
              <div className="font-semibold">{formatValue(data.current)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Previous Period</div>
              <div className="text-muted-foreground">{formatValue(data.previous)}</div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">Growth</div>
              <div className={`flex items-center gap-1 font-semibold ${getGrowthColor(data.direction)}`}>
                <Icon className="h-3 w-3" />
                {formatPercentage(data.growth)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading && !data) {
    return <LoadingSkeleton type="section" />;
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Comparative Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Period-over-period growth and year-over-year comparisons
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimePeriodSelector
            selectedPeriod={selectedPeriod as any}
            onPeriodChange={handlePeriodChange}
            onRefresh={handleRefresh}
            refreshing={isLoading}
          />
          <ExportButton
            data={data}
            type="revenue" // Using revenue type for now
            period={selectedPeriod}
            disabled={!data}
          />
        </div>
      </div>

      {/* Growth Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GrowthIndicator
          title="Revenue Growth"
          data={data.growth.revenue}
          formatValue={formatCurrency}
        />

        <GrowthIndicator
          title="Order Growth"
          data={data.growth.orders}
          formatValue={(value) => value.toString()}
        />

        <GrowthIndicator
          title="Customer Growth"
          data={data.growth.customers}
          formatValue={(value) => value.toString()}
        />

        <GrowthIndicator
          title="Avg Order Value"
          data={data.growth.avgOrderValue}
          formatValue={formatCurrency}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Period Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Comparison:</span>
                <Badge variant="outline">{data.comparison}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Period:</span>
                <span className="font-medium">{data.period}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    realTimeAnalytics.connectionStatus === 'connected' ? 'bg-green-500' :
                    realTimeAnalytics.connectionStatus === 'error' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`} />
                  {realTimeAnalytics.connectionStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Growth Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Positive Growth:</span>
                <span className="font-medium text-green-600">
                  {Object.values(data.growth).filter(g => g.direction === 'up').length} metrics
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Declining:</span>
                <span className="font-medium text-red-600">
                  {Object.values(data.growth).filter(g => g.direction === 'down').length} metrics
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Overall Trend:</span>
                <Badge variant={Object.values(data.growth).filter(g => g.direction === 'up').length >= 2 ? 'default' : 'secondary'}>
                  {Object.values(data.growth).filter(g => g.direction === 'up').length >= 2 ? 'Growing' : 'Mixed'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {data.growth.revenue.direction === 'up' && (
                <div className="flex items-start gap-2 text-green-700">
                  <TrendingUp className="h-4 w-4 mt-0.5" />
                  <span>Revenue growing by {formatPercentage(data.growth.revenue.growth)}</span>
                </div>
              )}

              {data.growth.customers.direction === 'up' && (
                <div className="flex items-start gap-2 text-green-700">
                  <TrendingUp className="h-4 w-4 mt-0.5" />
                  <span>Customer base expanding by {formatPercentage(data.growth.customers.growth)}</span>
                </div>
              )}

              {data.growth.avgOrderValue.direction === 'down' && (
                <div className="flex items-start gap-2 text-red-700">
                  <TrendingDown className="h-4 w-4 mt-0.5" />
                  <span>Avg order value declined by {formatPercentage(Math.abs(data.growth.avgOrderValue.growth))}</span>
                </div>
              )}

              {Object.values(data.growth).every(g => g.direction === 'up') && (
                <div className="flex items-start gap-2 text-green-700 font-medium">
                  <TrendingUp className="h-4 w-4 mt-0.5" />
                  <span>All metrics showing positive growth!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
