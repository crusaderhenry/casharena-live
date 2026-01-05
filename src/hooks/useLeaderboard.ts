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

// Mock data for test mode
const mockLeaderboard: LeaderboardUser[] = [
  { id: '1', username: 'CryptoKing', avatar: '👑', rank_points: 1200, total_wins: 12, games_played: 25, weekly_rank: 1 },
  { id: '2', username: 'LuckyAce', avatar: '🎰', rank_points: 980, total_wins: 10, games_played: 22, weekly_rank: 2 },
  { id: '3', username: 'FastHands', avatar: '⚡', rank_points: 850, total_wins: 9, games_played: 20, weekly_rank: 3 },
  { id: '4', username: 'GoldRush', avatar: '💰', rank_points: 720, total_wins: 7, games_played: 18, weekly_rank: 4 },
  { id: '5', username: 'NightOwl', avatar: '🦉', rank_points: 650, total_wins: 6, games_played: 15, weekly_rank: 5 },
  { id: '6', username: 'StarPlayer', avatar: '⭐', rank_points: 580, total_wins: 5, games_played: 14, weekly_rank: 6 },
  { id: '7', username: 'DiamondPro', avatar: '💎', rank_points: 520, total_wins: 4, games_played: 12, weekly_rank: 7 },
  { id: '8', username: 'ThunderBolt', avatar: '🌩️', rank_points: 480, total_wins: 4, games_played: 11, weekly_rank: 8 },
  { id: '9', username: 'SilverFox', avatar: '🦊', rank_points: 420, total_wins: 3, games_played: 10, weekly_rank: 9 },
  { id: '10', username: 'MoonRider', avatar: '🌙', rank_points: 350, total_wins: 2, games_played: 8, weekly_rank: 10 },
];

export const useLeaderboard = (useTestData = false) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    if (useTestData) {
      setLeaderboard(mockLeaderboard);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Use the secure RPC function to get leaderboard data
      const { data, error } = await supabase.rpc('get_leaderboard', { limit_count: 50 });

      if (error) {
        console.error('Error fetching leaderboard:', error);
        // Fallback to mock data on error
        setLeaderboard(mockLeaderboard);
      } else {
        // Add weekly_rank based on position
        const rankedData = (data || []).map((user: any, index: number) => ({
          ...user,
          weekly_rank: index + 1,
        }));
        setLeaderboard(rankedData.length > 0 ? rankedData : mockLeaderboard);
      }
    } catch (err) {
      console.error('Error:', err);
      setLeaderboard(mockLeaderboard);
    }
    setLoading(false);
  }, [useTestData]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { leaderboard, loading, refresh: fetchLeaderboard };
};
