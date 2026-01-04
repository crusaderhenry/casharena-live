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
}: GameCardProps) => {
  const navigate = useNavigate();

  return (
    <div 
      className="card-game cursor-pointer group"
      onClick={() => navigate(path)}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
          accentColor === 'primary' ? 'bg-primary/20' : 'bg-secondary/20'
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <span className={`font-semibold ${accentColor === 'primary' ? 'text-primary' : 'text-secondary'}`}>
                ₦{entry.toLocaleString()}
              </span>
              <span className="text-muted-foreground">{info}</span>
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-1 font-semibold text-sm ${
          accentColor === 'primary' ? 'text-primary' : 'text-secondary'
        } group-hover:translate-x-1 transition-transform`}>
          {ctaText}
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
