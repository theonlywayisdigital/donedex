/**
 * PDF Export - Platform-specific implementation
 * Uses expo-print/expo-sharing on native, browser print dialog on web
 */

import { Platform } from 'react-native';

// Re-export types
export type { ExportOptions, ExportResult } from './types';

// Platform-specific exports
import { exportReportToPdf as exportNative, printReport as printNative } from './pdfExport.native';
import { exportReportToPdf as exportWeb, printReport as printWeb, downloadAsHtml } from './pdfExport.web';

export const exportReportToPdf = Platform.OS === 'web' ? exportWeb : exportNative;
export const printReport = Platform.OS === 'web' ? printWeb : printNative;

// Web-only export for HTML download fallback
export { downloadAsHtml } from './pdfExport.web';
