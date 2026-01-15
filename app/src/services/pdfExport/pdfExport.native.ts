/**
 * PDF Export - Native Implementation
 * Uses expo-print and expo-sharing for iOS/Android
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateHtml } from './htmlGenerator';
import type { ExportOptions, ExportResult } from './types';

/**
 * Generate and share a PDF report
 */
export async function exportReportToPdf(options: ExportOptions): Promise<ExportResult> {
  try {
    const html = generateHtml(options);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Sharing is not available on this device' };
    }

    // Share the PDF
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Inspection Report',
      UTI: 'com.adobe.pdf',
    });

    return { success: true };
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export PDF',
    };
  }
}

/**
 * Print a report directly
 */
export async function printReport(options: ExportOptions): Promise<ExportResult> {
  try {
    const html = generateHtml(options);

    await Print.printAsync({
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Error printing report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to print report',
    };
  }
}
