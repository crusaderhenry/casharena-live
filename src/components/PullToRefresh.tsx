import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullProgress: number;
  isRefreshing: boolean;
  pullDistance: number;
}

export const PullToRefreshIndicator = ({ 
  pullProgress, 
  isRefreshing,
  pullDistance 
}: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div 
      className="flex items-center justify-center transition-all duration-200"
      style={{ 
        height: isRefreshing ? 48 : pullDistance,
        opacity: Math.min(pullProgress, 1)
      }}
    >
      <div className={cn(
        "w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center transition-transform",
        isRefreshing && "animate-spin"
      )}>
        <RefreshCw 
          className={cn(
            "w-4 h-4 text-primary transition-transform",
            !isRefreshing && "duration-200"
          )}
          style={{ 
            transform: isRefreshing ? undefined : `rotate(${pullProgress * 360}deg)` 
          }}
        />
      </div>
    </div>
  );
};
