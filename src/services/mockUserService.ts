import { supabase } from '@/integrations/supabase/client';

interface MockUserTriggerResult {
  success: boolean;
  joined?: number;
  commented?: boolean;
  error?: string;
}

/**
 * Trigger mock users to potentially join a game
 * Called when a real user joins or when game needs activity
 */
export const triggerMockUserJoins = async (gameId: string): Promise<MockUserTriggerResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('mock-user-service', {
      body: { action: 'trigger_joins', gameId },
    });

    if (error) {
      console.error('Mock user join trigger error:', error);
      return { success: false, error: error.message };
    }

    return data as MockUserTriggerResult;
  } catch (error: any) {
    console.error('Mock user join trigger failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Trigger a mock user to potentially comment
 * Called periodically during live games
 */
export const triggerMockUserComment = async (gameId: string): Promise<MockUserTriggerResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('mock-user-service', {
      body: { action: 'trigger_comment', gameId },
    });

    if (error) {
      console.error('Mock user comment trigger error:', error);
      return { success: false, error: error.message };
    }

    return data as MockUserTriggerResult;
  } catch (error: any) {
    console.error('Mock user comment trigger failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get mock participants for a game (for display purposes)
 */
export const getMockParticipants = async (gameId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('mock-user-service', {
      body: { action: 'get_mock_participants', gameId },
    });

    if (error) {
      console.error('Get mock participants error:', error);
      return [];
    }

    return data?.participants || [];
  } catch (error: any) {
    console.error('Get mock participants failed:', error);
    return [];
  }
};
