/**
 * Library Service
 * Handles library record types and templates
 *
 * Migrated to Firebase/Firestore
 */

import { db } from './firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { collections, generateId } from './firestore';
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
  options?: string[] | { value: string; label: string }[];
  // Common options
  help_text?: string;
  placeholder_text?: string;
  default_value?: string;
  // Number-specific
  min_value?: number;
  max_value?: number;
  step_value?: number;
  // DateTime config
  datetime_mode?: 'date' | 'time' | 'datetime';
  // Rating config
  rating_max?: number;
  rating_style?: 'stars' | 'numeric' | 'slider';
  // Declaration/signature config
  declaration_text?: string;
  signature_requires_name?: boolean;
  // Measurement unit config
  unit_type?: string;
  unit_options?: string[];
  default_unit?: string;
  // Counter config
  counter_min?: number;
  counter_max?: number;
  counter_step?: number;
  // Expiry date config
  warning_days_before?: number;
  // Checklist/repeater config
  sub_items?: { label: string; id?: string }[];
  min_entries?: number;
  max_entries?: number;
  // Instruction field config
  instruction_style?: 'info' | 'warning' | 'tip';
}

/**
 * Fetch all library record types
 */
export async function fetchLibraryRecordTypes(): Promise<LibraryRecordTypesResult> {
  try {
    const libraryQuery = query(
      collection(db, 'library_record_types'),
      orderBy('sort_order', 'asc')
    );
    const snapshot = await getDocs(libraryQuery);

    const recordTypes: LibraryRecordType[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as LibraryRecordType));

    return { data: recordTypes, error: null };
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
    const docRef = doc(db, 'library_record_types', libraryId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { data: null, error: { message: 'Library record type not found' } };
    }

    return { data: { id: docSnap.id, ...docSnap.data() } as LibraryRecordType, error: null };
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
    let templatesQuery;

    if (recordTypeId) {
      templatesQuery = query(
        collection(db, 'library_templates'),
        where('record_type_id', '==', recordTypeId),
        orderBy('sort_order', 'asc')
      );
    } else {
      templatesQuery = query(
        collection(db, 'library_templates'),
        orderBy('sort_order', 'asc')
      );
    }

    const snapshot = await getDocs(templatesQuery);

    const templates: LibraryTemplate[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as LibraryTemplate));

    return { data: templates, error: null };
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
    const docRef = doc(db, 'library_templates', templateId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { data: null, error: { message: 'Library template not found' } };
    }

    return { data: { id: docSnap.id, ...docSnap.data() } as LibraryTemplate, error: null };
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
      const recordTypeRef = doc(db, 'record_types', newRecordType.id);
      await deleteDoc(recordTypeRef);
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

    // Create the template
    const templateId = generateId();
    const now = new Date().toISOString();

    const templateData = {
      organisation_id: organisationId,
      record_type_id: null,
      name: customizations?.name || libraryTemplate.name,
      description: customizations?.description || libraryTemplate.description,
      is_published: false, // Start as draft
      created_by: userId,
      created_at: now,
      updated_at: now,
    };

    const templateRef = doc(db, collections.templates, templateId);
    await setDoc(templateRef, templateData);

    // Create sections and items using batch
    const batch = writeBatch(db);

    for (let sectionIndex = 0; sectionIndex < librarySections.length; sectionIndex++) {
      const section = librarySections[sectionIndex];
      const sectionId = generateId();

      // Create section
      const sectionRef = doc(db, collections.templateSections, sectionId);
      batch.set(sectionRef, {
        template_id: templateId,
        name: section.name,
        sort_order: sectionIndex,
        created_at: now,
        updated_at: now,
      });

      // Create items for this section
      for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
        const item = section.items[itemIndex];
        const itemId = generateId();
        const itemRef = doc(db, collections.templateItems, itemId);

        batch.set(itemRef, {
          section_id: sectionId,
          label: item.label,
          item_type: item.item_type,
          is_required: item.is_required ?? false,
          photo_rule: item.photo_rule ?? 'never',
          options: item.options ?? null,
          sort_order: itemIndex,
          // Common options
          help_text: item.help_text ?? null,
          placeholder_text: item.placeholder_text ?? null,
          default_value: item.default_value ?? null,
          // Number-specific
          min_value: item.min_value ?? null,
          max_value: item.max_value ?? null,
          step_value: item.step_value ?? null,
          // DateTime config
          datetime_mode: item.datetime_mode ?? null,
          // Rating config
          rating_max: item.rating_max ?? null,
          rating_style: item.rating_style ?? null,
          // Declaration/signature config
          declaration_text: item.declaration_text ?? null,
          signature_requires_name: item.signature_requires_name ?? null,
          // Measurement unit config
          unit_type: item.unit_type ?? null,
          unit_options: item.unit_options ?? null,
          default_unit: item.default_unit ?? null,
          // Counter config
          counter_min: item.counter_min ?? null,
          counter_max: item.counter_max ?? null,
          counter_step: item.counter_step ?? null,
          // Expiry date config
          warning_days_before: item.warning_days_before ?? null,
          // Checklist/repeater config
          sub_items: item.sub_items ?? null,
          min_entries: item.min_entries ?? null,
          max_entries: item.max_entries ?? null,
          // Instruction field config
          instruction_style: item.instruction_style ?? null,
          created_at: now,
          updated_at: now,
        });
      }
    }

    await batch.commit();

    return { data: { id: templateId, ...templateData } as Template, error: null };
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
    // Fetch all library record types
    const { data: recordTypes, error: rtError } = await fetchLibraryRecordTypes();
    if (rtError) {
      return { data: [], error: rtError };
    }

    // Fetch all library templates
    const { data: templates, error: tError } = await fetchLibraryTemplates();
    if (tError) {
      return { data: [], error: tError };
    }

    // Group templates by record type
    const templatesByRecordType = new Map<string, LibraryTemplate[]>();
    for (const template of templates) {
      const rtId = template.record_type_id || '';
      if (!templatesByRecordType.has(rtId)) {
        templatesByRecordType.set(rtId, []);
      }
      templatesByRecordType.get(rtId)!.push(template);
    }

    // Combine record types with their templates
    const result = recordTypes.map(rt => ({
      ...rt,
      library_templates: templatesByRecordType.get(rt.id) || [],
    }));

    return { data: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch library record types with templates';
    return { data: [], error: { message } };
  }
}
