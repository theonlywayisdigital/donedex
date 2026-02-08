/**
 * Templates Service
 * Handles template management including sections and items
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
  writeBatch,
} from 'firebase/firestore';
import { collections, generateId } from './firestore';

// Types matching database schema
export type ItemType =
  // Original types
  | 'pass_fail'
  | 'yes_no'
  | 'condition'
  | 'severity'
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'photo'
  // Previously added
  | 'signature'
  | 'declaration'
  | 'datetime'
  | 'rating'
  // Rating & Scales
  | 'rating_numeric'
  | 'slider'
  | 'traffic_light'
  // Date & Time
  | 'date'
  | 'time'
  | 'expiry_date'
  // Measurement & Counting
  | 'counter'
  | 'measurement'
  | 'temperature'
  | 'meter_reading'
  | 'currency'
  // Evidence & Media
  | 'photo_before_after'
  | 'annotated_photo'
  // Location & Assets
  | 'gps_location'
  | 'barcode_scan'
  | 'asset_lookup'
  // People
  | 'person_picker'
  | 'contractor'
  | 'witness'
  // Smart/Advanced
  | 'conditional'
  | 'repeater'
  | 'checklist'
  | 'instruction'
  | 'auto_timestamp'
  | 'auto_weather'
  // Composite Field Groups
  | 'composite_person_name'
  | 'composite_contact'
  | 'composite_address_uk'
  | 'composite_address_us'
  | 'composite_address_intl'
  | 'composite_vehicle'
  // Display & Selection
  | 'coloured_selection'
  | 'title'
  | 'paragraph';

export type DatetimeMode = 'date' | 'time' | 'datetime';
export type ConditionOperator = 'equals' | 'not_equals' | 'not_empty' | 'greater_than' | 'less_than' | 'contains';
export type RatingStyle = 'stars' | 'numeric' | 'slider';
export type InstructionStyle = 'info' | 'warning' | 'tip';
export type DisplayStyle = 'heading1' | 'heading2' | 'heading3' | 'body';
export type MediaType = 'photo' | 'annotated_photo' | 'signature';
export type UnitType = 'length' | 'temperature' | 'currency' | 'weight' | 'volume' | 'area';

export type PhotoRule = 'never' | 'on_fail' | 'always' | 'on_pass' | 'on_yes' | 'on_no';

export interface Template {
  id: string;
  organisation_id: string;
  record_type_id: string | null;
  name: string;
  description: string | null;
  is_published: boolean;
  archived?: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateSection {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface TemplateItem {
  id: string;
  section_id: string;
  label: string;
  item_type: ItemType;
  is_required: boolean;
  photo_rule: PhotoRule;
  options: string[] | null;
  sort_order: number;
  created_at: string;

  // Common options
  help_text: string | null;
  placeholder_text: string | null;
  default_value: string | null;

  // Number-specific
  min_value: number | null;
  max_value: number | null;
  step_value: number | null;

  // DateTime config
  datetime_mode: DatetimeMode | null;

  // Rating config
  rating_max: number | null;
  rating_style: RatingStyle | null;

  // Declaration/signature config
  declaration_text: string | null;
  signature_requires_name: boolean | null;

  // Conditional visibility
  condition_field_id: string | null;
  condition_operator: ConditionOperator | null;
  condition_value: string | null;

  // Measurement unit config
  unit_type: UnitType | null;
  unit_options: string[] | null;
  default_unit: string | null;

  // Counter config
  counter_min: number | null;
  counter_max: number | null;
  counter_step: number | null;

  // Media config
  max_media_count: number | null;
  media_required: boolean | null;
  max_duration_seconds: number | null;

  // Expiry date config
  warning_days_before: number | null;

  // Checklist/repeater config
  sub_items: SubItem[] | null;
  min_entries: number | null;
  max_entries: number | null;

  // Instruction field config
  instruction_image_url: string | null;
  instruction_style: InstructionStyle | null;

  // Asset lookup config
  asset_types: string[] | null;

  // Coloured selection config
  coloured_options: { label: string; color: string }[] | null;

  // Title/paragraph display style
  display_style: DisplayStyle | null;
}

// Sub-item definition for checklist and repeater fields
export interface SubItem {
  id: string;
  label: string;
  item_type: ItemType;
  is_required?: boolean;
}

export interface TemplateSectionWithItems extends TemplateSection {
  template_items: TemplateItem[];
}

export interface TemplateWithSections extends Template {
  template_sections: TemplateSectionWithItems[];
}

/**
 * Fetch a template with all its sections and items
 */
