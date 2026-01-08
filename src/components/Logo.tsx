import { Sparkles } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSparkle?: boolean;
  className?: string;
}

export const Logo = ({ size = 'md', showSparkle = true, className = '' }: LogoProps) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const sparkleSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className={`font-black tracking-tight ${sizeClasses[size]}`}>
        <span className="text-[#4fd1c5]">Fortunes</span>
        <span className="text-gold"> HQ</span>
      </span>
      {showSparkle && (
        <Sparkles className={`${sparkleSizes[size]} text-gold`} />
      )}
    </div>
  );
};
