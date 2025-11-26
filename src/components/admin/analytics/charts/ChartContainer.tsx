import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  children: ReactNode;
  loading?: boolean;
  className?: string;
  height?: number;
}

export const ChartContainer = ({
  title,
  children,
  loading = false,
  className = '',
  height = 300
}: ChartContainerProps) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }} className="relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  );
};

