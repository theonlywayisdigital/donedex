/**
 * Documents Service
 * Handles CRUD operations for record documents and file uploads
 */

import { supabase } from './supabase';
import type { RecordDocument, RecordDocumentCategory } from '../types';

// ============================================
// Types
// ============================================

export interface DocumentWithUploader extends RecordDocument {
  uploader_name?: string | null;
}

export interface FetchDocumentsOptions {
  recordId: string;
  category?: RecordDocumentCategory;
  limit?: number;
  offset?: number;
}

export interface UploadDocumentOptions {
  recordId: string;
  organisationId: string;
  file: {
    uri: string;
    name: string;
    type: string;
    size?: number;
  };
  name?: string;
  category?: RecordDocumentCategory;
  description?: string;
}

export interface DocumentResult {
  data: RecordDocument | null;
  error: { message: string } | null;
}

export interface DocumentsResult {
  data: DocumentWithUploader[];
  error: { message: string } | null;
}

// ============================================
// Fetch Functions
// ============================================

/**
 * Fetch documents for a record
 */
export async function fetchRecordDocuments(
  options: FetchDocumentsOptions
): Promise<DocumentsResult> {
  const { recordId, category, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('record_documents')
    .select(
      `
      *,
      uploader:user_profiles!uploaded_by (full_name)
    `
    )
    .eq('record_id', recordId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Documents] Error fetching documents:', error);
    return { data: [], error: { message: error.message } };
  }

  // Transform to include uploader name
  const documents: DocumentWithUploader[] = (data || []).map((doc: unknown) => {
    const d = doc as RecordDocument & { uploader?: { full_name: string } | null };
    return {
      ...d,
      uploader_name: d.uploader?.full_name || null,
    };
  });

  return { data: documents, error: null };
}

/**
 * Fetch a single document by ID
 */
export async function fetchDocumentById(
  documentId: string
): Promise<DocumentResult> {
  const { data, error } = await supabase
    .from('record_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    console.error('[Documents] Error fetching document:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as RecordDocument, error: null };
}

/**
 * Get document count for a record
 */
export async function getDocumentCount(
  recordId: string
): Promise<{ count: number; error: { message: string } | null }> {
  const { count, error } = await supabase
    .from('record_documents')
    .select('*', { count: 'exact', head: true })
    .eq('record_id', recordId);

  if (error) {
    console.error('[Documents] Error getting document count:', error);
    return { count: 0, error: { message: error.message } };
  }

  return { count: count || 0, error: null };
}

// ============================================
// Upload Functions
// ============================================

/**
 * Upload a document file and create the database record
 */
export async function uploadDocument(
  options: UploadDocumentOptions
): Promise<DocumentResult> {
  const {
    recordId,
    organisationId,
    file,
    name,
    category = 'general',
    description,
  } = options;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  // Generate unique file path: {org_id}/{record_id}/{timestamp}_{filename}
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${organisationId}/${recordId}/${timestamp}_${sanitizedName}`;

  try {
    // Upload file to storage
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('record-documents')
      .upload(filePath, blob, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Documents] Storage upload error:', uploadError);
      return { data: null, error: { message: uploadError.message } };
    }

    // Get file size if not provided
    const fileSize = file.size || blob.size;

    // Create database record
    const { data, error: dbError } = await supabase
      .from('record_documents')
      .insert({
        record_id: recordId,
        organisation_id: organisationId,
        name: name || file.name,
        original_filename: file.name,
        file_path: filePath,
        file_size: fileSize,
        mime_type: file.type,
        category,
        description: description || null,
        uploaded_by: user.id,
      } as never)
      .select()
      .single();

    if (dbError) {
      // Try to clean up the uploaded file
      await supabase.storage.from('record-documents').remove([filePath]);
      console.error('[Documents] Database insert error:', dbError);
      return { data: null, error: { message: dbError.message } };
    }

    return { data: data as RecordDocument, error: null };
  } catch (err) {
    console.error('[Documents] Upload error:', err);
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Upload failed' },
    };
  }
}

// ============================================
// Update Functions
// ============================================

/**
 * Update document metadata (name, category, description)
 */
export async function updateDocument(
  documentId: string,
  updates: {
    name?: string;
    category?: RecordDocumentCategory;
    description?: string | null;
  }
): Promise<DocumentResult> {
  const { data, error } = await supabase
    .from('record_documents')
    .update(updates as never)
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    console.error('[Documents] Error updating document:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as RecordDocument, error: null };
}

// ============================================
// Delete Functions
// ============================================

/**
 * Delete a document (removes both storage file and database record)
 */
export async function deleteDocument(
  documentId: string
): Promise<{ error: { message: string } | null }> {
  // First, get the document to find the file path
  const { data: doc, error: fetchError } = await supabase
    .from('record_documents')
    .select('file_path')
    .eq('id', documentId)
    .single();

  if (fetchError) {
    console.error('[Documents] Error fetching document for deletion:', fetchError);
    return { error: { message: fetchError.message } };
  }

  const filePath = (doc as { file_path: string }).file_path;

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('record-documents')
    .remove([filePath]);

  if (storageError) {
    console.error('[Documents] Storage deletion error:', storageError);
    // Continue anyway - the file might already be gone
  }

  // Delete database record
  const { error: dbError } = await supabase
    .from('record_documents')
    .delete()
    .eq('id', documentId);

  if (dbError) {
    console.error('[Documents] Database deletion error:', dbError);
    return { error: { message: dbError.message } };
  }

  return { error: null };
}

// ============================================
// URL Functions
// ============================================

/**
 * Get a signed URL for downloading a document
 * URLs expire after 1 hour by default
 */
export async function getDocumentUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<{ url: string | null; error: { message: string } | null }> {
  const { data, error } = await supabase.storage
    .from('record-documents')
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('[Documents] Error creating signed URL:', error);
    return { url: null, error: { message: error.message } };
  }

  return { url: data.signedUrl, error: null };
}

/**
 * Get a public URL for a document (only works if bucket is public)
 */
export function getDocumentPublicUrl(filePath: string): string {
  const { data } = supabase.storage.from('record-documents').getPublicUrl(filePath);
  return data.publicUrl;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get icon name based on MIME type
 * Returns valid IconName values from the Icon component
 */
export function getDocumentIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'file-text';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'clipboard-list';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'file-text';
  if (mimeType === 'text/plain' || mimeType === 'text/csv') return 'file-text';
  return 'file-text';
}

/**
 * Check if a MIME type can be previewed in-app
 */
export function isPreviewable(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

/**
 * Category display names
 * Uses valid IconName values from the Icon component
 */
export const DOCUMENT_CATEGORIES: Record<RecordDocumentCategory, { label: string; icon: string }> = {
  general: { label: 'General', icon: 'file-text' },
  contract: { label: 'Contract', icon: 'clipboard-check' },
  certificate: { label: 'Certificate', icon: 'shield' },
  photo: { label: 'Photo', icon: 'image' },
  report: { label: 'Report', icon: 'file-text' },
  correspondence: { label: 'Correspondence', icon: 'mail' },
  other: { label: 'Other', icon: 'folder' },
};
