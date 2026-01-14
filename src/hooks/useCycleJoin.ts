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

  // Helper to nudge backend status check
  const nudgeStatusCheck = async (cycleId: string) => {
    try {
      await supabase.functions.invoke('cycle-status-check', {
        body: { cycle_id: cycleId }
      });
    } catch {
      // Ignore errors, this is just a nudge
    }
  };

  const joinCycle = useCallback(async (cycleId: string, asSpectator: boolean = false): Promise<JoinResult> => {
    if (!user) {
      toast.error('Please log in to join');
      return { success: false, error: 'Not authenticated' };
    }

    setJoining(true);
    try {
      const MAX_RETRIES = 2;
      let lastError = '';

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // Nudge backend status before each attempt (ensures status is current)
        await nudgeStatusCheck(cycleId);
        
        // Small delay to let status propagate
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const { data, error } = await supabase.rpc('join_cycle_atomic', {
          p_cycle_id: cycleId,
          p_user_id: user.id,
          p_as_spectator: asSpectator,
        });

        if (error) {
          console.error(`[useCycleJoin] RPC error (attempt ${attempt + 1}):`, error);
          lastError = error.message;
          
          // Only retry on "Entries are closed" type errors
          if (!error.message.toLowerCase().includes('entries') && 
              !error.message.toLowerCase().includes('closed')) {
            toast.error(error.message);
            return { success: false, error: error.message };
          }
          continue; // Retry
        }

        const result = data as unknown as JoinResult;
        
        if (!result || !result.success) {
          const errorMsg = result?.error || 'Failed to join';
          lastError = errorMsg;
          
          // Only retry on "Entries are closed" type errors
          if (!errorMsg.toLowerCase().includes('entries') && 
              !errorMsg.toLowerCase().includes('closed')) {
            toast.error(errorMsg);
            return { success: false, error: errorMsg };
          }
          continue; // Retry
        }

        // Success!
        if (result.alreadyJoined) {
          toast.info(result.isSpectator ? 'Already watching' : 'Already joined');
        } else {
          toast.success(asSpectator ? 'Joined as spectator!' : 'Joined the game!');
          // Refresh profile to update wallet balance
          await refreshProfile();
        }

        return result;
      }

      // All retries failed
      toast.error(lastError || 'Failed to join game');
      return { success: false, error: lastError };
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
