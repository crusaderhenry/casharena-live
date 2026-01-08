import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar: string;
  rank_points: number;
  total_wins: number;
  games_played: number;
  weekly_rank?: number;
}

export const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      // Use the secure RPC function to get leaderboard data
      const { data, error } = await supabase.rpc('get_leaderboard', { limit_count: 50 });

      if (error) {
        console.error('Error fetching leaderboard:', error);
        setLeaderboard([]);
      } else {
        // Add weekly_rank based on position
        const rankedData = (data || []).map((user: any, index: number) => ({
          ...user,
          weekly_rank: index + 1,
        }));
        setLeaderboard(rankedData);
      }
    } catch (err) {
      console.error('Error:', err);
      setLeaderboard([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { leaderboard, loading, refresh: fetchLeaderboard };
};
