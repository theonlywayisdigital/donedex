import { supabase } from './supabase';
import { compressImageToBase64 } from './imageCompression';
import { Platform } from 'react-native';
import { decode as base64Decode } from 'base-64';

// Types matching database schema
export interface Report {
  id: string;
  organisation_id: string;
  record_id: string;
  template_id: string;
  user_id: string;
  status: 'draft' | 'submitted';
  started_at: string;
  submitted_at: string | null;
  created_at: string;
}

// Legacy alias
/** @deprecated Use record_id instead of site_id */
export type ReportWithSiteId = Report & { site_id?: string };

export interface ReportResponse {
  id: string;
  report_id: string;
  template_item_id: string;
  item_label: string;
  item_type: string;
  response_value: string | null;
  severity: 'low' | 'medium' | 'high' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportPhoto {
  id: string;
  report_response_id: string;
  storage_path: string;
  created_at: string;
}

export interface ReportWithDetails extends Report {
  record: { name: string };
  template: { name: string };
  user_profile: { full_name: string } | null;
}

// Legacy alias
/** @deprecated Use ReportWithDetails with record instead */
export interface ReportWithSiteDetails extends Report {
  site: { name: string };
  template: { name: string };
  user_profile: { full_name: string } | null;
}

export interface CreateReportInput {
  organisation_id: string;
  record_id: string;
  template_id: string;
  user_id: string;
}

// Legacy alias
/** @deprecated Use record_id instead of site_id */
export interface CreateReportInputLegacy {
  organisation_id: string;
  site_id: string;
  template_id: string;
  user_id: string;
}

export interface CreateResponseInput {
  report_id: string;
  template_item_id: string;
  item_label: string;
  item_type: string;
  response_value?: string | null;
  severity?: 'low' | 'medium' | 'high' | null;
  notes?: string | null;
}

/**
 * Create a new report (draft)
 */
export async function createReport(input: CreateReportInput): Promise<{ data: Report | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      organisation_id: input.organisation_id,
      record_id: input.record_id,
      template_id: input.template_id,
      user_id: input.user_id,
      status: 'draft',
      started_at: new Date().toISOString(),
    } as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating report:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as Report, error: null };
}

/**
 * Fetch a report by ID with record and template details
 */
export async function fetchReportById(reportId: string): Promise<{ data: ReportWithDetails | null; error: { message: string } | null }> {
  // First get the report with record and template
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      record:records(name),
      template:templates(name)
    `)
    .eq('id', reportId)
    .single();

  if (error) {
    console.error('Error fetching report:', error);
    return { data: null, error: { message: error.message } };
  }

  // Fetch user profile separately since there's no direct FK
  let userProfile: { full_name: string } | null = null;
  const reportData = data as unknown as Report & { record: { name: string }; template: { name: string } };
  if (reportData?.user_id) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', reportData.user_id)
      .single();
    userProfile = profile as { full_name: string } | null;
  }

  return {
    data: {
      ...reportData,
      user_profile: userProfile,
    },
    error: null,
  };
}

/**
 * Fetch all responses for a report
 */
export async function fetchReportResponses(reportId: string): Promise<{ data: ReportResponse[]; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('report_responses')
    .select('*')
    .eq('report_id', reportId);

  if (error) {
    console.error('Error fetching report responses:', error);
    return { data: [], error: { message: error.message } };
  }

  return { data: (data as ReportResponse[]) || [], error: null };
}

/**
 * Create or update a response
 */
export async function upsertResponse(input: CreateResponseInput): Promise<{ data: ReportResponse | null; error: { message: string } | null }> {
  // First check if response exists for this report/item combo
  const { data: existing } = await supabase
    .from('report_responses')
    .select('id')
    .eq('report_id', input.report_id)
    .eq('template_item_id', input.template_item_id)
    .single();

  if (existing && (existing as { id: string }).id) {
    // Update existing
    const { data, error } = await supabase
      .from('report_responses')
      .update({
        response_value: input.response_value,
        severity: input.severity,
        notes: input.notes,
      } as never)
      .eq('id', (existing as { id: string }).id)
      .select()
      .single();

    if (error) {
      console.error('Error updating response:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: data as ReportResponse, error: null };
  } else {
    // Create new
    const { data, error } = await supabase
      .from('report_responses')
      .insert({
        report_id: input.report_id,
        template_item_id: input.template_item_id,
        item_label: input.item_label,
        item_type: input.item_type,
        response_value: input.response_value,
        severity: input.severity,
        notes: input.notes,
      } as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating response:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: data as ReportResponse, error: null };
  }
}

/**
 * Submit a report (change status from draft to submitted)
 */
export async function submitReport(reportId: string): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase
    .from('reports')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    } as never)
    .eq('id', reportId);

  if (error) {
    console.error('Error submitting report:', error);
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Fetch reports for a record
 */
export async function fetchRecordReports(recordId: string): Promise<{ data: ReportWithDetails[]; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      record:records(name),
      template:templates(name)
    `)
    .eq('record_id', recordId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching record reports:', error);
    return { data: [], error: { message: error.message } };
  }

  // Fetch user profiles for all reports
  const reports = (data || []) as Array<Report & { record: { name: string }; template: { name: string } }>;
  const userIds = [...new Set(reports.map((r) => r.user_id).filter(Boolean))];

  let profilesMap: Record<string, { full_name: string }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);
    profilesMap = ((profiles || []) as Array<{ id: string; full_name: string }>).reduce((acc, p) => {
      acc[p.id] = { full_name: p.full_name };
      return acc;
    }, {} as Record<string, { full_name: string }>);
  }

  const reportsWithDetails: ReportWithDetails[] = reports.map((r) => ({
    ...r,
    user_profile: profilesMap[r.user_id] || null,
  }));

  return { data: reportsWithDetails, error: null };
}

