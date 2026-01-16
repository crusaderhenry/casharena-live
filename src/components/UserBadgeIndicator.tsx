import { useMemo } from 'react';
import { Trophy, Star, Medal, Crown, Flame, Zap, Gamepad2, Target, LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface UserBadgeIndicatorProps {
  totalWins: number;
  gamesPlayed?: number;
  size?: 'xs' | 'sm' | 'md';
  showTooltip?: boolean;
}

interface BadgeDef {
  id: string;
  name: string;
  icon: LucideIcon;
  requirement: { type: 'wins' | 'games'; value: number };
  color: string;
  bgColor: string;
  priority: number; // Higher = more prestigious
}

// Badge definitions ordered by priority (highest first = most prestigious)
const BADGES: BadgeDef[] = [
  { id: 'winner_100', name: 'Unstoppable', icon: Zap, requirement: { type: 'wins', value: 100 }, color: 'text-red-400', bgColor: 'bg-red-500/20', priority: 100 },
  { id: 'winner_50', name: 'Legend', icon: Flame, requirement: { type: 'wins', value: 50 }, color: 'text-orange-400', bgColor: 'bg-orange-500/20', priority: 90 },
  { id: 'winner_25', name: 'Champion', icon: Crown, requirement: { type: 'wins', value: 25 }, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', priority: 80 },
  { id: 'winner_10', name: 'Competitor', icon: Medal, requirement: { type: 'wins', value: 10 }, color: 'text-purple-400', bgColor: 'bg-purple-500/20', priority: 70 },
  { id: 'winner_5', name: 'Rising Star', icon: Star, requirement: { type: 'wins', value: 5 }, color: 'text-blue-400', bgColor: 'bg-blue-500/20', priority: 60 },
  { id: 'first_win', name: 'First Blood', icon: Trophy, requirement: { type: 'wins', value: 1 }, color: 'text-green-400', bgColor: 'bg-green-500/20', priority: 50 },
  { id: 'player_500', name: 'Dedicated', icon: Target, requirement: { type: 'games', value: 500 }, color: 'text-pink-400', bgColor: 'bg-pink-500/20', priority: 45 },
  { id: 'player_100', name: 'Veteran', icon: Gamepad2, requirement: { type: 'games', value: 100 }, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', priority: 40 },
  { id: 'player_50', name: 'Regular', icon: Gamepad2, requirement: { type: 'games', value: 50 }, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', priority: 35 },
  { id: 'player_10', name: 'Rookie', icon: Gamepad2, requirement: { type: 'games', value: 10 }, color: 'text-slate-400', bgColor: 'bg-slate-500/20', priority: 30 },
];

const getHighestBadge = (totalWins: number, gamesPlayed: number): BadgeDef | null => {
  // Sort by priority descending and find first matching badge
  const sortedBadges = [...BADGES].sort((a, b) => b.priority - a.priority);
  
  for (const badge of sortedBadges) {
    const { type, value } = badge.requirement;
    if (type === 'wins' && totalWins >= value) {
      return badge;
    }
    if (type === 'games' && gamesPlayed >= value) {
      return badge;
    }
  }
  
  return null;
};

export const UserBadgeIndicator = ({
  totalWins,
  gamesPlayed = 0,
  size = 'sm',
  showTooltip = true,
}: UserBadgeIndicatorProps) => {
  const highestBadge = useMemo(() => 
    getHighestBadge(totalWins, gamesPlayed), 
    [totalWins, gamesPlayed]
  );

  if (!highestBadge) return null;

  const IconComponent = highestBadge.icon;
  
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  const badge = (
    <span 
      className={`inline-flex items-center justify-center ${highestBadge.color} shrink-0`}
      title={!showTooltip ? highestBadge.name : undefined}
    >
      <IconComponent className={sizeClasses[size]} />
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="flex items-center gap-1.5">
          <span className={highestBadge.color}>
            <IconComponent className="w-3 h-3" />
          </span>
          <span>{highestBadge.name}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Export utility function for components that need to calculate badge without rendering
export const getHighestBadgeInfo = getHighestBadge;
