import { supabase } from './supabase';

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
  const { data, error } = await supabase
    .from('templates')
    .select(`
      *,
      template_sections (
        *,
        template_items (*)
      )
    `)
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching template:', error);
    return { data: null, error: { message: error.message } };
  }

  // Sort sections and items by sort_order
  const template = data as unknown as TemplateWithSections;
  if (template.template_sections) {
    template.template_sections.sort((a, b) => a.sort_order - b.sort_order);
    template.template_sections.forEach((section) => {
      if (section.template_items) {
        section.template_items.sort((a, b) => a.sort_order - b.sort_order);
      }
    });
  }

  return { data: template, error: null };
}

/**
 * Fetch all templates for the user's organisation
 */
export async function fetchTemplates(): Promise<{ data: Template[]; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching templates:', error);
    return { data: [], error: { message: error.message } };
  }

  return { data: (data as Template[]) || [], error: null };
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
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching templates by record type:', error);
    return { data: [], error: { message: error.message } };
  }

  return { data: (data as Template[]) || [], error: null };
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
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('is_published', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching published templates:', error);
    return { data: [], error: { message: error.message } };
  }

  return { data: (data as Template[]) || [], error: null };
}

/**
 * Create a new template
 */
export async function createTemplate(
  template: Omit<Template, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Template | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('templates')
    .insert(template as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as Template, error: null };
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<Omit<Template, 'id' | 'created_at' | 'updated_at' | 'organisation_id'>>
): Promise<{ data: Template | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('templates')
    .update(updates as never)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating template:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as Template, error: null };
}

/**
 * Create a section in a template
 */
export async function createSection(
  section: Omit<TemplateSection, 'id' | 'created_at'>
): Promise<{ data: TemplateSection | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('template_sections')
    .insert(section as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating section:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as TemplateSection, error: null };
}

/**
 * Create an item in a section
 */
export async function createItem(
  item: Omit<TemplateItem, 'id' | 'created_at'>
): Promise<{ data: TemplateItem | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('template_items')
    .insert(item as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating item:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as TemplateItem, error: null };
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting template:', error);
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Update a section
 */
export async function updateSection(
  sectionId: string,
  updates: Partial<Omit<TemplateSection, 'id' | 'created_at' | 'template_id'>>
): Promise<{ data: TemplateSection | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('template_sections')
    .update(updates as never)
    .eq('id', sectionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating section:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as TemplateSection, error: null };
}

/**
 * Delete a section (cascades to items)
 */
export async function deleteSection(sectionId: string): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase
    .from('template_sections')
    .delete()
    .eq('id', sectionId);

  if (error) {
    console.error('Error deleting section:', error);
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Update an item
 */
export async function updateItem(
  itemId: string,
  updates: Partial<Omit<TemplateItem, 'id' | 'created_at' | 'section_id'>>
): Promise<{ data: TemplateItem | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('template_items')
    .update(updates as never)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating item:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: data as TemplateItem, error: null };
}

/**
 * Delete an item
 */
export async function deleteItem(itemId: string): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase
    .from('template_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting item:', error);
    return { error: { message: error.message } };
  }

  return { error: null };
}

/**
 * Bulk update section sort orders
 */
export async function updateSectionOrders(
  sections: { id: string; sort_order: number }[]
): Promise<{ error: { message: string } | null }> {
  // Update each section's sort_order
  for (const section of sections) {
    const { error } = await supabase
      .from('template_sections')
      .update({ sort_order: section.sort_order } as never)
      .eq('id', section.id);

    if (error) {
      console.error('Error updating section order:', error);
      return { error: { message: error.message } };
    }
  }

  return { error: null };
}

/**
 * Bulk update item sort orders
 */
export async function updateItemOrders(
  items: { id: string; sort_order: number }[]
): Promise<{ error: { message: string } | null }> {
  // Update each item's sort_order
  for (const item of items) {
    const { error } = await supabase
      .from('template_items')
      .update({ sort_order: item.sort_order } as never)
      .eq('id', item.id);

    if (error) {
      console.error('Error updating item order:', error);
      return { error: { message: error.message } };
    }
  }

  return { error: null };
}
