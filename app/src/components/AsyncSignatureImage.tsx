/**
 * AsyncSignatureImage
 * A component that loads signature URLs asynchronously from Firebase Storage
 */

import React, { useState, useEffect } from 'react';
import { Image, StyleProp, ImageStyle, ActivityIndicator, View } from 'react-native';
import { getSignatureUrl } from '../services/reports';
import { colors } from '../constants/theme';

interface AsyncSignatureImageProps {
  /** Raw value from response (could be base64, JSON with path, or storage path) */
  value: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

/**
 * Parse a signature value to extract the storage path
 */
function parseSignaturePath(value: string): { path: string | null; signerName?: string } {
  // If it's already a data URL, no path needed
  if (value.startsWith('data:')) {
    return { path: null };
  }

  // Try parsing as JSON with path
  try {
    const parsed = JSON.parse(value);
    if (parsed.path) {
      return { path: parsed.path, signerName: parsed.signerName };
    }
    return { path: null };
  } catch {
    // Not JSON, treat as direct storage path
    if (!value.startsWith('blob:')) {
      return { path: value };
    }
    return { path: null };
  }
}

export function AsyncSignatureImage({
  value,
  style,
  resizeMode = 'contain',
}: AsyncSignatureImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadUrl = async () => {
      // If it's already a data URL, use it directly
      if (value.startsWith('data:') || value.startsWith('blob:')) {
        if (isMounted) {
          setImageUrl(value);
          setLoading(false);
        }
        return;
      }

      const { path } = parseSignaturePath(value);
      if (path) {
        try {
          const url = await getSignatureUrl(path);
          if (isMounted && url) {
            setImageUrl(url);
          }
        } catch (err) {
          console.error('Error loading signature URL:', err);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    loadUrl();

    return () => {
      isMounted = false;
    };
  }, [value]);

  if (loading) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={style}
      resizeMode={resizeMode}
    />
  );
}

export default AsyncSignatureImage;
