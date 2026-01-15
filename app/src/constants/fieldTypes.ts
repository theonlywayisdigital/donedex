/**
 * Donedex Field Type Definitions
 * Reference: docs/mvp-spec.md Section 6
 */

export const FIELD_TYPES = {
  // Original types
  PASS_FAIL: 'pass_fail',
  YES_NO: 'yes_no',
  CONDITION: 'condition',
  SEVERITY: 'severity',
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  PHOTO: 'photo',

  // Previously added
  SIGNATURE: 'signature',
  DECLARATION: 'declaration',
  DATETIME: 'datetime',
  RATING: 'rating',

  // Rating & Scales
  RATING_NUMERIC: 'rating_numeric',
  SLIDER: 'slider',
  TRAFFIC_LIGHT: 'traffic_light',

  // Date & Time
  DATE: 'date',
  TIME: 'time',
  EXPIRY_DATE: 'expiry_date',

  // Measurement & Counting
  COUNTER: 'counter',
  MEASUREMENT: 'measurement',
  TEMPERATURE: 'temperature',
  METER_READING: 'meter_reading',
  CURRENCY: 'currency',

  // Evidence & Media
  PHOTO_BEFORE_AFTER: 'photo_before_after',
  VIDEO: 'video',
  AUDIO: 'audio',
  ANNOTATED_PHOTO: 'annotated_photo',

  // Location & Assets
  GPS_LOCATION: 'gps_location',
  BARCODE_SCAN: 'barcode_scan',
  ASSET_LOOKUP: 'asset_lookup',

  // People
  PERSON_PICKER: 'person_picker',
  CONTRACTOR: 'contractor',
  WITNESS: 'witness',

  // Smart/Advanced
  CONDITIONAL: 'conditional',
  REPEATER: 'repeater',
  CHECKLIST: 'checklist',
  INSTRUCTION: 'instruction',
  AUTO_TIMESTAMP: 'auto_timestamp',
  AUTO_WEATHER: 'auto_weather',

  // Composite Field Groups
  COMPOSITE_PERSON_NAME: 'composite_person_name',
  COMPOSITE_CONTACT: 'composite_contact',
  COMPOSITE_ADDRESS_UK: 'composite_address_uk',
  COMPOSITE_ADDRESS_US: 'composite_address_us',
  COMPOSITE_ADDRESS_INTL: 'composite_address_intl',
  COMPOSITE_VEHICLE: 'composite_vehicle',
} as const;

export type FieldType = typeof FIELD_TYPES[keyof typeof FIELD_TYPES];

export const PHOTO_RULES = {
  NEVER: 'never',
  ON_FAIL: 'on_fail',
  ALWAYS: 'always',
} as const;

export type PhotoRule = typeof PHOTO_RULES[keyof typeof PHOTO_RULES];

// Field type categories for template builder UI
export const FIELD_TYPE_CATEGORIES = {
  GROUPS: {
    label: 'Field Groups',
    types: ['composite_person_name', 'composite_contact', 'composite_address_uk', 'composite_address_us', 'composite_address_intl', 'composite_vehicle'],
  },
  BASIC: {
    label: 'Basic',
    types: ['pass_fail', 'yes_no', 'condition', 'severity', 'text', 'number', 'select', 'multi_select'],
  },
  RATING_SCALES: {
    label: 'Rating & Scales',
    types: ['rating', 'rating_numeric', 'slider', 'traffic_light'],
  },
  DATE_TIME: {
    label: 'Date & Time',
    types: ['date', 'time', 'datetime', 'expiry_date'],
  },
  MEASUREMENT: {
    label: 'Measurement & Counting',
    types: ['counter', 'measurement', 'temperature', 'meter_reading', 'currency'],
  },
  EVIDENCE: {
    label: 'Evidence & Media',
    types: ['photo', 'photo_before_after', 'video', 'audio', 'signature', 'annotated_photo'],
  },
  LOCATION: {
    label: 'Location & Assets',
    types: ['gps_location', 'barcode_scan', 'asset_lookup'],
  },
  PEOPLE: {
    label: 'People',
    types: ['person_picker', 'contractor', 'witness'],
  },
  ADVANCED: {
    label: 'Smart/Advanced',
    types: ['instruction', 'declaration', 'checklist', 'repeater', 'auto_timestamp', 'auto_weather'],
  },
} as const;

