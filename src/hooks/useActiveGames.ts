import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useServerTime } from './useServerTime';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ActiveGame {
  id: string;
  name: string;
  description: string | null;
  status: 'scheduled' | 'open' | 'live' | 'ending' | 'ended';
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
  sponsored_amount: number | null;
  scheduled_at: string | null;
  start_time: string | null;
  lobby_opens_at: string | null;
  entry_cutoff_minutes: number;
  visibility: string;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  // Computed fields from server
  seconds_until_open: number;
  seconds_until_live: number;
  seconds_remaining: number;
  is_ending_soon: boolean;
}

interface UseActiveGamesOptions {
  includeTestMode?: boolean;
}

// Mock games for test mode
const mockGames: ActiveGame[] = [
  {
    id: 'mock-1',
    name: 'Fastest Finger',
    description: 'Last comment wins!',
    status: 'live',
    pool_value: 35000,
    effective_prize_pool: 35000,
    participant_count: 23,
    countdown: 45,
    entry_fee: 700,
    max_duration: 20,
    comment_timer: 60,
    payout_type: 'top3',
    payout_distribution: [0.5, 0.3, 0.2],
    is_sponsored: false,
    sponsored_amount: null,
    scheduled_at: null,
    start_time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    lobby_opens_at: null,
    entry_cutoff_minutes: 10,
    visibility: 'public',
    recurrence_type: null,
    recurrence_interval: null,
    seconds_until_open: 0,
    seconds_until_live: 0,
    seconds_remaining: 900,
    is_ending_soon: false,
  },
  {
    id: 'mock-2',
    name: 'Speed Rush',
    description: 'Quick-fire action!',
    status: 'live',
    pool_value: 18500,
    effective_prize_pool: 18500,
    participant_count: 15,
    countdown: 32,
    entry_fee: 500,
    max_duration: 15,
    comment_timer: 45,
    payout_type: 'winner_takes_all',
    payout_distribution: [1.0],
    is_sponsored: false,
    sponsored_amount: null,
    scheduled_at: null,
    start_time: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    lobby_opens_at: null,
    entry_cutoff_minutes: 10,
    visibility: 'public',
    recurrence_type: null,
    recurrence_interval: null,
    seconds_until_open: 0,
    seconds_until_live: 0,
    seconds_remaining: 720,
    is_ending_soon: false,
  },
  {
    id: 'mock-3',
    name: 'Quick Draw',
    description: 'Sponsored by FortunesHQ',
    status: 'scheduled',
    pool_value: 0,
    effective_prize_pool: 50000,
    participant_count: 8,
    countdown: 60,
    entry_fee: 0,
    max_duration: 10,
    comment_timer: 30,
    payout_type: 'top5',
    payout_distribution: [0.4, 0.25, 0.15, 0.12, 0.08],
    is_sponsored: true,
    sponsored_amount: 50000,
    scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    start_time: null,
    lobby_opens_at: null,
    entry_cutoff_minutes: 10,
    visibility: 'public',
    recurrence_type: 'hourly',
    recurrence_interval: 1,
    seconds_until_open: 1800,
    seconds_until_live: 0,
    seconds_remaining: 0,
    is_ending_soon: false,
  },
];

export const useActiveGames = (isTestMode: boolean = false) => {
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { secondsUntil, gameTimeRemaining, synced } = useServerTime();

  // Fetch games using the get_active_games function
  const fetchGames = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase.rpc('get_active_games');
      
      if (fetchError) {
        console.error('[useActiveGames] Fetch error:', fetchError);
        setError(fetchError.message);
        return;
      }

      const mappedGames: ActiveGame[] = (data || []).map((g: any) => ({
        id: g.id,
        name: g.name || 'Fastest Finger',
        description: g.description,
        status: g.status as ActiveGame['status'],
        pool_value: g.pool_value,
        effective_prize_pool: g.effective_prize_pool,
        participant_count: g.participant_count,
        countdown: g.countdown,
        entry_fee: g.entry_fee,
        max_duration: g.max_duration,
        comment_timer: g.comment_timer,
        payout_type: g.payout_type || 'top3',
        payout_distribution: g.payout_distribution || [0.5, 0.3, 0.2],
        is_sponsored: g.is_sponsored || false,
        sponsored_amount: g.sponsored_amount,
        scheduled_at: g.scheduled_at,
        start_time: g.start_time,
        lobby_opens_at: g.lobby_opens_at,
        entry_cutoff_minutes: g.entry_cutoff_minutes || 10,
        visibility: g.visibility || 'public',
        recurrence_type: g.recurrence_type,
        recurrence_interval: g.recurrence_interval,
        seconds_until_open: g.seconds_until_open,
        seconds_until_live: g.seconds_until_live,
        seconds_remaining: g.seconds_remaining,
        is_ending_soon: g.is_ending_soon,
      }));

      setGames(mappedGames);
      setError(null);
    } catch (err) {
      console.error('[useActiveGames] Error:', err);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Real-time subscriptions
  useEffect(() => {

    const channels: RealtimeChannel[] = [];

    // Subscribe to game updates
    const gamesChannel = supabase
      .channel('active-games-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fastest_finger_games' },
        (payload) => {
          console.log('[useActiveGames] Game update:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const newGame = payload.new as any;
            if (['scheduled', 'open', 'live'].includes(newGame.status)) {
              fetchGames(); // Refetch to get computed fields
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setGames(prev => {
              const index = prev.findIndex(g => g.id === updated.id);
              if (index === -1) {
                // New active game
                if (['scheduled', 'open', 'live'].includes(updated.status)) {
                  fetchGames();
                }
                return prev;
              }
              
              // Remove if ended
              if (updated.status === 'ended' || updated.status === 'cancelled') {
                return prev.filter(g => g.id !== updated.id);
              }
              
              // Update existing
              const newGames = [...prev];
              newGames[index] = {
                ...newGames[index],
                ...updated,
                name: updated.name || newGames[index].name,
              };
              return newGames;
            });
          } else if (payload.eventType === 'DELETE') {
            setGames(prev => prev.filter(g => g.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    channels.push(gamesChannel);

    // Subscribe to participant changes for pool updates
    const participantsChannel = supabase
      .channel('active-games-participants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fastest_finger_participants' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newP = payload.new as any;
            setGames(prev => prev.map(g => {
              if (g.id === newP.game_id) {
                return {
                  ...g,
                  participant_count: g.participant_count + 1,
                  pool_value: g.pool_value + g.entry_fee,
                  effective_prize_pool: g.effective_prize_pool + g.entry_fee,
                };
              }
              return g;
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldP = payload.old as any;
            setGames(prev => prev.map(g => {
              if (g.id === oldP.game_id) {
                return {
                  ...g,
                  participant_count: Math.max(0, g.participant_count - 1),
                  pool_value: Math.max(0, g.pool_value - g.entry_fee),
                  effective_prize_pool: Math.max(0, g.effective_prize_pool - g.entry_fee),
                };
              }
              return g;
            }));
          }
        }
      )
      .subscribe();

    channels.push(participantsChannel);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [fetchGames]);

  // Categorize games
  const liveGames = games.filter(g => g.status === 'live' || g.status === 'ending');
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
};