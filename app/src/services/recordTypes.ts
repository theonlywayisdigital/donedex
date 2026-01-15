import { supabase } from './supabase';
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
  const { data, error } = await supabase
    .from('record_types')
    .select('*')
    .eq('archived', false)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching record types:', error);
    return { data: [], error: { message: error.message } };
  }

  return { data: (data as RecordType[]) || [], error: null };
}

/**
 * Fetch a single record type by ID
 */
export async function fetchRecordTypeById(recordTypeId: string): Promise<RecordTypeResult> {
  const { data, error } = await supabase
    .from('record_types')
    .select('*')
    .eq('id', recordTypeId)
    .single();

  if (error) {
    console.error('Error fetching record type:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as RecordType, error: null };
}

/**
 * Create a new record type (admin only)
 */
export async function createRecordType(
  recordType: Omit<RecordType, 'id' | 'created_at' | 'updated_at' | 'archived'>
): Promise<RecordTypeResult> {
  const { data, error } = await supabase
    .from('record_types')
    .insert(recordType as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating record type:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as RecordType, error: null };
}

/**
 * Update an existing record type (admin only)
 */
export async function updateRecordType(
  recordTypeId: string,
  updates: Partial<Omit<RecordType, 'id' | 'created_at' | 'updated_at' | 'organisation_id'>>
): Promise<RecordTypeResult> {
  const { data, error } = await supabase
    .from('record_types')
    .update(updates as never)
    .eq('id', recordTypeId)
    .select()
    .single();

  if (error) {
    console.error('Error updating record type:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as RecordType, error: null };
}

/**
 * Archive a record type (soft delete - admin only)
 */
export async function archiveRecordType(recordTypeId: string): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase
    .from('record_types')
    .update({ archived: true } as never)
    .eq('id', recordTypeId);

  if (error) {
    console.error('Error archiving record type:', error);
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Fetch the default record type for the organisation
 */
export async function fetchDefaultRecordType(): Promise<RecordTypeResult> {
  const { data, error } = await supabase
    .from('record_types')
    .select('*')
    .eq('is_default', true)
    .single();

  if (error) {
    console.error('Error fetching default record type:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as RecordType, error: null };
}

/**
 * Fetch templates for a specific record type
 */
export async function fetchTemplatesByRecordType(
  recordTypeId: string
): Promise<{ data: Template[]; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('record_type_id', recordTypeId)
    .eq('is_published', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching templates by record type:', error);
    return { data: [], error: { message: error.message } };
  }

  return { data: (data as Template[]) || [], error: null };
}
