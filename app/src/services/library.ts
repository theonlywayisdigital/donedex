import { supabase } from './supabase';
import { createRecordType } from './recordTypes';
import { bulkCreateRecordTypeFields } from './recordTypeFields';
import type { LibraryRecordType, LibraryTemplate, RecordType, Template } from '../types';

export interface LibraryRecordTypesResult {
  data: LibraryRecordType[];
  error: { message: string } | null;
}

export interface LibraryRecordTypeResult {
  data: LibraryRecordType | null;
  error: { message: string } | null;
}

export interface LibraryTemplatesResult {
  data: LibraryTemplate[];
  error: { message: string } | null;
}

export interface LibraryTemplateResult {
  data: LibraryTemplate | null;
  error: { message: string } | null;
}

// Field definition from library JSON
export interface LibraryFieldDefinition {
  label: string;
  field_type: string;
  is_required?: boolean;
  help_text?: string;
  placeholder_text?: string;
  default_value?: string;
  options?: { value: string; label: string }[];
  min_value?: number;
  max_value?: number;
  unit_type?: string;
  unit_options?: string[];
  default_unit?: string;
}

// Template section/item structure from library JSON
export interface LibraryTemplateSection {
  name: string;
  items: LibraryTemplateItem[];
}

export interface LibraryTemplateItem {
  label: string;
  item_type: string;
  is_required?: boolean;
  photo_rule?: 'never' | 'on_fail' | 'always';
  options?: { value: string; label: string }[];
}

/**
 * Fetch all library record types
 */
export async function fetchLibraryRecordTypes(): Promise<LibraryRecordTypesResult> {
  try {
    const { data, error } = await supabase
      .from('library_record_types')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return { data: [], error: { message: error.message } };
    }

    return { data: (data as LibraryRecordType[]) || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch library record types';
    return { data: [], error: { message } };
  }
}

/**
 * Fetch a single library record type by ID
 */
export async function fetchLibraryRecordTypeById(
  libraryId: string
): Promise<LibraryRecordTypeResult> {
  try {
    const { data, error } = await supabase
      .from('library_record_types')
      .select('*')
      .eq('id', libraryId)
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as LibraryRecordType, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch library record type';
    return { data: null, error: { message } };
  }
}

/**
 * Fetch library templates, optionally filtered by record type
 */
export async function fetchLibraryTemplates(
  recordTypeId?: string
): Promise<LibraryTemplatesResult> {
  try {
    let query = supabase
      .from('library_templates')
      .select('*')
      .order('sort_order', { ascending: true });

    if (recordTypeId) {
      query = query.eq('record_type_id', recordTypeId);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: { message: error.message } };
    }

    return { data: (data as LibraryTemplate[]) || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch library templates';
    return { data: [], error: { message } };
  }
}

/**
 * Fetch a single library template by ID
 */
