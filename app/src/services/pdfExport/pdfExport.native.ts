/**
 * PDF Export - Native Implementation
 * Uses expo-print and expo-sharing for iOS/Android
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateHtml, collectImageUrls } from './htmlGenerator';
import type { ExportOptions, ExportResult, ImageDataMap } from './types';

/**
 * Convert an image URL to base64 data URI
 */
async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${url}`);
      return null;
    }
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        console.warn(`Failed to convert image to base64: ${url}`);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Error converting image to base64: ${url}`, error);
    return null;
  }
}

/**
 * Pre-load all images as base64 data URIs
 */
async function preloadImages(options: ExportOptions): Promise<{ imageDataMap: ImageDataMap; failedCount: number }> {
  const imageUrls = collectImageUrls(options);
  const imageDataMap: ImageDataMap = new Map();
  let failedCount = 0;

  // Fetch all images in parallel
  const results = await Promise.all(
    imageUrls.map(async (url) => {
      const base64 = await imageUrlToBase64(url);
      return { url, base64 };
    })
  );

  // Build the map
  for (const { url, base64 } of results) {
    if (base64) {
      imageDataMap.set(url, base64);
    } else {
      failedCount++;
    }
  }

  return { imageDataMap, failedCount };
}

/**
 * Generate and share a PDF report
 */
export async function exportReportToPdf(options: ExportOptions): Promise<ExportResult> {
  try {
    // Pre-load all images as base64 for reliable PDF embedding
    const { imageDataMap, failedCount } = await preloadImages(options);

    const html = generateHtml({ ...options, imageDataMap });

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

    return {
      success: true,
      warning: failedCount > 0 ? `${failedCount} image(s) could not be loaded and may be missing from the PDF.` : undefined,
    };
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
    // Pre-load all images as base64 for reliable printing
    const { imageDataMap, failedCount } = await preloadImages(options);

    const html = generateHtml({ ...options, imageDataMap });

    await Print.printAsync({
      html,
    });

    return {
      success: true,
      warning: failedCount > 0 ? `${failedCount} image(s) could not be loaded and may be missing from the print.` : undefined,
    };
  } catch (error) {
    console.error('Error printing report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to print report',
    };
  }
}
