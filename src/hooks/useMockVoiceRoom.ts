import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MockVoiceParticipant {
  user_id: string;
  username: string;
  avatar: string;
  is_speaking: boolean;
  is_muted: boolean;
}

/**
 * Hook to fetch mock participants from a cycle and simulate voice activity
 * Shows 50 mock users in voice room with realistic speaking patterns
 */
export const useMockVoiceRoom = (cycleId: string | null, isLive: boolean) => {
  const [voiceParticipants, setVoiceParticipants] = useState<MockVoiceParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch mock participants from database
  const fetchMockParticipants = useCallback(async () => {
    if (!cycleId) return;

    try {
      // Get all mock users
      const { data: mockUsers } = await supabase
        .from('mock_users')
        .select('id, username, avatar')
        .eq('is_active', true);

      if (!mockUsers) {
        setVoiceParticipants([]);
        setLoading(false);
        return;
      }

      const mockUserIds = mockUsers.map(m => m.id);
      const mockUserMap = new Map(mockUsers.map(m => [m.id, m]));

      // Get participants in this cycle that are mock users
      const { data: participants } = await supabase
        .from('cycle_participants')
        .select('user_id')
        .eq('cycle_id', cycleId)
        .eq('is_spectator', false)
        .in('user_id', mockUserIds);

      if (!participants || participants.length === 0) {
        setVoiceParticipants([]);
        setLoading(false);
        return;
      }

      // Take up to 50 mock users for voice room
      const voiceUsers = participants.slice(0, 50).map(p => {
        const mock = mockUserMap.get(p.user_id);
        return {
          user_id: p.user_id,
          username: mock?.username || 'Unknown',
          avatar: mock?.avatar || '🎮',
          is_speaking: false,
          is_muted: Math.random() > 0.85, // 15% muted
        };
      });

      setVoiceParticipants(voiceUsers);
      setLoading(false);
    } catch (error) {
      console.error('[useMockVoiceRoom] Error:', error);
      setLoading(false);
    }
  }, [cycleId]);

  // Initial fetch
  useEffect(() => {
    fetchMockParticipants();
  }, [fetchMockParticipants]);

  // Simulate voice activity when live
  useEffect(() => {
    if (!isLive || voiceParticipants.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Randomly toggle speaking states for realistic voice room feel
    intervalRef.current = setInterval(() => {
      setVoiceParticipants(prev => {
        const available = prev.filter(p => !p.is_muted);
        if (available.length === 0) return prev;

        // 3-8 people speaking at once for active voice room
        const numSpeaking = 3 + Math.floor(Math.random() * 6);
        const speakerIds = new Set<string>();

        for (let i = 0; i < numSpeaking; i++) {
          const speaker = available[Math.floor(Math.random() * available.length)];
          if (speaker) speakerIds.add(speaker.user_id);
        }

        return prev.map(p => ({
          ...p,
          is_speaking: speakerIds.has(p.user_id),
        }));
      });
    }, 500 + Math.random() * 700); // 0.5-1.2 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLive, voiceParticipants.length]);

  return {
    voiceParticipants,
    loading,
    refetch: fetchMockParticipants,
  };
};
