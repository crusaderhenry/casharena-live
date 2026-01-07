import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MyCycle {
  id: string;
  template_name: string;
  status: string;
  entry_fee: number;
  pool_value: number;
  participant_count: number;
  countdown: number;
  live_start_at: string;
  entry_open_at: string;
  sponsored_prize_amount: number | null;
  effective_prize_pool: number;
  is_spectator: boolean;
}

export const useMyGames = () => {
  const { user } = useAuth();
  const [myGames, setMyGames] = useState<MyCycle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyGames = useCallback(async () => {
    if (!user?.id) {
      setMyGames([]);
      setLoading(false);
      return;
    }

    try {
      // Get all cycle IDs the user has joined
      const { data: participations, error: pError } = await supabase
        .from('cycle_participants')
        .select('cycle_id, is_spectator')
        .eq('user_id', user.id);

      if (pError) throw pError;

      if (!participations || participations.length === 0) {
        setMyGames([]);
        setLoading(false);
        return;
      }

      const cycleIds = participations.map(p => p.cycle_id);
      const spectatorMap = new Map(participations.map(p => [p.cycle_id, p.is_spectator]));

      // Fetch only active cycles (not ended/cancelled/settled)
      const { data: cycles, error: cError } = await supabase
        .from('game_cycles')
        .select(`
          id,
          status,
          entry_fee,
          pool_value,
          participant_count,
          countdown,
          live_start_at,
          entry_open_at,
          sponsored_prize_amount,
          game_templates!inner(name)
        `)
        .in('id', cycleIds)
        .in('status', ['waiting', 'opening', 'live', 'ending'])
        .order('live_start_at', { ascending: true });

      if (cError) throw cError;

      const cyclesWithPool = (cycles || []).map(c => ({
        id: c.id,
        template_name: (c.game_templates as any)?.name || 'Royal Rumble',
        status: c.status,
        entry_fee: c.entry_fee,
        pool_value: c.pool_value,
        participant_count: c.participant_count,
        countdown: c.countdown,
        live_start_at: c.live_start_at,
        entry_open_at: c.entry_open_at,
        sponsored_prize_amount: c.sponsored_prize_amount,
        effective_prize_pool: c.pool_value + (c.sponsored_prize_amount || 0),
        is_spectator: spectatorMap.get(c.id) || false,
      }));

      setMyGames(cyclesWithPool);
    } catch (err) {
      console.error('Error fetching my games:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMyGames();

    // Subscribe to participant changes for this user
    if (!user?.id) return;

    const channel = supabase
      .channel('my-cycles-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cycle_participants',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchMyGames();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_cycles',
      }, (payload) => {
        const updated = payload.new as any;
        setMyGames(prev => prev.map(g => {
          if (g.id === updated.id) {
            return {
              ...g,
              status: updated.status,
              pool_value: updated.pool_value,
              participant_count: updated.participant_count,
              countdown: updated.countdown,
              effective_prize_pool: updated.pool_value + (updated.sponsored_prize_amount || 0),
            };
          }
          return g;
        }).filter(g => ['waiting', 'opening', 'live', 'ending'].includes(g.status)));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchMyGames]);

  return { myGames, loading, refresh: fetchMyGames };
};