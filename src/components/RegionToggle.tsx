/**
 * Region Toggle Button
 * Switch between US and EU regions
 */

import { Button } from '@/components/ui/button';
import { useRegion } from '@/contexts/RegionContext';
import { Globe, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const RegionToggle = () => {
  const { region, setRegion } = useRegion();

  const handleRegionChange = (newRegion: 'us' | 'eu') => {
    console.log('🔄 Changing region from', region, 'to', newRegion);
    setRegion(newRegion);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            <span className="font-semibold">{region.toUpperCase()}</span>
          <ChevronDown className="h-4 w-4" />
          </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={region} onValueChange={(value) => handleRegionChange(value as 'us' | 'eu')}>
          <DropdownMenuRadioItem value="us">
            US
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="eu">
            EU
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

