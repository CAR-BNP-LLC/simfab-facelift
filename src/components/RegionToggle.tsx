/**
 * Region Toggle Button
 * Switch between US and EU regions
 */

import { Button } from '@/components/ui/button';
import { useRegion } from '@/contexts/RegionContext';
import { Globe } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const RegionToggle = () => {
  const { region, toggleRegion } = useRegion();

  const handleToggle = () => {
    console.log('🔄 Toggling region from', region, 'to', region === 'us' ? 'eu' : 'us');
    toggleRegion();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            <span className="font-semibold">{region.toUpperCase()}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch to {region === 'us' ? 'EU' : 'US'} region</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

