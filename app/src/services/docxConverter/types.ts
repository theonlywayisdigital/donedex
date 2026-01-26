/**
 * DOCX Converter Types
 */

export interface DocxPage {
  pageNumber: number;
  base64: string;
  width: number;
  height: number;
}

export interface DocxConversionResult {
  pages: DocxPage[];
  totalPages: number;
}

export interface DocxConversionOptions {
  maxPages?: number;      // Maximum pages to convert (default: 10)
  scale?: number;         // Render scale (default: 1.5)
  quality?: number;       // JPEG quality 0-1 (default: 0.8)
}
