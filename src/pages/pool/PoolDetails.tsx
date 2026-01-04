import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { ChevronLeft, Sparkles, Clock } from 'lucide-react';

const MOCK_PARTICIPANTS = [
  { name: 'You', odds: 1.5 },
  { name: 'Amaka O.', odds: 1.2 },
  { name: 'Chidi N.', odds: 1.0 },
  { name: 'Funke A.', odds: 1.8 },
  { name: 'Ibrahim M.', odds: 1.1 },
  { name: 'Joy E.', odds: 1.3 },
  { name: 'Kenneth P.', odds: 1.0 },
  { name: 'Lola T.', odds: 1.6 },
];

export const PoolDetails = () => {
  const navigate = useNavigate();
  const { addWinnings } = useWallet();
  const { poolOdds, drawPool, addActivity } = useGame();
  const [countdown, setCountdown] = useState(30); // 30 seconds for demo
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDraw();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDraw = () => {
    setIsDrawing(true);
    setTimeout(() => {
      const result = drawPool();
      if (result.winner) {
        addWinnings(result.amount, 'pool_win', 'Lucky Pool Winner!');
        addActivity(`Won ₦${result.amount.toLocaleString()} in Lucky Pool! 🎉`, 'pool');
      }
      navigate('/pool/result', { state: result });
    }, 3000);
  };

  if (isDrawing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-8 animate-pulse glow-strong">
          <Sparkles className="w-16 h-16 text-primary animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Drawing Winner...</h1>
        <p className="text-muted-foreground">Good luck! 🍀</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => navigate('/pool')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Pool Details</h1>
            <p className="text-sm text-muted-foreground">You're in the draw!</p>
          </div>
        </div>

        {/* Countdown */}
        <div className="card-game text-center glow-primary">
          <Clock className="w-8 h-8 text-secondary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-2">Draw in</p>
          <p className="timer-display">{countdown}s</p>
        </div>

        {/* Your Entry */}
        <div className="card-game border-primary/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name="You" size="lg" />
              <div>
                <p className="font-bold text-foreground">Your Entry</p>
                <p className="text-sm text-muted-foreground">Good luck!</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Odds</p>
              <p className="text-xl font-bold text-primary">{poolOdds.toFixed(1)}x</p>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Other Participants ({MOCK_PARTICIPANTS.length - 1})
          </h3>
          {MOCK_PARTICIPANTS.filter(p => p.name !== 'You').map((participant, index) => (
            <div key={index} className="card-game flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Avatar name={participant.name} size="sm" />
                <p className="font-medium text-foreground">{participant.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">{participant.odds}x</p>
            </div>
          ))}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
