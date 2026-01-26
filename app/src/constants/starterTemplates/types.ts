/**
 * Starter Template Library - Type Definitions
 */

import type { FieldType, PhotoRule } from '../fieldTypes';

/**
 * Template item definition for library templates
 */
export interface TemplateItemDef {
  label: string;
  item_type: FieldType;
  is_required?: boolean;
  photo_rule?: PhotoRule;
  options?: string[];
  help_text?: string;
  placeholder_text?: string;
  default_value?: string;
  // Extended properties
  min_value?: number;
  max_value?: number;
  step_value?: number;
  datetime_mode?: 'date' | 'time' | 'datetime';
  rating_max?: number;
  rating_style?: 'stars' | 'numeric' | 'slider';
  declaration_text?: string;
  signature_requires_name?: boolean;
  unit_type?: 'length' | 'temperature' | 'currency' | 'weight' | 'volume' | 'area';
  unit_options?: string[];
  default_unit?: string;
  counter_min?: number;
  counter_max?: number;
  counter_step?: number;
  max_media_count?: number;
  media_required?: boolean;
  warning_days_before?: number;
  sub_items?: string[];
  min_entries?: number;
  max_entries?: number;
  instruction_style?: 'info' | 'warning' | 'tip';
  display_style?: 'heading1' | 'heading2' | 'heading3' | 'body';
  coloured_options?: { label: string; color: string }[];
}

/**
 * Template section definition for library templates
 */
export interface TemplateSectionDef {
  name: string;
  items: TemplateItemDef[];
}

/**
 * Full template definition for library templates
 */
export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  record_type_id: string;
  sections: TemplateSectionDef[];
}

/**
 * Library record type (category) definition
 */
export interface LibraryRecordTypeDef {
  id: string;
  name: string;
  name_singular: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}

// ============================================
// Reusable Section Patterns
// ============================================

/**
 * Standard property room inspection items
 */
