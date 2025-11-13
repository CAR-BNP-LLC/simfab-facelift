import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Globe, TrendingUp, Eye, ArrowLeftRight } from 'lucide-react';
import { TimePeriodSelector } from '../filters/TimePeriodSelector';
import { ExportButton } from '../export/ExportButton';
import { useRealTimeAnalytics } from '../hooks/useRealTimeAnalytics';
import {
  useVisitorOverview,
  useVisitorReferrers,
  useVisitorReturning,
  useVisitorPages
} from '../hooks/useAnalyticsData';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

interface VisitorAnalyticsProps {
  className?: string;
}

export const VisitorAnalytics = ({ className }: VisitorAnalyticsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  // Fetch visitor analytics data
  const overviewData = useVisitorOverview(selectedPeriod);
  const referrersData = useVisitorReferrers(selectedPeriod);
  const returningData = useVisitorReturning(selectedPeriod);
  const pagesData = useVisitorPages(selectedPeriod, 20);

  // Real-time analytics for visitor data
  const realTimeAnalytics = useRealTimeAnalytics(
    () => {
      overviewData.refetch();
      referrersData.refetch();
      returningData.refetch();
      pagesData.refetch();
    },
    {
      enabled: realTimeEnabled,
      interval: 60000, // 1 minute for visitor data
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
  const isLoading = overviewData.loading || referrersData.loading || returningData.loading || pagesData.loading || realTimeAnalytics.isRefreshing;

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading && !overviewData.data) {
    return <LoadingSkeleton type="section" />;
  }

  const overview = overviewData.data?.data || {};
  const referrers = referrersData.data?.data || {};
  const returning = returningData.data?.data || {};
  const pages = pagesData.data?.data?.pages || [];

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Visitor Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Track visitors, referrers, and page views
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
            data={overview}
            type="revenue"
            period={selectedPeriod}
            disabled={!overviewData.data}
          />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Unique Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.unique_visitors || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(overview.total_sessions || 0)} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Page Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.total_page_views || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overview.avg_page_views_per_session?.toFixed(1) || '0'} avg per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              New Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatNumber(returning.new_visitors || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(returning.returning_rate || 0)} returning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Returning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatNumber(returning.returning_visitors || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(returning.returning_rate || 0)} of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referrer Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Traffic Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrers.referrers && referrers.referrers.length > 0 ? (
              <div className="space-y-4">
                {referrers.referrers.map((ref: any) => (
                  <div key={ref.referrer_category}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{ref.referrer_category}</span>
                      <div className="text-right">
                        <span className="font-semibold">{formatNumber(ref.visitors)}</span>
                        <span className="text-muted-foreground ml-2">visitors</span>
                      </div>
                    </div>
                    <Progress 
                      value={overview.unique_visitors > 0 ? (ref.visitors / overview.unique_visitors) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No referrer data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UTM Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {referrers.utm_sources && referrers.utm_sources.length > 0 ? (
              <div className="space-y-3">
                {referrers.utm_sources.map((utm: any) => (
                  <div key={utm.utm_source} className="flex justify-between items-center">
                    <span className="text-sm">{utm.utm_source}</span>
                    <Badge variant="secondary">{formatNumber(utm.visitors)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No UTM data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          {pages.length > 0 ? (
            <div className="space-y-3">
              {pages.map((page: any, index: number) => (
                <div key={page.page_path} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{page.page_path}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatNumber(page.unique_visitors)} unique visitors
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatNumber(page.views)}</div>
                    <div className="text-xs text-muted-foreground">views</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No page data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

