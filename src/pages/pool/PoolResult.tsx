import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Confetti } from '@/components/Confetti';
import { Sparkles, XCircle } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

export const PoolResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { play } = useSounds();
  const { buttonClick } = useHaptics();
  
  const result = location.state as { winner: boolean; amount: number } | undefined;
  const isWinner = result?.winner ?? false;
  const amount = result?.amount ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {isWinner && <Confetti duration={5000} />}
      
      <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
        {isWinner ? (
          <>
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-6 animate-bounce-in glow-strong">
              <Sparkles className="w-16 h-16 text-primary" />
            </div>
            
            <h1 className="text-4xl font-black text-foreground mb-2 animate-slide-up">
              YOU WON! 🎉
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 animate-fade-in">
              Congratulations, lucky winner!
            </p>
            
            <div className="card-premium glow-primary mb-8 animate-scale-in w-full max-w-sm">
              <p className="text-sm text-muted-foreground mb-2">Your Prize</p>
              <p className="text-5xl font-black text-money">₦{amount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">Added to your wallet! ✨</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6 animate-scale-in">
              <XCircle className="w-12 h-12 text-muted-foreground" />
            </div>
            
            <h1 className="text-3xl font-black text-foreground mb-2 animate-slide-up">
              Not This Time
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 animate-fade-in">
              Better luck next draw!
            </p>
            
            <div className="card-premium mb-8 animate-fade-in w-full max-w-sm">
              <p className="text-muted-foreground">
                Everyone has equal odds. Try again in the next pool!
              </p>
            </div>
          </>
        )}
        
        <div className="w-full max-w-sm space-y-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/pool');
            }}
            className="w-full btn-outline"
          >
            Join Next Pool
          </button>
          
          <button
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/home');
            }}
            className="w-full btn-primary"
          >
            Back to Home
          </button>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
