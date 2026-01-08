import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface JoinResult {
  success: boolean;
  error?: string;
  alreadyJoined?: boolean;
  isSpectator?: boolean;
}

interface LeaveResult {
  success: boolean;
  error?: string;
  refunded?: boolean;
  amount?: number;
  was_spectator?: boolean;
  seconds_until_live?: number;
}

export const useCycleJoin = () => {
  const { user, refreshProfile } = useAuth();
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const joinCycle = useCallback(async (cycleId: string, asSpectator: boolean = false): Promise<JoinResult> => {
    if (!user) {
      toast.error('Please log in to join');
      return { success: false, error: 'Not authenticated' };
    }

    setJoining(true);
    try {
      const { data, error } = await supabase.rpc('join_cycle_atomic', {
        p_cycle_id: cycleId,
        p_user_id: user.id,
        p_as_spectator: asSpectator,
      });

      if (error) {
        console.error('[useCycleJoin] RPC error:', error);
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      const result = data as unknown as JoinResult;
      
      if (!result || !result.success) {
        const errorMsg = result?.error || 'Failed to join';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      if (result.alreadyJoined) {
        toast.info(result.isSpectator ? 'Already watching' : 'Already joined');
      } else {
        toast.success(asSpectator ? 'Joined as spectator!' : 'Joined the game!');
        // Refresh profile to update wallet balance
        await refreshProfile();
      }

      return result;
    } catch (err) {
      console.error('[useCycleJoin] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setJoining(false);
    }
  }, [user, refreshProfile]);

  const leaveCycle = useCallback(async (cycleId: string): Promise<LeaveResult> => {
    if (!user) {
      toast.error('Please log in');
      return { success: false, error: 'Not authenticated' };
    }

    setLeaving(true);
    try {
      const { data, error } = await supabase.rpc('leave_cycle_atomic', {
        p_cycle_id: cycleId,
        p_user_id: user.id,
      });

      if (error) {
        console.error('[useCycleJoin] Leave RPC error:', error);
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      const result = data as unknown as LeaveResult;
      
      if (!result || !result.success) {
        const errorMsg = result?.error || 'Failed to leave game';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      if (result.refunded) {
        toast.success(`Left game. ₦${result.amount?.toLocaleString()} refunded!`);
      } else {
        toast.success('Left game successfully');
      }
      
      await refreshProfile();
      return result;
    } catch (err) {
      console.error('[useCycleJoin] Leave error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLeaving(false);
    }
  }, [user, refreshProfile]);

  const checkParticipation = useCallback(async (cycleId: string): Promise<{ isParticipant: boolean; isSpectator: boolean }> => {
    if (!user) return { isParticipant: false, isSpectator: false };

    const { data, error } = await supabase
      .from('cycle_participants')
      .select('is_spectator')
      .eq('cycle_id', cycleId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      return { isParticipant: false, isSpectator: false };
    }

    return { isParticipant: true, isSpectator: data.is_spectator };
  }, [user]);

  return {
    joinCycle,
    leaveCycle,
    checkParticipation,
    joining,
    leaving,
  };
};
