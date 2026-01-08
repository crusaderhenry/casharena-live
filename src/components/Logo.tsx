import { Crown } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  className?: string;
}

export const Logo = ({ size = 'md', showIcon = true, className = '' }: LogoProps) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && (
        <div className="relative">
          <Crown className={`${iconSizes[size]} text-gold`} />
          <div className="absolute inset-0 blur-sm">
            <Crown className={`${iconSizes[size]} text-gold/50`} />
          </div>
        </div>
      )}
      <span className={`font-black tracking-tight ${sizeClasses[size]}`}>
        <span className="text-foreground">Fortunes</span>
        <span className="text-gold">HQ</span>
      </span>
    </div>
  );
};
