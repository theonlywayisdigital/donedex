/**
 * Cross-Platform Signature Canvas Component
 *
 * Provides signature capture functionality that works on both web and native platforms:
 * - Web: Uses HTML5 Canvas API with mouse/touch events
 * - Native (iOS/Android): Uses react-native-signature-canvas (WebView-based)
 */

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

// Only import native signature canvas on native platforms
let SignatureScreen: React.ComponentType<any> | null = null;
let SignatureViewRef: any = null;

if (Platform.OS !== 'web') {
  const nativeSignature = require('react-native-signature-canvas');
  SignatureScreen = nativeSignature.default;
  SignatureViewRef = nativeSignature.SignatureViewRef;
}

export interface SignatureCanvasRef {
  clearSignature: () => void;
  readSignature: () => void;
  isEmpty: () => boolean;
}

interface SignatureCanvasProps {
  onOK: (base64: string) => void;
  onEmpty?: () => void;
  onBegin?: () => void;
  onEnd?: () => void;
  backgroundColor?: string;
  penColor?: string;
  minWidth?: number;
  maxWidth?: number;
  style?: any;
}

// ============================================
// WEB IMPLEMENTATION - HTML5 Canvas
// ============================================
const WebSignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
  ({ onOK, onEmpty, onBegin, onEnd, backgroundColor = '#FFFFFF', penColor = '#1A1A1A', minWidth = 1, maxWidth = 3, style }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawingRef = useRef(false);
    const [hasSignature, setHasSignature] = useState(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Set canvas size to match container
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.scale(window.devicePixelRatio, window.devicePixelRatio);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = penColor;
      context.lineWidth = (minWidth + maxWidth) / 2;
      contextRef.current = context;

      // Fill background
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, rect.width, rect.height);
    }, [backgroundColor, penColor, minWidth, maxWidth]);

    const getCoordinates = (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }

      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top,
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      const coords = getCoordinates(e);
      if (!coords || !contextRef.current) return;

      isDrawingRef.current = true;
      lastPointRef.current = coords;
      setHasSignature(true);
      onBegin?.();

      contextRef.current.beginPath();
      contextRef.current.moveTo(coords.x, coords.y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current || !contextRef.current) return;

      const coords = getCoordinates(e);
      if (!coords) return;

      contextRef.current.lineTo(coords.x, coords.y);
      contextRef.current.stroke();
      lastPointRef.current = coords;
    };

    const stopDrawing = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        lastPointRef.current = null;
        onEnd?.();
      }
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Mouse events
      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseleave', stopDrawing);

      // Touch events
      canvas.addEventListener('touchstart', startDrawing, { passive: true });
      canvas.addEventListener('touchmove', draw, { passive: true });
      canvas.addEventListener('touchend', stopDrawing);
      canvas.addEventListener('touchcancel', stopDrawing);

      return () => {
        canvas.removeEventListener('mousedown', startDrawing);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', stopDrawing);
        canvas.removeEventListener('mouseleave', stopDrawing);
        canvas.removeEventListener('touchstart', startDrawing);
        canvas.removeEventListener('touchmove', draw);
        canvas.removeEventListener('touchend', stopDrawing);
        canvas.removeEventListener('touchcancel', stopDrawing);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      clearSignature: () => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (!canvas || !context) return;

        const rect = canvas.getBoundingClientRect();
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, rect.width, rect.height);
        setHasSignature(false);
      },
      readSignature: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (!hasSignature) {
          onEmpty?.();
          return;
        }

        const base64 = canvas.toDataURL('image/png');
        onOK(base64);
      },
      isEmpty: () => !hasSignature,
    }));

    return (
      <View style={[webStyles.container, style]}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            touchAction: 'none',
            cursor: 'crosshair',
          }}
        />
        <View style={webStyles.signLine}>
          <Text style={webStyles.signText}>Sign above</Text>
        </View>
      </View>
    );
  }
);

WebSignatureCanvas.displayName = 'WebSignatureCanvas';

const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  signLine: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing.xs,
    alignItems: 'center',
  },
  signText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});

// ============================================
// NATIVE IMPLEMENTATION - react-native-signature-canvas
// ============================================
const NativeSignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
  ({ onOK, onEmpty, onBegin, onEnd, backgroundColor = '#FFFFFF', penColor = '#1A1A1A', style }, ref) => {
    const signatureRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      clearSignature: () => {
        signatureRef.current?.clearSignature();
      },
      readSignature: () => {
        signatureRef.current?.readSignature();
      },
      isEmpty: () => false, // Native doesn't expose this easily
    }));

    if (!SignatureScreen) {
      return (
        <View style={[nativeStyles.fallback, style]}>
          <Text>Signature not available</Text>
        </View>
      );
    }

    return (
      <SignatureScreen
        ref={signatureRef}
        onOK={onOK}
        onEmpty={onEmpty}
        onBegin={onBegin}
        onEnd={onEnd}
        descriptionText=""
        clearText="Clear"
        confirmText="Save"
        webStyle={`
          .m-signature-pad--footer { display: none; }
          .m-signature-pad { box-shadow: none; border: none; }
          .m-signature-pad--body { border: none; }
        `}
        backgroundColor={backgroundColor}
        penColor={penColor}
        style={[nativeStyles.canvas, style]}
      />
    );
  }
);

NativeSignatureCanvas.displayName = 'NativeSignatureCanvas';

const nativeStyles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
});

// ============================================
// EXPORTED COMPONENT - Platform-specific
// ============================================
export const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
  (props, ref) => {
    if (Platform.OS === 'web') {
      return <WebSignatureCanvas ref={ref} {...props} />;
    }
    return <NativeSignatureCanvas ref={ref} {...props} />;
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;
