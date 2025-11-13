import { useState, useEffect } from 'react';
import { Download, TrendingUp, Users, DollarSign, Percent, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface CouponAnalyticsProps {
  couponId: number;
  couponCode: string;
}

interface AnalyticsData {
  coupon: {
    id: number;
    code: string;
    type: string;
    value: number;
    description: string | null;
    is_active: boolean;
    region: string;
  };
  summary: {
    totalUses: number;
    uniqueUsers: number;
    totalDiscountGiven: number;
    totalRevenueBefore: number;
    totalRevenueAfter: number;
    totalSavings: number;
    avgOrderValueBefore: number;
    avgOrderValueAfter: number;
    minOrderValue: number;
    maxOrderValue: number;
    roi: number;
    avgDiscountPerUse: number;
    avgUsesPerUser: number;
  };
  usageOverTime: Array<{
    date: string;
    usage_count: number;
    daily_discount: number;
    daily_revenue: number;
  }>;
  topUsers: Array<{
    user_id: number;
    email: string;
    usage_count: number;
    total_discount: number;
    total_spent: number;
  }>;
}

export default function CouponAnalytics({ couponId, couponCode }: CouponAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [couponId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/coupons/${couponId}/stats`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load coupon analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const exportToPDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.text('Coupon Analytics Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(14);
    doc.text(`Coupon: ${data.coupon.code}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Coupon Details
    doc.setFontSize(14);
    doc.text('Coupon Details', 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.text(`Code: ${data.coupon.code}`, 20, yPos);
    yPos += 6;
    doc.text(`Type: ${data.coupon.type}`, 20, yPos);
    yPos += 6;
    doc.text(`Value: ${data.coupon.value}${data.coupon.type === 'percentage' ? '%' : '$'}`, 20, yPos);
    yPos += 6;
    doc.text(`Region: ${data.coupon.region?.toUpperCase() || 'US'}`, 20, yPos);
    yPos += 6;
    doc.text(`Status: ${data.coupon.is_active ? 'Active' : 'Inactive'}`, 20, yPos);
    yPos += 12;

    // Summary Statistics
    doc.setFontSize(14);
    doc.text('Summary Statistics', 20, yPos);
    yPos += 8;
    doc.setFontSize(10);

    const summaryData = [
      ['Metric', 'Value'],
      ['Total Uses', data.summary.totalUses.toString()],
      ['Unique Users', data.summary.uniqueUsers.toString()],
      ['Total Discount Given', formatCurrency(data.summary.totalDiscountGiven)],
      ['Total Revenue Before', formatCurrency(data.summary.totalRevenueBefore)],
      ['Total Revenue After', formatCurrency(data.summary.totalRevenueAfter)],
      ['Total Savings', formatCurrency(data.summary.totalSavings)],
      ['Avg Order Value (Before)', formatCurrency(data.summary.avgOrderValueBefore)],
      ['Avg Order Value (After)', formatCurrency(data.summary.avgOrderValueAfter)],
      ['Min Order Value', formatCurrency(data.summary.minOrderValue)],
      ['Max Order Value', formatCurrency(data.summary.maxOrderValue)],
      ['ROI', `${data.summary.roi.toFixed(2)}%`],
      ['Avg Discount Per Use', formatCurrency(data.summary.avgDiscountPerUse)],
      ['Avg Uses Per User', data.summary.avgUsesPerUser.toFixed(2)],
    ];

    summaryData.forEach((row, index) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont(index === 0 ? 'helvetica' : 'helvetica', index === 0 ? 'bold' : 'normal');
      doc.text(row[0], 20, yPos);
      doc.text(row[1], pageWidth - 20, yPos, { align: 'right' });
      yPos += 6;
    });

    yPos += 10;

    // Top Users
    if (data.topUsers.length > 0) {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.text('Top Users', 20, yPos);
      yPos += 8;
      doc.setFontSize(10);

      doc.setFont('helvetica', 'bold');
      doc.text('Email', 20, yPos);
      doc.text('Uses', 80, yPos);
      doc.text('Total Discount', 110, yPos);
      doc.text('Total Spent', 160, yPos);
      yPos += 6;

      doc.setFont('helvetica', 'normal');
      data.topUsers.slice(0, 10).forEach((user) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(user.email || 'Guest', 20, yPos);
        doc.text(user.usage_count.toString(), 80, yPos);
        doc.text(formatCurrency(parseFloat(user.total_discount.toString())), 110, yPos);
        doc.text(formatCurrency(parseFloat(user.total_spent.toString())), 160, yPos);
        yPos += 6;
      });
    }

    // Save PDF
    doc.save(`coupon-analytics-${data.coupon.code}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: 'Success',
      description: 'PDF report generated successfully',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.usageOverTime.map(item => ({
    date: formatDate(item.date),
    usage: item.usage_count,
    revenue: parseFloat(item.daily_revenue.toString()),
    discount: parseFloat(item.daily_discount.toString()),
  }));

  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Coupon Analytics</h2>
          <p className="text-muted-foreground">Statistics and insights for {data.coupon.code}</p>
        </div>
        <Button onClick={exportToPDF} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalUses}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.uniqueUsers} unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalDiscountGiven)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data.summary.avgDiscountPerUse)} avg per use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenueAfter)}</div>
            <p className="text-xs text-muted-foreground">
              After discount applied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.roi.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Return on investment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Revenue Before Discount:</span>
              <span className="font-semibold">{formatCurrency(data.summary.totalRevenueBefore)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Revenue After Discount:</span>
              <span className="font-semibold">{formatCurrency(data.summary.totalRevenueAfter)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Savings:</span>
              <span className="font-semibold text-green-600">{formatCurrency(data.summary.totalSavings)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg Order Value (Before):</span>
              <span className="font-semibold">{formatCurrency(data.summary.avgOrderValueBefore)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg Order Value (After):</span>
              <span className="font-semibold">{formatCurrency(data.summary.avgOrderValueAfter)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Order Value Range:</span>
              <span className="font-semibold">
                {formatCurrency(data.summary.minOrderValue)} - {formatCurrency(data.summary.maxOrderValue)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Uses:</span>
              <span className="font-semibold">{data.summary.totalUses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Unique Users:</span>
              <span className="font-semibold">{data.summary.uniqueUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg Uses Per User:</span>
              <span className="font-semibold">{data.summary.avgUsesPerUser.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg Discount Per Use:</span>
              <span className="font-semibold">{formatCurrency(data.summary.avgDiscountPerUse)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Discount Given:</span>
              <span className="font-semibold">{formatCurrency(data.summary.totalDiscountGiven)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">ROI:</span>
              <Badge variant={data.summary.roi >= 0 ? 'default' : 'destructive'}>
                {data.summary.roi.toFixed(2)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Over Time Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Over Time (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: any) => {
                    if (typeof value === 'number') {
                      return value < 100 ? value : formatCurrency(value);
                    }
                    return value;
                  }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="usage" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Usage Count"
                  dot={{ r: 4 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Daily Revenue"
                  dot={{ r: 4 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="discount" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Daily Discount"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Users Table */}
      {data.topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Total Discount</TableHead>
                  <TableHead>Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>{user.email || 'Guest'}</TableCell>
                    <TableCell>{user.usage_count}</TableCell>
                    <TableCell>{formatCurrency(parseFloat(user.total_discount.toString()))}</TableCell>
                    <TableCell>{formatCurrency(parseFloat(user.total_spent.toString()))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

