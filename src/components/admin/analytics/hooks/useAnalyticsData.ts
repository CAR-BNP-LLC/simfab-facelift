import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface UseAnalyticsDataOptions {
  period?: string;
  autoFetch?: boolean;
}

interface AnalyticsDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Revenue time-series data
export interface RevenueDataPoint {
  date: string;
  order_count: number;
  revenue: number;
}

export interface RevenueTimeSeriesResponse {
  period: string;
  interval: string;
  data: RevenueDataPoint[];
}

// Order status distribution
export interface OrderStatusData {
  status: string;
  count: number;
  total_revenue: number;
}

export interface OrderStatusDistributionResponse {
  period: string;
  data: OrderStatusData[];
}

// Custom hook for fetching analytics data
export const useAnalyticsData = <T>(
  endpoint: string,
  options: UseAnalyticsDataOptions = {}
): AnalyticsDataState<T> & { refetch: () => void } => {
  const { period = '30d', autoFetch = true } = options;
  const [state, setState] = useState<AnalyticsDataState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const url = new URL(`${API_URL}/api/admin/dashboard/analytics/${endpoint}`);
      url.searchParams.set('period', period);

      const response = await fetch(url.toString(), {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint} data`);
      }

      const result = await response.json();

      if (result.success) {
        setState({
          data: result.data,
          loading: false,
          error: null
        });
      } else {
        throw new Error(result.error?.message || 'Failed to load data');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({
        data: null,
        loading: false,
        error: errorMessage
      });

      toast({
        title: 'Analytics Error',
        description: `Failed to load ${endpoint} data: ${errorMessage}`,
        variant: 'destructive'
      });
    }
  }, [endpoint, period, toast]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  return {
    ...state,
    refetch
  };
};

// Specific hooks for different analytics data types
export const useRevenueTimeSeries = (period: string = '30d') => {
  return useAnalyticsData<RevenueTimeSeriesResponse>('revenue-timeseries', { period });
};

export const useOrderStatusDistribution = (period: string = '30d') => {
  return useAnalyticsData<OrderStatusDistributionResponse>('order-status-distribution', { period });
};

export const useOrdersTimeSeries = (period: string = '30d') => {
  return useAnalyticsData<any>('orders-timeseries', { period });
};

// Customer analytics hooks
export const useCustomerAnalyticsOverview = (period: string = '30d') => {
  return useAnalyticsData<any>('customers/overview', { period });
};

export const useCustomerSegments = (period: string = '30d') => {
  return useAnalyticsData<any>('customers/segments', { period });
};

export const useCustomerLifetimeValue = (period: string = '90d') => {
  return useAnalyticsData<any>('customers/lifetime-value', { period });
};

export const useCustomerGrowthTrend = (period: string = '90d') => {
  return useAnalyticsData<any>('customers/growth-trend', { period });
};

// Product analytics hooks
export const useProductPerformance = (period: string = '30d', limit: number = 20) => {
  return useAnalyticsData<any>('products/performance', { period, limit: limit.toString() });
};

export const useProductCategoriesAnalytics = (period: string = '30d') => {
  return useAnalyticsData<any>('products/categories', { period });
};

export const useProductStockTurnover = (period: string = '90d') => {
  return useAnalyticsData<any>('products/stock-turnover', { period });
};

// Performance analytics hooks
export const usePerformanceOverview = (period: string = '30d') => {
  return useAnalyticsData<any>('performance/overview', { period });
};

export const useConversionFunnel = (period: string = '30d') => {
  return useAnalyticsData<any>('performance/conversion-funnel', { period });
};

// Inventory analytics hooks
export const useInventoryOverview = (period: string = '30d') => {
  return useAnalyticsData<any>('inventory/overview', { period });
};

export const useInventoryStockMovements = (period: string = '90d') => {
  return useAnalyticsData<any>('inventory/stock-movements', { period });
};

// Comparative analytics hooks
export const useComparativeGrowth = (period: string = '30d') => {
  return useAnalyticsData<any>('comparative/growth', { period });
};

export const useYearOverYearComparison = (period: string = '30d') => {
  return useAnalyticsData<any>('comparative/year-over-year', { period });
};

// Visitor analytics hooks
export const useVisitorOverview = (period: string = '30d') => {
  return useAnalyticsData<any>('visitors/overview', { period });
};

export const useVisitorReferrers = (period: string = '30d') => {
  return useAnalyticsData<any>('visitors/referrers', { period });
};

export const useVisitorReturning = (period: string = '30d') => {
  return useAnalyticsData<any>('visitors/returning', { period });
};

export const useVisitorPages = (period: string = '30d', limit: number = 20) => {
  return useAnalyticsData<any>('visitors/pages', { period, limit: limit.toString() });
};
