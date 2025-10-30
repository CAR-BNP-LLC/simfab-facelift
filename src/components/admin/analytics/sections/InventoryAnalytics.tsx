import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { TimePeriodSelector } from '../filters/TimePeriodSelector';
import { ExportButton } from '../export/ExportButton';
import { useRealTimeAnalytics } from '../hooks/useRealTimeAnalytics';
import { useInventoryOverview, useInventoryStockMovements } from '../hooks/useAnalyticsData';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

interface InventoryData {
  period: string;
  overview: {
    total_products: number;
    in_stock_products: number;
    out_of_stock_products: number;
    low_stock_products: number;
    total_stock_quantity: number;
    avg_stock_per_product: number;
    total_stock_value: number;
    avg_product_price: number;
  };
  stock_health: {
    stock_turnover_rate: number;
    low_stock_percentage: number;
    out_of_stock_percentage: number;
    healthy_stock_percentage: number;
  };
  sales_velocity: {
    total_sold_in_period: number;
    avg_sold_per_product: number;
    products_with_movement: number;
    products_without_movement: number;
  };
  recommendations: {
    needs_restock: number;
    needs_attention: number;
    optimal_stock_level: number;
    estimated_monthly_sales: number;
  };
}

interface InventoryAnalyticsProps {
  className?: string;
  initialData?: InventoryData;
}

