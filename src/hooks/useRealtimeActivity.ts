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

  // Fetch recent winners from cycle_winners
  const fetchRecentWinners = useCallback(async () => {
    try {
      const { data: winners, error } = await supabase
        .from('cycle_winners')
        .select(`
          id,
          prize_amount,
          position,
          created_at,
          cycle_id,
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

        // Fetch cycle names via template
        const cycleIds = [...new Set(winners.map(w => w.cycle_id))];
        const { data: cycles } = await supabase
          .from('game_cycles')
          .select('id, template_id, game_templates!inner(name)')
          .in('id', cycleIds);

        const cycleMap = new Map(cycles?.map(c => [c.id, (c.game_templates as any)?.name || 'Royal Rumble']) || []);

        const winActivities: RealActivityItem[] = winners.map(w => {
          const profile = profileMap.get(w.user_id);
          return {
            id: w.id,
            type: 'finger_win' as const,
            playerName: profile?.username || 'Player',
            playerAvatar: profile?.avatar || '🎮',
            amount: w.prize_amount,
            position: w.position,
            gameName: cycleMap.get(w.cycle_id),
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

  // Fetch recent game events from game_cycles
  const fetchGameEvents = useCallback(async () => {
    try {
      const { data: cycles, error } = await supabase
        .from('game_cycles')
        .select(`
          id, 
          status, 
          live_start_at, 
          actual_end_at, 
          pool_value,
          game_templates!inner(name)
        `)
        .in('status', ['live', 'settled'])
        .order('live_start_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (cycles) {
        const gameActivities: RealActivityItem[] = cycles
          .filter(c => c.status === 'live' && c.live_start_at)
          .map(c => ({
            id: `game_start_${c.id}`,
            type: 'game_start' as const,
            playerName: 'System',
            playerAvatar: '🎮',
            gameName: (c.game_templates as any)?.name || 'Royal Rumble',
            amount: c.pool_value,
            timestamp: new Date(c.live_start_at!),
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

  // Subscribe to realtime cycle winners
  useEffect(() => {
    const winnersChannel = supabase
      .channel('realtime-cycle-winners')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cycle_winners',
        },
        async (payload) => {
          const winner = payload.new as {
            id: string;
            user_id: string;
            cycle_id: string;
            prize_amount: number;
            position: number;
            created_at: string;
          };

          // Fetch profile for this winner
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar')
            .eq('id', winner.user_id)
            .single();

          // Fetch cycle template name
          const { data: cycle } = await supabase
            .from('game_cycles')
            .select('game_templates!inner(name)')
            .eq('id', winner.cycle_id)
            .single();

          const newActivity: RealActivityItem = {
            id: winner.id,
            type: 'finger_win',
            playerName: profile?.username || 'Player',
            playerAvatar: profile?.avatar || '🎮',
            amount: winner.prize_amount,
            position: winner.position,
            gameName: (cycle?.game_templates as any)?.name || 'Royal Rumble',
            timestamp: new Date(winner.created_at),
          };

          setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
        }
      )
      .subscribe();

    // Subscribe to game cycle status changes
    const cyclesChannel = supabase
      .channel('realtime-cycles-activity')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_cycles',
        },
        async (payload) => {
          const cycle = payload.new as {
            id: string;
            status: string;
            pool_value: number;
            template_id: string;
          };
          const oldCycle = payload.old as { status: string };

          // Fetch template name
          const { data: template } = await supabase
            .from('game_templates')
            .select('name')
            .eq('id', cycle.template_id)
            .single();

          if (cycle.status === 'live' && oldCycle.status !== 'live') {
            const newActivity: RealActivityItem = {
              id: `game_start_${cycle.id}_${Date.now()}`,
              type: 'game_start',
              playerName: 'System',
              playerAvatar: '🎮',
              gameName: template?.name || 'Royal Rumble',
              amount: cycle.pool_value,
              timestamp: new Date(),
            };

            setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
          }

          if (cycle.status === 'settled' && oldCycle.status === 'live') {
            const newActivity: RealActivityItem = {
              id: `game_end_${cycle.id}_${Date.now()}`,
              type: 'game_end',
              playerName: 'System',
              playerAvatar: '🏆',
              gameName: template?.name || 'Royal Rumble',
              amount: cycle.pool_value,
              timestamp: new Date(),
            };

            setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(winnersChannel);
      supabase.removeChannel(cyclesChannel);
    };
  }, [limit]);

  return { activities, loading, refresh: fetchRecentWinners };
};
