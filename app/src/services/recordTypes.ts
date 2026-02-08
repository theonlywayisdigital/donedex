/**
 * Record Types Service
 * Handles record type management
 *
 * Migrated to Firebase/Firestore
 */

import { db } from './firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { collections, generateId } from './firestore';
import type { RecordType, Template } from '../types';

export interface RecordTypesResult {
  data: RecordType[];
  error: { message: string } | null;
}

export interface RecordTypeResult {
  data: RecordType | null;
  error: { message: string } | null;
}

export interface RecordTypeWithTemplates extends RecordType {
  templates: Template[];
}

/**
 * Fetch all record types for the current user's organisation
 */
export async function fetchRecordTypes(): Promise<RecordTypesResult> {
  try {
    const recordTypesQuery = query(
      collection(db, 'record_types'),
      where('archived', '==', false)
    );
    const snapshot = await getDocs(recordTypesQuery);

    const recordTypes: RecordType[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as RecordType));

    // Sort: default first, then alphabetically
    recordTypes.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    return { data: recordTypes, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch record types';
    return { data: [], error: { message } };
  }
}

/**
 * Fetch a single record type by ID
 */
export async function fetchRecordTypeById(recordTypeId: string): Promise<RecordTypeResult> {
  try {
    const recordTypeRef = doc(db, 'record_types', recordTypeId);
    const recordTypeSnap = await getDoc(recordTypeRef);

    if (!recordTypeSnap.exists()) {
      return { data: null, error: { message: 'Record type not found' } };
    }

    return { data: { id: recordTypeSnap.id, ...recordTypeSnap.data() } as RecordType, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch record type';
    return { data: null, error: { message } };
  }
}

/**
 * Create a new record type (admin only)
 */
export async function createRecordType(
  recordType: Omit<RecordType, 'id' | 'created_at' | 'updated_at' | 'archived'>
): Promise<RecordTypeResult> {
  try {
    const recordTypeId = generateId();
    const recordTypeRef = doc(db, 'record_types', recordTypeId);
    const now = new Date().toISOString();

    const recordTypeData = {
      ...recordType,
      archived: false,
      created_at: now,
      updated_at: now,
    };

    await setDoc(recordTypeRef, recordTypeData);

    return { data: { id: recordTypeId, ...recordTypeData } as RecordType, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create record type';
    return { data: null, error: { message } };
  }
}

/**
 * Update an existing record type (admin only)
 */
export async function updateRecordType(
  recordTypeId: string,
  updates: Partial<Omit<RecordType, 'id' | 'created_at' | 'updated_at' | 'organisation_id'>>
): Promise<RecordTypeResult> {
  try {
    const recordTypeRef = doc(db, 'record_types', recordTypeId);
    await updateDoc(recordTypeRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    const recordTypeSnap = await getDoc(recordTypeRef);
    return { data: { id: recordTypeSnap.id, ...recordTypeSnap.data() } as RecordType, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update record type';
    return { data: null, error: { message } };
  }
}

/**
 * Archive a record type (soft delete - admin only)
 */
export async function archiveRecordType(recordTypeId: string): Promise<{ error: { message: string } | null }> {
  try {
    const recordTypeRef = doc(db, 'record_types', recordTypeId);
    await updateDoc(recordTypeRef, {
      archived: true,
      updated_at: new Date().toISOString(),
    });

    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to archive record type';
    return { error: { message } };
  }
}

/**
 * Fetch the default record type for the organisation
 */
export async function fetchDefaultRecordType(): Promise<RecordTypeResult> {
  try {
    const recordTypesQuery = query(
      collection(db, 'record_types'),
      where('is_default', '==', true)
    );
    const snapshot = await getDocs(recordTypesQuery);

    if (snapshot.empty) {
      return { data: null, error: { message: 'No default record type found' } };
    }

    const recordTypeDoc = snapshot.docs[0];
    return { data: { id: recordTypeDoc.id, ...recordTypeDoc.data() } as RecordType, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch default record type';
    return { data: null, error: { message } };
  }
}

/**
 * Fetch templates for a specific record type
 */
export async function fetchTemplatesByRecordType(
  recordTypeId: string
): Promise<{ data: Template[]; error: { message: string } | null }> {
  try {
    const templatesQuery = query(
      collection(db, collections.templates),
      where('record_type_id', '==', recordTypeId),
      where('is_published', '==', true),
      where('archived', '==', false),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(templatesQuery);

    const templates: Template[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Template));

    return { data: templates, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch templates by record type';
    return { data: [], error: { message } };
  }
}