// Icon name type for Lucide icons used in field types
export type FieldTypeIconName =
  | 'check-circle' | 'x-circle' | 'help-circle' | 'alert-triangle' | 'circle'
  | 'calendar' | 'clock' | 'camera' | 'video' | 'mic' | 'pen-tool'
  | 'map-pin' | 'scan' | 'tag' | 'user' | 'users' | 'eye'
  | 'star' | 'hash' | 'type' | 'list' | 'check-square'
  | 'thermometer' | 'ruler' | 'gauge' | 'circle-dollar-sign'
  | 'file-text' | 'info' | 'clipboard-list' | 'refresh-cw' | 'cloud-sun'
  | 'contact' | 'home' | 'globe' | 'car';

// PII category type for field configuration
export type FieldPiiCategory = 'email' | 'phone' | 'name' | 'signature' | 'location' | 'identifier';

// Field type display configuration
export const FIELD_TYPE_CONFIG: Record<string, {
  label: string;
  description: string;
  options: string[] | null;
  displayOptions: string[] | null;
  icon?: FieldTypeIconName;
  category?: string;
  /** Whether this field type inherently contains PII */
  containsPII?: boolean;
  /** The PII category for fields that contain PII by design */
  piiCategory?: FieldPiiCategory;
  /** Warning message for admin when creating fields of this type */
  piiWarning?: string;
}> = {
  // Basic types
  [FIELD_TYPES.PASS_FAIL]: {
    label: 'Pass / Fail',
    description: 'Binary pass/fail check',
    options: ['pass', 'fail'],
    displayOptions: ['Pass', 'Fail'],
    icon: 'check-circle',
    category: 'basic',
  },
  [FIELD_TYPES.YES_NO]: {
    label: 'Yes / No',
    description: 'Binary yes/no question',
    options: ['yes', 'no'],
    displayOptions: ['Yes', 'No'],
    icon: 'help-circle',
    category: 'basic',
  },
  [FIELD_TYPES.CONDITION]: {
    label: 'Condition',
    description: 'Three-level condition assessment',
    options: ['good', 'fair', 'poor'],
    displayOptions: ['Good', 'Fair', 'Poor'],
    icon: 'gauge',
    category: 'basic',
  },
  [FIELD_TYPES.SEVERITY]: {
    label: 'Severity',
    description: 'Hazard severity rating',
    options: ['low', 'medium', 'high'],
    displayOptions: ['Low', 'Medium', 'High'],
    icon: 'alert-triangle',
    category: 'basic',
  },
  [FIELD_TYPES.TEXT]: {
    label: 'Text',
    description: 'Free text input',
    options: null,
    displayOptions: null,
    icon: 'type',
    category: 'basic',
    piiWarning: 'Text fields can contain personal data. Consider using dedicated field types (Email, Phone) for personal information.',
  },
  [FIELD_TYPES.NUMBER]: {
    label: 'Number',
    description: 'Numeric input',
    options: null,
    displayOptions: null,
    icon: 'hash',
    category: 'basic',
  },
  [FIELD_TYPES.SELECT]: {
    label: 'Single Select',
    description: 'Single choice from list',
    options: null,
    displayOptions: null,
    icon: 'list',
    category: 'basic',
  },
  [FIELD_TYPES.MULTI_SELECT]: {
    label: 'Multi Select',
    description: 'Multiple choices from list',
    options: null,
    displayOptions: null,
    icon: 'check-square',
    category: 'basic',
  },

  // Rating & Scales
  [FIELD_TYPES.RATING]: {
    label: 'Rating',
    description: 'Star rating (configurable max)',
    options: null,
    displayOptions: null,
    icon: 'star',
    category: 'rating',
  },
  [FIELD_TYPES.RATING_NUMERIC]: {
    label: 'Numeric Rating',
    description: '1-10 numeric scale',
    options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    displayOptions: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    icon: 'hash',
    category: 'rating',
  },
  [FIELD_TYPES.SLIDER]: {
    label: 'Slider',
    description: '0-100% drag slider',
    options: null,
    displayOptions: null,
    icon: 'gauge',
    category: 'rating',
  },
  [FIELD_TYPES.TRAFFIC_LIGHT]: {
    label: 'Traffic Light',
    description: 'Red/Amber/Green buttons',
    options: ['red', 'amber', 'green'],
    displayOptions: ['Red', 'Amber', 'Green'],
    icon: 'circle',
    category: 'rating',
  },

  // Date & Time
  [FIELD_TYPES.DATE]: {
    label: 'Date',
    description: 'Date picker',
    options: null,
    displayOptions: null,
    icon: 'calendar',
    category: 'datetime',
  },
  [FIELD_TYPES.TIME]: {
    label: 'Time',
    description: 'Time picker',
    options: null,
    displayOptions: null,
    icon: 'clock',
    category: 'datetime',
  },
  [FIELD_TYPES.DATETIME]: {
    label: 'Date & Time',
    description: 'Combined date and time picker',
    options: null,
    displayOptions: null,
    icon: 'calendar',
    category: 'datetime',
  },
  [FIELD_TYPES.EXPIRY_DATE]: {
    label: 'Expiry Date',
    description: 'Date with visual warning when overdue',
    options: null,
    displayOptions: null,
    icon: 'clock',
    category: 'datetime',
  },

  // Measurement & Counting
  [FIELD_TYPES.COUNTER]: {
    label: 'Counter',
    description: 'Tap +/- buttons to count',
    options: null,
    displayOptions: null,
    icon: 'hash',
    category: 'measurement',
  },
  [FIELD_TYPES.MEASUREMENT]: {
    label: 'Measurement',
    description: 'Number + unit (m, cm, ft, mm)',
    options: null,
    displayOptions: null,
    icon: 'ruler',
    category: 'measurement',
  },
  [FIELD_TYPES.TEMPERATURE]: {
    label: 'Temperature',
    description: 'Number + °C/°F toggle',
    options: null,
    displayOptions: null,
    icon: 'thermometer',
    category: 'measurement',
  },
  [FIELD_TYPES.METER_READING]: {
    label: 'Meter Reading',
    description: 'Number input + required photo',
    options: null,
    displayOptions: null,
    icon: 'gauge',
    category: 'measurement',
  },
  [FIELD_TYPES.CURRENCY]: {
    label: 'Currency',
    description: 'Number + currency symbol',
    options: null,
    displayOptions: null,
    icon: 'circle-dollar-sign',
    category: 'measurement',
  },

  // Evidence & Media
  [FIELD_TYPES.PHOTO]: {
    label: 'Photo',
    description: 'Photo capture (mark required in field settings)',
    options: null,
    displayOptions: null,
    icon: 'camera',
    category: 'evidence',
  },
  [FIELD_TYPES.PHOTO_BEFORE_AFTER]: {
    label: 'Before/After Photos',
    description: 'Two linked photos',
    options: null,
    displayOptions: null,
    icon: 'camera',
    category: 'evidence',
  },
  [FIELD_TYPES.VIDEO]: {
    label: 'Video',
    description: 'Short video clip (max 30s)',
    options: null,
    displayOptions: null,
    icon: 'video',
    category: 'evidence',
  },
  [FIELD_TYPES.AUDIO]: {
    label: 'Audio Note',
    description: 'Voice memo recording',
    options: null,
    displayOptions: null,
    icon: 'mic',
    category: 'evidence',
  },
  [FIELD_TYPES.SIGNATURE]: {
    label: 'Signature',
    description: 'Draw signature on screen',
    options: null,
    displayOptions: null,
    icon: 'pen-tool',
    category: 'evidence',
    containsPII: true,
    piiCategory: 'signature',
    piiWarning: 'Signatures are personal data and create GDPR obligations.',
  },
  [FIELD_TYPES.ANNOTATED_PHOTO]: {
    label: 'Annotated Photo',
    description: 'Take photo then draw/mark on it',
    options: null,
    displayOptions: null,
    icon: 'pen-tool',
    category: 'evidence',
  },

  // Location & Assets
  [FIELD_TYPES.GPS_LOCATION]: {
    label: 'GPS Location',
    description: 'Auto-capture coordinates',
    options: null,
    displayOptions: null,
    icon: 'map-pin',
    category: 'location',
    containsPII: true,
    piiCategory: 'location',
    piiWarning: 'GPS data can identify individuals and is considered personal data under GDPR.',
  },
  [FIELD_TYPES.BARCODE_SCAN]: {
    label: 'Barcode/QR Scan',
    description: 'Scan barcode or QR code',
    options: null,
    displayOptions: null,
    icon: 'scan',
    category: 'location',
  },
  [FIELD_TYPES.ASSET_LOOKUP]: {
    label: 'Asset Lookup',
    description: 'Search or scan to link asset',
    options: null,
    displayOptions: null,
    icon: 'tag',
    category: 'location',
  },

  // People
  [FIELD_TYPES.PERSON_PICKER]: {
    label: 'Team Member',
    description: 'Select from team members',
    options: null,
    displayOptions: null,
    icon: 'user',
    category: 'people',
    containsPII: true,
    piiCategory: 'name',
    piiWarning: 'Stores personal identifiers. Data subject access requests may apply.',
  },
  [FIELD_TYPES.CONTRACTOR]: {
    label: 'Contractor Details',
    description: 'Name + company + phone',
    options: null,
    displayOptions: null,
    icon: 'users',
    category: 'people',
    containsPII: true,
    piiCategory: 'name',
    piiWarning: 'Contains personal data (name, phone). Creates GDPR obligations.',
  },
  [FIELD_TYPES.WITNESS]: {
    label: 'Witness',
    description: 'Name + signature capture',
    options: null,
    displayOptions: null,
    icon: 'eye',
    category: 'people',
    containsPII: true,
    piiCategory: 'name',
    piiWarning: 'Contains personal data (name, signature). Creates GDPR obligations.',
  },

  // Smart/Advanced
  [FIELD_TYPES.DECLARATION]: {
    label: 'Declaration',
    description: 'Text acknowledgment with checkbox',
    options: null,
    displayOptions: null,
    icon: 'file-text',
    category: 'advanced',
  },
  [FIELD_TYPES.INSTRUCTION]: {
    label: 'Instruction',
    description: 'Display-only text/image (no input)',
    options: null,
    displayOptions: null,
    icon: 'info',
    category: 'advanced',
  },
  [FIELD_TYPES.CHECKLIST]: {
    label: 'Checklist',
    description: 'Nested checkboxes within an item',
    options: null,
    displayOptions: null,
    icon: 'clipboard-list',
    category: 'advanced',
  },
  [FIELD_TYPES.REPEATER]: {
    label: 'Repeater',
    description: 'Add multiple entries of same fields',
    options: null,
    displayOptions: null,
    icon: 'refresh-cw',
    category: 'advanced',
  },
  [FIELD_TYPES.AUTO_TIMESTAMP]: {
    label: 'Auto Timestamp',
    description: 'Auto-filled when section completed',
    options: null,
    displayOptions: null,
    icon: 'clock',
    category: 'advanced',
  },
  [FIELD_TYPES.AUTO_WEATHER]: {
    label: 'Auto Weather',
    description: 'Auto-pull current weather',
    options: null,
    displayOptions: null,
    icon: 'cloud-sun',
    category: 'advanced',
  },
  [FIELD_TYPES.CONDITIONAL]: {
    label: 'Conditional',
    description: 'Only shows if trigger condition met',
    options: null,
    displayOptions: null,
    icon: 'help-circle',
    category: 'advanced',
  },

  // Composite Field Groups
  [FIELD_TYPES.COMPOSITE_PERSON_NAME]: {
    label: 'Person Name',
    description: 'First name + last name',
    options: null,
    displayOptions: null,
    icon: 'user',
    category: 'groups',
    containsPII: true,
    piiCategory: 'name',
    piiWarning: 'Person names are personal data and create GDPR obligations.',
  },
  [FIELD_TYPES.COMPOSITE_CONTACT]: {
    label: 'Contact Details',
    description: 'Name + email + phone',
    options: null,
    displayOptions: null,
    icon: 'contact',
    category: 'groups',
    containsPII: true,
    piiCategory: 'name',
    piiWarning: 'Contact details contain personal data and create GDPR obligations.',
  },
  [FIELD_TYPES.COMPOSITE_ADDRESS_UK]: {
    label: 'Address (UK)',
    description: 'Street, city, county, postcode',
    options: null,
    displayOptions: null,
    icon: 'home',
    category: 'groups',
    containsPII: true,
    piiCategory: 'location',
    piiWarning: 'Addresses are personal data and create GDPR obligations.',
  },
  [FIELD_TYPES.COMPOSITE_ADDRESS_US]: {
    label: 'Address (US)',
    description: 'Street, city, state, ZIP',
    options: null,
    displayOptions: null,
    icon: 'home',
    category: 'groups',
    containsPII: true,
    piiCategory: 'location',
    piiWarning: 'Addresses are personal data and create GDPR obligations.',
  },
  [FIELD_TYPES.COMPOSITE_ADDRESS_INTL]: {
    label: 'Address (International)',
    description: 'Street, city, postal code, country',
    options: null,
    displayOptions: null,
    icon: 'globe',
    category: 'groups',
    containsPII: true,
    piiCategory: 'location',
    piiWarning: 'Addresses are personal data and create GDPR obligations.',
  },
  [FIELD_TYPES.COMPOSITE_VEHICLE]: {
    label: 'Vehicle',
    description: 'Make, model, registration, color',
    options: null,
    displayOptions: null,
    icon: 'car',
    category: 'groups',
    containsPII: true,
    piiCategory: 'identifier',
    piiWarning: 'Vehicle registration numbers can identify individuals and create GDPR obligations.',
  },
};

