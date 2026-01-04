import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';
import { TestControls, useTestMode } from '@/components/TestModeToggle';
import { ChevronLeft, Zap, Lock, Users, Lightbulb, Timer } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { useHaptics } from '@/hooks/useHaptics';

const MOCK_PLAYERS = [
  'You', 'Adebayo K.', 'Chidinma U.', 'Emeka A.', 'Fatima B.',
  'Grace O.', 'Henry I.', 'Ifeoma C.', 'John D.', 'Kemi L.',
  'Ladi M.', 'Musa N.', 'Ngozi P.', 'Olumide R.', 'Patricia S.',
  'Queen T.', 'Richard U.', 'Sandra V.', 'Tayo W.', 'Ugochi X.',
  'Victor Y.', 'Wale Z.', 'Xena A.',
];

export const FingerLobby = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(300);
  const [entryClosed, setEntryClosed] = useState(false);
  const { play } = useSounds();
  const { warning, buttonClick } = useHaptics();
  const { isTestMode } = useTestMode();

  const poolValue = MOCK_PLAYERS.length * 700;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 60 && !entryClosed) {
          setEntryClosed(true);
          play('timer');
          warning();
        }
        if (prev <= 10 && prev > 0) {
          play('countdown');
        }
        if (prev <= 0) {
          clearInterval(timer);
          navigate('/finger/arena');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate, entryClosed, play, warning]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTestStart = () => {
    navigate('/finger/arena');
  };

  const handleTestReset = () => {
    setCountdown(300);
    setEntryClosed(false);
  };

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="px-5 pt-6 pb-8 space-y-6">
        {/* Header */}
        <header className="flex items-center gap-4 animate-slide-down">
          <button 
            onClick={() => {
              play('click');
              buttonClick();
              navigate('/finger');
            }}
            className="btn-icon"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Game Lobby</h1>
            <p className="text-sm text-muted-foreground">Waiting for game to start</p>
          </div>
          <span className="badge-live">Live</span>
        </header>

        {/* Test Controls */}
        <TestControls
          onStart={handleTestStart}
          onEnd={handleTestStart}
          onReset={handleTestReset}
          isStarted={false}
          startLabel="Start Game Now"
        />

        {/* Countdown */}
        <div className={`card-premium text-center transition-all duration-300 animate-slide-up ${
          entryClosed ? 'border-destructive/50' : 'card-glow'
        }`}>
          <div className="flex items-center justify-center gap-2 mb-3">
            {entryClosed ? (
              <Lock className="w-5 h-5 text-destructive" />
            ) : (
              <Timer className="w-5 h-5 text-primary" />
            )}
            <span className="text-sm text-muted-foreground font-medium">
              {entryClosed ? 'Entry Closed' : 'Game Starts In'}
            </span>
          </div>
          <p className={`timer-display ${entryClosed ? 'timer-warning' : ''}`}>
            {formatTime(countdown)}
          </p>
          {entryClosed && (
            <div className="flex items-center justify-center gap-2 mt-4 text-destructive">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-bold">No more entries allowed</span>
            </div>
          )}
        </div>

        {/* Pool Info */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="card-premium text-center">
            <p className="stat-label">Participants</p>
            <p className="text-3xl font-extrabold text-foreground flex items-center justify-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              {MOCK_PLAYERS.length}
            </p>
          </div>
          <div className="card-premium text-center">
            <p className="stat-label">Total Pool</p>
            <p className="text-3xl font-extrabold text-money">₦{poolValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Participants Grid */}
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Players in Lobby ({MOCK_PLAYERS.length})
          </h3>
          <div className="grid grid-cols-5 gap-4">
            {MOCK_PLAYERS.map((player, index) => (
              <div 
                key={index} 
                className="flex flex-col items-center animate-scale-in" 
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <Avatar 
                  name={player} 
                  size="sm" 
                  isWinner={player === 'You'}
                />
                <p className={`text-2xs mt-2 truncate w-full text-center font-medium ${
                  player === 'You' ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {player === 'You' ? 'You' : player.split(' ')[0]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="card-premium border-primary/20 bg-primary/5 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Pro Tips
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Keep your finger ready on the send button
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Short messages are faster to type
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Watch the timer - strike at the last second!
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Use the voice room to distract opponents 😎
            </li>
          </ul>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
