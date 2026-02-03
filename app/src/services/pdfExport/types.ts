/**
 * PDF Export Types
 */

import { ReportWithDetails, ReportResponse } from '../reports';
import { TemplateWithSections } from '../templates';
import { BrandingContext } from '../../types/branding';

export interface ExportOptions {
  report: ReportWithDetails;
  template: TemplateWithSections;
  responses: Map<string, ReportResponse>;
  branding?: BrandingContext;
}

export interface ExportResult {
  success: boolean;
  error?: string;
  warning?: string;
}

export interface ResponseDisplay {
  text: string;
  color: string;
  isSignature?: boolean;
  signatureUrl?: string;
  photoUrls?: string[];
}

/**
 * Map of image URLs to base64 data URIs
 * Used for embedding images directly in PDF HTML
 */
export type ImageDataMap = Map<string, string>;

/**
 * Extended export options with pre-loaded image data
 */
export interface ExportOptionsWithImages extends ExportOptions {
  imageDataMap?: ImageDataMap;
}