// Values that trigger "on_fail" photo rule
export const FAIL_VALUES = ['fail', 'no', 'poor', 'high', 'medium', 'red', 'amber'];

// Unit presets for measurement fields
export const UNIT_PRESETS = {
  length: {
    label: 'Length',
    units: ['m', 'cm', 'mm', 'ft', 'in'],
    defaultUnit: 'm',
  },
  temperature: {
    label: 'Temperature',
    units: ['°C', '°F'],
    defaultUnit: '°C',
  },
  currency: {
    label: 'Currency',
    units: ['£', '$', '€', '¥'],
    defaultUnit: '£',
  },
  weight: {
    label: 'Weight',
    units: ['kg', 'g', 'lb', 'oz'],
    defaultUnit: 'kg',
  },
  volume: {
    label: 'Volume',
    units: ['L', 'mL', 'gal'],
    defaultUnit: 'L',
  },
  area: {
    label: 'Area',
    units: ['m²', 'ft²', 'sqm'],
    defaultUnit: 'm²',
  },
} as const;

export const USER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const REPORT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
} as const;

export type ReportStatus = typeof REPORT_STATUS[keyof typeof REPORT_STATUS];

// ============================================
// PII Helper Functions
// ============================================

/**
 * Check if a field type inherently contains PII by design
 */
