import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Determines if a URL is a YouTube URL or embed
 */
export const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

/**
 * Determines if a URL is already a full URL (not a storage path)
 */
export const isFullUrl = (url: string): boolean => {
  return url.startsWith('http://') || url.startsWith('https://');
};

/**
 * Hook to generate a signed URL for a private storage file
 * Returns the original URL if it's already a full URL (YouTube, external, etc.)
 */
export function useSignedUrl(
  bucket: string, 
  path: string | null | undefined, 
  expiresIn: number = 3600 // 1 hour default
) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function getSignedUrl() {
      if (!path) {
        setSignedUrl(null);
        return;
      }

      // If it's already a full URL (YouTube, external link, etc.), return as-is
      if (isFullUrl(path)) {
        setSignedUrl(path);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);

        if (signError) {
          throw signError;
        }

        setSignedUrl(data?.signedUrl || null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get signed URL'));
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    }

    getSignedUrl();
  }, [bucket, path, expiresIn]);

  return { signedUrl, loading, error };
}

/**
 * Utility function to get a signed URL for a storage file
 * Returns the original URL if it's already a full URL
 */
export async function getSignedUrl(
  bucket: string, 
  path: string | null | undefined,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!path) return null;
  
  // If it's already a full URL, return as-is
  if (isFullUrl(path)) {
    return path;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data?.signedUrl || null;
}
