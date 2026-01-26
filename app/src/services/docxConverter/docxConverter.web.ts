/**
 * DOCX Converter - Web Implementation
 * Uses docx-preview to render DOCX and html2canvas to capture as images
 */

import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import type { DocxConversionResult, DocxConversionOptions, DocxPage } from './types';

/**
 * Convert DOCX file to array of page images
 * @param uri - URI or blob URL of the DOCX file
 * @param options - Conversion options
 */
export async function convertDocxToImages(
  uri: string,
  options: DocxConversionOptions = {}
): Promise<DocxConversionResult> {
  const { maxPages = 10, scale = 1.5, quality = 0.8 } = options;

  try {
    // Fetch the DOCX data
    let docxData: ArrayBuffer;

    if (uri.startsWith('blob:') || uri.startsWith('http')) {
      const response = await fetch(uri);
      docxData = await response.arrayBuffer();
    } else if (uri.startsWith('data:')) {
      // Handle data URL
      const base64 = uri.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      docxData = bytes.buffer;
    } else {
      throw new Error('Unsupported DOCX URI format');
    }

    // Create a hidden container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '816px'; // ~8.5 inches at 96 DPI (letter size)
    container.style.backgroundColor = '#ffffff';
    container.style.padding = '20px';
    document.body.appendChild(container);

    try {
      // Render the DOCX to HTML
      await renderAsync(docxData, container, undefined, {
        className: 'docx',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        useBase64URL: true,
      });

      // Wait for content and images to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pages: DocxPage[] = [];

      // Try multiple selectors to find the content
      // docx-preview can create different structures
      let contentElement: HTMLElement | null = null;

      // Try various selectors
      const selectors = [
        '.docx-wrapper',
        '.docx',
        'article',
        'section',
      ];

      for (const selector of selectors) {
        contentElement = container.querySelector(selector) as HTMLElement;
        if (contentElement) break;
      }

      // If no specific element found, use the container itself
      if (!contentElement) {
        contentElement = container;
      }

      // Check if container has any content
      if (container.innerHTML.trim().length < 50) {
        throw new Error('Document appears to be empty or failed to render');
      }

      // Look for page sections within the content
      const pageSections = contentElement.querySelectorAll('section.docx, article.docx, .docx-wrapper > section') as NodeListOf<HTMLElement>;

      if (pageSections.length > 0) {
        // Capture each section as a page
        const pagesToCapture = Math.min(pageSections.length, maxPages);

        for (let i = 0; i < pagesToCapture; i++) {
          const section = pageSections[i];
          section.style.display = 'block';

          const canvas = await html2canvas(section, {
            scale: scale,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
            allowTaint: true,
          });

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const base64 = dataUrl.split(',')[1];

          pages.push({
            pageNumber: i + 1,
            base64,
            width: canvas.width,
            height: canvas.height,
          });
        }
      } else {
        // Capture the whole content as one page
        const canvas = await html2canvas(contentElement, {
          scale: scale,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true,
          allowTaint: true,
        });

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];

        pages.push({
          pageNumber: 1,
          base64,
          width: canvas.width,
          height: canvas.height,
        });
      }

      if (pages.length === 0) {
        throw new Error('No content could be captured from document');
      }

      return {
        pages,
        totalPages: pages.length,
      };
    } finally {
      // Clean up
      document.body.removeChild(container);
    }
  } catch (error) {
    console.error('DOCX conversion error:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to convert DOCX: ${error.message}`
        : 'Failed to convert DOCX'
    );
  }
}

/**
 * Check if DOCX conversion is supported on this platform
 */
export function isDocxConversionSupported(): boolean {
  return typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined';
}