export function fieldTypeContainsPII(fieldType: string): boolean {
  const config = FIELD_TYPE_CONFIG[fieldType];
  return config?.containsPII === true;
}

/**
 * Get the PII category for a field type (if it contains PII)
 */
export function getFieldTypePiiCategory(fieldType: string): FieldPiiCategory | null {
  const config = FIELD_TYPE_CONFIG[fieldType];
  return config?.piiCategory || null;
}

/**
 * Get the PII warning message for a field type (if any)
 */
export function getFieldTypePiiWarning(fieldType: string): string | null {
  const config = FIELD_TYPE_CONFIG[fieldType];
  return config?.piiWarning || null;
}

/**
 * Get all field types that contain PII by design
 */
export function getPiiFieldTypes(): string[] {
  return Object.entries(FIELD_TYPE_CONFIG)
    .filter(([, config]) => config.containsPII === true)
    .map(([type]) => type);
}

// ============================================
// Composite Field Definitions
// ============================================

/**
 * Sub-field definition for composite field types
 */
export interface CompositeSubField {
  /** Unique key for this sub-field (used in JSON storage) */
  key: string;
  /** Display label */
  label: string;
  /** Input type */
  type: 'text' | 'email' | 'phone' | 'select';
  /** Whether this sub-field is required */
  required: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Options for select type */
  options?: string[];
  /** Validation pattern */
  validation?: RegExp;
  /** Validation error message */
  validationMessage?: string;
  /** Layout hint: full width or half width */
  width?: 'full' | 'half';
}

