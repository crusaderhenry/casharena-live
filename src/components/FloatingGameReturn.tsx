import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Radio, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveGameState {
  cycleId: string;
  status: string;
  liveEndAt: string;
  isParticipant: boolean;
}

const STORAGE_KEY = 'fhq_active_game';

// Helper to calculate seconds until a timestamp
const getSecondsUntil = (timestamp: string): number => {
  const targetTime = new Date(timestamp).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((targetTime - now) / 1000));
};

export const FloatingGameReturn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState<ActiveGameState | null>(null);
  const [countdown, setCountdown] = useState(0);
  const activeGameRef = useRef<ActiveGameState | null>(null);

  // Keep ref in sync for use in subscription callback
  useEffect(() => {
    activeGameRef.current = activeGame;
  }, [activeGame]);

  // Don't show on any arena page (live, lobby, results, etc.)
  const isOnArenaPage = location.pathname.includes('/arena/');

  // Clear active game helper
  const clearActiveGame = useCallback(() => {
    setActiveGame(null);
    setCountdown(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Check and load active game
  const checkActiveGame = useCallback(async () => {
    if (!user) return;

    // Find any live cycles where user is a participant (not spectator)
    const { data: participation } = await supabase
      .from('cycle_participants')
      .select('cycle_id, is_spectator, game_cycles!inner(id, status, live_end_at)')
      .eq('user_id', user.id)
      .eq('is_spectator', false);

    if (participation && participation.length > 0) {
      // Only consider 'live' status - not 'ending', 'ended', 'settled', or 'cancelled'
      const liveGames = participation.filter((p: any) => 
        p.game_cycles?.status === 'live'
      );

      if (liveGames.length > 0) {
        const game = liveGames[0];
        const liveEndAt = game.game_cycles.live_end_at;
        const secondsRemaining = getSecondsUntil(liveEndAt);
        
        // Only set if game still has time remaining
        if (secondsRemaining > 0) {
          const gameData: ActiveGameState = {
            cycleId: game.cycle_id,
            status: game.game_cycles.status,
            liveEndAt: liveEndAt,
            isParticipant: !game.is_spectator,
          };
          setActiveGame(gameData);
          setCountdown(secondsRemaining);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
          return;
        }
      }
    }

    // No active live game
    clearActiveGame();
  }, [user, clearActiveGame]);

  // Initial load and subscription
  useEffect(() => {
    if (!user) {
      clearActiveGame();
      return;
    }

    // Load from localStorage first for immediate display
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ActiveGameState;
        // Validate the stored game is still live
        const secondsRemaining = getSecondsUntil(parsed.liveEndAt);
        if (secondsRemaining > 0 && parsed.status === 'live') {
          setActiveGame(parsed);
          setCountdown(secondsRemaining);
        } else {
          // Stored game has ended
          clearActiveGame();
        }
      } catch (e) {
        clearActiveGame();
      }
    }

    // Then check server for latest state
    checkActiveGame();

    // Subscribe to game_cycles updates for ANY changes
    const channel = supabase
      .channel('floating-game-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_cycles' },
        (payload) => {
          const updated = payload.new as any;
          const currentGame = activeGameRef.current;
          
          if (currentGame && updated.id === currentGame.cycleId) {
            // Game status changed - check if it's no longer live
            if (updated.status !== 'live') {
              clearActiveGame();
            } else {
              // Still live - update countdown based on live_end_at
              const secondsRemaining = getSecondsUntil(updated.live_end_at);
              if (secondsRemaining <= 0) {
                clearActiveGame();
              } else {
                setActiveGame(prev => prev ? { 
                  ...prev, 
                  status: updated.status,
                  liveEndAt: updated.live_end_at 
                } : null);
                setCountdown(secondsRemaining);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, checkActiveGame, clearActiveGame]);

  // Update countdown every second based on live_end_at
  useEffect(() => {
    if (!activeGame?.liveEndAt) return;
    
    const interval = setInterval(() => {
      const remaining = getSecondsUntil(activeGame.liveEndAt);
      if (remaining <= 0) {
        // Game has ended - clear immediately
        clearActiveGame();
      } else {
        setCountdown(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeGame?.liveEndAt, clearActiveGame]);

  // Don't render if no active game, on arena page, or countdown is 0
  if (!activeGame || isOnArenaPage || countdown <= 0) return null;

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

// Helper to set active game from arena (must include liveEndAt for countdown)
export const setActiveGameState = (state: ActiveGameState | null) => {
  if (state && state.status === 'live') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};
