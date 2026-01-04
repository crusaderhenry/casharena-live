import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GameCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  entry?: number;
  poolValue?: number;
  countdown?: string;
  path: string;
  badge?: string;
  isLive?: boolean;
}

export const GameCard = ({
  title,
  description,
  icon,
  entry,
  poolValue,
  countdown,
  path,
  badge,
  isLive,
}: GameCardProps) => {
  const navigate = useNavigate();

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div 
      onClick={() => navigate(path)}
      className="card-game cursor-pointer group"
    >
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center group-hover:glow-primary transition-all">
            {icon}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground">{title}</h3>
              {badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary rounded-full">
                  {badge}
                </span>
              )}
              {isLive && (
                <span className="live-indicator">
                  <span className="live-dot" />
                  Live
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="flex items-center gap-3 text-xs">
              {entry && (
                <span className="text-primary font-semibold">
                  Entry: {formatMoney(entry)}
                </span>
              )}
              {poolValue && (
                <span className="text-money font-semibold">
                  Pool: {formatMoney(poolValue)}
                </span>
              )}
              {countdown && (
                <span className="text-muted-foreground">
                  {countdown}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
};
