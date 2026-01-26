/**
 * PDF Converter - Web Implementation
 * Uses pdf.js to render PDF pages to canvas and extract as images
 */

import * as pdfjsLib from 'pdfjs-dist';
import type { PdfConversionResult, PdfConversionOptions, PdfPage } from './types';

// Set the worker source for pdf.js
// Using CDN for simplicity - in production, could bundle the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Convert PDF file to array of page images
 * @param uri - URI or blob URL of the PDF file
 * @param options - Conversion options
 */
export async function convertPdfToImages(
  uri: string,
  options: PdfConversionOptions = {}
): Promise<PdfConversionResult> {
  const { maxPages = 10, scale = 1.5, quality = 0.8 } = options;

  try {
    // Fetch the PDF data
    let pdfData: ArrayBuffer;

    if (uri.startsWith('blob:') || uri.startsWith('http')) {
      const response = await fetch(uri);
      pdfData = await response.arrayBuffer();
    } else if (uri.startsWith('data:')) {
      // Handle data URL
      const base64 = uri.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      pdfData = bytes.buffer;
    } else {
      throw new Error('Unsupported PDF URI format');
    }

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    const totalPages = pdf.numPages;
    const pagesToConvert = Math.min(totalPages, maxPages);
    const pages: PdfPage[] = [];

    // Convert each page to an image
    for (let pageNum = 1; pageNum <= pagesToConvert; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render the page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Convert canvas to base64 JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];

      pages.push({
        pageNumber: pageNum,
        base64,
        width: viewport.width,
        height: viewport.height,
      });
    }

    return {
      pages,
      totalPages,
    };
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to convert PDF: ${error.message}`
        : 'Failed to convert PDF'
    );
  }
}

/**
 * Check if PDF conversion is supported on this platform
 */
export function isPdfConversionSupported(): boolean {
  return typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined';
}
