import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Wifi, WifiOff, RefreshCw, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealTimeControlsProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  interval: number;
  onIntervalChange: (interval: number) => void;
  lastUpdate: Date | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  isRefreshing: boolean;
  onManualRefresh: () => void;
  onPause: () => void;
  onResume: () => void;
  className?: string;
}

const INTERVAL_OPTIONS = [
  { value: 10000, label: '10 seconds', description: 'Very frequent updates' },
  { value: 30000, label: '30 seconds', description: 'Recommended' },
  { value: 60000, label: '1 minute', description: 'Balanced' },
  { value: 300000, label: '5 minutes', description: 'Conservative' }
];

export const RealTimeControls = memo<RealTimeControlsProps>(({
  isEnabled,
  onToggle,
  interval,
  onIntervalChange,
  lastUpdate,
  connectionStatus,
  isRefreshing,
  onManualRefresh,
  onPause,
  onResume,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-3 w-3 text-green-600" />;
      case 'connecting':
        return <RefreshCw className="h-3 w-3 text-yellow-600 animate-spin" />;
      case 'disconnected':
      case 'error':
        return <WifiOff className="h-3 w-3 text-red-600" />;
      default:
        return <WifiOff className="h-3 w-3 text-gray-600" />;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'disconnected':
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  const getCurrentIntervalLabel = () => {
    const option = INTERVAL_OPTIONS.find(opt => opt.value === interval);
    return option?.label || 'Custom';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Connection Status */}
      <Badge
        variant="outline"
        className={cn('flex items-center gap-1 text-xs', getConnectionStatusColor())}
      >
        {getConnectionStatusIcon()}
        <span className="hidden sm:inline">
          {connectionStatus === 'connected' ? 'Live' :
           connectionStatus === 'connecting' ? 'Connecting' :
           connectionStatus === 'disconnected' ? 'Offline' :
           'Error'}
        </span>
      </Badge>

      {/* Last Update */}
      <div className="text-xs text-muted-foreground hidden md:block">
        Updated {formatLastUpdate(lastUpdate)}
      </div>

      {/* Manual Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onManualRefresh}
        disabled={isRefreshing || connectionStatus === 'disconnected'}
        className="gap-1"
      >
        <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>

      {/* Pause/Resume Button */}
      {isEnabled && (
        <Button
          variant="outline"
          size="sm"
          onClick={isEnabled ? onPause : onResume}
          className="gap-1"
        >
          {isEnabled ? (
            <>
              <Pause className="h-3 w-3" />
              <span className="hidden sm:inline">Pause</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              <span className="hidden sm:inline">Resume</span>
            </>
          )}
        </Button>
      )}

      {/* Settings Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Settings className="h-3 w-3" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Real-time Updates</h4>
              <p className="text-sm text-muted-foreground">
                Configure automatic data refresh settings
              </p>
            </div>

            <div className="space-y-3">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="realtime-toggle" className="text-sm font-medium">
                  Enable Auto-refresh
                </Label>
                <Switch
                  id="realtime-toggle"
                  checked={isEnabled}
                  onCheckedChange={onToggle}
                />
              </div>

              {/* Interval Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Refresh Interval</Label>
                <Select
                  value={interval.toString()}
                  onValueChange={(value) => onIntervalChange(parseInt(value))}
                  disabled={!isEnabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Information */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Status: <span className="capitalize">{connectionStatus}</span></div>
                  <div>Current interval: {getCurrentIntervalLabel()}</div>
                  <div>Last update: {formatLastUpdate(lastUpdate)}</div>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

RealTimeControls.displayName = 'RealTimeControls';

