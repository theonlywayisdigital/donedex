/**
 * PDF Export - Web Implementation
 * Uses browser's native print functionality and Blob API
 */

import { generateHtml } from './htmlGenerator';
import type { ExportOptions, ExportResult } from './types';

/**
 * Generate and download a PDF report on web
 * Uses the browser's print-to-PDF functionality via a hidden iframe
 */
export async function exportReportToPdf(options: ExportOptions): Promise<ExportResult> {
  try {
    const html = generateHtml(options);

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
    const html = generateHtml(options);
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
