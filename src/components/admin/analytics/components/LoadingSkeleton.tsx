import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LoadingSkeletonProps {
  type?: 'chart' | 'card' | 'table' | 'section';
  count?: number;
  height?: number;
}

export const LoadingSkeleton = ({
  type = 'chart',
  count = 1,
  height = 300
}: LoadingSkeletonProps) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'chart':
        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
            </CardHeader>
            <CardContent>
              <div
                className="bg-muted rounded animate-pulse"
                style={{ height: `${height}px` }}
              />
            </CardContent>
          </Card>
        );

      case 'card':
        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              </div>
            </CardContent>
          </Card>
        );

      case 'table':
        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                    <div className="h-4 bg-muted rounded animate-pulse w-20" />
                    <div className="h-4 bg-muted rounded animate-pulse w-16" />
                    <div className="h-4 bg-muted rounded animate-pulse w-12" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'section':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 bg-muted rounded animate-pulse w-48" />
                <div className="h-4 bg-muted rounded animate-pulse w-64" />
              </div>
              <div className="h-9 bg-muted rounded animate-pulse w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (count === 1) {
    return renderSkeleton();
  }

  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  );
};
