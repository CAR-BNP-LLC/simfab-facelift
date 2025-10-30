import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';
import { CustomerGrowthChart } from '../charts/CustomerGrowthChart';
import { CustomerSegmentsChart } from '../charts/CustomerSegmentsChart';
import { TimePeriodSelector } from '../filters/TimePeriodSelector';
import { ExportButton } from '../export/ExportButton';
import { useRealTimeAnalytics } from '../hooks/useRealTimeAnalytics';
import {
  useCustomerAnalyticsOverview,
  useCustomerSegments,
  useCustomerGrowthTrend
} from '../hooks/useAnalyticsData';

interface CustomerAnalyticsProps {
  className?: string;
}

export const CustomerAnalytics = ({ className }: CustomerAnalyticsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  // Fetch customer analytics data
  const overviewData = useCustomerAnalyticsOverview(selectedPeriod);
  const segmentsData = useCustomerSegments(selectedPeriod);
  const growthData = useCustomerGrowthTrend(selectedPeriod);

  // Real-time analytics for customer data
  const realTimeAnalytics = useRealTimeAnalytics(
    () => {
      overviewData.refetch();
      segmentsData.refetch();
      growthData.refetch();
    },
    {
      enabled: realTimeEnabled,
      interval: 60000, // 1 minute for customer data (less frequent updates)
      showNotifications: false // Don't show notifications for customer analytics
    }
  );

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const handleRefresh = () => {
    realTimeAnalytics.refresh();
  };

  // Calculate if any data is loading
  const isLoading = overviewData.loading || segmentsData.loading || growthData.loading || realTimeAnalytics.isRefreshing;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Customer Insights</h3>
          <p className="text-sm text-muted-foreground">
            Customer segmentation, growth trends, and lifetime value analysis
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
            data={segmentsData.data}
            type="customers"
            period={selectedPeriod}
            disabled={!segmentsData.data}
          />
        </div>
      </div>

      {/* Customer Overview Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : overviewData.data?.overview ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overviewData.data.overview.total_customers || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active customers in period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                New Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{overviewData.data.overview.new_customers_30d || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Avg Orders/Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(overviewData.data.overview.avg_orders_per_customer || 0).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Orders per customer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Avg Lifetime Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(overviewData.data.overview.avg_lifetime_value || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Customer lifetime value
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomerGrowthChart
          data={growthData.data?.data || []}
          period={selectedPeriod}
          loading={growthData.loading}
        />

        <CustomerSegmentsChart
          data={segmentsData.data?.segments || []}
          period={selectedPeriod}
          loading={segmentsData.loading}
        />
      </div>

      {/* Customer Segments Summary */}
      {segmentsData.data?.segments && segmentsData.data.segments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Customer Segments Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {segmentsData.data.segments.map((segment: any) => (
                <div key={segment.segment} className="text-center">
                  <Badge
                    variant={
                      segment.segment === 'VIP' ? 'default' :
                      segment.segment === 'Regular' ? 'secondary' :
                      segment.segment === 'New' ? 'outline' :
                      'outline'
                    }
                    className="mb-2"
                  >
                    {segment.segment}
                  </Badge>
                  <div className="text-2xl font-bold">{segment.customer_count}</div>
                  <div className="text-sm text-muted-foreground">
                    ${segment.avg_spent?.toFixed(2)} avg spent
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${segment.total_segment_revenue?.toFixed(0)} total revenue
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
