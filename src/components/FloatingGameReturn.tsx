import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Radio, ArrowRight, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveGame {
  cycleId: string;
  templateName: string;
  countdown: number;
  status: string;
}

export const FloatingGameReturn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [localCountdown, setLocalCountdown] = useState(0);

  // Check for active game participation
  useEffect(() => {
    if (!user) {
      setActiveGame(null);
      return;
    }

    const checkActiveGame = async () => {
      // Find any live game the user is participating in (not as spectator)
      const { data: participation } = await supabase
        .from('cycle_participants')
        .select(`
          cycle_id,
          is_spectator,
          game_cycles (
            id,
            status,
            countdown,
            template_id
          )
        `)
        .eq('user_id', user.id)
        .eq('is_spectator', false);

      if (!participation || participation.length === 0) {
        setActiveGame(null);
        return;
      }

      // Find any live game
      const liveGame = participation.find(
        p => p.game_cycles && 
        (p.game_cycles.status === 'live' || p.game_cycles.status === 'ending')
      );

      if (liveGame?.game_cycles) {
        // Get template name
        const { data: template } = await supabase
          .from('game_templates')
          .select('name')
          .eq('id', liveGame.game_cycles.template_id)
          .single();

        setActiveGame({
          cycleId: liveGame.cycle_id,
          templateName: template?.name || 'Royal Rumble',
          countdown: liveGame.game_cycles.countdown,
          status: liveGame.game_cycles.status,
        });
        setLocalCountdown(liveGame.game_cycles.countdown);
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Local countdown ticker
  useEffect(() => {
    if (!activeGame || activeGame.status !== 'live') return;

    const interval = setInterval(() => {
      setLocalCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeGame]);

  // Hide if we're already on the arena page for this game
  const isOnArenaPage = location.pathname.includes(`/arena/${activeGame?.cycleId}/live`);
  
  if (!activeGame || isOnArenaPage) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isUrgent = localCountdown <= 10 && localCountdown > 0;

  return (
    <button
      onClick={() => navigate(`/arena/${activeGame.cycleId}/live`)}
      className={`fixed bottom-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl transition-all active:scale-95 ${
        isUrgent 
          ? 'bg-gradient-to-r from-red-500 to-orange-500 animate-pulse' 
          : 'bg-gradient-to-r from-primary to-primary/80'
      }`}
    >
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Radio className="w-4 h-4 text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-ping" />
        </div>
        <span className="text-xs font-bold text-white/90 uppercase">Live</span>
      </div>

      {/* Game info */}
      <div className="flex flex-col items-start border-l border-white/20 pl-3">
        <span className="text-xs text-white/80 truncate max-w-[100px]">
          {activeGame.templateName}
        </span>
        <div className="flex items-center gap-1">
          <Timer className={`w-3 h-3 ${isUrgent ? 'text-white' : 'text-white/70'}`} />
          <span className={`text-sm font-bold tabular-nums ${isUrgent ? 'text-white' : 'text-white/90'}`}>
            {formatTime(localCountdown)}
          </span>
        </div>
      </div>

      {/* Return arrow */}
      <ArrowRight className="w-5 h-5 text-white" />
    </button>
  );
};
