/**
 * Property & Real Estate Templates (7)
 */

import type { TemplateDefinition } from './types';
import {
  ROOM_INSPECTION_ITEMS,
  KITCHEN_INSPECTION_ITEMS,
  BATHROOM_INSPECTION_ITEMS,
  TENANT_SIGN_OFF_ITEMS,
  SIGN_OFF_ITEMS,
} from './types';

export const propertyTemplates: TemplateDefinition[] = [
  // ============================================
  // 1. Full Property Inventory
  // ============================================
  {
    id: 'property-full-inventory',
    name: 'Full Property Inventory',
    description: 'Comprehensive property inventory for move-in/move-out with all rooms and meter readings',
    record_type_id: 'property',
    sections: [
      {
        name: 'Property Details',
        items: [
          { label: 'Property Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Landlord/Agent', item_type: 'composite_contact' },
          { label: 'Tenant Name', item_type: 'composite_person_name' },
          { label: 'Inspection Type', item_type: 'select', is_required: true, options: ['Check-In', 'Check-Out', 'Mid-Term', 'Interim'] },
          { label: 'Inspection Date', item_type: 'date', is_required: true },
          { label: 'Property Type', item_type: 'select', options: ['House', 'Flat', 'Maisonette', 'Bungalow', 'Studio', 'Room', 'Commercial'] },
          { label: 'Furnished Status', item_type: 'select', options: ['Unfurnished', 'Part Furnished', 'Fully Furnished'] },
          { label: 'Number of Bedrooms', item_type: 'counter', counter_min: 0, counter_max: 10 },
        ],
      },
      {
        name: 'Meter Readings',
        items: [
          { label: 'Electric Meter', item_type: 'meter_reading', photo_rule: 'always', help_text: 'Photo the meter dial' },
          { label: 'Gas Meter', item_type: 'meter_reading', photo_rule: 'always', help_text: 'Photo the meter dial (if applicable)' },
          { label: 'Water Meter', item_type: 'meter_reading', photo_rule: 'always', help_text: 'Photo the meter dial (if applicable)' },
        ],
      },
      {
        name: 'Keys & Access',
        items: [
          { label: 'Front Door Keys', item_type: 'counter', counter_min: 0, counter_max: 10 },
          { label: 'Back Door Keys', item_type: 'counter', counter_min: 0, counter_max: 10 },
          { label: 'Window Keys', item_type: 'counter', counter_min: 0, counter_max: 10 },
          { label: 'Garage Keys', item_type: 'counter', counter_min: 0, counter_max: 10 },
          { label: 'Post Box Keys', item_type: 'counter', counter_min: 0, counter_max: 10 },
          { label: 'Fobs/Remotes', item_type: 'counter', counter_min: 0, counter_max: 10 },
          { label: 'Alarm Code', item_type: 'text', placeholder_text: 'Alarm code if applicable' },
          { label: 'Key Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Entrance Hall',
        items: ROOM_INSPECTION_ITEMS,
      },
      {
        name: 'Living Room',
        items: [
          ...ROOM_INSPECTION_ITEMS,
          { label: 'Fireplace', item_type: 'condition', photo_rule: 'on_fail', help_text: 'If present' },
        ],
      },
      {
        name: 'Kitchen',
        items: KITCHEN_INSPECTION_ITEMS,
      },
      {
        name: 'Bedroom 1 (Master)',
        items: [
          ...ROOM_INSPECTION_ITEMS,
          { label: 'Built-in Wardrobes', item_type: 'condition', photo_rule: 'on_fail', help_text: 'If present' },
        ],
      },
      {
        name: 'Bedroom 2',
        items: ROOM_INSPECTION_ITEMS,
      },
      {
        name: 'Bedroom 3',
        items: ROOM_INSPECTION_ITEMS,
      },
      {
        name: 'Bathroom',
        items: BATHROOM_INSPECTION_ITEMS,
      },
      {
        name: 'En-Suite',
        items: BATHROOM_INSPECTION_ITEMS,
      },
      {
        name: 'Garden/Exterior',
        items: [
          { label: 'Front Garden', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Back Garden', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Patio/Decking', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Fencing', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Shed/Outbuilding', item_type: 'condition', photo_rule: 'on_fail', help_text: 'If present' },
          { label: 'Garage', item_type: 'condition', photo_rule: 'on_fail', help_text: 'If present' },
          { label: 'Driveway', item_type: 'condition', photo_rule: 'on_fail', help_text: 'If present' },
          { label: 'Exterior Photos', item_type: 'photo', max_media_count: 10 },
          { label: 'Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Sign Off',
        items: TENANT_SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 2. Move-In Inspection
  // ============================================
  {
    id: 'property-move-in',
    name: 'Move-In Inspection',
    description: 'Standard check-in inspection for new tenancy start',
    record_type_id: 'property',
    sections: [
      {
        name: 'Property Details',
        items: [
          { label: 'Property Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Tenant Name', item_type: 'composite_person_name', is_required: true },
          { label: 'Tenancy Start Date', item_type: 'date', is_required: true },
          { label: 'Agent/Landlord', item_type: 'composite_contact' },
        ],
      },
      {
        name: 'Meter Readings',
        items: [
          { label: 'Electric Meter', item_type: 'meter_reading', is_required: true, photo_rule: 'always' },
          { label: 'Gas Meter', item_type: 'meter_reading', photo_rule: 'always' },
          { label: 'Water Meter', item_type: 'meter_reading', photo_rule: 'always' },
        ],
      },
      {
        name: 'Keys Handed Over',
        items: [
          { label: 'Keys Checklist', item_type: 'checklist', sub_items: ['Front door', 'Back door', 'Windows', 'Garage', 'Post box', 'Fobs/remotes'] },
          { label: 'Total Keys', item_type: 'counter', counter_min: 0, counter_max: 20 },
        ],
      },
      {
        name: 'Safety Checks',
        items: [
          { label: 'Smoke Alarms Tested', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'CO Alarm Tested', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Gas Safety Certificate Valid', item_type: 'yes_no', is_required: true },
          { label: 'EICR Valid', item_type: 'yes_no', is_required: true },
          { label: 'EPC Provided', item_type: 'yes_no' },
        ],
      },
      {
        name: 'Property Overview',
        items: [
          { label: 'General Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Cleanliness', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Any Issues Noted', item_type: 'text', placeholder_text: 'List any issues found during check-in' },
          { label: 'Photos', item_type: 'photo', max_media_count: 20 },
        ],
      },
      {
        name: 'Sign Off',
        items: TENANT_SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 3. Move-Out Inspection
  // ============================================
  {
    id: 'property-move-out',
    name: 'Move-Out Inspection',
    description: 'End of tenancy check-out inspection with condition comparison',
    record_type_id: 'property',
    sections: [
      {
        name: 'Property Details',
        items: [
          { label: 'Property Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Tenant Name', item_type: 'composite_person_name', is_required: true },
          { label: 'Tenancy End Date', item_type: 'date', is_required: true },
          { label: 'Agent/Landlord', item_type: 'composite_contact' },
        ],
      },
      {
        name: 'Meter Readings',
        items: [
          { label: 'Electric Meter (Final)', item_type: 'meter_reading', is_required: true, photo_rule: 'always' },
          { label: 'Gas Meter (Final)', item_type: 'meter_reading', photo_rule: 'always' },
          { label: 'Water Meter (Final)', item_type: 'meter_reading', photo_rule: 'always' },
        ],
      },
      {
        name: 'Keys Returned',
        items: [
          { label: 'All Keys Returned', item_type: 'yes_no', is_required: true, photo_rule: 'on_no' },
          { label: 'Keys Returned Count', item_type: 'counter', counter_min: 0, counter_max: 20 },
          { label: 'Keys Missing', item_type: 'text', placeholder_text: 'List any missing keys' },
        ],
      },
      {
        name: 'Condition Comparison',
        items: [
          { label: 'General Condition vs Check-In', item_type: 'select', is_required: true, options: ['Same', 'Better', 'Worse', 'Significantly Worse'] },
          { label: 'Cleanliness', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Professional Clean Required', item_type: 'yes_no' },
          { label: 'Damage Found', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Damage Details', item_type: 'text', placeholder_text: 'Describe any damage found' },
          { label: 'Before/After Photos', item_type: 'photo_before_after' },
        ],
      },
      {
        name: 'Room by Room Check',
        items: [
          { label: 'Living Areas', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Kitchen', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Bedrooms', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Bathrooms', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Garden/Exterior', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 20 },
        ],
      },
      {
        name: 'Deposit Deductions',
        items: [
          { label: 'Deductions Required', item_type: 'yes_no' },
          { label: 'Cleaning Deduction', item_type: 'currency', unit_type: 'currency', default_unit: '£' },
          { label: 'Damage Deduction', item_type: 'currency', unit_type: 'currency', default_unit: '£' },
          { label: 'Key Replacement', item_type: 'currency', unit_type: 'currency', default_unit: '£' },
          { label: 'Deduction Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Sign Off',
        items: TENANT_SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 4. Mid-Tenancy Check
  // ============================================
  {
    id: 'property-mid-tenancy',
    name: 'Mid-Tenancy Check',
    description: 'Routine property inspection during tenancy',
    record_type_id: 'property',
    sections: [
      {
        name: 'Property Details',
        items: [
          { label: 'Property Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Tenant Name', item_type: 'composite_person_name' },
          { label: 'Inspection Date', item_type: 'date', is_required: true },
          { label: 'Tenant Present', item_type: 'yes_no' },
        ],
      },
      {
        name: 'Overall Assessment',
        items: [
          { label: 'General Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Cleanliness', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Garden Maintained', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Property Being Cared For', item_type: 'yes_no', is_required: true },
        ],
      },
      {
        name: 'Safety Checks',
        items: [
          { label: 'Smoke Alarms Working', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'CO Alarm Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Obvious Hazards', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Exits Clear', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Maintenance Issues',
        items: [
          { label: 'Maintenance Required', item_type: 'yes_no' },
          { label: 'Issue Description', item_type: 'text', placeholder_text: 'Describe any maintenance issues' },
          { label: 'Severity', item_type: 'severity', photo_rule: 'on_fail' },
          { label: 'Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Tenant Concerns',
        items: [
          { label: 'Tenant Raised Issues', item_type: 'yes_no' },
          { label: 'Issue Details', item_type: 'text', placeholder_text: 'Details of any issues raised by tenant' },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 5. Landlord Safety Pack
  // ============================================
  {
    id: 'property-landlord-safety',
    name: 'Landlord Safety Pack',
    description: 'Track all required safety certificates and compliance documents',
    record_type_id: 'property',
    sections: [
      {
        name: 'Property Details',
        items: [
          { label: 'Property Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Landlord Name', item_type: 'composite_person_name' },
          { label: 'Managing Agent', item_type: 'composite_contact' },
        ],
      },
      {
        name: 'Gas Safety',
        items: [
          { label: 'Gas Supply Present', item_type: 'yes_no', is_required: true },
          { label: 'Gas Safety Certificate (CP12)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Certificate Expiry Date', item_type: 'expiry_date', warning_days_before: 30 },
          { label: 'Engineer Name', item_type: 'text' },
          { label: 'Gas Safe Registration No', item_type: 'text' },
          { label: 'Certificate Photo', item_type: 'photo', max_media_count: 2 },
        ],
      },
      {
        name: 'Electrical Safety',
        items: [
          { label: 'EICR Valid', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'EICR Expiry Date', item_type: 'expiry_date', warning_days_before: 60 },
          { label: 'Electrician Name', item_type: 'text' },
          { label: 'PAT Testing Done', item_type: 'yes_no' },
          { label: 'PAT Test Date', item_type: 'date' },
          { label: 'Certificate Photo', item_type: 'photo', max_media_count: 2 },
        ],
      },
      {
        name: 'Fire Safety',
        items: [
          { label: 'Smoke Alarms on Each Floor', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'CO Alarm Near Boiler', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fire Blanket in Kitchen', item_type: 'yes_no' },
          { label: 'Fire Extinguisher', item_type: 'yes_no' },
          { label: 'Smoke Alarm Test Date', item_type: 'date' },
        ],
      },
      {
        name: 'Energy Performance',
        items: [
          { label: 'EPC Certificate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'EPC Rating', item_type: 'select', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
          { label: 'EPC Expiry Date', item_type: 'expiry_date', warning_days_before: 90 },
          { label: 'Certificate Photo', item_type: 'photo', max_media_count: 2 },
        ],
      },
      {
        name: 'Other Compliance',
        items: [
          { label: 'Right to Rent Checks Done', item_type: 'yes_no' },
          { label: 'Deposit Protected', item_type: 'yes_no' },
          { label: 'Deposit Scheme', item_type: 'select', options: ['DPS', 'TDS', 'MyDeposits', 'Other'] },
          { label: 'How to Rent Guide Provided', item_type: 'yes_no' },
          { label: 'Legionella Risk Assessment', item_type: 'yes_no' },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 6. HMO Compliance Audit
  // ============================================
  {
    id: 'property-hmo',
    name: 'HMO Compliance Audit',
    description: 'House in Multiple Occupation compliance checklist',
    record_type_id: 'property',
    sections: [
      {
        name: 'Property Details',
        items: [
          { label: 'Property Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'HMO Licence Number', item_type: 'text' },
          { label: 'Licence Expiry Date', item_type: 'expiry_date', warning_days_before: 90 },
          { label: 'Number of Occupants', item_type: 'counter', counter_min: 0, counter_max: 20 },
          { label: 'Number of Households', item_type: 'counter', counter_min: 0, counter_max: 10 },
        ],
      },
      {
        name: 'Fire Safety',
        items: [
          { label: 'Fire Doors Fitted', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fire Doors Self-Closing', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Alarm System', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fire Alarm Grade', item_type: 'select', options: ['Grade A', 'Grade B', 'Grade C', 'Grade D1', 'Grade D2'] },
          { label: 'Fire Blanket in Kitchen', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Extinguishers', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Emergency Lighting', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Exit Signs', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Escape Routes Clear', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fire Risk Assessment Date', item_type: 'date' },
        ],
      },
      {
        name: 'Room Standards',
        items: [
          { label: 'Min. Room Size Met (6.51m² single)', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Adequate Heating', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Adequate Ventilation', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Natural Light', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Room Measurements', item_type: 'text', placeholder_text: 'List room sizes' },
        ],
      },
      {
        name: 'Kitchen Facilities',
        items: [
          { label: 'Kitchen Size Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Cooker (4 rings + oven per 5 people)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Sink with Hot/Cold', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Worktop Space', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Food Storage', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fridge/Freezer', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Waste Disposal', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Bathroom Facilities',
        items: [
          { label: 'Bathroom Ratio (1:5 occupants)', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Hot Water Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Ventilation', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'WC Count', item_type: 'counter', counter_min: 0, counter_max: 10 },
          { label: 'Bath/Shower Count', item_type: 'counter', counter_min: 0, counter_max: 10 },
        ],
      },
      {
        name: 'General Compliance',
        items: [
          { label: 'Gas Safety Certificate', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'EICR Valid', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'PAT Testing', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Manager Contact Displayed', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Waste Collection Arrangements', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 20 },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 7. Commercial Property Survey
  // ============================================
  {
    id: 'property-commercial',
    name: 'Commercial Property Survey',
    description: 'Commercial property condition survey with measurements',
    record_type_id: 'property',
    sections: [
      {
        name: 'Property Details',
        items: [
          { label: 'Property Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Property Type', item_type: 'select', is_required: true, options: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Mixed Use', 'Other'] },
          { label: 'Total Floor Area', item_type: 'measurement', unit_type: 'area', default_unit: 'm²' },
          { label: 'Number of Floors', item_type: 'counter', counter_min: 1, counter_max: 50 },
          { label: 'Year Built', item_type: 'number' },
          { label: 'Last Refurbishment', item_type: 'date' },
        ],
      },
      {
        name: 'External Condition',
        items: [
          { label: 'Roof', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Roof Type', item_type: 'select', options: ['Flat', 'Pitched', 'Metal', 'Other'] },
          { label: 'External Walls', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Windows', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'External Doors', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Signage', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Car Park', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Landscaping', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'External Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Internal Condition',
        items: [
          { label: 'Reception/Entrance', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Common Areas', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Office Areas', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Flooring Overall', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Ceilings', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Internal Walls', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Internal Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Building Services',
        items: [
          { label: 'Heating System', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Heating Type', item_type: 'select', options: ['Gas Central', 'Electric', 'Air Source', 'Ground Source', 'Other'] },
          { label: 'Air Conditioning', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Electrical Installation', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Lighting', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Plumbing', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Fire Alarm System', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Security System', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Lift/Elevator', item_type: 'condition', photo_rule: 'on_fail', help_text: 'If present' },
        ],
      },
      {
        name: 'Compliance',
        items: [
          { label: 'Fire Risk Assessment Current', item_type: 'yes_no', is_required: true },
          { label: 'Asbestos Survey', item_type: 'yes_no' },
          { label: 'DDA Compliance', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'EPC Rating', item_type: 'select', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
        ],
      },
      {
        name: 'Overall Assessment',
        items: [
          { label: 'Overall Condition Rating', item_type: 'rating', rating_max: 5 },
          { label: 'Immediate Repairs Needed', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Estimated Repair Costs', item_type: 'currency', unit_type: 'currency', default_unit: '£' },
          { label: 'Recommendations', item_type: 'text', placeholder_text: 'Key recommendations for property' },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },
];
