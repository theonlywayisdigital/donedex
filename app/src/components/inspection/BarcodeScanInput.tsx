/**
 * BarcodeScanInput Component
 * Barcode/QR code scanner for inspection fields
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon } from '../ui';

interface BarcodeScanInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function BarcodeScanInput({ value, onChange }: BarcodeScanInputProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        return;
      }
    }
    setScanned(false);
    setShowScanner(true);
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    onChange(result.data);
    setShowScanner(false);
  };

  const handleClear = () => {
    onChange(null);
  };

  // No value - show scan button
  if (!value) {
    return (
      <>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleOpenScanner}
          activeOpacity={0.7}
        >
          <Icon name="scan" size={20} color={colors.primary.DEFAULT} />
          <Text style={styles.scanButtonText}>Scan Barcode / QR</Text>
        </TouchableOpacity>

        <Modal
          visible={showScanner}
          animationType="slide"
          onRequestClose={() => setShowScanner(false)}
        >
          <View style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code39',
                  'code93',
                  'code128',
                  'codabar',
                  'itf14',
                  'pdf417',
                  'aztec',
                  'datamatrix',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            >
              <View style={styles.overlay}>
                <View style={styles.overlayTop} />
                <View style={styles.overlayMiddle}>
                  <View style={styles.overlaySide} />
                  <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                  </View>
                  <View style={styles.overlaySide} />
                </View>
                <View style={styles.overlayBottom}>
                  <Text style={styles.instructionText}>
                    Position barcode within the frame
                  </Text>
                </View>
              </View>
            </CameraView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowScanner(false)}
            >
              <Icon name="x" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </Modal>
      </>
    );
  }

  // Value captured - show result
  return (
    <View style={styles.resultContainer}>
      <View style={styles.resultIcon}>
        <Icon name="check-circle" size={18} color={colors.success} />
      </View>

      <View style={styles.resultContent}>
        <Text style={styles.resultLabel}>Scanned value:</Text>
        <Text style={styles.resultValue} numberOfLines={2}>
          {value}
        </Text>
      </View>

      <View style={styles.resultActions}>
        <TouchableOpacity
          style={styles.rescanButton}
          onPress={handleOpenScanner}
          activeOpacity={0.7}
        >
          <Icon name="refresh-cw" size={16} color={colors.primary.DEFAULT} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          activeOpacity={0.7}
        >
          <Icon name="trash-2" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const FRAME_SIZE = SCREEN_WIDTH * 0.7;

const styles = StyleSheet.create({
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  scanButtonText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },

  // Scanner modal
  scannerContainer: {
    flex: 1,
    backgroundColor: colors.black,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.white,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  instructionText: {
    color: colors.white,
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Result display
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  resultValue: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    fontWeight: fontWeight.medium,
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rescanButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.danger + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BarcodeScanInput;