/**
 * Composite field type definition
 */
export interface CompositeDefinition {
  /** Display label */
  label: string;
  /** Brief description */
  description: string;
  /** Icon name */
  icon: FieldTypeIconName;
  /** Sub-field definitions */
  subFields: CompositeSubField[];
  /** Whether this composite contains PII */
  containsPII: boolean;
  /** PII category */
  piiCategory: FieldPiiCategory;
}

/**
 * Custom sub-field definition (user-defined additional fields)
 * Simpler than CompositeSubField - no validation patterns
 */
export interface CustomSubField {
  /** Unique key for this sub-field (auto-generated from label) */
  key: string;
  /** Display label */
  label: string;
  /** Input type */
  type: 'text' | 'email' | 'phone' | 'select';
  /** Whether this sub-field is required */
  required: boolean;
  /** Layout hint: full width or half width */
  width: 'full' | 'half';
  /** Placeholder text */
  placeholder?: string;
  /** Options for select type */
  options?: string[];
}

/**
 * Get custom sub-fields from field options
 */
export function getCustomSubFields(options: unknown): CustomSubField[] {
  if (options && typeof options === 'object' && 'customSubFields' in options) {
    return (options as { customSubFields: CustomSubField[] }).customSubFields || [];
  }
  return [];
}

/**
 * Generate a unique key from a label
 */
