import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

export const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="animate-float mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-strong">
          <Zap className="w-12 h-12 text-primary-foreground" />
        </div>
      </div>
      
      <h1 className="text-4xl font-bold text-foreground mb-4 animate-slide-up">
        Welcome to <span className="text-money">CashArena</span>
      </h1>
      
      <p className="text-lg text-muted-foreground mb-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        Compete. Stay consistent. Get lucky. Be fast.
      </p>
      
      <p className="text-lg text-muted-foreground mb-12 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        Win real rewards in exciting challenges.
      </p>
      
      <button
        onClick={() => navigate('/onboarding/how-it-works')}
        className="btn-primary w-full max-w-xs text-lg py-4 animate-scale-in"
        style={{ animationDelay: '0.2s' }}
      >
        Get Started
      </button>
      
      <p className="text-xs text-muted-foreground mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        🎮 Demo mode. No real money involved.
      </p>
    </div>
  );
};
