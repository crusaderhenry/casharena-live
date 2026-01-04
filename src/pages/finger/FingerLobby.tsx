import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';
import { SkipTimerButton, useTestMode } from '@/components/TestModeToggle';
import { ChevronLeft, Zap, Lock, Users } from 'lucide-react';
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
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [entryClosed, setEntryClosed] = useState(false);
  const { play } = useSounds();
  const { warning } = useHaptics();
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

  const handleSkip = () => {
    navigate('/finger/arena');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={() => navigate('/finger')}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Fastest Finger Lobby</h1>
            <p className="text-sm text-muted-foreground">Waiting for game to start</p>
          </div>
        </div>

        {/* Countdown */}
        <div className={`card-game text-center ${entryClosed ? 'border-destructive/50' : 'glow-secondary'}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className={`w-6 h-6 ${entryClosed ? 'text-destructive' : 'text-secondary'}`} />
            <span className="text-sm text-muted-foreground">
              {entryClosed ? 'Entry Closed' : 'Game Starts In'}
            </span>
          </div>
          <p className={`timer-display ${entryClosed ? 'text-destructive' : ''}`}>
            {formatTime(countdown)}
          </p>
          {entryClosed && (
            <div className="flex items-center justify-center gap-2 mt-2 text-destructive">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">No more entries</span>
            </div>
          )}
          {isTestMode && (
            <div className="mt-4">
              <SkipTimerButton onSkip={handleSkip} label="Start Game Now" />
            </div>
          )}
        </div>

        {/* Pool Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-game text-center">
            <p className="text-xs text-muted-foreground mb-1">Participants</p>
            <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {MOCK_PLAYERS.length}
            </p>
          </div>
          <div className="card-game text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Pool</p>
            <p className="text-2xl font-bold text-money">₦{poolValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Players in Lobby
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {MOCK_PLAYERS.map((player, index) => (
              <div key={index} className="flex flex-col items-center animate-scale-in" style={{ animationDelay: `${index * 30}ms` }}>
                <Avatar 
                  name={player} 
                  size="md" 
                  isWinner={player === 'You'}
                />
                <p className={`text-xs mt-1 truncate w-full text-center ${
                  player === 'You' ? 'text-primary font-bold' : 'text-muted-foreground'
                }`}>
                  {player === 'You' ? 'You' : player.split(' ')[0]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="card-game bg-secondary/5 border-secondary/20">
          <h3 className="font-bold text-foreground mb-2">💡 Pro Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Keep your finger ready on the send button</li>
            <li>• Short messages are faster to type</li>
            <li>• Watch the timer - strike at the last second!</li>
          </ul>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};