export function generateSubFieldKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// US States for address
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

// Common countries for international address
export const COUNTRIES = [
  'United Kingdom', 'United States', 'Canada', 'Australia', 'Ireland',
  'France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Belgium',
  'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Portugal', 'Poland', 'New Zealand', 'South Africa', 'India',
  'Japan', 'China', 'Singapore', 'Hong Kong', 'UAE', 'Brazil', 'Mexico',
];

// Common vehicle colors
export const VEHICLE_COLORS = [
  'White', 'Black', 'Silver', 'Grey', 'Blue', 'Red', 'Green',
  'Brown', 'Beige', 'Orange', 'Yellow', 'Gold', 'Purple', 'Other',
];

/**
 * Composite field definitions with sub-field schemas
 */
export const COMPOSITE_DEFINITIONS: Record<string, CompositeDefinition> = {
  [FIELD_TYPES.COMPOSITE_PERSON_NAME]: {
    label: 'Person Name',
    description: 'First name + last name',
    icon: 'user',
    subFields: [
      {
        key: 'firstName',
        label: 'First Name',
        type: 'text',
        required: true,
        placeholder: 'First name',
        width: 'half',
      },
      {
        key: 'lastName',
        label: 'Last Name',
        type: 'text',
        required: true,
        placeholder: 'Last name',
        width: 'half',
      },
    ],
    containsPII: true,
    piiCategory: 'name',
  },

  [FIELD_TYPES.COMPOSITE_CONTACT]: {
    label: 'Contact Details',
    description: 'Name + email + phone',
    icon: 'contact',
    subFields: [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        required: false,
        placeholder: 'Contact name',
        width: 'full',
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        required: false,
        placeholder: 'email@example.com',
        validation: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        validationMessage: 'Please enter a valid email address',
        width: 'full',
      },
      {
        key: 'phone',
        label: 'Phone',
        type: 'phone',
        required: false,
        placeholder: '+44 7911 123456',
        validation: /^[\d\s\-+()]{7,}$/,
        validationMessage: 'Please enter a valid phone number',
        width: 'full',
      },
    ],
    containsPII: true,
    piiCategory: 'name',
  },

  [FIELD_TYPES.COMPOSITE_ADDRESS_UK]: {
    label: 'Address (UK)',
    description: 'Street, city, county, postcode',
    icon: 'home',
    subFields: [
      {
        key: 'street',
        label: 'Street Address',
        type: 'text',
        required: true,
        placeholder: '123 High Street',
        width: 'full',
      },
      {
        key: 'city',
        label: 'City / Town',
        type: 'text',
        required: true,
        placeholder: 'London',
        width: 'half',
      },
      {
        key: 'county',
        label: 'County',
        type: 'text',
        required: false,
        placeholder: 'Greater London',
        width: 'half',
      },
      {
        key: 'postcode',
        label: 'Postcode',
        type: 'text',
        required: true,
        placeholder: 'SW1A 1AA',
        validation: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
        validationMessage: 'Please enter a valid UK postcode',
        width: 'half',
      },
    ],
    containsPII: true,
    piiCategory: 'location',
  },

  [FIELD_TYPES.COMPOSITE_ADDRESS_US]: {
    label: 'Address (US)',
    description: 'Street, city, state, ZIP',
    icon: 'home',
    subFields: [
      {
        key: 'street',
        label: 'Street Address',
        type: 'text',
        required: true,
        placeholder: '123 Main Street',
        width: 'full',
      },
      {
        key: 'city',
        label: 'City',
        type: 'text',
        required: true,
        placeholder: 'New York',
        width: 'half',
      },
      {
        key: 'state',
        label: 'State',
        type: 'select',
        required: true,
        options: US_STATES,
        width: 'half',
      },
      {
        key: 'zip',
        label: 'ZIP Code',
        type: 'text',
        required: true,
        placeholder: '10001',
        validation: /^\d{5}(-\d{4})?$/,
        validationMessage: 'Please enter a valid ZIP code',
        width: 'half',
      },
    ],
    containsPII: true,
    piiCategory: 'location',
  },

  [FIELD_TYPES.COMPOSITE_ADDRESS_INTL]: {
    label: 'Address (International)',
    description: 'Street, city, postal code, country',
    icon: 'globe',
    subFields: [
      {
        key: 'street',
        label: 'Street Address',
        type: 'text',
        required: true,
        placeholder: '123 Example Street',
        width: 'full',
      },
      {
        key: 'city',
        label: 'City',
        type: 'text',
        required: true,
        placeholder: 'City',
        width: 'half',
      },
      {
        key: 'stateProvince',
        label: 'State / Province',
        type: 'text',
        required: false,
        placeholder: 'State or Province',
        width: 'half',
      },
      {
        key: 'postalCode',
        label: 'Postal Code',
        type: 'text',
        required: false,
        placeholder: 'Postal code',
        width: 'half',
      },
      {
        key: 'country',
        label: 'Country',
        type: 'select',
        required: true,
        options: COUNTRIES,
        width: 'half',
      },
    ],
    containsPII: true,
    piiCategory: 'location',
  },

  [FIELD_TYPES.COMPOSITE_VEHICLE]: {
    label: 'Vehicle',
    description: 'Make, model, registration, color',
    icon: 'car',
    subFields: [
      {
        key: 'make',
        label: 'Make',
        type: 'text',
        required: true,
        placeholder: 'Ford',
        width: 'half',
      },
      {
        key: 'model',
        label: 'Model',
        type: 'text',
        required: true,
        placeholder: 'Transit',
        width: 'half',
      },
      {
        key: 'registration',
        label: 'Registration / Plate',
        type: 'text',
        required: true,
        placeholder: 'AB12 CDE',
        width: 'half',
      },
      {
        key: 'color',
        label: 'Color',
        type: 'select',
        required: false,
        options: VEHICLE_COLORS,
        width: 'half',
      },
    ],
    containsPII: true,
    piiCategory: 'identifier',
  },
};