/** @deprecated Use fetchRecordReports instead */
export const fetchSiteReports = fetchRecordReports;

/**
 * Fetch all reports for the user's organisation
 */
export async function fetchAllReports(): Promise<{ data: ReportWithDetails[]; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      record:records(name),
      template:templates(name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', error);
    return { data: [], error: { message: error.message } };
  }

  // Fetch user profiles for all reports
  const reports = (data || []) as Array<Report & { record: { name: string }; template: { name: string } }>;
  const userIds = [...new Set(reports.map((r) => r.user_id).filter(Boolean))];

  let profilesMap: Record<string, { full_name: string }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);
    profilesMap = ((profiles || []) as Array<{ id: string; full_name: string }>).reduce((acc, p) => {
      acc[p.id] = { full_name: p.full_name };
      return acc;
    }, {} as Record<string, { full_name: string }>);
  }

  const reportsWithDetails: ReportWithDetails[] = reports.map((r) => ({
    ...r,
    user_profile: profilesMap[r.user_id] || null,
  }));

  return { data: reportsWithDetails, error: null };
}

/**
 * Upload a photo for a response
 * Photos are automatically compressed to max 2000px before upload
 * @deprecated Use uploadMediaFile instead
 */
export async function uploadResponsePhoto(
  reportId: string,
  responseId: string,
  photoUri: string
): Promise<{ data: ReportPhoto | null; error: { message: string } | null }> {
  try {
    // Compress the image and get base64 - works reliably on all platforms
    const compressed = await compressImageToBase64(photoUri, {
      maxWidth: 2000,
      maxHeight: 2000,
      quality: 0.8,
    });

    if (!compressed.base64) {
      return { data: null, error: { message: 'Image compression failed' } };
    }

    // Generate unique filename
    const filename = `${reportId}/${responseId}/${Date.now()}.jpg`;

    // Convert base64 to ArrayBuffer for upload
    const binaryString = base64Decode(compressed.base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('report-photos')
      .upload(filename, bytes, {
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('Error uploading photo:', uploadError);
      return { data: null, error: { message: uploadError.message } };
    }

    // Create photo record in database
    const { data, error } = await supabase
      .from('report_photos')
      .insert({
        report_response_id: responseId,
        storage_path: filename,
      } as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating photo record:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: data as ReportPhoto, error: null };
  } catch (err) {
    console.error('Error in uploadResponsePhoto:', err);
    return { data: null, error: { message: 'Failed to upload photo' } };
  }
}

/**
 * Get public URL for a photo
 */
export function getPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage.from('report-photos').getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Upload a signature image for a response
 * @param reportId - The report ID
 * @param responseId - The response ID
 * @param base64Data - Base64 encoded signature image data
 * @returns Storage path for the uploaded signature
 */
export async function uploadSignature(
  reportId: string,
  responseId: string,
  base64Data: string
): Promise<{ data: string | null; error: { message: string } | null }> {
  try {
    console.log('[uploadSignature] Starting signature upload');
    console.log(`[uploadSignature] Base64 data length: ${base64Data?.length || 0}`);

    // Generate unique filename
    const filename = `${reportId}/${responseId}/${Date.now()}.png`;

    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
    console.log(`[uploadSignature] Cleaned base64 length: ${base64Content.length}`);

    // Convert base64 to ArrayBuffer using reliable method for React Native
    const binaryString = base64Decode(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    console.log(`[uploadSignature] ArrayBuffer size: ${bytes.length} bytes`);

    // Upload to Supabase Storage (signatures bucket) using ArrayBuffer
    const { error: uploadError } = await supabase.storage
      .from('report-signatures')
      .upload(filename, bytes, {
        contentType: 'image/png',
      });

    if (uploadError) {
      console.error('[uploadSignature] Upload error:', uploadError);
      return { data: null, error: { message: uploadError.message } };
    }

    console.log(`[uploadSignature] Upload successful: ${filename}`);
    return { data: filename, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[uploadSignature] Exception:', err);
    return { data: null, error: { message: `Failed to upload signature: ${errorMessage}` } };
  }
}

/**
 * Get public URL for a signature
 */
export function getSignatureUrl(storagePath: string): string {
  const { data } = supabase.storage.from('report-signatures').getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Upload a media file (photo) for a response
 * Simplified upload that stores files by reportId/templateItemId path
 * @param reportId - The report ID
 * @param templateItemId - The template item ID (used for path organization)
 * @param fileUri - Local URI to the file
 * @param mediaType - Type of media ('photo')
 * @returns Storage path for the uploaded file
 */
export async function uploadMediaFile(
  reportId: string,
  templateItemId: string,
  fileUri: string,
  mediaType: 'photo'
): Promise<{ data: string | null; error: { message: string } | null }> {
  try {
    console.log(`[uploadMediaFile] Starting upload for report ${reportId}, item ${templateItemId}`);
    console.log(`[uploadMediaFile] Source URI: ${fileUri ? fileUri.substring(0, 100) : 'NULL'}...`);
    console.log(`[uploadMediaFile] Platform: ${Platform.OS}`);

    // Generate unique filename using reportId and templateItemId
    const filename = `${reportId}/${templateItemId}/${Date.now()}.jpg`;
    console.log(`[uploadMediaFile] Target filename: ${filename}`);

    // Compress image and get base64 - this works reliably on all platforms
    console.log('[uploadMediaFile] Compressing image to base64...');
    const compressed = await compressImageToBase64(fileUri, {
      maxWidth: 2000,
      maxHeight: 2000,
      quality: 0.8,
    });
    console.log(`[uploadMediaFile] Compressed to ${compressed.width}x${compressed.height}`);

    if (!compressed.base64) {
      console.error('[uploadMediaFile] No base64 data returned from compression');
      return { data: null, error: { message: 'Image compression failed - no data returned' } };
    }

    console.log(`[uploadMediaFile] Base64 length: ${compressed.base64.length} chars`);

    // Convert base64 to ArrayBuffer for upload
    // This method works reliably on React Native
    const binaryString = base64Decode(compressed.base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    console.log(`[uploadMediaFile] ArrayBuffer size: ${bytes.length} bytes`);

    // Upload to Supabase Storage using ArrayBuffer
    console.log('[uploadMediaFile] Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('report-photos')
      .upload(filename, bytes, { contentType: 'image/jpeg' });

    if (uploadError) {
      console.error('[uploadMediaFile] Upload error:', uploadError);
      return { data: null, error: { message: uploadError.message } };
    }

    console.log('[uploadMediaFile] Upload successful:', uploadData);
    console.log(`[uploadMediaFile] Storage path: ${filename}`);

    // Also log the public URL for debugging
    const publicUrl = getPhotoUrl(filename);
    console.log(`[uploadMediaFile] Public URL: ${publicUrl}`);

    return { data: filename, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[uploadMediaFile] Exception:', err);
    console.error('[uploadMediaFile] Error stack:', err instanceof Error ? err.stack : 'No stack');
    return { data: null, error: { message: `Photo upload failed: ${errorMessage}` } };
  }
}
