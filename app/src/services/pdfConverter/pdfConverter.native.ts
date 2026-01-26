/**
 * PDF Converter - Native Implementation
 *
 * Note: Full PDF rendering on native requires additional libraries like
 * react-native-pdf or react-native-pdf-lib. For now, we provide a
 * fallback that prompts users to take photos of their PDF pages.
 *
 * Future enhancement: Add react-native-pdf-lib for native PDF rendering.
 */

import type { PdfConversionResult, PdfConversionOptions } from './types';

/**
 * Convert PDF file to array of page images
 * On native, this is not fully supported - throws an error with guidance
 */
export async function convertPdfToImages(
  _uri: string,
  _options: PdfConversionOptions = {}
): Promise<PdfConversionResult> {
  throw new Error(
    'PDF conversion is not yet supported on mobile devices. ' +
    'Please take photos of each page of your document, or use the web app to upload PDFs.'
  );
}

/**
 * Check if PDF conversion is supported on this platform
 */
export function isPdfConversionSupported(): boolean {
  return false;
}