// ============================================
// Composite Field Helper Functions
// ============================================

/**
 * Check if a field type is a composite type
 */
export function isCompositeFieldType(fieldType: string): boolean {
  return fieldType.startsWith('composite_');
}

/**
 * Get the composite definition for a field type
 */
export function getCompositeDefinition(fieldType: string): CompositeDefinition | null {
  return COMPOSITE_DEFINITIONS[fieldType] || null;
}

/**
 * Parse a composite field value from JSON string
 */
export function parseCompositeValue(value: string | null): Record<string, string | null> {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

/**
 * Format composite value for storage as JSON string
 */
export function formatCompositeValue(values: Record<string, string | null>): string {
  return JSON.stringify(values);
}

/**
 * Format composite value for display (e.g., in lists)
 */
export function formatCompositeDisplay(value: string | null, fieldType: string): string {
  const parsed = parseCompositeValue(value);

  switch (fieldType) {
    case FIELD_TYPES.COMPOSITE_PERSON_NAME:
      return [parsed.firstName, parsed.lastName].filter(Boolean).join(' ');

    case FIELD_TYPES.COMPOSITE_CONTACT:
      return [parsed.name, parsed.email, parsed.phone].filter(Boolean).join(', ');

    case FIELD_TYPES.COMPOSITE_ADDRESS_UK:
      return [parsed.street, parsed.city, parsed.postcode].filter(Boolean).join(', ');

    case FIELD_TYPES.COMPOSITE_ADDRESS_US:
      return [parsed.street, parsed.city, parsed.state, parsed.zip].filter(Boolean).join(', ');

    case FIELD_TYPES.COMPOSITE_ADDRESS_INTL:
      return [parsed.street, parsed.city, parsed.country].filter(Boolean).join(', ');

    case FIELD_TYPES.COMPOSITE_VEHICLE:
      return [parsed.make, parsed.model, parsed.registration].filter(Boolean).join(' - ');

    default:
      return Object.values(parsed).filter(Boolean).join(', ');
  }
}

/**
 * Validate a composite field value
 */
export function validateCompositeValue(
  fieldType: string,
  value: Record<string, string | null>
): { valid: boolean; errors: Record<string, string> } {
  const definition = COMPOSITE_DEFINITIONS[fieldType];
  const errors: Record<string, string> = {};

  if (!definition) {
    return { valid: true, errors };
  }

  for (const subField of definition.subFields) {
    const subValue = value[subField.key];

    // Required check
    if (subField.required && !subValue?.trim()) {
      errors[subField.key] = `${subField.label} is required`;
      continue;
    }

    // Pattern validation
    if (subValue && subField.validation && !subField.validation.test(subValue)) {
      errors[subField.key] = subField.validationMessage || `Invalid ${subField.label.toLowerCase()}`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Get all composite field types
 */
export function getCompositeFieldTypes(): string[] {
  return Object.keys(COMPOSITE_DEFINITIONS);
}
