import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GameOGData {
  type: 'game';
  game_id: string;
}

interface WinnerOGData {
  type: 'winner';
  game_id?: string;
  user_id: string;
  position: number;
  amount: number;
  username: string;
  avatar: string;
}

interface BadgeOGData {
  type: 'badge';
  badge_id: string;
  badge_name: string;
  badge_description: string;
  user_id?: string;
  username?: string;
}

type OGImageData = GameOGData | WinnerOGData | BadgeOGData;

export const useOGImage = () => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateOGImage = useCallback(async (data: OGImageData): Promise<string | null> => {
    setGenerating(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('og-image', {
        body: data,
      });

      if (fnError) {
        console.error('[useOGImage] Function error:', fnError);
        setError(fnError.message);
        return null;
      }

      if (result?.success && result?.url) {
        return result.url;
      }

      setError(result?.error || 'Failed to generate image');
      return null;
    } catch (err) {
      console.error('[useOGImage] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  // Generate share URL with OG image metadata
  const getShareUrl = useCallback((baseUrl: string, ogImageUrl?: string) => {
    if (!ogImageUrl) return baseUrl;
    // Append OG image as query param for social crawlers
    const url = new URL(baseUrl);
    url.searchParams.set('og_image', ogImageUrl);
    return url.toString();
  }, []);

  return {
    generateOGImage,
    getShareUrl,
    generating,
    error,
  };
};
