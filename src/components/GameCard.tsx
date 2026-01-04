import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
}: GameCardProps) => {
  const navigate = useNavigate();

  return (
    <div 
      className="card-premium cursor-pointer group"
      onClick={() => navigate(path)}
    >
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
          accentColor === 'primary' ? 'bg-primary/15' : 'bg-secondary/15'
        }`} style={{ boxShadow: accentColor === 'primary' ? 'var(--glow-primary)' : 'var(--glow-secondary)' }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-foreground">{title}</h3>
            {badge && (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                accentColor === 'primary' 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-secondary/20 text-secondary'
              }`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className={`font-bold ${accentColor === 'primary' ? 'text-primary' : 'text-secondary'}`}>
                ₦{entry.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-xs">{info}</span>
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-1 font-bold text-sm ${
          accentColor === 'primary' ? 'text-primary' : 'text-secondary'
        } group-hover:translate-x-1 transition-transform`}>
          {ctaText}
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
