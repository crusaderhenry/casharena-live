import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Radio, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useServerTime } from '@/hooks/useServerTime';

interface ActiveGameState {
  cycleId: string;
  status: string;
  countdown: number;
  isParticipant: boolean;
}

const STORAGE_KEY = 'fhq_active_game';

export const FloatingGameReturn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { secondsUntil } = useServerTime();
  const [activeGame, setActiveGame] = useState<ActiveGameState | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Don't show on arena pages
  const isOnArenaPage = location.pathname.includes('/arena/') && location.pathname.includes('/live');

  // Load and subscribe to active game
  useEffect(() => {
    if (!user || isOnArenaPage) {
      setActiveGame(null);
      return;
    }

    // Load from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setActiveGame(parsed);
        setCountdown(parsed.countdown);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Subscribe to live game updates
    const checkActiveGame = async () => {
      // Find any live cycles where user is a participant
      const { data: participation } = await supabase
        .from('cycle_participants')
        .select('cycle_id, is_spectator, game_cycles!inner(id, status, countdown, live_end_at)')
        .eq('user_id', user.id)
        .eq('is_spectator', false);

      if (participation && participation.length > 0) {
        const liveGames = participation.filter((p: any) => 
          p.game_cycles?.status === 'live' || p.game_cycles?.status === 'ending'
        );

        if (liveGames.length > 0) {
          const game = liveGames[0];
          const gameData = {
            cycleId: game.cycle_id,
            status: game.game_cycles.status,
            countdown: game.game_cycles.countdown,
            isParticipant: !game.is_spectator,
          };
          setActiveGame(gameData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
          return;
        }
      }

      // No active game
      setActiveGame(null);
      localStorage.removeItem(STORAGE_KEY);
    };

    checkActiveGame();

    // Subscribe to cycle updates
    const channel = supabase
      .channel('floating-game-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_cycles' },
        (payload) => {
          const updated = payload.new as any;
          if (activeGame && updated.id === activeGame.cycleId) {
            if (updated.status === 'ended' || updated.status === 'settled' || updated.status === 'cancelled') {
              setActiveGame(null);
              localStorage.removeItem(STORAGE_KEY);
            } else {
              setActiveGame(prev => prev ? { ...prev, status: updated.status, countdown: updated.countdown } : null);
              setCountdown(updated.countdown);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isOnArenaPage, activeGame?.cycleId]);

  // Update countdown every second
  useEffect(() => {
    if (!activeGame) return;
    
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeGame]);

  if (!activeGame || isOnArenaPage) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReturn = () => {
    navigate(`/arena/${activeGame.cycleId}/live`);
  };

  return (
    <button
      onClick={handleReturn}
      className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 animate-bounce-gentle active:scale-95 transition-transform"
    >
      <div className="relative">
        <Radio className="w-5 h-5" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-pulse" />
      </div>
      <div className="flex flex-col items-start">
        <span className="text-xs font-bold">LIVE • {formatTime(countdown)}</span>
        <span className="text-[10px] opacity-80">Tap to return</span>
      </div>
      <ArrowRight className="w-4 h-4 ml-1" />
    </button>
  );
};

// Helper to set active game from arena
export const setActiveGameState = (state: ActiveGameState | null) => {
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};
