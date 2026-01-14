import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CycleComment {
  id: string;
  cycle_id: string;
  user_id: string;
  content: string;
  server_timestamp: string;
  username?: string;
  avatar?: string;
  user_type?: string;
}

export const useCycleComments = (cycleId: string | null) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CycleComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch comments with user profiles
  const fetchComments = useCallback(async () => {
    if (!cycleId) return;

    try {
      const { data, error } = await supabase
        .from('cycle_comments')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('server_timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[useCycleComments] Error:', error);
        return;
      }

      // Fetch profiles for all commenters (including user_type for filtering)
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar, user_type')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enrichedComments: CycleComment[] = (data || []).map(c => ({
        ...c,
        username: profileMap.get(c.user_id)?.username || 'Unknown',
        avatar: profileMap.get(c.user_id)?.avatar || '🎮',
        user_type: profileMap.get(c.user_id)?.user_type || 'user',
      }));

      setComments(enrichedComments);
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  // Initial fetch
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time subscription
  useEffect(() => {
    if (!cycleId) return;

    const channel = supabase
      .channel(`cycle-comments-${cycleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cycle_comments', filter: `cycle_id=eq.${cycleId}` },
        async (payload) => {
          const newComment = payload.new as any;
          
        // Fetch profile for the new commenter (including user_type)
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar, user_type')
            .eq('id', newComment.user_id)
            .single();

          const enrichedComment: CycleComment = {
            ...newComment,
            username: profile?.username || 'Unknown',
            avatar: profile?.avatar || '🎮',
            user_type: profile?.user_type || 'user',
          };

          setComments(prev => [enrichedComment, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId]);

  // Send a comment
  const sendComment = useCallback(async (content: string): Promise<boolean> => {
    if (!cycleId || !user || !content.trim()) return false;

    setSending(true);
    try {
      const { error } = await supabase.from('cycle_comments').insert({
        cycle_id: cycleId,
        user_id: user.id,
        content: content.trim(),
      });

      if (error) {
        console.error('[useCycleComments] Send error:', error);
        return false;
      }

      return true;
    } finally {
      setSending(false);
    }
  }, [cycleId, user]);

  // Get unique commenters ordered by last comment (for winner display)
  const getOrderedCommenters = useCallback(() => {
    const seen = new Set<string>();
    const ordered: CycleComment[] = [];

    for (const comment of comments) {
      if (!seen.has(comment.user_id)) {
        seen.add(comment.user_id);
        ordered.push(comment);
      }
    }

    return ordered;
  }, [comments]);

  return {
    comments,
    loading,
    sending,
    sendComment,
    getOrderedCommenters,
    refetch: fetchComments,
  };
};