import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';
import { useWallet } from '@/contexts/WalletContext';
import { useGame } from '@/contexts/GameContext';
import { TestControls, useTestMode } from '@/components/TestModeToggle';
import { ChevronLeft, Sparkles, Clock, Users, Shuffle, Shield, Dice6 } from 'lucide-react';
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
    const prize = Math.floor(totalPool * 0.9);
    
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
        <div className="w-32 h-32 rounded-full bg-secondary/20 flex items-center justify-center mb-8 shadow-glow-gold">
          <Shuffle className="w-16 h-16 text-secondary animate-spin-slow" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground mb-3">Drawing Winner...</h1>
        <p className="text-muted-foreground mb-10">Fair random selection in progress 🍀</p>
        
        <div className="w-full max-w-xs space-y-2">
          {MOCK_PARTICIPANTS.map((p, i) => (
            <div 
              key={i}
              className={`p-3 rounded-2xl transition-all duration-150 ${
                i === highlightIndex 
                  ? 'bg-secondary/20 border-2 border-secondary shadow-glow-gold' 
                  : 'bg-card border border-border/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar name={p.name} size="sm" isWinner={i === highlightIndex} />
                <span className={`font-medium ${i === highlightIndex ? 'text-secondary' : 'text-foreground'}`}>
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
    <div className="min-h-screen bg-background safe-bottom">
      <div className="px-5 pt-6 pb-8 space-y-6">
        {/* Header */}
        <header className="flex items-center gap-4 animate-slide-down">
          <button 
            onClick={() => navigate('/pool')}
            className="btn-icon"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Pool Details</h1>
            <p className="text-sm text-muted-foreground">You're in the draw!</p>
          </div>
          <span className="badge-gold">Joined</span>
        </header>

        {/* Fairness Badge */}
        <div className="fairness-notice animate-slide-up">
          <Shield className="w-4 h-4" />
          <span>One random winner • No tricks • Entire pool</span>
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
        <div className={`card-premium text-center transition-all duration-300 animate-slide-up ${
          countdown <= 10 ? 'border-destructive/50' : 'card-glow-gold'
        }`}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Dice6 className={`w-6 h-6 ${countdown <= 10 ? 'text-destructive' : 'text-secondary'}`} />
            <span className="text-sm font-medium text-muted-foreground">Draw in</span>
          </div>
          <p className={`timer-display ${countdown <= 10 ? 'timer-warning' : ''}`}>{countdown}s</p>
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="card-premium text-center">
            <p className="stat-label">Prize Pool</p>
            <p className="text-3xl font-extrabold text-money">₦{totalPool.toLocaleString()}</p>
          </div>
          <div className="card-premium text-center">
            <p className="stat-label">Participants</p>
            <p className="text-3xl font-extrabold text-foreground flex items-center justify-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              {MOCK_PARTICIPANTS.length}
            </p>
          </div>
        </div>

        {/* Your Entry */}
        <div className="card-glow animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar name="You" size="lg" isWinner />
              <div>
                <p className="font-bold text-foreground text-lg">Your Entry</p>
                <p className="text-sm text-muted-foreground">Equal chance with everyone</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Win Chance</p>
              <p className="text-2xl font-extrabold text-primary">{Math.round(100 / MOCK_PARTICIPANTS.length)}%</p>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            All Participants ({MOCK_PARTICIPANTS.length})
          </h3>
          {MOCK_PARTICIPANTS.map((participant, index) => (
            <div 
              key={index} 
              className={`card-interactive py-3 flex items-center justify-between transition-all ${
                isDrawing && index === highlightIndex ? 'border-secondary bg-secondary/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar name={participant.name} size="sm" isWinner={participant.name === 'You'} />
                <p className={`font-medium ${participant.name === 'You' ? 'text-primary' : 'text-foreground'}`}>
                  {participant.name}
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Equal odds</span>
            </div>
          ))}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
