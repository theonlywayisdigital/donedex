/**
 * DOCX Converter - Native Implementation
 *
 * Note: DOCX rendering on native requires additional libraries.
 * For now, we provide a fallback that prompts users to convert to PDF.
 */

import type { DocxConversionResult, DocxConversionOptions } from './types';

/**
 * Convert DOCX file to array of page images
 * On native, this is not supported - throws an error with guidance
 */
export async function convertDocxToImages(
  _uri: string,
  _options: DocxConversionOptions = {}
): Promise<DocxConversionResult> {
  throw new Error(
    'Word document conversion is not yet supported on mobile devices. ' +
    'Please convert to PDF first, or use the web app to upload Word documents.'
  );
}

/**
 * Check if DOCX conversion is supported on this platform
 */
export function isDocxConversionSupported(): boolean {
  return false;
}
