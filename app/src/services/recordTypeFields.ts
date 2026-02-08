/**
 * Record Type Fields Service
 * Handles CRUD operations for record type fields
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
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  writeBatch,
} from 'firebase/firestore';
import { generateId } from './firestore';
import type { RecordTypeField, PiiCategory } from '../types';
import { fieldTypeContainsPII, getFieldTypePiiCategory } from '../constants/fieldTypes';

export interface RecordTypeFieldsResult {
  data: RecordTypeField[];
  error: { message: string } | null;
}

export interface RecordTypeFieldResult {
  data: RecordTypeField | null;
  error: { message: string } | null;
}

/**
 * Fetch all fields for a record type
 */
export async function fetchRecordTypeFields(
  recordTypeId: string
): Promise<RecordTypeFieldsResult> {
  try {
    const fieldsQuery = query(
      collection(db, 'record_type_fields'),
      where('record_type_id', '==', recordTypeId),
      orderBy('sort_order', 'asc')
    );
    const snapshot = await getDocs(fieldsQuery);

    const fields: RecordTypeField[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as RecordTypeField));

    return { data: fields, error: null };
  } catch (err) {
    console.error('Error fetching record type fields:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch record type fields';
    return { data: [], error: { message } };
  }
}

/**
 * Fetch a single field by ID
 */
export async function fetchRecordTypeFieldById(
  fieldId: string
): Promise<RecordTypeFieldResult> {
  try {
    const fieldRef = doc(db, 'record_type_fields', fieldId);
    const fieldSnap = await getDoc(fieldRef);

    if (!fieldSnap.exists()) {
      return { data: null, error: { message: 'Field not found' } };
    }

    return { data: { id: fieldSnap.id, ...fieldSnap.data() } as RecordTypeField, error: null };
  } catch (err) {
    console.error('Error fetching record type field:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch record type field';
    return { data: null, error: { message } };
  }
}

export interface CreateRecordTypeFieldInput {
  record_type_id: string;
  label: string;
  field_type: string;
  is_required?: boolean;
  help_text?: string | null;
  placeholder_text?: string | null;
  default_value?: string | null;
  options?: unknown | null;
  min_value?: number | null;
  max_value?: number | null;
  unit_type?: string | null;
  unit_options?: unknown | null;
  default_unit?: string | null;
  sort_order?: number;
  /** Whether this field contains PII (auto-set based on field_type if not provided) */
  contains_pii?: boolean;
  /** PII category (auto-set based on field_type if not provided) */
  pii_category?: PiiCategory;
}

/**
 * Create a new field for a record type
 *
 * PII flags are automatically set based on field_type:
 * - signature, gps_location, person_picker, contractor, witness → contains_pii: true
 * - If contains_pii is explicitly provided, it takes precedence
 */
export async function createRecordTypeField(
  field: CreateRecordTypeFieldInput
): Promise<RecordTypeFieldResult> {
  try {
    // If no sort_order provided, get the max and add 1
    let sortOrder = field.sort_order;
    if (sortOrder === undefined) {
      const existingQuery = query(
        collection(db, 'record_type_fields'),
        where('record_type_id', '==', field.record_type_id),
        orderBy('sort_order', 'desc'),
        firestoreLimit(1)
      );
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        const lastField = existingSnap.docs[0].data();
        sortOrder = (lastField.sort_order || 0) + 1;
      } else {
        sortOrder = 0;
      }
    }

    const fieldId = generateId();
    const now = new Date().toISOString();

    // Auto-set PII flags based on field type if not explicitly provided
    const fieldData = {
      ...field,
      sort_order: sortOrder,
      contains_pii: field.contains_pii ?? fieldTypeContainsPII(field.field_type),
      pii_category: field.pii_category ?? getFieldTypePiiCategory(field.field_type),
      created_at: now,
      updated_at: now,
    };

    const fieldRef = doc(db, 'record_type_fields', fieldId);
    await setDoc(fieldRef, fieldData);

    return { data: { id: fieldId, ...fieldData } as RecordTypeField, error: null };
  } catch (err) {
    console.error('Error creating record type field:', err);
    const message = err instanceof Error ? err.message : 'Failed to create record type field';
    return { data: null, error: { message } };
  }
}

/**
 * Update an existing field
 */
export async function updateRecordTypeField(
  fieldId: string,
  updates: Partial<Omit<RecordTypeField, 'id' | 'record_type_id' | 'created_at' | 'updated_at'>>
): Promise<RecordTypeFieldResult> {
  try {
    const fieldRef = doc(db, 'record_type_fields', fieldId);
    await updateDoc(fieldRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    const fieldSnap = await getDoc(fieldRef);
    return { data: { id: fieldSnap.id, ...fieldSnap.data() } as RecordTypeField, error: null };
  } catch (err) {
    console.error('Error updating record type field:', err);
    const message = err instanceof Error ? err.message : 'Failed to update record type field';
    return { data: null, error: { message } };
  }
}

/**
 * Delete a field
 */
export async function deleteRecordTypeField(
  fieldId: string
): Promise<{ error: { message: string } | null }> {
  try {
    const fieldRef = doc(db, 'record_type_fields', fieldId);
    await deleteDoc(fieldRef);

    return { error: null };
  } catch (err) {
    console.error('Error deleting record type field:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete record type field';
    return { error: { message } };
  }
}

/**
 * Reorder fields within a record type
 */
export async function reorderRecordTypeFields(
  recordTypeId: string,
  fieldIds: string[]
): Promise<{ error: { message: string } | null }> {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    fieldIds.forEach((fieldId, index) => {
      const fieldRef = doc(db, 'record_type_fields', fieldId);
      batch.update(fieldRef, {
        sort_order: index,
        updated_at: now,
      });
    });

    await batch.commit();

    return { error: null };
  } catch (err) {
    console.error('Error reordering record type fields:', err);
    const message = err instanceof Error ? err.message : 'Failed to reorder record type fields';
    return { error: { message } };
  }
}

/**
 * Bulk create fields for a record type (used when copying from library)
 *
 * PII flags are automatically set based on field_type for each field.
 */
export async function bulkCreateRecordTypeFields(
  recordTypeId: string,
  fields: Omit<CreateRecordTypeFieldInput, 'record_type_id'>[]
): Promise<RecordTypeFieldsResult> {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const createdFields: RecordTypeField[] = [];

    fields.forEach((field, index) => {
      const fieldId = generateId();
      const fieldData = {
        ...field,
        record_type_id: recordTypeId,
        sort_order: field.sort_order ?? index,
        // Auto-set PII flags based on field type
        contains_pii: field.contains_pii ?? fieldTypeContainsPII(field.field_type),
        pii_category: field.pii_category ?? getFieldTypePiiCategory(field.field_type),
        created_at: now,
        updated_at: now,
      };

      const fieldRef = doc(db, 'record_type_fields', fieldId);
      batch.set(fieldRef, fieldData);

      createdFields.push({ id: fieldId, ...fieldData } as RecordTypeField);
    });

    await batch.commit();

    return { data: createdFields, error: null };
  } catch (err) {
    console.error('Error bulk creating record type fields:', err);
    const message = err instanceof Error ? err.message : 'Failed to bulk create record type fields';
    return { data: [], error: { message } };
  }
}
