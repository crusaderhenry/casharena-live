import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MyGame {
  id: string;
  name: string;
  status: string;
  entry_fee: number;
  pool_value: number;
  participant_count: number;
  countdown: number;
  start_time: string | null;
  scheduled_at: string | null;
  is_sponsored: boolean;
  sponsored_amount: number | null;
  effective_prize_pool: number;
}

export const useMyGames = () => {
  const { user } = useAuth();
  const [myGames, setMyGames] = useState<MyGame[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyGames = useCallback(async () => {
    if (!user?.id) {
      setMyGames([]);
      setLoading(false);
      return;
    }

    try {
      // Get all game IDs the user has joined
      const { data: participations, error: pError } = await supabase
        .from('fastest_finger_participants')
        .select('game_id')
        .eq('user_id', user.id);

      if (pError) throw pError;

      if (!participations || participations.length === 0) {
        setMyGames([]);
        setLoading(false);
        return;
      }

      const gameIds = participations.map(p => p.game_id);

      // Fetch only active games (not ended/cancelled)
      const { data: games, error: gError } = await supabase
        .from('fastest_finger_games')
        .select('*')
        .in('id', gameIds)
        .in('status', ['scheduled', 'open', 'live'])
        .order('start_time', { ascending: true, nullsFirst: false });

      if (gError) throw gError;

      const gamesWithPool = (games || []).map(g => ({
        ...g,
        effective_prize_pool: g.is_sponsored && g.sponsored_amount
          ? (g.pool_value || 0) + g.sponsored_amount
          : (g.pool_value || 0),
      }));

      setMyGames(gamesWithPool);
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
      .channel('my-games-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fastest_finger_participants',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchMyGames();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'fastest_finger_games',
      }, (payload) => {
        const updated = payload.new as any;
        setMyGames(prev => prev.map(g => {
          if (g.id === updated.id) {
            return {
              ...g,
              ...updated,
              effective_prize_pool: updated.is_sponsored && updated.sponsored_amount
                ? (updated.pool_value || 0) + updated.sponsored_amount
                : (updated.pool_value || 0),
            };
          }
          return g;
        }).filter(g => ['scheduled', 'open', 'live'].includes(g.status)));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchMyGames]);

  return { myGames, loading, refresh: fetchMyGames };
};
