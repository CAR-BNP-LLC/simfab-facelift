import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Target,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { TimePeriodSelector } from '../filters/TimePeriodSelector';
import { ExportButton } from '../export/ExportButton';
import { useRealTimeAnalytics } from '../hooks/useRealTimeAnalytics';
import { usePerformanceOverview, useConversionFunnel } from '../hooks/useAnalyticsData';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

interface PerformanceData {
  period: string;
  orders: {
    total: number;
    paid: number;
    unpaid: number;
    today: number;
    conversion_rate: number;
  };
  revenue: {
    total: number;
    paid: number;
    avg_order_value: number;
    avg_paid_order_value: number;
    avg_revenue_per_order: number;
  };
  customers: {
    total: number;
    new: number;
    avg_orders_per_customer: number;
    avg_lifetime_value: number;
  };
  carts: {
    total: number;
    active: number;
    converted: number;
    recent: number;
    conversion_rate: number;
  };
  kpis: {
    conversion_rate: number;
    cart_abandonment_rate: number;
    customer_acquisition_rate: number;
    repeat_purchase_rate: number;
  };
}

interface PerformanceAnalyticsProps {
  className?: string;
  initialData?: PerformanceData;
}

export const PerformanceAnalytics = ({ className, initialData }: PerformanceAnalyticsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Fetch real performance data from API
  const performanceOverviewData = usePerformanceOverview(selectedPeriod);
  const conversionFunnelData = useConversionFunnel(selectedPeriod);

  const realTimeAnalytics = useRealTimeAnalytics(
    () => {
      performanceOverviewData.refetch();
      conversionFunnelData.refetch();
    },
    {
      enabled: true,
      interval: 120000, // 2 minutes for performance data
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
  const isLoading = performanceOverviewData.loading || conversionFunnelData.loading || realTimeAnalytics.isRefreshing;
  
  // Transform API data to match UI expectations - API returns complete structure
  const apiData = performanceOverviewData.data;
  
  const data = initialData || apiData || {
    period: selectedPeriod,
    orders: { total: 0, paid: 0, unpaid: 0, today: 0, conversion_rate: 0 },
    revenue: { total: 0, paid: 0, avg_order_value: 0, avg_paid_order_value: 0, avg_revenue_per_order: 0 },
    customers: { total: 0, new: 0, avg_orders_per_customer: 0, avg_lifetime_value: 0 },
    carts: { total: 0, active: 0, converted: 0, recent: 0, conversion_rate: 0 },
    kpis: { conversion_rate: 0, cart_abandonment_rate: 0, customer_acquisition_rate: 0, repeat_purchase_rate: 0 }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return <Badge variant="default" className="bg-green-100 text-green-800">Good</Badge>;
    if (value >= thresholds.warning) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
    return <Badge variant="destructive" className="bg-red-100 text-red-800">Poor</Badge>;
  };

  if (isLoading && !data) {
    return <LoadingSkeleton type="section" />;
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Performance Metrics</h3>
          <p className="text-sm text-muted-foreground">
            Key performance indicators, conversion rates, and business metrics
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

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPercentage(data.kpis.conversion_rate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.orders.paid} of {data.orders.total} orders paid
            </p>
            {getStatusBadge(data.kpis.conversion_rate, { good: 90, warning: 75 })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart Abandonment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPercentage(data.kpis.cart_abandonment_rate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.carts.total - data.carts.converted} abandoned carts
            </p>
            {getStatusBadge(100 - data.kpis.cart_abandonment_rate, { good: 85, warning: 70 })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer Acquisition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatPercentage(data.kpis.customer_acquisition_rate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.customers.new} new customers
            </p>
            {getStatusBadge(data.kpis.customer_acquisition_rate, { good: 10, warning: 5 })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Repeat Purchase Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatPercentage(data.kpis.repeat_purchase_rate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg {data.customers.avg_orders_per_customer.toFixed(1)} orders/customer
            </p>
            {getStatusBadge(data.kpis.repeat_purchase_rate, { good: 30, warning: 15 })}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <span className="font-semibold">{formatCurrency(data.revenue.total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Paid Revenue</span>
                  <span className="font-semibold text-green-600">{formatCurrency(data.revenue.paid)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Order Value</span>
                  <span className="font-semibold">{formatCurrency(data.revenue.avg_order_value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Revenue per Order</span>
                  <span className="font-semibold">{formatCurrency(data.revenue.avg_revenue_per_order)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cart Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Carts</span>
                  <span className="font-semibold">{data.carts.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Carts</span>
                  <span className="font-semibold text-blue-600">{data.carts.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Converted Carts</span>
                  <span className="font-semibold text-green-600">{data.carts.converted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Recent Carts (1h)</span>
                  <span className="font-semibold">{data.carts.recent}</span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Conversion Rate</span>
                    <span>{formatPercentage(data.carts.conversion_rate)}</span>
                  </div>
                  <Progress value={data.carts.conversion_rate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Orders</span>
                    <span className="font-semibold">{data.orders.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Paid Orders</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {data.orders.paid}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Unpaid Orders</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {data.orders.unpaid}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Today's Orders</span>
                    <span className="font-semibold">{data.orders.today}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Conversion Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Order Conversion</span>
                      <span className="font-semibold">{formatPercentage(data.kpis.conversion_rate)}</span>
                    </div>
                    <Progress value={data.kpis.conversion_rate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Cart Conversion</span>
                      <span className="font-semibold">{formatPercentage(data.carts.conversion_rate)}</span>
                    </div>
                    <Progress value={data.carts.conversion_rate} className="h-2" />
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Abandonment: {formatPercentage(data.kpis.cart_abandonment_rate)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Order Values</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Order Value</span>
                    <span className="font-semibold">{formatCurrency(data.revenue.avg_order_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Paid Order</span>
                    <span className="font-semibold text-green-600">{formatCurrency(data.revenue.avg_paid_order_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Revenue/Order</span>
                    <span className="font-semibold">{formatCurrency(data.revenue.avg_revenue_per_order)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Customer Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Customers</span>
                    <span className="font-semibold">{data.customers.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">New Customers</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      +{data.customers.new}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Orders/Customer</span>
                    <span className="font-semibold">{data.customers.avg_orders_per_customer.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Lifetime Value</span>
                    <span className="font-semibold">{formatCurrency(data.customers.avg_lifetime_value)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Acquisition & Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Acquisition Rate</span>
                      <span className="font-semibold">{formatPercentage(data.kpis.customer_acquisition_rate)}</span>
                    </div>
                    <Progress value={data.kpis.customer_acquisition_rate * 10} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Repeat Purchase Rate</span>
                      <span className="font-semibold">{formatPercentage(data.kpis.repeat_purchase_rate)}</span>
                    </div>
                    <Progress value={data.kpis.repeat_purchase_rate} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Customer Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Growing Customer Base</div>
                      <div className="text-muted-foreground">
                        {formatPercentage(data.kpis.customer_acquisition_rate)} monthly growth
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Customer Loyalty</div>
                      <div className="text-muted-foreground">
                        {formatPercentage(data.kpis.repeat_purchase_rate)} repeat purchase rate
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conversion Funnel Tab */}
        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Conversion Funnel Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock funnel data - in real app this would come from API */}
                {[
                  { stage: 'Visitors', count: 10000, rate: 100 },
                  { stage: 'Carts Created', count: 2500, rate: 25 },
                  { stage: 'Checkouts Initiated', count: 1800, rate: 72 },
                  { stage: 'Successful Payments', count: 1620, rate: 90 },
                  { stage: 'Completed Orders', count: 1530, rate: 94.4 }
                ].map((stage, index) => (
                  <div key={stage.stage} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{stage.stage}</span>
                      <div className="text-right">
                        <div className="font-semibold">{stage.count.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{stage.rate}%</div>
                      </div>
                    </div>
                    <Progress
                      value={stage.rate}
                      className="h-3"
                    />
                    {index < 4 && (
                      <div className="text-center my-2">
                        <span className="text-xs text-muted-foreground">
                          ↓ {(stage.rate * (index < 3 ? [25, 72, 90][index] : 94.4) / 100).toFixed(1)}% conversion
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
