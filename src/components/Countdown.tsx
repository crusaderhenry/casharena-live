import { useState, useEffect } from 'react';

interface CountdownProps {
  targetSeconds: number;
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showSeconds?: boolean;
}

export const Countdown = ({ 
  targetSeconds, 
  onComplete, 
  size = 'md',
  showSeconds = true 
}: CountdownProps) => {
  const [seconds, setSeconds] = useState(targetSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setSeconds(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onComplete]);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const formatNumber = (n: number) => n.toString().padStart(2, '0');

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'timer-display',
  };

  return (
    <div className={`font-bold tabular-nums ${sizeClasses[size]}`}>
      {hours > 0 && <span>{formatNumber(hours)}:</span>}
      <span>{formatNumber(minutes)}</span>
      {showSeconds && <span>:{formatNumber(secs)}</span>}
    </div>
  );
};

interface LiveTimerProps {
  seconds: number;
  size?: 'sm' | 'md' | 'lg';
  warning?: boolean;
}

export const LiveTimer = ({ seconds, size = 'lg', warning = false }: LiveTimerProps) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'timer-display',
  };

  return (
    <div className={`font-bold tabular-nums ${sizeClasses[size]} ${
      warning ? 'text-destructive' : 'text-secondary'
    }`} style={warning ? {} : { textShadow: '0 0 20px hsl(51 100% 50% / 0.6)' }}>
      {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
    </div>
  );
};
