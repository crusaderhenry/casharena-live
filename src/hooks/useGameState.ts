import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GameState {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'scheduled' | 'open' | 'live' | 'ending_soon' | 'ended' | 'settled';
  pool_value: number;
  effective_prize_pool: number;
  participant_count: number;
  countdown: number;
  entry_fee: number;
  max_duration: number;
  comment_timer: number;
  payout_type: string;
  payout_distribution: number[];
  is_sponsored: boolean;
  sponsored_amount: number;
  scheduled_at: string | null;
  start_time: string | null;
  end_time: string | null;
  lobby_opens_at: string | null;
  entry_cutoff_minutes: number;
  visibility: string;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  seconds_until_open: number;
  seconds_until_live: number;
  seconds_remaining: number;
  is_ending_soon: boolean;
}

/**
 * Hook for fetching and subscribing to real-time game state
 * All timing is server-authoritative
 */
export function useGameState(gameId?: string) {
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    if (!gameId) {
      setGame(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_game_state' as any, { game_id: gameId });

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        setGame(data[0] as GameState);
      } else {
        setGame(null);
      }
    } catch (err: any) {
      console.error('[useGameState] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // Initial fetch
  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  // Real-time subscription
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`game-state-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fastest_finger_games',
          filter: `id=eq.${gameId}`,
        },
        () => {
          fetchGame();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, fetchGame]);

  // Poll every 5 seconds to update computed fields (countdown timers)
  useEffect(() => {
    if (!gameId) return;

    const interval = setInterval(fetchGame, 5000);
    return () => clearInterval(interval);
  }, [gameId, fetchGame]);

  return { game, loading, error, refetch: fetchGame };
}

/**
 * Hook for fetching all active games with real-time updates
 */
export function useActiveGames() {
  const [games, setGames] = useState<GameState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_active_games' as any);

      if (rpcError) throw rpcError;

      setGames((data || []) as GameState[]);
    } catch (err: any) {
      console.error('[useActiveGames] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Real-time subscription for all game changes
  useEffect(() => {
    const channel = supabase
      .channel('active-games-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fastest_finger_games',
        },
        () => {
          fetchGames();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fastest_finger_participants',
        },
        () => {
          fetchGames();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGames]);

  // Poll every 5 seconds to update computed fields
  useEffect(() => {
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  // Computed categories
  const liveGames = games.filter(g => g.status === 'live' || g.status === 'ending_soon');
  const openGames = games.filter(g => g.status === 'open');
  const scheduledGames = games.filter(g => g.status === 'scheduled');

  return {
    games,
    liveGames,
    openGames,
    scheduledGames,
    loading,
    error,
    refetch: fetchGames,
  };
}
