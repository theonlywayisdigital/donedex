/**
 * PDF Converter - Platform Resolver
 * Metro bundler will use .native.ts or .web.ts based on platform
 */

export { convertPdfToImages, isPdfConversionSupported } from './pdfConverter.web';
