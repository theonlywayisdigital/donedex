/**
 * AsyncPhotoImage
 * A component that loads photo URLs asynchronously from Firebase Storage
 */

import React, { useState, useEffect } from 'react';
import { Image, StyleProp, ImageStyle, ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { getPhotoUrl } from '../services/reports';
import { colors } from '../constants/theme';

interface AsyncPhotoImageProps {
  /** Storage path or URL */
  storagePath: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onPress?: () => void;
  onError?: (error: string) => void;
}

export function AsyncPhotoImage({
  storagePath,
  style,
  resizeMode = 'cover',
  onPress,
  onError,
}: AsyncPhotoImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadUrl = async () => {
      // If it's already a data URL or blob URL, use it directly
      if (storagePath.startsWith('data:') || storagePath.startsWith('blob:') || storagePath.startsWith('http')) {
        if (isMounted) {
          setImageUrl(storagePath);
          setLoading(false);
        }
        return;
      }

      try {
        const url = await getPhotoUrl(storagePath);
        if (isMounted && url) {
          setImageUrl(url);
        }
      } catch (err) {
        console.error('Error loading photo URL:', err);
        onError?.(err instanceof Error ? err.message : 'Failed to load image');
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    loadUrl();

    return () => {
      isMounted = false;
    };
  }, [storagePath, onError]);

  if (loading) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (!imageUrl) {
    return null;
  }

  const ImageComponent = (
    <Image
      source={{ uri: imageUrl }}
      style={style}
      resizeMode={resizeMode}
      onError={(e) => {
        console.error(`Image load error for ${imageUrl}:`, e.nativeEvent.error);
        onError?.(e.nativeEvent.error);
      }}
    />
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {ImageComponent}
      </TouchableOpacity>
    );
  }

  return ImageComponent;
}

export default AsyncPhotoImage;
