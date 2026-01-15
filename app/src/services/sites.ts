/**
 * @deprecated This file is deprecated. Use records.ts instead.
 * Sites have been renamed to Records in the database.
 */

import {
  fetchRecords,
  fetchRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  fetchRecordTemplates,
} from './records';
import type { Record as RecordModel, Template } from '../types';

// Re-export functions with legacy names
export const fetchSites = fetchRecords;
export const fetchSiteById = fetchRecordById;
export const createSite = createRecord;
export const updateSite = updateRecord;
export const deleteSite = deleteRecord;
export const fetchSiteTemplates = fetchRecordTemplates;

// Re-export types
export type Site = RecordModel;
export type SiteTemplate = Template;
export type SitesResult = { data: Site[]; error: { message: string } | null };
export type SiteResult = { data: Site | null; error: { message: string } | null };
export type SiteTemplatesResult = { data: Template[]; error: { message: string } | null };
