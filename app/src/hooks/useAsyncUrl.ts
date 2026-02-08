/**
 * Hook for loading async storage URLs
 * Used for signature and photo URLs from Firebase Storage
 */

import { useState, useEffect } from 'react';
import { getSignatureUrl, getPhotoUrl } from '../services/reports';

/**
 * Hook to load a signature URL asynchronously
 */
export function useSignatureUrl(storagePath: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) {
      setUrl(null);
      return;
    }

    // If it's already a data URL or blob URL, use it directly
    if (storagePath.startsWith('data:') || storagePath.startsWith('blob:')) {
      setUrl(storagePath);
      return;
    }

    let isMounted = true;

    getSignatureUrl(storagePath).then((resolvedUrl) => {
      if (isMounted && resolvedUrl) {
        setUrl(resolvedUrl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [storagePath]);

  return url;
}

/**
 * Hook to load a photo URL asynchronously
 */
export function usePhotoUrl(storagePath: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) {
      setUrl(null);
      return;
    }

    // If it's already a data URL or blob URL, use it directly
    if (storagePath.startsWith('data:') || storagePath.startsWith('blob:')) {
      setUrl(storagePath);
      return;
    }

    let isMounted = true;

    getPhotoUrl(storagePath).then((resolvedUrl) => {
      if (isMounted && resolvedUrl) {
        setUrl(resolvedUrl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [storagePath]);

  return url;
}

/**
 * Component wrapper to render an async signature image
 * Use this when you can't easily use hooks (e.g., inside map)
 */
export function useAsyncSignaturePath(
  value: string | null,
  itemType: string
): string | null {
  const [signaturePath, setSignaturePath] = useState<string | null>(null);

  useEffect(() => {
    if (itemType !== 'signature' || !value) {
      setSignaturePath(null);
      return;
    }

    // Check if it's already a data URL
    if (value.startsWith('data:')) {
      setSignaturePath(value);
      return;
    }

    // Try parsing as JSON with path
    try {
      const parsed = JSON.parse(value);
      if (parsed.path) {
        setSignaturePath(parsed.path);
      }
    } catch {
      // Not JSON, might be direct storage path
      if (!value.startsWith('blob:')) {
        setSignaturePath(value);
      }
    }
  }, [value, itemType]);

  return useSignatureUrl(signaturePath);
}
