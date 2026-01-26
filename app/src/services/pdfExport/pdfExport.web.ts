/**
 * PDF Export - Web Implementation
 * Uses browser's native print functionality and Blob API
 */

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
async function preloadImages(options: ExportOptions): Promise<ImageDataMap> {
  const imageUrls = collectImageUrls(options);
  const imageDataMap: ImageDataMap = new Map();

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
    }
  }

  return imageDataMap;
}

/**
 * Generate and download a PDF report on web
 * Uses the browser's print-to-PDF functionality via a hidden iframe
 */
export async function exportReportToPdf(options: ExportOptions): Promise<ExportResult> {
  try {
    // Pre-load all images as base64 for reliable PDF embedding
    const imageDataMap = await preloadImages(options);

    const html = generateHtml({ ...options, imageDataMap });

    // Create a Blob with the HTML content
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Create an iframe to trigger print dialog
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    document.body.appendChild(iframe);

    // Write the HTML content to the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      URL.revokeObjectURL(url);
      document.body.removeChild(iframe);
      return { success: false, error: 'Could not create print document' };
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for content to load
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      // Fallback in case onload doesn't fire
      setTimeout(resolve, 500);
    });

    // Trigger print dialog - user can "Save as PDF" from here
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (printError) {
      console.warn('Print dialog failed, falling back to new window:', printError);
      // Fallback: open in new window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }

    // Clean up after a delay to allow print dialog to open
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);

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
 * Print a report directly on web
 * Opens the browser's print dialog
 */
export async function printReport(options: ExportOptions): Promise<ExportResult> {
  // On web, exportReportToPdf and printReport have the same behavior
  // Both open the browser's print dialog, which allows saving as PDF
  return exportReportToPdf(options);
}

/**
 * Alternative: Download as HTML file
 * Provides a simpler fallback if print-to-PDF doesn't work
 */
export async function downloadAsHtml(options: ExportOptions): Promise<ExportResult> {
  try {
    // Pre-load all images as base64 for reliable embedding
    const imageDataMap = await preloadImages(options);

    const html = generateHtml({ ...options, imageDataMap });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `inspection-report-${options.report.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);

    return { success: true };
  } catch (error) {
    console.error('Error downloading HTML:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download report',
    };
  }
}
