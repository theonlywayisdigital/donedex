/**
 * Starter Template Library
 * 84 pre-built inspection templates across 17 categories
 *
 * Categories:
 * - Industry: property, construction, hospitality, healthcare, food, education,
 *             fleet, retail, manufacturing, facilities, events, agriculture, marine
 * - Compliance: UK (11), US (6), International (4), Australia (4)
 */

// Type definitions
export * from './types';

// Industry templates (re-exported with consistent naming)
export { propertyTemplates as PROPERTY_TEMPLATES } from './property';
export { constructionTemplates as CONSTRUCTION_TEMPLATES } from './construction';
export { hospitalityTemplates as HOSPITALITY_TEMPLATES } from './hospitality';
export { healthcareTemplates as HEALTHCARE_TEMPLATES } from './healthcare';
export { foodTemplates as FOOD_TEMPLATES } from './food';
export { educationTemplates as EDUCATION_TEMPLATES } from './education';
export { fleetTemplates as FLEET_TEMPLATES } from './fleet';
export { retailTemplates as RETAIL_TEMPLATES } from './retail';
export { MANUFACTURING_TEMPLATES } from './manufacturing';
export { FACILITIES_TEMPLATES } from './facilities';
export { EVENTS_TEMPLATES } from './events';
export { AGRICULTURE_TEMPLATES } from './agriculture';
export { MARINE_TEMPLATES } from './marine';

// Compliance templates
export { COMPLIANCE_UK_TEMPLATES } from './compliance-uk';
export { COMPLIANCE_US_TEMPLATES } from './compliance-us';
export { COMPLIANCE_INTL_TEMPLATES } from './compliance-intl';
export { COMPLIANCE_AU_TEMPLATES } from './compliance-au';

// Import all templates for combined export
import { propertyTemplates } from './property';
import { constructionTemplates } from './construction';
import { hospitalityTemplates } from './hospitality';
import { healthcareTemplates } from './healthcare';
import { foodTemplates } from './food';
import { educationTemplates } from './education';
import { fleetTemplates } from './fleet';
import { retailTemplates } from './retail';
import { MANUFACTURING_TEMPLATES } from './manufacturing';
import { FACILITIES_TEMPLATES } from './facilities';
import { EVENTS_TEMPLATES } from './events';
import { AGRICULTURE_TEMPLATES } from './agriculture';
import { MARINE_TEMPLATES } from './marine';
import { COMPLIANCE_UK_TEMPLATES } from './compliance-uk';
import { COMPLIANCE_US_TEMPLATES } from './compliance-us';
import { COMPLIANCE_INTL_TEMPLATES } from './compliance-intl';
import { COMPLIANCE_AU_TEMPLATES } from './compliance-au';
import { TemplateDefinition } from './types';

/**
 * Record type definitions for the library_record_types table
 */
export interface RecordTypeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'industry' | 'compliance';
}

export const RECORD_TYPES: RecordTypeDefinition[] = [
  // Industry categories
  {
    id: 'property',
    name: 'Property',
    description: 'Property inspections, inventories, and condition reports',
    icon: 'home',
    color: '#3B82F6', // blue
    category: 'industry',
  },
  {
    id: 'construction',
    name: 'Construction',
    description: 'Construction site safety and quality inspections',
    icon: 'construction',
    color: '#F59E0B', // amber
    category: 'industry',
  },
  {
    id: 'hospitality',
    name: 'Hospitality',
    description: 'Hotel, restaurant, and tourism inspections',
    icon: 'hotel',
    color: '#8B5CF6', // purple
    category: 'industry',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Medical facility and care home inspections',
    icon: 'local-hospital',
    color: '#EF4444', // red
    category: 'industry',
  },
  {
    id: 'food',
    name: 'Food & Beverage',
    description: 'Food safety and hygiene inspections',
    icon: 'restaurant',
    color: '#10B981', // emerald
    category: 'industry',
  },
  {
    id: 'education',
    name: 'Education',
    description: 'School and educational facility inspections',
    icon: 'school',
    color: '#6366F1', // indigo
    category: 'industry',
  },
  {
    id: 'fleet',
    name: 'Fleet & Transport',
    description: 'Vehicle and fleet management inspections',
    icon: 'local-shipping',
    color: '#14B8A6', // teal
    category: 'industry',
  },
  {
    id: 'retail',
    name: 'Retail',
    description: 'Store and retail environment inspections',
    icon: 'store',
    color: '#EC4899', // pink
    category: 'industry',
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Factory and production quality inspections',
    icon: 'precision-manufacturing',
    color: '#64748B', // slate
    category: 'industry',
  },
  {
    id: 'facilities',
    name: 'Facilities',
    description: 'Building and facility maintenance inspections',
    icon: 'apartment',
    color: '#0EA5E9', // sky
    category: 'industry',
  },
  {
    id: 'events',
    name: 'Events',
    description: 'Event venue and production safety inspections',
    icon: 'celebration',
    color: '#F97316', // orange
    category: 'industry',
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'Farm safety and agricultural inspections',
    icon: 'agriculture',
    color: '#22C55E', // green
    category: 'industry',
  },
  {
    id: 'marine',
    name: 'Marine',
    description: 'Vessel and maritime safety inspections',
    icon: 'sailing',
    color: '#0284C7', // light blue
    category: 'industry',
  },
  // Compliance categories
  {
    id: 'compliance-uk',
    name: 'UK Compliance',
    description: 'UK regulatory compliance inspections',
    icon: 'gavel',
    color: '#1E40AF', // blue-800
    category: 'compliance',
  },
  {
    id: 'compliance-us',
    name: 'US Compliance',
    description: 'US regulatory compliance inspections (OSHA, FDA, ADA)',
    icon: 'gavel',
    color: '#B91C1C', // red-700
    category: 'compliance',
  },
  {
    id: 'compliance-intl',
    name: 'International',
    description: 'International standards compliance (ISO, GDPR)',
    icon: 'public',
    color: '#059669', // emerald-600
    category: 'compliance',
  },
  {
    id: 'compliance-au',
    name: 'Australia',
    description: 'Australian regulatory compliance inspections',
    icon: 'gavel',
    color: '#D97706', // amber-600
    category: 'compliance',
  },
];

