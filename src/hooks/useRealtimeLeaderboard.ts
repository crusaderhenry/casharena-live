import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  avatar: string;
  comment_count: number;
  last_comment_at: string;
}

/**
 * Real-time leaderboard based on comments
 * Ranks players by most recent comment (fastest finger)
 */
export const useRealtimeLeaderboard = (gameId: string | null) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Build leaderboard from comments
  const buildLeaderboard = useCallback(async () => {
    if (!gameId) return;

    try {
      // Fetch all comments for this game
      const { data: comments, error } = await supabase
        .from('comments')
        .select('user_id, created_at')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get unique users and their most recent comment
      const userComments = new Map<string, { count: number; lastAt: string }>();
      
      (comments || []).forEach(c => {
        const existing = userComments.get(c.user_id);
        if (existing) {
          userComments.set(c.user_id, {
            count: existing.count + 1,
            lastAt: c.created_at, // Latest comment
          });
        } else {
          userComments.set(c.user_id, {
            count: 1,
            lastAt: c.created_at,
          });
        }
      });

      if (userComments.size === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const userIds = Array.from(userComments.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build leaderboard sorted by most recent comment (last person to comment is #1)
      const leaderboard = Array.from(userComments.entries())
        .map(([userId, data]) => {
          const profile = profileMap.get(userId);
          return {
            id: `${gameId}_${userId}`,
            user_id: userId,
            username: profile?.username || 'Player',
            avatar: profile?.avatar || '🎮',
            comment_count: data.count,
            last_comment_at: data.lastAt,
          };
        })
        .sort((a, b) => new Date(b.last_comment_at).getTime() - new Date(a.last_comment_at).getTime());

      setEntries(leaderboard);
    } catch (err) {
      console.error('Error building leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // Initial load
  useEffect(() => {
    buildLeaderboard();
  }, [buildLeaderboard]);

  // Subscribe to real-time comment changes
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`leaderboard-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          console.log('Leaderboard update - new comment:', payload);
          
          // Fetch profile for this user
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar')
            .eq('id', (payload.new as any).user_id)
            .single();

          const newEntry: LeaderboardEntry = {
            id: `${gameId}_${(payload.new as any).user_id}`,
            user_id: (payload.new as any).user_id,
            username: profile?.username || 'Player',
            avatar: profile?.avatar || '🎮',
            comment_count: 1,
            last_comment_at: (payload.new as any).created_at,
          };

          setEntries(prev => {
            // Check if user already exists
            const existingIndex = prev.findIndex(e => e.user_id === newEntry.user_id);
            
            let updated: LeaderboardEntry[];
            if (existingIndex >= 0) {
              // Update existing entry
              updated = prev.map((e, i) => 
                i === existingIndex 
                  ? { ...e, comment_count: e.comment_count + 1, last_comment_at: newEntry.last_comment_at }
                  : e
              );
            } else {
              // Add new entry
              updated = [...prev, newEntry];
            }

            // Sort by most recent comment
            return updated.sort((a, b) => 
              new Date(b.last_comment_at).getTime() - new Date(a.last_comment_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Top 3 for display
  const topThree = useMemo(() => entries.slice(0, 3), [entries]);

  return {
    entries,
    topThree,
    loading,
    refresh: buildLeaderboard,
  };
};
