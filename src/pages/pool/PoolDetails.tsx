import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { TestControls, useTestMode } from '@/components/TestModeToggle';
import { ChevronLeft, Sparkles, Clock, Users, Shuffle, Shield } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

const MOCK_PARTICIPANTS = [
  { name: 'You' },
  { name: 'Amaka O.' },
  { name: 'Chidi N.' },
  { name: 'Funke A.' },
  { name: 'Ibrahim M.' },
  { name: 'Joy E.' },
  { name: 'Kenneth P.' },
  { name: 'Lola T.' },
];

export const PoolDetails = () => {
  const navigate = useNavigate();
  const { addWinnings } = useWallet();
  const { resetPool, addActivity } = useGame();
  const { isTestMode } = useTestMode();
  const { play } = useSounds();
  const { success } = useHaptics();
  
  const [countdown, setCountdown] = useState(60);
  const [isDrawing, setIsDrawing] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const drawIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalPool = MOCK_PARTICIPANTS.length * 1000;

  useEffect(() => {
    if (isTestMode && isTestStarted) {
      setCountdown(5);
    }
  }, [isTestMode, isTestStarted]);

  useEffect(() => {
    if (isDrawing) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          startDraw();
          return 0;
        }
        if (prev <= 10) {
          play('countdown');
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isDrawing]);

  const startDraw = () => {
    setIsDrawing(true);
    play('timer');
    
    let iterations = 0;
    const maxIterations = 20;
    
    drawIntervalRef.current = setInterval(() => {
      setHighlightIndex(Math.floor(Math.random() * MOCK_PARTICIPANTS.length));
      iterations++;
      
      if (iterations >= maxIterations) {
        if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
        finalizeDraw();
      }
    }, 150);
  };

  const finalizeDraw = () => {
    const winnerIndex = Math.floor(Math.random() * MOCK_PARTICIPANTS.length);
    setHighlightIndex(winnerIndex);
    
    const isWinner = MOCK_PARTICIPANTS[winnerIndex].name === 'You';
    const prize = Math.floor(totalPool * 0.9); // 10% platform cut
    
    setTimeout(() => {
      if (isWinner) {
        addWinnings(prize, 'pool_win', 'Lucky Pool Winner!');
        addActivity(`Won ₦${prize.toLocaleString()} in Lucky Pool! 🎉`, 'pool');
        play('win');
        success();
      }
      navigate('/pool/result', { state: { winner: isWinner, amount: prize } });
    }, 1500);
  };

  const handleTestStart = () => {
    setIsTestStarted(true);
    setCountdown(5);
  };

  const handleTestEnd = () => {
    if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
    finalizeDraw();
  };

  const handleTestReset = () => {
    if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
    setIsTestStarted(false);
    setIsDrawing(false);
    setHighlightIndex(-1);
    setCountdown(60);
    resetPool();
  };

  if (isDrawing && !isTestMode) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-8 glow-strong">
          <Shuffle className="w-16 h-16 text-primary animate-spin-slow" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Drawing Winner...</h1>
        <p className="text-muted-foreground mb-8">Fair random selection in progress 🍀</p>
        
        {/* Scrolling names */}
        <div className="w-full max-w-xs space-y-2">
          {MOCK_PARTICIPANTS.map((p, i) => (
            <div 
              key={i}
              className={`p-3 rounded-xl transition-all duration-150 ${
                i === highlightIndex 
                  ? 'bg-primary/30 border-2 border-primary animate-scroll-highlight' 
                  : 'bg-card border border-border/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar name={p.name} size="sm" isWinner={i === highlightIndex} />
                <span className={`font-medium ${i === highlightIndex ? 'text-primary' : 'text-foreground'}`}>
                  {p.name}
                </span>
              </div>
            </div>
          ))}
        </div>
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
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Pool Details</h1>
            <p className="text-sm text-muted-foreground">You're in the draw!</p>
          </div>
        </div>

        {/* Fairness Badge */}
        <div className="fairness-badge">
          <Shield className="w-4 h-4" />
          <span>One random winner. No tricks. Entire pool.</span>
        </div>

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onEnd={handleTestEnd}
          onReset={handleTestReset}
          isStarted={isTestStarted || isDrawing}
          startLabel="Start Draw"
          endLabel="Force Winner"
        />

        {/* Countdown */}
        <div className={`card-premium text-center ${countdown <= 10 ? 'border-destructive/50' : 'glow-primary'}`}>
          <Clock className={`w-8 h-8 mx-auto mb-2 ${countdown <= 10 ? 'text-destructive' : 'text-secondary'}`} />
          <p className="text-sm text-muted-foreground mb-2">Draw in</p>
          <p className={`timer-display ${countdown <= 10 ? 'text-destructive' : ''}`}>{countdown}s</p>
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-premium text-center">
            <p className="text-xs text-muted-foreground mb-1">Prize Pool</p>
            <p className="text-2xl font-black text-money">₦{totalPool.toLocaleString()}</p>
          </div>
          <div className="card-premium text-center">
            <p className="text-xs text-muted-foreground mb-1">Participants</p>
            <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {MOCK_PARTICIPANTS.length}
            </p>
          </div>
        </div>

        {/* Your Entry */}
        <div className="card-premium border-primary/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name="You" size="lg" isWinner />
              <div>
                <p className="font-bold text-foreground">Your Entry</p>
                <p className="text-sm text-muted-foreground">Equal chance with everyone</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Win Chance</p>
              <p className="text-xl font-bold text-primary">{Math.round(100 / MOCK_PARTICIPANTS.length)}%</p>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            All Participants ({MOCK_PARTICIPANTS.length})
          </h3>
          {MOCK_PARTICIPANTS.map((participant, index) => (
            <div 
              key={index} 
              className={`card-game flex items-center justify-between py-3 ${
                isDrawing && index === highlightIndex ? 'border-primary bg-primary/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar name={participant.name} size="sm" isWinner={participant.name === 'You'} />
                <p className={`font-medium ${participant.name === 'You' ? 'text-primary' : 'text-foreground'}`}>
                  {participant.name}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">Equal odds</span>
            </div>
          ))}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
