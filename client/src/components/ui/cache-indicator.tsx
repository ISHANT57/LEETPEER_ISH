import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, Clock, Zap } from 'lucide-react';

interface CacheIndicatorProps {
  isFromCache: boolean;
  cacheAge?: number;
  className?: string;
}

export function CacheIndicator({ isFromCache, cacheAge, className = "" }: CacheIndicatorProps) {
  if (!isFromCache) return null;

  const formatCacheAge = (age: number) => {
    const minutes = Math.floor(age / (1000 * 60));
    const seconds = Math.floor((age % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  const getIndicatorProps = () => {
    if (!cacheAge) {
      return {
        variant: "secondary" as const,
        icon: Database,
        text: "Cached",
        tooltip: "Showing cached data for instant loading"
      };
    }

    const ageInMinutes = cacheAge / (1000 * 60);
    
    if (ageInMinutes < 5) {
      return {
        variant: "default" as const,
        icon: Zap,
        text: "Fast",
        tooltip: `Fresh cached data (${formatCacheAge(cacheAge)})`
      };
    } else if (ageInMinutes < 15) {
      return {
        variant: "secondary" as const,
        icon: Clock,
        text: "Cached",
        tooltip: `Cached data (${formatCacheAge(cacheAge)}) - updating in background`
      };
    } else {
      return {
        variant: "outline" as const,
        icon: Clock,
        text: "Stale",
        tooltip: `Older cached data (${formatCacheAge(cacheAge)}) - refreshing soon`
      };
    }
  };

  const { variant, icon: Icon, text, tooltip } = getIndicatorProps();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant} className={`gap-1 text-xs ${className}`}>
          <Icon className="h-3 w-3" />
          {text}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}