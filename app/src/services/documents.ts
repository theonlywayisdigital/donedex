/**
 * Documents Service
 * Handles CRUD operations for record documents and file uploads
 *
 * Migrated to Firebase/Firestore
 */

import { auth, db, storage } from './firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collections, generateId } from './firestore';
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
  const { recordId, category, limit = 50 } = options;

  try {
    let documentsQuery = query(
      collection(db, 'record_documents'),
      where('record_id', '==', recordId),
      orderBy('created_at', 'desc'),
      firestoreLimit(limit)
    );

    // Note: Firestore doesn't support adding where clause after orderBy easily
    // We'll filter client-side if category is specified
    const snapshot = await getDocs(documentsQuery);

    const documents: DocumentWithUploader[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      // Filter by category if specified
      if (category && data.category !== category) {
        continue;
      }

      // Fetch uploader name
      let uploaderName: string | null = null;
      if (data.uploaded_by) {
        const userRef = doc(db, collections.users, data.uploaded_by);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          uploaderName = userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null;
        }
      }

      documents.push({
        id: docSnap.id,
        ...data,
        uploader_name: uploaderName,
      } as DocumentWithUploader);
    }

    return { data: documents, error: null };
  } catch (err) {
    console.error('[Documents] Error fetching documents:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch documents';
    return { data: [], error: { message } };
  }
}

/**
 * Fetch a single document by ID
 */
export async function fetchDocumentById(
  documentId: string
): Promise<DocumentResult> {
  try {
    const docRef = doc(db, 'record_documents', documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { data: null, error: { message: 'Document not found' } };
    }

    return { data: { id: docSnap.id, ...docSnap.data() } as RecordDocument, error: null };
  } catch (err) {
    console.error('[Documents] Error fetching document:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch document';
    return { data: null, error: { message } };
  }
}

/**
 * Get document count for a record
 */
export async function getDocumentCount(
  recordId: string
): Promise<{ count: number; error: { message: string } | null }> {
  try {
    const documentsQuery = query(
      collection(db, 'record_documents'),
      where('record_id', '==', recordId)
    );
    const snapshot = await getDocs(documentsQuery);

    return { count: snapshot.size, error: null };
  } catch (err) {
    console.error('[Documents] Error getting document count:', err);
    const message = err instanceof Error ? err.message : 'Failed to get document count';
    return { count: 0, error: { message } };
  }
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

  const user = auth.currentUser;
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  // Generate unique file path: {org_id}/{record_id}/{timestamp}_{filename}
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `record-documents/${organisationId}/${recordId}/${timestamp}_${sanitizedName}`;

  try {
    // Upload file to Firebase Storage
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, blob, {
      contentType: file.type,
    });

    // Get file size if not provided
    const fileSize = file.size || blob.size;

    // Create database record
    const documentId = generateId();
    const now = new Date().toISOString();

    const documentData = {
      record_id: recordId,
      organisation_id: organisationId,
      name: name || file.name,
      original_filename: file.name,
      file_path: filePath,
      file_size: fileSize,
      mime_type: file.type,
      category,
      description: description || null,
      uploaded_by: user.uid,
      created_at: now,
      updated_at: now,
    };

    const docRef = doc(db, 'record_documents', documentId);
    await setDoc(docRef, documentData);

    return { data: { id: documentId, ...documentData } as RecordDocument, error: null };
  } catch (err) {
    console.error('[Documents] Upload error:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return { data: null, error: { message } };
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
  try {
    const docRef = doc(db, 'record_documents', documentId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    const docSnap = await getDoc(docRef);
    return { data: { id: docSnap.id, ...docSnap.data() } as RecordDocument, error: null };
  } catch (err) {
    console.error('[Documents] Error updating document:', err);
    const message = err instanceof Error ? err.message : 'Failed to update document';
    return { data: null, error: { message } };
  }
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
  try {
    // First, get the document to find the file path
    const docRef = doc(db, 'record_documents', documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { error: { message: 'Document not found' } };
    }

    const filePath = docSnap.data().file_path;

    // Delete from Firebase Storage
    try {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    } catch (storageErr) {
      console.error('[Documents] Storage deletion error:', storageErr);
      // Continue anyway - the file might already be gone
    }

    // Delete database record
    await deleteDoc(docRef);

    return { error: null };
  } catch (err) {
    console.error('[Documents] Error deleting document:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete document';
    return { error: { message } };
  }
}

// ============================================
// URL Functions
// ============================================

/**
 * Get a download URL for a document from Firebase Storage
 */
export async function getDocumentUrl(
  filePath: string
): Promise<{ url: string | null; error: { message: string } | null }> {
  try {
    const storageRef = ref(storage, filePath);
    const url = await getDownloadURL(storageRef);
    return { url, error: null };
  } catch (err) {
    console.error('[Documents] Error getting download URL:', err);
    const message = err instanceof Error ? err.message : 'Failed to get download URL';
    return { url: null, error: { message } };
  }
}

/**
 * Get a public URL for a document (alias for getDocumentUrl)
 */
export async function getDocumentPublicUrl(filePath: string): Promise<string> {
  const result = await getDocumentUrl(filePath);
  return result.url || '';
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
