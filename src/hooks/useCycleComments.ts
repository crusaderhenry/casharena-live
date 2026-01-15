import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

// Validation schema for comment content
const commentSchema = z.string()
  .trim()
  .min(1, 'Comment cannot be empty')
  .max(500, 'Comment must be 500 characters or less')
  .transform(val => 
    // Basic sanitization - remove script tags and other dangerous content
    val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
       .replace(/<[^>]*>/g, '') // Strip all HTML tags
       .trim()
  );

export interface CycleComment {
  id: string;
  cycle_id: string;
  user_id: string;
  content: string;
  server_timestamp: string;
  username?: string;
  avatar?: string;
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

      // Fetch profiles using secure RPC function (bypasses need for direct profile access)
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      
      let profileMap = new Map<string, { username: string; avatar: string }>();
      
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .rpc('get_public_profiles', { user_ids: userIds });
        
        if (!profileError && profiles) {
          profileMap = new Map(profiles.map((p: { id: string; username: string; avatar: string }) => [p.id, p]));
        }
      }

      const enrichedComments: CycleComment[] = (data || []).map(c => ({
        ...c,
        username: profileMap.get(c.user_id)?.username || 'Unknown',
        avatar: profileMap.get(c.user_id)?.avatar || '🎮',
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
          const newComment = payload.new as { id: string; cycle_id: string; user_id: string; content: string; server_timestamp: string };
          
          // Fetch profile using secure RPC function
          const { data: profiles } = await supabase
            .rpc('get_public_profiles', { user_ids: [newComment.user_id] });

          const profile = profiles?.[0];

          const enrichedComment: CycleComment = {
            ...newComment,
            username: profile?.username || 'Unknown',
            avatar: profile?.avatar || '🎮',
          };

          setComments(prev => [enrichedComment, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId]);

  // Send a comment with validation
  const sendComment = useCallback(async (content: string): Promise<boolean> => {
    if (!cycleId || !user) return false;

    // Validate and sanitize content
    const validationResult = commentSchema.safeParse(content);
    if (!validationResult.success) {
      console.error('[useCycleComments] Validation error:', validationResult.error.message);
      return false;
    }

    const sanitizedContent = validationResult.data;
    if (!sanitizedContent) return false;

    setSending(true);
    try {
      const { error } = await supabase.from('cycle_comments').insert({
        cycle_id: cycleId,
        user_id: user.id,
        content: sanitizedContent,
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