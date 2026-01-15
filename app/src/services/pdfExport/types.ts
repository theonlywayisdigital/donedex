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
}

export interface ResponseDisplay {
  text: string;
  color: string;
  isSignature?: boolean;
  signatureUrl?: string;
  photoUrls?: string[];
  videoUrls?: string[];
}
