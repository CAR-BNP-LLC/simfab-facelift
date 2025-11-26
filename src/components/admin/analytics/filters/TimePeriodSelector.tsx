import { memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimePeriod = '7d' | '30d' | '90d' | '1y';

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
}

const PERIOD_OPTIONS: { value: TimePeriod; label: string; description: string }[] = [
  { value: '7d', label: '7 Days', description: 'Last week' },
  { value: '30d', label: '30 Days', description: 'Last month' },
  { value: '90d', label: '90 Days', description: 'Last quarter' },
  { value: '1y', label: '1 Year', description: 'Last year' }
];

export const TimePeriodSelector = memo<TimePeriodSelectorProps>(({
  selectedPeriod,
  onPeriodChange,
  onRefresh,
  refreshing = false,
  className
}) => {
  const selectedOption = PERIOD_OPTIONS.find(option => option.value === selectedPeriod);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Time Period Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Period Badge */}
      {selectedOption && (
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {selectedOption.description}
        </Badge>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      )}
    </div>
  );
});

TimePeriodSelector.displayName = 'TimePeriodSelector';

