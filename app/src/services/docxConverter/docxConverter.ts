/**
 * DOCX Converter - Platform Resolver
 * Metro bundler will use .native.ts or .web.ts based on platform
 */

export { convertDocxToImages, isDocxConversionSupported } from './docxConverter.web';
