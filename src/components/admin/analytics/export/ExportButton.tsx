import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportAnalyticsData } from './exportService';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonProps {
  data: any;
  type: 'revenue' | 'customers' | 'products' | 'orders';
  period: string;
  disabled?: boolean;
  className?: string;
}

export const ExportButton = ({
  data,
  type,
  period,
  disabled = false,
  className
}: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: 'csv' | 'excel') => {
    if (!data || disabled) return;

    setIsExporting(true);

    try {
      await exportAnalyticsData(data, type, period, format);

      toast({
        title: 'Export Successful',
        description: `Analytics data exported as ${format.toUpperCase()} file.`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'revenue': return 'Revenue';
      case 'customers': return 'Customer';
      case 'products': return 'Product';
      case 'orders': return 'Order';
      default: return 'Analytics';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting || !data}
          className={className}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export {getTypeLabel()} Data</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport('csv')}
          disabled={isExporting}
        >
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('excel')}
          disabled={isExporting}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