export const InventoryAnalytics = ({ className, initialData }: InventoryAnalyticsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Fetch real inventory data from API
  const inventoryOverviewData = useInventoryOverview(selectedPeriod);
  const stockMovementsData = useInventoryStockMovements(selectedPeriod);

  const realTimeAnalytics = useRealTimeAnalytics(
    () => {
      inventoryOverviewData.refetch();
      stockMovementsData.refetch();
    },
    {
      enabled: true,
      interval: 300000, // 5 minutes for inventory data
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
  const isLoading = inventoryOverviewData.loading || stockMovementsData.loading || realTimeAnalytics.isRefreshing;
  
  // Transform API data to match UI expectations - API returns complete structure
  const apiData = inventoryOverviewData.data;
  
  const data = initialData || apiData || {
    period: selectedPeriod,
    overview: { total_products: 0, in_stock_products: 0, out_of_stock_products: 0, low_stock_products: 0, total_stock_quantity: 0, avg_stock_per_product: 0, total_stock_value: 0, avg_product_price: 0 },
    stock_health: { stock_turnover_rate: 0, low_stock_percentage: 0, out_of_stock_percentage: 0, healthy_stock_percentage: 0 },
    sales_velocity: { total_sold_in_period: 0, avg_sold_per_product: 0, products_with_movement: 0, products_without_movement: 0 },
    recommendations: { needs_restock: 0, needs_attention: 0, optimal_stock_level: 0, estimated_monthly_sales: 0 }
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

  const getStockStatusColor = (percentage: number, type: 'low' | 'out' | 'healthy') => {
    if (type === 'out' && percentage > 10) return 'text-red-600';
    if (type === 'low' && percentage > 20) return 'text-yellow-600';
    if (type === 'healthy' && percentage < 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStockStatusBadge = (percentage: number, type: 'low' | 'out' | 'healthy') => {
    if (type === 'out' && percentage > 10) return <Badge variant="destructive">Critical</Badge>;
    if (type === 'low' && percentage > 20) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
    if (type === 'healthy' && percentage < 80) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Needs Attention</Badge>;
    return <Badge variant="default" className="bg-green-100 text-green-800">Good</Badge>;
  };

  if (isLoading && !data) {
    return <LoadingSkeleton type="section" />;
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Inventory Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Stock levels, turnover rates, and inventory health insights
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

      {/* Stock Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Stock Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPercentage(data.stock_health.healthy_stock_percentage)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overview.in_stock_products} of {data.overview.total_products} products
            </p>
            {getStockStatusBadge(data.stock_health.healthy_stock_percentage, 'healthy')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {data.recommendations.needs_restock}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(data.stock_health.low_stock_percentage)} of inventory
            </p>
            {getStockStatusBadge(data.stock_health.low_stock_percentage, 'low')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.recommendations.needs_attention}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(data.stock_health.out_of_stock_percentage)} of products
            </p>
            {getStockStatusBadge(data.stock_health.out_of_stock_percentage, 'out')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Stock Turnover
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.stock_health.stock_turnover_rate.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Times per {selectedPeriod.replace('d', ' days')}
            </p>
            <Badge variant={data.stock_health.stock_turnover_rate > 0.5 ? 'default' : 'secondary'}>
              {data.stock_health.stock_turnover_rate > 0.5 ? 'Good' : 'Slow'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Inventory Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Stock Health</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Products</span>
                  <span className="font-semibold">{data.overview.total_products}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Stock Quantity</span>
                  <span className="font-semibold">{data.overview.total_stock_quantity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Stock per Product</span>
                  <span className="font-semibold">{data.overview.avg_stock_per_product.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Stock Value</span>
                  <span className="font-semibold">{formatCurrency(data.overview.total_stock_value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Product Price</span>
                  <span className="font-semibold">{formatCurrency(data.overview.avg_product_price)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sales Velocity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Sold in Period</span>
                  <span className="font-semibold">{data.sales_velocity.total_sold_in_period}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Sold per Product</span>
                  <span className="font-semibold">{data.sales_velocity.avg_sold_per_product.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Products with Movement</span>
                  <span className="font-semibold text-green-600">{data.sales_velocity.products_with_movement}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Products without Movement</span>
                  <span className="font-semibold text-red-600">{data.sales_velocity.products_without_movement}</span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Active Products</span>
                    <span>{formatPercentage((data.sales_velocity.products_with_movement / data.overview.total_products) * 100)}</span>
                  </div>
                  <Progress value={(data.sales_velocity.products_with_movement / data.overview.total_products) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Restock Needed</div>
                      <div className="text-sm text-muted-foreground">
                        {data.recommendations.needs_restock} products are running low
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Out of Stock</div>
                      <div className="text-sm text-muted-foreground">
                        {data.recommendations.needs_attention} products need immediate attention
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Optimal Stock Level</div>
                      <div className="text-sm text-muted-foreground">
                        Maintain {data.recommendations.optimal_stock_level} units for 30-day coverage
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Monthly Sales Estimate</div>
                      <div className="text-sm text-muted-foreground">
                        Expected {data.recommendations.estimated_monthly_sales} units this month
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Healthy Stock</span>
                    <span className="font-semibold">{formatPercentage(data.stock_health.healthy_stock_percentage)}</span>
                  </div>
                  <Progress value={data.stock_health.healthy_stock_percentage} className="h-3" />
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.overview.in_stock_products} products
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Low Stock</span>
                    <span className="font-semibold">{formatPercentage(data.stock_health.low_stock_percentage)}</span>
                  </div>
                  <Progress value={data.stock_health.low_stock_percentage} className="h-3" />
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.overview.low_stock_products} products
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Out of Stock</span>
                    <span className="font-semibold">{formatPercentage(data.stock_health.out_of_stock_percentage)}</span>
                  </div>
                  <Progress value={data.stock_health.out_of_stock_percentage} className="h-3" />
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.overview.out_of_stock_products} products
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock Turnover Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {data.stock_health.stock_turnover_rate.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Stock Turnover Ratio</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Target Range:</span>
                    <span>0.5 - 2.0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Current:</span>
                    <Badge variant={data.stock_health.stock_turnover_rate >= 0.5 && data.stock_health.stock_turnover_rate <= 2.0 ? 'default' : 'secondary'}>
                      {data.stock_health.stock_turnover_rate >= 0.5 && data.stock_health.stock_turnover_rate <= 2.0 ? 'Optimal' : 'Needs Review'}
                    </Badge>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-2">Interpretation:</div>
                  <div className="text-sm">
                    {data.stock_health.stock_turnover_rate < 0.5 && 'Stock is turning over too slowly - consider reducing inventory levels'}
                    {data.stock_health.stock_turnover_rate >= 0.5 && data.stock_health.stock_turnover_rate <= 2.0 && 'Stock turnover is in optimal range - inventory management is effective'}
                    {data.stock_health.stock_turnover_rate > 2.0 && 'Stock is turning over too quickly - may need to increase safety stock levels'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Stock Movements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock movement data - in real app this would come from API */}
                {[
                  { name: 'Racing Wheel Pro', sku: 'RWP-001', current: 45, sold: 23, status: 'healthy', turnover: 0.51 },
                  { name: 'Flight Sim Cockpit', sku: 'FSC-002', current: 8, sold: 15, status: 'low_stock', turnover: 1.88 },
                  { name: 'Gaming Monitor 4K', sku: 'GM4K-003', current: 0, sold: 12, status: 'out_of_stock', turnover: 0 },
                  { name: 'VR Headset Elite', sku: 'VRE-004', current: 67, sold: 8, status: 'healthy', turnover: 0.12 },
                  { name: 'Mechanical Keyboard', sku: 'MK-005', current: 12, sold: 18, status: 'low_stock', turnover: 1.5 }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium">{item.current}</div>
                        <div className="text-xs text-muted-foreground">Stock</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-green-600">{item.sold}</div>
                        <div className="text-xs text-muted-foreground">Sold</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{item.turnover.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Turnover</div>
                      </div>
                      <Badge variant={
                        item.status === 'healthy' ? 'default' :
                        item.status === 'low_stock' ? 'secondary' :
                        'destructive'
                      }>
                        {item.status === 'healthy' ? 'Good' :
                         item.status === 'low_stock' ? 'Low' :
                         'Out'}
                      </Badge>
                    </div>
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
