import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { ProductPerformanceChart } from '../charts/ProductPerformanceChart';
import { ProductCategoriesChart } from '../charts/ProductCategoriesChart';
import { TimePeriodSelector } from '../filters/TimePeriodSelector';
import { ExportButton } from '../export/ExportButton';
import { useRealTimeAnalytics } from '../hooks/useRealTimeAnalytics';
import {
  useProductPerformance,
  useProductCategoriesAnalytics,
  useProductStockTurnover
} from '../hooks/useAnalyticsData';

interface ProductAnalyticsProps {
  className?: string;
}

export const ProductAnalytics = ({ className }: ProductAnalyticsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [performanceMetric, setPerformanceMetric] = useState<'revenue' | 'sold' | 'score'>('revenue');
  const [categoryMetric, setCategoryMetric] = useState<'revenue' | 'orders' | 'units'>('revenue');

  // Fetch product analytics data
  const performanceData = useProductPerformance(selectedPeriod, 10);
  const categoriesData = useProductCategoriesAnalytics(selectedPeriod);
  const stockData = useProductStockTurnover(selectedPeriod);

  // Real-time analytics for product data
  const realTimeAnalytics = useRealTimeAnalytics(
    () => {
      performanceData.refetch();
      categoriesData.refetch();
      stockData.refetch();
    },
    {
      enabled: true,
      interval: 120000, // 2 minutes for product data (less critical)
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
  const isLoading = performanceData.loading || categoriesData.loading || stockData.loading || realTimeAnalytics.isRefreshing;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Product Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Product performance, category insights, and inventory analytics
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
            data={performanceData.data}
            type="products"
            period={selectedPeriod}
            disabled={!performanceData.data}
          />
        </div>
      </div>

      {/* Product Overview Cards */}
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
      ) : performanceData.data?.products && performanceData.data.products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Top Product
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate" title={performanceData.data.products[0].product_name}>
                {performanceData.data.products[0].product_name.length > 15
                  ? performanceData.data.products[0].product_name.substring(0, 12) + '...'
                  : performanceData.data.products[0].product_name}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ${performanceData.data.products[0].total_revenue?.toFixed(2)} revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Best Seller
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performanceData.data.products[0].total_sold || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Units sold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Avg Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(performanceData.data.products.reduce((sum, p) => sum + (p.performance_score || 0), 0) / performanceData.data.products.length).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Performance score
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(performanceData.data.products.reduce((sum, p) => sum + (p.total_revenue || 0), 0)).toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From top products
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Product Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-medium">Metric:</span>
            <div className="flex gap-2">
              <Badge
                variant={performanceMetric === 'revenue' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setPerformanceMetric('revenue')}
              >
                Revenue
              </Badge>
              <Badge
                variant={performanceMetric === 'sold' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setPerformanceMetric('sold')}
              >
                Units Sold
              </Badge>
              <Badge
                variant={performanceMetric === 'score' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setPerformanceMetric('score')}
              >
                Performance Score
              </Badge>
            </div>
          </div>

          <ProductPerformanceChart
            data={performanceData.data?.products || []}
            period={selectedPeriod}
            loading={performanceData.loading}
            metric={performanceMetric}
          />
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-medium">Metric:</span>
            <div className="flex gap-2">
              <Badge
                variant={categoryMetric === 'revenue' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setCategoryMetric('revenue')}
              >
                Revenue
              </Badge>
              <Badge
                variant={categoryMetric === 'orders' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setCategoryMetric('orders')}
              >
                Orders
              </Badge>
              <Badge
                variant={categoryMetric === 'units' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setCategoryMetric('units')}
              >
                Units Sold
              </Badge>
            </div>
          </div>

          <ProductCategoriesChart
            data={categoriesData.data?.categories || []}
            period={selectedPeriod}
            loading={categoriesData.loading}
            metric={categoryMetric}
          />
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          {stockData.data?.products && (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Stock Turnover Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stockData.data.products.slice(0, 10).map((product: any) => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{product.product_name}</div>
                          <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium">{product.current_stock}</div>
                            <div className="text-xs text-muted-foreground">Stock</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{product.sold_in_period}</div>
                            <div className="text-xs text-muted-foreground">Sold</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{product.turnover_ratio?.toFixed(2) || '0.00'}</div>
                            <div className="text-xs text-muted-foreground">Turnover</div>
                          </div>
                          <Badge variant={product.is_low_stock ? 'destructive' : 'secondary'}>
                            {product.is_low_stock ? 'Low Stock' : 'Good'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
