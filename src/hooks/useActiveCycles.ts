import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useServerTime } from './useServerTime';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface GameCycle {
  id: string;
  template_id: string;
  template_name: string;
  game_type: string;
  status: 'waiting' | 'opening' | 'live' | 'ending' | 'ended' | 'cancelled';
  entry_fee: number;
  sponsored_prize_amount: number;
  winner_count: number;
  prize_distribution: number[];
  pool_value: number;
  participant_count: number;
  countdown: number;
  allow_spectators: boolean;
  entry_open_at: string;
  entry_close_at: string;
  live_start_at: string;
  live_end_at: string;
  // Computed fields from server (WAT-based)
  seconds_until_opening: number;
  seconds_until_live: number;
  seconds_remaining: number;
}

export const useActiveCycles = () => {
  const [cycles, setCycles] = useState<GameCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { offset: serverTimeOffset } = useServerTime();

  // Fetch cycles using the get_active_cycles function
  const fetchCycles = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase.rpc('get_active_cycles');
      
      if (fetchError) {
        console.error('[useActiveCycles] Fetch error:', fetchError);
        setError(fetchError.message);
        return;
      }

      const mappedCycles: GameCycle[] = (data || []).map((c: any) => ({
        id: c.id,
        template_id: c.template_id,
        template_name: c.template_name || 'Royal Rumble',
        game_type: c.game_type || 'royal_rumble',
        status: c.status as GameCycle['status'],
        entry_fee: c.entry_fee,
        sponsored_prize_amount: c.sponsored_prize_amount || 0,
        winner_count: c.winner_count,
        prize_distribution: c.prize_distribution || [50, 30, 20],
        pool_value: c.pool_value,
        participant_count: c.participant_count,
        countdown: c.countdown,
        allow_spectators: c.allow_spectators,
        entry_open_at: c.entry_open_at,
        entry_close_at: c.entry_close_at,
        live_start_at: c.live_start_at,
        live_end_at: c.live_end_at,
        seconds_until_opening: c.seconds_until_opening,
        seconds_until_live: c.seconds_until_live,
        seconds_remaining: c.seconds_remaining,
      }));

      setCycles(mappedCycles);
      setError(null);
    } catch (err) {
      console.error('[useActiveCycles] Error:', err);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  // Real-time subscriptions
  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    // Subscribe to cycle updates
    const cyclesChannel = supabase
      .channel('active-cycles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_cycles' },
        (payload) => {
          console.log('[useActiveCycles] Cycle update:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            fetchCycles(); // Refetch to get computed fields
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setCycles(prev => {
              const index = prev.findIndex(c => c.id === updated.id);
              
              // Remove if ended or cancelled
              if (updated.status === 'ended' || updated.status === 'cancelled') {
                return prev.filter(c => c.id !== updated.id);
              }
              
              if (index === -1) {
                // New active cycle
                fetchCycles();
                return prev;
              }
              
              // Update existing
              const newCycles = [...prev];
              newCycles[index] = {
                ...newCycles[index],
                status: updated.status,
                pool_value: updated.pool_value,
                participant_count: updated.participant_count,
                countdown: updated.countdown,
              };
              return newCycles;
            });
          } else if (payload.eventType === 'DELETE') {
            setCycles(prev => prev.filter(c => c.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    channels.push(cyclesChannel);

    // Subscribe to participant changes
    const participantsChannel = supabase
      .channel('active-cycles-participants')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cycle_participants' },
        (payload) => {
          const newP = payload.new as any;
          setCycles(prev => prev.map(c => {
            if (c.id === newP.cycle_id && !newP.is_spectator) {
              return {
                ...c,
                participant_count: c.participant_count + 1,
                pool_value: c.pool_value + c.entry_fee,
              };
            }
            return c;
          }));
        }
      )
      .subscribe();

    channels.push(participantsChannel);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [fetchCycles]);

  // Categorize cycles
  const waitingCycles = cycles.filter(c => c.status === 'waiting');
  const openingCycles = cycles.filter(c => c.status === 'opening');
  const liveCycles = cycles.filter(c => c.status === 'live' || c.status === 'ending');

  // Helper to get local time display from WAT timestamp
  const toLocalTime = useCallback((watTimestamp: string) => {
    return new Date(watTimestamp);
  }, []);

  // Get time remaining using server time offset
  const getSecondsUntil = useCallback((targetTimestamp: string) => {
    const now = Date.now() + serverTimeOffset;
    const target = new Date(targetTimestamp).getTime();
    return Math.max(0, Math.floor((target - now) / 1000));
  }, [serverTimeOffset]);

  return {
    cycles,
    waitingCycles,
    openingCycles,
    liveCycles,
    loading,
    error,
    refetch: fetchCycles,
    toLocalTime,
    getSecondsUntil,
  };
};