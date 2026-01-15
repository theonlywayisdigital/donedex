import { supabase } from './supabase';
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
  const { data, error } = await supabase
    .from('record_type_fields')
    .select('*')
    .eq('record_type_id', recordTypeId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching record type fields:', error);
    return { data: [], error: { message: error.message } };
  }

  return { data: (data as RecordTypeField[]) || [], error: null };
}

/**
 * Fetch a single field by ID
 */
export async function fetchRecordTypeFieldById(
  fieldId: string
): Promise<RecordTypeFieldResult> {
  const { data, error } = await supabase
    .from('record_type_fields')
    .select('*')
    .eq('id', fieldId)
    .single();

  if (error) {
    console.error('Error fetching record type field:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as RecordTypeField, error: null };
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
  // If no sort_order provided, get the max and add 1
  if (field.sort_order === undefined) {
    const { data: existingFields } = await supabase
      .from('record_type_fields')
      .select('sort_order')
      .eq('record_type_id', field.record_type_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    field.sort_order = existingFields && existingFields.length > 0
      ? ((existingFields[0] as { sort_order: number }).sort_order + 1)
      : 0;
  }

  // Auto-set PII flags based on field type if not explicitly provided
  const fieldWithPii = {
    ...field,
    contains_pii: field.contains_pii ?? fieldTypeContainsPII(field.field_type),
    pii_category: field.pii_category ?? getFieldTypePiiCategory(field.field_type),
  };

  const { data, error } = await supabase
    .from('record_type_fields')
    .insert(fieldWithPii as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating record type field:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as RecordTypeField, error: null };
}

/**
 * Update an existing field
 */
export async function updateRecordTypeField(
  fieldId: string,
  updates: Partial<Omit<RecordTypeField, 'id' | 'record_type_id' | 'created_at' | 'updated_at'>>
): Promise<RecordTypeFieldResult> {
  const { data, error } = await supabase
    .from('record_type_fields')
    .update(updates as never)
    .eq('id', fieldId)
    .select()
    .single();

  if (error) {
    console.error('Error updating record type field:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as RecordTypeField, error: null };
}

/**
 * Delete a field
 */
export async function deleteRecordTypeField(
  fieldId: string
): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase
    .from('record_type_fields')
    .delete()
    .eq('id', fieldId);

  if (error) {
    console.error('Error deleting record type field:', error);
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Reorder fields within a record type
 */
export async function reorderRecordTypeFields(
  recordTypeId: string,
  fieldIds: string[]
): Promise<{ error: { message: string } | null }> {
  // Update each field's sort_order based on its position in the array
  const updates = fieldIds.map((fieldId, index) => ({
    id: fieldId,
    sort_order: index,
  }));

  // Update each field individually (Supabase doesn't support batch updates)
  for (const update of updates) {
    const { error } = await supabase
      .from('record_type_fields')
      .update({ sort_order: update.sort_order } as never)
      .eq('id', update.id)
      .eq('record_type_id', recordTypeId);

    if (error) {
      console.error('Error reordering record type fields:', error);
      return { error: { message: error.message } };
    }
  }

  return { error: null };
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
  const fieldsWithRecordType = fields.map((field, index) => ({
    ...field,
    record_type_id: recordTypeId,
    sort_order: field.sort_order ?? index,
    // Auto-set PII flags based on field type
    contains_pii: field.contains_pii ?? fieldTypeContainsPII(field.field_type),
    pii_category: field.pii_category ?? getFieldTypePiiCategory(field.field_type),
  }));

  const { data, error } = await supabase
    .from('record_type_fields')
    .insert(fieldsWithRecordType as never[])
    .select();

  if (error) {
    console.error('Error bulk creating record type fields:', error);
    return { data: [], error: { message: error.message } };
  }

  return { data: (data as RecordTypeField[]) || [], error: null };
}