export const ROOM_INSPECTION_ITEMS: TemplateItemDef[] = [
  { label: 'Overall Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
  { label: 'Ceiling', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Walls', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Floor Type', item_type: 'select', options: ['Carpet', 'Wood', 'Laminate', 'Tile', 'Vinyl', 'Concrete', 'Other'] },
  { label: 'Floor Condition', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Windows', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Doors', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Light Fixtures', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Electrical Sockets', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Heating', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Photos', item_type: 'photo', max_media_count: 10 },
  { label: 'Notes', item_type: 'text', placeholder_text: 'Additional notes about this room...' },
];

/**
 * Standard kitchen inspection items
 */
export const KITCHEN_INSPECTION_ITEMS: TemplateItemDef[] = [
  { label: 'Overall Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
  { label: 'Ceiling', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Walls', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Floor Type', item_type: 'select', options: ['Tile', 'Vinyl', 'Laminate', 'Wood', 'Other'] },
  { label: 'Floor Condition', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Windows', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Worktops', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Cupboards & Units', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Sink & Taps', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Cooker/Hob', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Extractor Fan', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Fridge/Freezer', item_type: 'condition', photo_rule: 'on_fail', help_text: 'If provided' },
  { label: 'Washing Machine', item_type: 'condition', photo_rule: 'on_fail', help_text: 'If provided' },
  { label: 'Dishwasher', item_type: 'condition', photo_rule: 'on_fail', help_text: 'If provided' },
  { label: 'Light Fixtures', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Electrical Sockets', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Photos', item_type: 'photo', max_media_count: 10 },
  { label: 'Notes', item_type: 'text', placeholder_text: 'Additional notes about the kitchen...' },
];

/**
 * Standard bathroom inspection items
 */
export const BATHROOM_INSPECTION_ITEMS: TemplateItemDef[] = [
  { label: 'Overall Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
  { label: 'Ceiling', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Walls', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Floor Type', item_type: 'select', options: ['Tile', 'Vinyl', 'Laminate', 'Other'] },
  { label: 'Floor Condition', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Window/Ventilation', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Bath', item_type: 'condition', photo_rule: 'on_fail', help_text: 'If present' },
  { label: 'Shower', item_type: 'condition', photo_rule: 'on_fail', help_text: 'If present' },
  { label: 'Toilet', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Sink & Taps', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Mirror/Cabinet', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Towel Rail/Radiator', item_type: 'condition', photo_rule: 'on_fail' },
  { label: 'Extractor Fan', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Light Fixtures', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Photos', item_type: 'photo', max_media_count: 10 },
  { label: 'Notes', item_type: 'text', placeholder_text: 'Additional notes about the bathroom...' },
];

/**
 * Standard safety checklist items
 */
export const SAFETY_CHECKLIST_ITEMS: TemplateItemDef[] = [
  { label: 'Smoke Alarms Working', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
  { label: 'CO Alarm Present', item_type: 'yes_no', photo_rule: 'on_no' },
  { label: 'Fire Exits Clear', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Fire Extinguisher Present', item_type: 'yes_no', photo_rule: 'on_no' },
  { label: 'First Aid Kit Available', item_type: 'yes_no' },
  { label: 'Emergency Contacts Posted', item_type: 'yes_no' },
  { label: 'Hazards Identified', item_type: 'severity', photo_rule: 'on_fail' },
  { label: 'Safety Notes', item_type: 'text', placeholder_text: 'Any safety concerns or observations...' },
];

/**
 * Standard sign-off section items
 */
export const SIGN_OFF_ITEMS: TemplateItemDef[] = [
  { label: 'Declaration', item_type: 'declaration', declaration_text: 'I confirm this inspection is accurate to the best of my knowledge.' },
  { label: 'Inspector Signature', item_type: 'signature', is_required: true, signature_requires_name: true },
  { label: 'Completed', item_type: 'auto_timestamp' },
];

/**
 * Standard sign-off with witness
 */
export const SIGN_OFF_WITH_WITNESS_ITEMS: TemplateItemDef[] = [
  { label: 'Declaration', item_type: 'declaration', declaration_text: 'I confirm this inspection is accurate to the best of my knowledge.' },
  { label: 'Inspector Signature', item_type: 'signature', is_required: true, signature_requires_name: true },
  { label: 'Witness', item_type: 'witness' },
  { label: 'Completed', item_type: 'auto_timestamp' },
];

/**
 * Standard tenant sign-off section
 */
export const TENANT_SIGN_OFF_ITEMS: TemplateItemDef[] = [
  { label: 'Declaration', item_type: 'declaration', declaration_text: 'I confirm this inventory accurately represents the condition of the property at the time of inspection.' },
  { label: 'Inspector Signature', item_type: 'signature', is_required: true, signature_requires_name: true },
  { label: 'Tenant Signature', item_type: 'signature', signature_requires_name: true, help_text: 'Tenant signature (if present)' },
  { label: 'Completed', item_type: 'auto_timestamp' },
];

/**
 * Standard vehicle pre-trip items
 */
export const VEHICLE_PRE_TRIP_ITEMS: TemplateItemDef[] = [
  { label: 'Tyres - Condition', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
  { label: 'Tyres - Pressure', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Lights - Headlights', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Lights - Brake Lights', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Lights - Indicators', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Windscreen - Condition', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Windscreen - Wipers', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Mirrors', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Horn', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Brakes', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Fluid Levels', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'Warning Lights', item_type: 'pass_fail', photo_rule: 'on_fail', help_text: 'Check dashboard for warning lights' },
  { label: 'Seat Belts', item_type: 'pass_fail', photo_rule: 'on_fail' },
  { label: 'First Aid Kit', item_type: 'yes_no' },
  { label: 'Fire Extinguisher', item_type: 'yes_no' },
  { label: 'Warning Triangle', item_type: 'yes_no' },
  { label: 'Damage Photos', item_type: 'photo', max_media_count: 10, help_text: 'Photo any existing damage' },
];

/**
 * Helper to create a room section with standard items
 */
export function createRoomSection(roomName: string, additionalItems?: TemplateItemDef[]): TemplateSectionDef {
  return {
    name: roomName,
    items: [
      ...ROOM_INSPECTION_ITEMS,
      ...(additionalItems || []),
    ],
  };
}
