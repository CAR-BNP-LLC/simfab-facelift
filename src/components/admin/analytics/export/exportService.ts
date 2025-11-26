import { saveAs } from 'file-saver';

export interface ExportOptions {
  format: 'csv' | 'excel';
  filename?: string;
  data: any[];
  headers?: Record<string, string>;
}

// Convert data to CSV format
export const convertToCSV = (data: any[], headers?: Record<string, string>): string => {
  if (!data || data.length === 0) return '';

  // Get all unique keys from the data
  const allKeys = Array.from(new Set(data.flatMap(item => Object.keys(item))));

  // Use custom headers if provided, otherwise use keys
  const headerRow = allKeys.map(key => headers?.[key] || key);

  // Convert data to CSV rows
  const csvRows = data.map(row =>
    allKeys.map(key => {
      const value = row[key];
      // Handle different data types
      if (value === null || value === undefined) return '';

      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  return [headerRow.join(','), ...csvRows].join('\n');
};

// Download CSV file
export const exportToCSV = (data: any[], filename: string = 'analytics-export', headers?: Record<string, string>) => {
  const csvContent = convertToCSV(data, headers);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

// Format data for different analytics types
export const formatAnalyticsDataForExport = (
  data: any,
  type: 'revenue' | 'customers' | 'products' | 'orders'
): { data: any[], headers: Record<string, string> } => {
  switch (type) {
    case 'revenue':
      return {
        data: data.data || [],
        headers: {
          date: 'Date',
          order_count: 'Orders',
          revenue: 'Revenue ($)'
        }
      };

    case 'customers':
      if (data.segments) {
        // Customer segments
        return {
          data: data.segments || [],
          headers: {
            segment: 'Segment',
            customer_count: 'Customers',
            avg_spent: 'Avg Spent ($)',
            total_segment_revenue: 'Total Revenue ($)',
            avg_orders: 'Avg Orders'
          }
        };
      } else if (data.customers) {
        // Customer lifetime value
        return {
          data: data.customers || [],
          headers: {
            user_id: 'User ID',
            total_orders: 'Total Orders',
            lifetime_value: 'Lifetime Value ($)',
            avg_order_value: 'Avg Order Value ($)',
            first_order_date: 'First Order',
            last_order_date: 'Last Order'
          }
        };
      }
      return { data: [], headers: {} };

    case 'products':
      if (data.products) {
        return {
          data: data.products || [],
          headers: {
            product_name: 'Product Name',
            sku: 'SKU',
            total_sold: 'Units Sold',
            total_revenue: 'Revenue ($)',
            performance_score: 'Performance Score',
            current_stock: 'Current Stock'
          }
        };
      }
      return { data: [], headers: {} };

    case 'orders':
      return {
        data: data.data || [],
        headers: {
          status: 'Status',
          count: 'Count',
          total_revenue: 'Total Revenue ($)'
        }
      };

    default:
      return { data: [], headers: {} };
  }
};

// Main export function
export const exportAnalyticsData = (
  data: any,
  type: 'revenue' | 'customers' | 'products' | 'orders',
  period: string,
  format: 'csv' | 'excel' = 'csv'
) => {
  const { data: exportData, headers } = formatAnalyticsDataForExport(data, type);

  if (exportData.length === 0) {
    throw new Error('No data available for export');
  }

  const filename = `${type}-analytics-${period}`;

  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename, headers);
      break;
    case 'excel':
      // For now, export as CSV (Excel can open CSV files)
      exportToCSV(exportData, filename, headers);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

