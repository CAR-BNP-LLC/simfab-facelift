import { useState, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimePeriodSelector, TimePeriod } from './filters/TimePeriodSelector';
import { RealTimeControls } from './components/RealTimeControls';
import { ExportButton } from './export/ExportButton';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { RevenueTrendChart } from './charts/RevenueTrendChart';
import { OrderStatusChart } from './charts/OrderStatusChart';
import { TopProductsChart } from './charts/TopProductsChart';
import { useRealTimeAnalytics } from './hooks/useRealTimeAnalytics';
import {
  useRevenueTimeSeries,
  useOrderStatusDistribution,
  useAnalyticsData
} from './hooks/useAnalyticsData';

// Lazy load analytics sections for better performance
const CustomerAnalytics = lazy(() => import('./sections/CustomerAnalytics').then(module => ({ default: module.CustomerAnalytics })));
const ProductAnalytics = lazy(() => import('./sections/ProductAnalytics').then(module => ({ default: module.ProductAnalytics })));
const ComparativeAnalytics = lazy(() => import('./sections/ComparativeAnalytics').then(module => ({ default: module.ComparativeAnalytics })));
const PerformanceAnalytics = lazy(() => import('./sections/PerformanceAnalytics').then(module => ({ default: module.PerformanceAnalytics })));
const InventoryAnalytics = lazy(() => import('./sections/InventoryAnalytics').then(module => ({ default: module.InventoryAnalytics })));
const VisitorAnalytics = lazy(() => import('./sections/VisitorAnalytics').then(module => ({ default: module.VisitorAnalytics })));

// Existing dashboard stats interface
interface DashboardStats {
  today: { order_count: number; revenue: number };
  month: { order_count: number; revenue: number };
  orderStatusCounts: Array<{ status: string; count: number }>;
  recentOrders: any[];
  topProducts: any[];
  productStats: { total: number; in_stock: number; low_stock: number };
}

interface AnalyticsDashboardProps {
  dashboardStats: DashboardStats | null;
  loading: boolean;
}

export const AnalyticsDashboard = ({ dashboardStats, loading }: AnalyticsDashboardProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [realTimeInterval, setRealTimeInterval] = useState(30000); // 30 seconds

  // Fetch analytics data for overview tab
  const revenueData = useRevenueTimeSeries(selectedPeriod);
  const orderStatusData = useOrderStatusDistribution(selectedPeriod);
  const topProductsData = useAnalyticsData('products/performance', { period: selectedPeriod });

  // Real-time analytics hook
  const realTimeAnalytics = useRealTimeAnalytics(
    () => {
      // Refresh all analytics data
      revenueData.refetch();
      orderStatusData.refetch();
      topProductsData.refetch();
    },
    {
      enabled: realTimeEnabled,
      interval: realTimeInterval,
      showNotifications: true
    }
  );

  // Handle period change
  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period);
  }, []);

  // Handle manual refresh
  const handleManualRefresh = useCallback(() => {
    realTimeAnalytics.refresh();
  }, [realTimeAnalytics]);

  // Calculate if any chart is loading
  const chartsLoading = revenueData.loading || orderStatusData.loading || topProductsData.loading || realTimeAnalytics.isRefreshing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor your store performance and customer insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'overview' && (
            <>
              <TimePeriodSelector
                selectedPeriod={selectedPeriod}
                onPeriodChange={handlePeriodChange}
                onRefresh={handleManualRefresh}
                refreshing={chartsLoading}
              />
              <ExportButton
                data={revenueData.data}
                type="revenue"
                period={selectedPeriod}
                disabled={!revenueData.data}
              />
            </>
          )}
          <RealTimeControls
            isEnabled={realTimeEnabled}
            onToggle={setRealTimeEnabled}
            interval={realTimeInterval}
            onIntervalChange={setRealTimeInterval}
            lastUpdate={realTimeAnalytics.lastUpdate}
            connectionStatus={realTimeAnalytics.connectionStatus}
            isRefreshing={realTimeAnalytics.isRefreshing}
            onManualRefresh={handleManualRefresh}
            onPause={realTimeAnalytics.pause}
            onResume={realTimeAnalytics.resume}
          />
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="comparative">Compare</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards Row */}
          {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      ) : dashboardStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${dashboardStats.today.revenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboardStats.today.order_count} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${dashboardStats.month.revenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboardStats.month.order_count} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.productStats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboardStats.productStats.in_stock} in stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {dashboardStats.productStats.low_stock}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Products need restock
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueTrendChart
          data={revenueData.data?.data || []}
          period={selectedPeriod}
          loading={revenueData.loading}
        />

        <OrderStatusChart
          data={orderStatusData.data?.data || []}
          period={selectedPeriod}
          loading={orderStatusData.loading}
        />
      </div>

      {/* Second Row - Top Products and Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsChart
          data={(dashboardStats?.topProducts || []).map(product => ({
            product_name: product.product_name,
            total_sold: product.total_sold,
            revenue: typeof product.revenue === 'string' ? parseFloat(product.revenue) : product.revenue
          }))}
          period={selectedPeriod}
          loading={loading}
        />

        {/* Recent Orders Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                ))
              ) : dashboardStats?.recentOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No orders yet</p>
              ) : (
                dashboardStats?.recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                    <div>
                      <p className="font-semibold text-sm">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.user_email || order.customer_email}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        order.status === 'delivered' ? 'default' :
                        order.status === 'shipped' ? 'secondary' :
                        order.status === 'cancelled' ? 'destructive' :
                        'outline'
                      } className="text-xs">
                        {order.status}
                      </Badge>
                      <p className="text-xs font-semibold mt-1">
                        ${parseFloat(order.total_amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        {/* Visitor Analytics Tab */}
        <TabsContent value="visitors" className="space-y-6">
          <Suspense fallback={<LoadingSkeleton type="section" />}>
            <VisitorAnalytics />
          </Suspense>
        </TabsContent>

        {/* Customer Analytics Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Suspense fallback={<LoadingSkeleton type="section" />}>
            <CustomerAnalytics />
          </Suspense>
        </TabsContent>

        {/* Product Analytics Tab */}
        <TabsContent value="products" className="space-y-6">
          <Suspense fallback={<LoadingSkeleton type="section" />}>
            <ProductAnalytics />
          </Suspense>
        </TabsContent>

        {/* Performance Analytics Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Suspense fallback={<LoadingSkeleton type="section" />}>
            <PerformanceAnalytics />
          </Suspense>
        </TabsContent>

        {/* Inventory Analytics Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <Suspense fallback={<LoadingSkeleton type="section" />}>
            <InventoryAnalytics />
          </Suspense>
        </TabsContent>

        {/* Comparative Analytics Tab */}
        <TabsContent value="comparative" className="space-y-6">
          <Suspense fallback={<LoadingSkeleton type="section" />}>
            <ComparativeAnalytics />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};
