import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Radio, ArrowRight, Timer, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveGame {
  cycleId: string;
  templateName: string;
  countdown: number; // Comment timer
  status: string;
  liveStartAt: string;
  liveEndAt: string;
}

export const FloatingGameReturn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [timeUntilLive, setTimeUntilLive] = useState(0);
  const [gameEndsIn, setGameEndsIn] = useState(0);

  // Check for active game participation
  useEffect(() => {
    if (!user) {
      setActiveGame(null);
      return;
    }

    const checkActiveGame = async () => {
      // Find any active game the user is participating in (not as spectator)
      const { data: participation } = await supabase
        .from('cycle_participants')
        .select(`
          cycle_id,
          is_spectator,
          game_cycles (
            id,
            status,
            countdown,
            template_id,
            live_start_at,
            live_end_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_spectator', false);

      if (!participation || participation.length === 0) {
        setActiveGame(null);
        return;
      }

      // Find any active game (live, opening, or waiting)
      const activeGameParticipation = participation.find(
        p => p.game_cycles && 
        ['live', 'ending', 'opening', 'waiting'].includes(p.game_cycles.status)
      );

      if (activeGameParticipation?.game_cycles) {
        const gc = activeGameParticipation.game_cycles;
        
        // Get template name
        const { data: template } = await supabase
          .from('game_templates')
          .select('name')
          .eq('id', gc.template_id)
          .single();

        setActiveGame({
          cycleId: activeGameParticipation.cycle_id,
          templateName: template?.name || 'Royal Rumble',
          countdown: gc.countdown,
          status: gc.status,
          liveStartAt: gc.live_start_at,
          liveEndAt: gc.live_end_at,
        });
        
        // Calculate time until live
        const now = Date.now();
        const liveAt = new Date(gc.live_start_at).getTime();
        setTimeUntilLive(Math.max(0, Math.floor((liveAt - now) / 1000)));
        
        // Calculate game ends in
        const endAt = new Date(gc.live_end_at).getTime();
        setGameEndsIn(Math.max(0, Math.floor((endAt - now) / 1000)));
      } else {
        setActiveGame(null);
      }
    };

    checkActiveGame();

    // Subscribe to game status changes
    const channel = supabase
      .channel('floating-return-check')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_cycles' },
        () => checkActiveGame()
      )
      .subscribe();

    // Re-sync every 30 seconds for accuracy
    const syncInterval = setInterval(checkActiveGame, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(syncInterval);
    };
  }, [user, location.pathname]);

  // Local countdown ticker
  useEffect(() => {
    if (!activeGame) return;

    const interval = setInterval(() => {
      if (activeGame.status === 'live' || activeGame.status === 'ending') {
        setGameEndsIn(prev => Math.max(0, prev - 1));
      } else {
        // For waiting/opening, tick down time until live
        setTimeUntilLive(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeGame]);

  // Determine the correct route based on game status
  const getTargetRoute = () => {
    if (!activeGame) return '/arena';
    
    if (activeGame.status === 'live' || activeGame.status === 'ending') {
      return `/arena/${activeGame.cycleId}/live`;
    }
    // For waiting/opening, go to lobby
    return `/arena/${activeGame.cycleId}`;
  };

  // Hide if we're already on the relevant game page
  const targetRoute = getTargetRoute();
  const isOnGamePage = location.pathname.includes(`/arena/${activeGame?.cycleId}`);
  
  if (!activeGame || isOnGamePage) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLive = activeGame.status === 'live' || activeGame.status === 'ending';
  const isUrgent = isLive && gameEndsIn <= 30 && gameEndsIn > 0;
  const isWaiting = activeGame.status === 'waiting' || activeGame.status === 'opening';

  return (
    <button
      onClick={() => navigate(targetRoute)}
      className={`fixed bottom-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl transition-all active:scale-95 ${
        isUrgent 
          ? 'bg-gradient-to-r from-red-500 to-orange-500 animate-pulse' 
          : isLive
            ? 'bg-gradient-to-r from-primary to-primary/80'
            : 'bg-gradient-to-r from-amber-500 to-orange-500'
      }`}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        {isLive ? (
          <>
            <div className="relative">
              <Radio className="w-4 h-4 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-ping" />
            </div>
            <span className="text-xs font-bold text-white/90 uppercase">Live</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white/90 uppercase">Joined</span>
          </>
        )}
      </div>

      {/* Game info */}
      <div className="flex flex-col items-start border-l border-white/20 pl-3">
        <span className="text-xs text-white/80 truncate max-w-[100px]">
          {activeGame.templateName}
        </span>
        <div className="flex items-center gap-1">
          <Timer className={`w-3 h-3 ${isUrgent ? 'text-white' : 'text-white/70'}`} />
          <span className={`text-sm font-bold tabular-nums ${isUrgent ? 'text-white' : 'text-white/90'}`}>
            {isLive ? formatTime(gameEndsIn) : formatTime(timeUntilLive)}
          </span>
          {isLive && <span className="text-[10px] text-white/60 ml-1">ends</span>}
          {isWaiting && <span className="text-[10px] text-white/60 ml-1">to live</span>}
        </div>
      </div>

      {/* Return arrow */}
      <ArrowRight className="w-5 h-5 text-white" />
    </button>
  );
};