/**
 * All templates combined into a single array
 */
export const ALL_TEMPLATES: TemplateDefinition[] = [
  ...propertyTemplates,
  ...constructionTemplates,
  ...hospitalityTemplates,
  ...healthcareTemplates,
  ...foodTemplates,
  ...educationTemplates,
  ...fleetTemplates,
  ...retailTemplates,
  ...MANUFACTURING_TEMPLATES,
  ...FACILITIES_TEMPLATES,
  ...EVENTS_TEMPLATES,
  ...AGRICULTURE_TEMPLATES,
  ...MARINE_TEMPLATES,
  ...COMPLIANCE_UK_TEMPLATES,
  ...COMPLIANCE_US_TEMPLATES,
  ...COMPLIANCE_INTL_TEMPLATES,
  ...COMPLIANCE_AU_TEMPLATES,
];

/**
 * Templates organized by record type ID
 */
export const TEMPLATES_BY_RECORD_TYPE: Record<string, TemplateDefinition[]> = {
  property: propertyTemplates,
  construction: constructionTemplates,
  hospitality: hospitalityTemplates,
  healthcare: healthcareTemplates,
  food: foodTemplates,
  education: educationTemplates,
  fleet: fleetTemplates,
  retail: retailTemplates,
  manufacturing: MANUFACTURING_TEMPLATES,
  facilities: FACILITIES_TEMPLATES,
  events: EVENTS_TEMPLATES,
  agriculture: AGRICULTURE_TEMPLATES,
  marine: MARINE_TEMPLATES,
  'compliance-uk': COMPLIANCE_UK_TEMPLATES,
  'compliance-us': COMPLIANCE_US_TEMPLATES,
  'compliance-intl': COMPLIANCE_INTL_TEMPLATES,
  'compliance-au': COMPLIANCE_AU_TEMPLATES,
};

/**
 * Get templates by category (industry or compliance)
 */
export function getTemplatesByCategory(category: 'industry' | 'compliance'): TemplateDefinition[] {
  const recordTypeIds = RECORD_TYPES
    .filter(rt => rt.category === category)
    .map(rt => rt.id);

  return ALL_TEMPLATES.filter(t => recordTypeIds.includes(t.record_type_id));
}

/**
 * Get template count summary
 */
export function getTemplateCounts(): { total: number; byCategory: Record<string, number>; byRecordType: Record<string, number> } {
  const byRecordType: Record<string, number> = {};
  const byCategory: Record<string, number> = { industry: 0, compliance: 0 };

  for (const template of ALL_TEMPLATES) {
    byRecordType[template.record_type_id] = (byRecordType[template.record_type_id] || 0) + 1;

    const recordType = RECORD_TYPES.find(rt => rt.id === template.record_type_id);
    if (recordType) {
      byCategory[recordType.category]++;
    }
  }

  return {
    total: ALL_TEMPLATES.length,
    byCategory,
    byRecordType,
  };
}

/**
 * Search templates by name or description
 */
export function searchTemplates(query: string): TemplateDefinition[] {
  const lowerQuery = query.toLowerCase();
  return ALL_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(id: string): TemplateDefinition | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}
