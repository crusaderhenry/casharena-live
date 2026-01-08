import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';

const WELCOME_KEY = 'crusader_welcome_shown';

interface UseCrusaderWelcomeOptions {
  username: string | null | undefined;
  userId: string | null | undefined;
}

export const useCrusaderWelcome = ({ username, userId }: UseCrusaderWelcomeOptions) => {
  const { settings } = useAudio();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // Only run if we have a user and haven't triggered yet
    if (!userId || !username || hasTriggeredRef.current) return;
    
    // Check if we've already welcomed this user
    const welcomeKey = `${WELCOME_KEY}_${userId}`;
    const hasWelcomed = localStorage.getItem(welcomeKey);
    
    if (hasWelcomed) return;
    
    // Mark as triggered to prevent double calls
    hasTriggeredRef.current = true;

    const playWelcome = async () => {
      // Skip if host is muted
      if (settings.hostMuted) {
        localStorage.setItem(welcomeKey, 'true');
        return;
      }

      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        
        if (!token) {
          console.warn('[CrusaderWelcome] No auth token');
          return;
        }

        // Generate the welcome message
        const welcomeText = `Hello ${username}! My name is Crusader Henry, welcome to FortunesHQ! Feel free to Play, Win and Celebrate. See you in the live shows arena!`;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crusader-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              text: welcomeText,
              // Use Crusader's voice
              voiceId: 'JBFqnCBsd6RMkjVDRZzb' // George voice as default Crusader
            }),
          }
        );

        if (!response.ok) {
          console.warn('[CrusaderWelcome] TTS request failed:', response.status);
          localStorage.setItem(welcomeKey, 'true');
          return;
        }

        const data = await response.json();
        if (data.audioContent) {
          const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onended = () => {
            audioRef.current = null;
          };

          audio.onerror = () => {
            audioRef.current = null;
          };

          // Small delay to let the user settle on the home page
          setTimeout(async () => {
            try {
              await audio.play();
            } catch (e) {
              console.warn('[CrusaderWelcome] Playback failed:', e);
            }
          }, 1500);
        }

        // Mark as welcomed
        localStorage.setItem(welcomeKey, 'true');
      } catch (error) {
        console.error('[CrusaderWelcome] Error:', error);
        // Still mark as welcomed to prevent infinite retries
        localStorage.setItem(welcomeKey, 'true');
      }
    };

    // Small delay to ensure page is loaded
    const timer = setTimeout(playWelcome, 2000);
    
    return () => clearTimeout(timer);
  }, [userId, username, settings.hostMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
};
