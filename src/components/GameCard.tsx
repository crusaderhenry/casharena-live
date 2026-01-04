import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

interface GameCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  entry: number;
  info: string;
  path: string;
  accentColor?: 'primary' | 'secondary';
  ctaText?: string;
  badge?: string;
  badgeType?: 'live' | 'gold' | 'neutral';
}

export const GameCard = ({
  title,
  description,
  icon,
  entry,
  info,
  path,
  accentColor = 'primary',
  ctaText = 'Join',
  badge,
  badgeType = 'neutral',
}: GameCardProps) => {
  const navigate = useNavigate();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();

  const handleClick = () => {
    play('click');
    buttonClick();
    navigate(path);
  };

  const badgeClasses = {
    live: 'badge-live',
    gold: 'badge-gold',
    neutral: 'badge-neutral',
  };

  return (
    <div 
      className="card-interactive group"
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        <div className={`
          w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0
          transition-all duration-300 group-hover:scale-105
          ${accentColor === 'primary' 
            ? 'bg-primary/15 shadow-glow' 
            : 'bg-secondary/15 shadow-glow-gold'
          }
        `}>
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-foreground">{title}</h3>
            {badge && (
              <span className={badgeClasses[badgeType]}>
                {badge}
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{description}</p>
          
          <div className="flex items-center gap-4">
            <span className={`font-bold ${accentColor === 'primary' ? 'text-primary' : 'text-secondary'}`}>
              ₦{entry.toLocaleString()}
            </span>
            <span className="text-muted-foreground text-xs font-medium">{info}</span>
          </div>
        </div>
        
        <div className={`
          flex items-center gap-1 font-bold text-sm 
          transition-all duration-300 group-hover:translate-x-1
          ${accentColor === 'primary' ? 'text-primary' : 'text-secondary'}
        `}>
          {ctaText}
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
