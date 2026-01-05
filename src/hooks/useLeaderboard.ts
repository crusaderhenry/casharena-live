import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar: string;
  rank_points: number;
  total_wins: number;
  games_played: number;
}

export const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar, rank_points, total_wins, games_played')
      .order('rank_points', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching leaderboard:', error);
    } else {
      setLeaderboard(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { leaderboard, loading, refresh: fetchLeaderboard };
};
