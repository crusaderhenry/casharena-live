import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RealActivityItem {
  id: string;
  type: 'finger_win' | 'game_start' | 'game_end' | 'rank_up';
  playerName: string;
  playerAvatar: string;
  amount?: number;
  position?: number;
  gameName?: string;
  timestamp: Date;
}

export const useRealtimeActivity = (limit = 10) => {
  const [activities, setActivities] = useState<RealActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent winners
  const fetchRecentWinners = useCallback(async () => {
    try {
      const { data: winners, error } = await supabase
        .from('winners')
        .select(`
          id,
          amount_won,
          position,
          created_at,
          game_id,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (winners && winners.length > 0) {
        // Fetch profiles for winners
        const userIds = [...new Set(winners.map(w => w.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Fetch game names
        const gameIds = [...new Set(winners.map(w => w.game_id))];
        const { data: games } = await supabase
          .from('fastest_finger_games')
          .select('id, name')
          .in('id', gameIds);

        const gameMap = new Map(games?.map(g => [g.id, g.name || 'Fastest Finger']) || []);

        const winActivities: RealActivityItem[] = winners.map(w => {
          const profile = profileMap.get(w.user_id);
          return {
            id: w.id,
            type: 'finger_win' as const,
            playerName: profile?.username || 'Player',
            playerAvatar: profile?.avatar || '🎮',
            amount: w.amount_won,
            position: w.position,
            gameName: gameMap.get(w.game_id),
            timestamp: new Date(w.created_at),
          };
        });

        setActivities(winActivities);
      }
    } catch (err) {
      console.error('Error fetching recent winners:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Fetch recent game events
  const fetchGameEvents = useCallback(async () => {
    try {
      const { data: games, error } = await supabase
        .from('fastest_finger_games')
        .select('id, name, status, start_time, end_time, pool_value, created_by')
        .in('status', ['live', 'ended'])
        .order('start_time', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (games) {
        const gameActivities: RealActivityItem[] = games
          .filter(g => g.status === 'live' && g.start_time)
          .map(g => ({
            id: `game_start_${g.id}`,
            type: 'game_start' as const,
            playerName: 'System',
            playerAvatar: '🎮',
            gameName: g.name || 'Fastest Finger',
            amount: g.pool_value,
            timestamp: new Date(g.start_time!),
          }));

        setActivities(prev => {
          const combined = [...gameActivities, ...prev];
          const unique = combined.filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
          );
          return unique.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
        });
      }
    } catch (err) {
      console.error('Error fetching game events:', err);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchRecentWinners();
    fetchGameEvents();
  }, [fetchRecentWinners, fetchGameEvents]);

  // Subscribe to realtime winners
  useEffect(() => {
    const winnersChannel = supabase
      .channel('realtime-winners')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'winners',
        },
        async (payload) => {
          const winner = payload.new as {
            id: string;
            user_id: string;
            game_id: string;
            amount_won: number;
            position: number;
            created_at: string;
          };

          // Fetch profile for this winner
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar')
            .eq('id', winner.user_id)
            .single();

          // Fetch game name
          const { data: game } = await supabase
            .from('fastest_finger_games')
            .select('name')
            .eq('id', winner.game_id)
            .single();

          const newActivity: RealActivityItem = {
            id: winner.id,
            type: 'finger_win',
            playerName: profile?.username || 'Player',
            playerAvatar: profile?.avatar || '🎮',
            amount: winner.amount_won,
            position: winner.position,
            gameName: game?.name || 'Fastest Finger',
            timestamp: new Date(winner.created_at),
          };

          setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
        }
      )
      .subscribe();

    // Subscribe to game status changes
    const gamesChannel = supabase
      .channel('realtime-games-activity')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fastest_finger_games',
        },
        (payload) => {
          const game = payload.new as {
            id: string;
            name: string | null;
            status: string;
            pool_value: number;
            start_time: string | null;
          };

          if (game.status === 'live' && payload.old && (payload.old as { status: string }).status !== 'live') {
            const newActivity: RealActivityItem = {
              id: `game_start_${game.id}_${Date.now()}`,
              type: 'game_start',
              playerName: 'System',
              playerAvatar: '🎮',
              gameName: game.name || 'Fastest Finger',
              amount: game.pool_value,
              timestamp: new Date(),
            };

            setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
          }

          if (game.status === 'ended' && payload.old && (payload.old as { status: string }).status === 'live') {
            const newActivity: RealActivityItem = {
              id: `game_end_${game.id}_${Date.now()}`,
              type: 'game_end',
              playerName: 'System',
              playerAvatar: '🏆',
              gameName: game.name || 'Fastest Finger',
              amount: game.pool_value,
              timestamp: new Date(),
            };

            setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(winnersChannel);
      supabase.removeChannel(gamesChannel);
    };
  }, [limit]);

  return { activities, loading, refresh: fetchRecentWinners };
};
