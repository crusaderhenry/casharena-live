import { useEffect } from 'react';
import { Confetti } from '@/components/Confetti';
import { X } from 'lucide-react';

interface BadgeCelebrationProps {
  badge: {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  };
  onDismiss: () => void;
}

export const BadgeCelebration = ({ badge, onDismiss }: BadgeCelebrationProps) => {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <>
      <Confetti duration={4000} />
      
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={onDismiss}
      >
        {/* Card */}
        <div 
          className="relative bg-card border border-primary/30 rounded-3xl p-6 max-w-sm w-full text-center animate-scale-in shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button 
            onClick={onDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Glow effect */}
          <div className={`absolute inset-0 ${badge.bgColor} rounded-3xl blur-xl opacity-50`} />
          
          <div className="relative z-10">
            {/* Title */}
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
              🎉 Achievement Unlocked!
            </p>

            {/* Badge Icon */}
            <div className={`w-24 h-24 rounded-full ${badge.bgColor} ${badge.color} flex items-center justify-center mx-auto mb-4 border-4 border-current/30 animate-pulse`}>
              <span className="scale-[2]">{badge.icon}</span>
            </div>

            {/* Badge Name */}
            <h2 className={`text-2xl font-black ${badge.color} mb-2`}>
              {badge.name}
            </h2>

            {/* Description */}
            <p className="text-muted-foreground text-sm mb-6">
              {badge.description}
            </p>

            {/* Action */}
            <button
              onClick={onDismiss}
              className="btn-primary w-full"
            >
              Awesome! 🎮
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
