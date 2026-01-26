/**
 * PDF Converter Types
 */

export interface PdfPage {
  pageNumber: number;
  base64: string;
  width: number;
  height: number;
}

export interface PdfConversionResult {
  pages: PdfPage[];
  totalPages: number;
}

export interface PdfConversionOptions {
  maxPages?: number;      // Maximum pages to convert (default: 10)
  scale?: number;         // Render scale (default: 1.5)
  quality?: number;       // JPEG quality 0-1 (default: 0.8)
}