export async function fetchTemplateWithSections(
  templateId: string
): Promise<{ data: TemplateWithSections | null; error: { message: string } | null }> {
  try {
    // Fetch template
    const templateRef = doc(db, collections.templates, templateId);
    const templateSnap = await getDoc(templateRef);

    if (!templateSnap.exists()) {
      return { data: null, error: { message: 'Template not found' } };
    }

    const template: Template = {
      id: templateSnap.id,
      ...templateSnap.data(),
    } as Template;

    // Fetch sections
    const sectionsQuery = query(
      collection(db, collections.templateSections),
      where('template_id', '==', templateId),
      orderBy('sort_order', 'asc')
    );
    const sectionsSnap = await getDocs(sectionsQuery);

    const sectionsWithItems: TemplateSectionWithItems[] = [];

    for (const sectionDoc of sectionsSnap.docs) {
      const section: TemplateSection = {
        id: sectionDoc.id,
        ...sectionDoc.data(),
      } as TemplateSection;

      // Fetch items for this section
      const itemsQuery = query(
        collection(db, collections.templateItems),
        where('section_id', '==', section.id),
        orderBy('sort_order', 'asc')
      );
      const itemsSnap = await getDocs(itemsQuery);

      const items: TemplateItem[] = itemsSnap.docs.map(itemDoc => ({
        id: itemDoc.id,
        ...itemDoc.data(),
      } as TemplateItem));

      sectionsWithItems.push({
        ...section,
        template_items: items,
      });
    }

    const templateWithSections: TemplateWithSections = {
      ...template,
      template_sections: sectionsWithItems,
    };

    return { data: templateWithSections, error: null };
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Fetch all templates for the user's organisation
 */
export async function fetchTemplates(): Promise<{ data: Template[]; error: { message: string } | null }> {
  try {
    const templatesQuery = query(
      collection(db, collections.templates),
      where('archived', '==', false),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(templatesQuery);

    const templates: Template[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Template));

    return { data: templates, error: null };
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return { data: [], error: { message: error.message } };
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
      where('archived', '==', false),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(templatesQuery);

    const templates: Template[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Template));

    return { data: templates, error: null };
  } catch (error: any) {
    console.error('Error fetching templates by record type:', error);
    return { data: [], error: { message: error.message } };
  }
}

/**
 * Fetch published templates for a specific record type
 * @deprecated Use fetchPublishedTemplates() - templates are now company-wide
 */
export async function fetchPublishedTemplatesByRecordType(
  recordTypeId: string
): Promise<{ data: Template[]; error: { message: string } | null }> {
  // Templates are now company-wide, so we ignore recordTypeId
  return fetchPublishedTemplates();
}

/**
 * Fetch all published templates for the organisation
 * Templates are company-wide - available for all record types
 */
export async function fetchPublishedTemplates(): Promise<{ data: Template[]; error: { message: string } | null }> {
  try {
    const templatesQuery = query(
      collection(db, collections.templates),
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
  } catch (error: any) {
    console.error('Error fetching published templates:', error);
    return { data: [], error: { message: error.message } };
  }
}

/**
 * Create a new template
 */
export async function createTemplate(
  template: Omit<Template, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Template | null; error: { message: string } | null }> {
  try {
    const templateId = generateId();
    const templateRef = doc(db, collections.templates, templateId);
    const now = new Date().toISOString();

    const templateData = {
      ...template,
      archived: false,
      created_at: now,
      updated_at: now,
    };

    await setDoc(templateRef, templateData);

    return { data: { id: templateId, ...templateData } as Template, error: null };
  } catch (error: any) {
    console.error('Error creating template:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<Omit<Template, 'id' | 'created_at' | 'updated_at' | 'organisation_id'>>
): Promise<{ data: Template | null; error: { message: string } | null }> {
  try {
    const templateRef = doc(db, collections.templates, templateId);
    await updateDoc(templateRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    const templateSnap = await getDoc(templateRef);
    return { data: { id: templateSnap.id, ...templateSnap.data() } as Template, error: null };
  } catch (error: any) {
    console.error('Error updating template:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Create a section in a template
 */
export async function createSection(
  section: Omit<TemplateSection, 'id' | 'created_at'>
): Promise<{ data: TemplateSection | null; error: { message: string } | null }> {
  try {
    const sectionId = generateId();
    const sectionRef = doc(db, collections.templateSections, sectionId);
    const now = new Date().toISOString();

    const sectionData = {
      ...section,
      created_at: now,
    };

    await setDoc(sectionRef, sectionData);

    return { data: { id: sectionId, ...sectionData } as TemplateSection, error: null };
  } catch (error: any) {
    console.error('Error creating section:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Create an item in a section
 */
export async function createItem(
  item: Omit<TemplateItem, 'id' | 'created_at'>
): Promise<{ data: TemplateItem | null; error: { message: string } | null }> {
  try {
    const itemId = generateId();
    const itemRef = doc(db, collections.templateItems, itemId);
    const now = new Date().toISOString();

    const itemData = {
      ...item,
      created_at: now,
    };

    await setDoc(itemRef, itemData);

    return { data: { id: itemId, ...itemData } as TemplateItem, error: null };
  } catch (error: any) {
    console.error('Error creating item:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Archive a template (soft delete)
 */
export async function archiveTemplate(templateId: string): Promise<{ error: { message: string } | null }> {
  try {
    const templateRef = doc(db, collections.templates, templateId);
    await updateDoc(templateRef, {
      archived: true,
      updated_at: new Date().toISOString(),
    });

    return { error: null };
  } catch (error: any) {
    console.error('Error archiving template:', error);
    return { error: { message: error.message } };
  }
}

/** @deprecated Use archiveTemplate instead */
export const deleteTemplate = archiveTemplate;

/**
 * Update a section
 */
export async function updateSection(
  sectionId: string,
  updates: Partial<Omit<TemplateSection, 'id' | 'created_at' | 'template_id'>>
): Promise<{ data: TemplateSection | null; error: { message: string } | null }> {
  try {
    const sectionRef = doc(db, collections.templateSections, sectionId);
    await updateDoc(sectionRef, updates);

    const sectionSnap = await getDoc(sectionRef);
    return { data: { id: sectionSnap.id, ...sectionSnap.data() } as TemplateSection, error: null };
  } catch (error: any) {
    console.error('Error updating section:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Delete a section (cascades to items)
 */
export async function deleteSection(sectionId: string): Promise<{ error: { message: string } | null }> {
  try {
    const batch = writeBatch(db);

    // Delete all items in this section
    const itemsQuery = query(
      collection(db, collections.templateItems),
      where('section_id', '==', sectionId)
    );
    const itemsSnap = await getDocs(itemsQuery);

    itemsSnap.docs.forEach(itemDoc => {
      batch.delete(itemDoc.ref);
    });

    // Delete the section
    const sectionRef = doc(db, collections.templateSections, sectionId);
    batch.delete(sectionRef);

    await batch.commit();

    return { error: null };
  } catch (error: any) {
    console.error('Error deleting section:', error);
    return { error: { message: error.message } };
  }
}

/**
 * Update an item
 */
export async function updateItem(
  itemId: string,
  updates: Partial<Omit<TemplateItem, 'id' | 'created_at' | 'section_id'>>
): Promise<{ data: TemplateItem | null; error: { message: string } | null }> {
  try {
    const itemRef = doc(db, collections.templateItems, itemId);
    await updateDoc(itemRef, updates);

    const itemSnap = await getDoc(itemRef);
    return { data: { id: itemSnap.id, ...itemSnap.data() } as TemplateItem, error: null };
  } catch (error: any) {
    console.error('Error updating item:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Delete an item
 */
export async function deleteItem(itemId: string): Promise<{ error: { message: string } | null }> {
  try {
    const itemRef = doc(db, collections.templateItems, itemId);
    await deleteDoc(itemRef);

    return { error: null };
  } catch (error: any) {
    console.error('Error deleting item:', error);
    return { error: { message: error.message } };
  }
}

/**
 * Bulk update section sort orders
 */
export async function updateSectionOrders(
  sections: { id: string; sort_order: number }[]
): Promise<{ error: { message: string } | null }> {
  try {
    const batch = writeBatch(db);

    for (const section of sections) {
      const sectionRef = doc(db, collections.templateSections, section.id);
      batch.update(sectionRef, { sort_order: section.sort_order });
    }

    await batch.commit();

    return { error: null };
  } catch (error: any) {
    console.error('Error updating section orders:', error);
    return { error: { message: error.message } };
  }
}

/**
 * Bulk update item sort orders
 */
export async function updateItemOrders(
  items: { id: string; sort_order: number }[]
): Promise<{ error: { message: string } | null }> {
  try {
    const batch = writeBatch(db);

    for (const item of items) {
      const itemRef = doc(db, collections.templateItems, item.id);
      batch.update(itemRef, { sort_order: item.sort_order });
    }

    await batch.commit();

    return { error: null };
  } catch (error: any) {
    console.error('Error updating item orders:', error);
    return { error: { message: error.message } };
  }
}