export async function fetchLibraryTemplateById(
  templateId: string
): Promise<LibraryTemplateResult> {
  try {
    const { data, error } = await supabase
      .from('library_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as LibraryTemplate, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch library template';
    return { data: null, error: { message } };
  }
}

/**
 * Copy a library record type to an organisation
 * Creates a new record type with all fields, optionally customized
 */
export async function copyLibraryRecordTypeToOrg(
  libraryId: string,
  organisationId: string,
  customizations?: {
    name?: string;
    name_singular?: string;
    icon?: string;
    color?: string;
    fields?: LibraryFieldDefinition[];
  }
): Promise<{ data: RecordType | null; error: { message: string } | null }> {
  try {
    // Fetch the library record type
    const { data: libraryType, error: fetchError } = await fetchLibraryRecordTypeById(libraryId);

    if (fetchError || !libraryType) {
      return { data: null, error: fetchError || { message: 'Library record type not found' } };
    }

    // Parse the fields from the library type
    const libraryFields = libraryType.fields as unknown as LibraryFieldDefinition[];
    const fieldsToCreate = customizations?.fields || libraryFields;

    // Create the record type in the organisation
    const { data: newRecordType, error: createError } = await createRecordType({
      organisation_id: organisationId,
      name: customizations?.name || libraryType.name,
      name_singular: customizations?.name_singular || libraryType.name_singular,
      description: libraryType.description,
      icon: customizations?.icon || libraryType.icon,
      color: customizations?.color || libraryType.color,
      fields: libraryType.fields, // Store original library fields as reference
      is_default: false,
      is_system: false,
      source_library_id: libraryId,
    });

    if (createError || !newRecordType) {
      return { data: null, error: createError || { message: 'Failed to create record type' } };
    }

    // Create the fields for the new record type
    const fieldInputs = fieldsToCreate.map((field, index) => ({
      label: field.label,
      field_type: field.field_type,
      is_required: field.is_required ?? false,
      help_text: field.help_text ?? null,
      placeholder_text: field.placeholder_text ?? null,
      default_value: field.default_value ?? null,
      options: field.options ?? null,
      min_value: field.min_value ?? null,
      max_value: field.max_value ?? null,
      unit_type: field.unit_type ?? null,
      unit_options: field.unit_options ?? null,
      default_unit: field.default_unit ?? null,
      sort_order: index,
    }));

    const { error: fieldsError } = await bulkCreateRecordTypeFields(
      newRecordType.id,
      fieldInputs
    );

    if (fieldsError) {
      // Rollback: delete the record type we just created
      await supabase.from('record_types').delete().eq('id', newRecordType.id);
      return { data: null, error: fieldsError };
    }

    return { data: newRecordType, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to copy library record type';
    return { data: null, error: { message } };
  }
}

/**
 * Copy a library template to an organisation
 * Creates a new template with all sections and items
 * Templates are company-wide, so record_type_id is set to null
 */
export async function copyLibraryTemplateToOrg(
  libraryTemplateId: string,
  organisationId: string,
  userId: string,
  customizations?: {
    name?: string;
    description?: string;
  }
): Promise<{ data: Template | null; error: { message: string } | null }> {
  try {
    // Fetch the library template
    const { data: libraryTemplate, error: fetchError } = await fetchLibraryTemplateById(libraryTemplateId);

    if (fetchError || !libraryTemplate) {
      return { data: null, error: fetchError || { message: 'Library template not found' } };
    }

    // Parse the sections from the library template
    const librarySections = libraryTemplate.sections as unknown as LibraryTemplateSection[];

    // Create the template - record_type_id is null since templates are company-wide
    const { data: newTemplate, error: templateError } = await supabase
      .from('templates')
      .insert({
        organisation_id: organisationId,
        record_type_id: null,
        name: customizations?.name || libraryTemplate.name,
        description: customizations?.description || libraryTemplate.description,
        is_published: false, // Start as draft
        created_by: userId,
      } as never)
      .select()
      .single();

    if (templateError || !newTemplate) {
      return { data: null, error: templateError ? { message: templateError.message } : { message: 'Failed to create template' } };
    }

    // Create sections and items
    for (let sectionIndex = 0; sectionIndex < librarySections.length; sectionIndex++) {
      const section = librarySections[sectionIndex];

      // Create section
      const { data: newSection, error: sectionError } = await supabase
        .from('template_sections')
        .insert({
          template_id: (newTemplate as Template).id,
          name: section.name,
          sort_order: sectionIndex,
        } as never)
        .select()
        .single();

      if (sectionError || !newSection) {
        // Rollback: delete the template
        await supabase.from('templates').delete().eq('id', (newTemplate as Template).id);
        return { data: null, error: sectionError ? { message: sectionError.message } : { message: 'Failed to create section' } };
      }

      // Create items for this section
      const items = section.items.map((item, itemIndex) => ({
        section_id: (newSection as { id: string }).id,
        label: item.label,
        item_type: item.item_type,
        is_required: item.is_required ?? false,
        photo_rule: item.photo_rule ?? 'never',
        options: item.options ?? null,
        sort_order: itemIndex,
      }));

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('template_items')
          .insert(items as never[]);

        if (itemsError) {
          // Rollback: delete the template
          await supabase.from('templates').delete().eq('id', (newTemplate as Template).id);
          return { data: null, error: { message: itemsError.message } };
        }
      }
    }

    return { data: newTemplate as Template, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to copy library template';
    return { data: null, error: { message } };
  }
}

/**
 * Fetch library record types with their associated templates
 */
export async function fetchLibraryRecordTypesWithTemplates(): Promise<{
  data: (LibraryRecordType & { library_templates: LibraryTemplate[] })[];
  error: { message: string } | null;
}> {
  try {
    const { data, error } = await supabase
      .from('library_record_types')
      .select(`
        *,
        library_templates (*)
      `)
      .order('sort_order', { ascending: true });

    if (error) {
      return { data: [], error: { message: error.message } };
    }

    return {
      data: (data as (LibraryRecordType & { library_templates: LibraryTemplate[] })[]) || [],
      error: null
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch library record types with templates';
    return { data: [], error: { message } };
  }
}
