/**
 * Healthcare & Care Templates (5)
 */

import type { TemplateDefinition } from './types';
import { SIGN_OFF_ITEMS } from './types';

export const healthcareTemplates: TemplateDefinition[] = [
  // ============================================
  // 1. Patient Room Inspection
  // ============================================
  {
    id: 'healthcare-patient-room',
    name: 'Patient Room Inspection',
    description: 'Hospital or care home patient room cleanliness and safety check',
    record_type_id: 'healthcare',
    sections: [
      {
        name: 'Room Details',
        items: [
          { label: 'Room/Bed Number', item_type: 'text', is_required: true },
          { label: 'Ward/Unit', item_type: 'text' },
          { label: 'Room Type', item_type: 'select', options: ['Single', 'Double', 'Bay (4)', 'Bay (6)', 'Isolation'] },
          { label: 'Currently Occupied', item_type: 'yes_no' },
        ],
      },
      {
        name: 'Cleanliness',
        items: [
          { label: 'Floor Clean', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Bed Frame Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Mattress Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Bedside Locker Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Over-bed Table Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Window Sills Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Curtain/Privacy Screen Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'High Touch Points Cleaned', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Bathroom (if en-suite)',
        items: [
          { label: 'Toilet Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Sink Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Shower/Bath Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Floor Clean & Dry', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hand Wash Dispenser Full', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Paper Towels Stocked', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Safety',
        items: [
          { label: 'Call Bell Working', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Call Bell Within Reach', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Bed Rails Functioning', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Trip Hazards', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Lighting Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Emergency Equipment Accessible', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Equipment',
        items: [
          { label: 'Oxygen Supply (if needed)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Suction Equipment (if needed)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'TV/Entertainment Working', item_type: 'pass_fail' },
          { label: 'Air Conditioning/Heating', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Overall Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Maintenance Required', item_type: 'yes_no' },
          { label: 'Maintenance Details', item_type: 'text' },
          { label: 'Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 2. Medical Equipment Check
  // ============================================
  {
    id: 'healthcare-equipment',
    name: 'Medical Equipment Check',
    description: 'Medical device and equipment safety inspection',
    record_type_id: 'healthcare',
    sections: [
      {
        name: 'Equipment Details',
        items: [
          { label: 'Equipment Type', item_type: 'select', is_required: true, options: ['Defibrillator', 'Infusion Pump', 'Patient Monitor', 'Ventilator', 'Suction Unit', 'Hoist', 'Bed', 'Wheelchair', 'Other'] },
          { label: 'Equipment Name/Model', item_type: 'text', is_required: true },
          { label: 'Asset/Serial Number', item_type: 'barcode_scan', is_required: true },
          { label: 'Location', item_type: 'text' },
          { label: 'Manufacturer', item_type: 'text' },
        ],
      },
      {
        name: 'Service Status',
        items: [
          { label: 'Last Service Date', item_type: 'date' },
          { label: 'Next Service Due', item_type: 'expiry_date', warning_days_before: 30 },
          { label: 'PAT Test Date', item_type: 'date' },
          { label: 'PAT Test Due', item_type: 'expiry_date', warning_days_before: 30 },
        ],
      },
      {
        name: 'Physical Inspection',
        items: [
          { label: 'External Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Casing Intact', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Visible Damage', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Clean & Hygienic', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Labels Legible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Cables/Leads Intact', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Functional Check',
        items: [
          { label: 'Powers On', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Self-Test Passes', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Battery Status (if applicable)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Alarms Function', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Controls Respond', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Accessories',
        items: [
          { label: 'All Accessories Present', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Accessories Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'User Manual Available', item_type: 'yes_no' },
        ],
      },
      {
        name: 'Outcome',
        items: [
          { label: 'Equipment Status', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Safe for Use', item_type: 'yes_no', is_required: true },
          { label: 'Action Required', item_type: 'text', placeholder_text: 'List any actions needed' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 5 },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 3. Infection Control Audit
  // ============================================
  {
    id: 'healthcare-infection',
    name: 'Infection Control Audit',
    description: 'Infection prevention and control compliance audit',
    record_type_id: 'healthcare',
    sections: [
      {
        name: 'Audit Details',
        items: [
          { label: 'Ward/Department', item_type: 'text', is_required: true },
          { label: 'Audit Date', item_type: 'date', is_required: true },
          { label: 'Audit Type', item_type: 'select', options: ['Routine', 'Outbreak Investigation', 'Follow-up', 'Spot Check'] },
        ],
      },
      {
        name: 'Hand Hygiene',
        items: [
          { label: 'Hand Wash Sinks Available', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Soap Dispensers Stocked', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Paper Towels Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Alcohol Gel at Point of Care', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Hand Hygiene Posters Displayed', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Staff Observed Washing Hands', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'PPE',
        items: [
          { label: 'Gloves Available', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Aprons Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Masks Available (where needed)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'PPE Disposed Correctly', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'PPE Station Organised', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Waste Management',
        items: [
          { label: 'Clinical Waste Bins Available', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Correct Waste Segregation', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Sharps Bins Not Overfilled', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Sharps Bins Signed/Dated', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Domestic Waste Managed', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Environmental Cleanliness',
        items: [
          { label: 'Floors Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'High Touch Points Clean', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Equipment Clean Between Patients', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Cleaning Schedule Displayed', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Cleaning Documented', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Linen & Laundry',
        items: [
          { label: 'Clean Linen Stored Correctly', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Dirty Linen Bagged Correctly', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Infected Linen Separate', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Isolation',
        items: [
          { label: 'Isolation Rooms Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Signage Correct', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Precautions Being Followed', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Overall Compliance', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Compliance Score', item_type: 'slider' },
          { label: 'Corrective Actions', item_type: 'text', placeholder_text: 'List required corrective actions' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 4. Care Home Room Inspection
  // ============================================
  {
    id: 'healthcare-care-home',
    name: 'Care Home Room Inspection',
    description: 'Residential care home room condition and safety check',
    record_type_id: 'healthcare',
    sections: [
      {
        name: 'Room Details',
        items: [
          { label: 'Room Number', item_type: 'text', is_required: true },
          { label: 'Resident Name', item_type: 'composite_person_name' },
          { label: 'Room Type', item_type: 'select', options: ['Single', 'Double', 'Suite'] },
          { label: 'Resident Present', item_type: 'yes_no' },
        ],
      },
      {
        name: 'Cleanliness',
        items: [
          { label: 'Floor Clean', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Furniture Clean', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Windows Clean', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Bathroom Clean', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fresh Linen', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Unpleasant Odours', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Safety',
        items: [
          { label: 'Call Bell Working', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Call Bell Accessible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Trip Hazards', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Grab Rails Secure', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Lighting Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Temperature Comfortable', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Window Restrictors Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Furniture & Fittings',
        items: [
          { label: 'Bed Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Mattress Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Chair Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Wardrobe/Storage', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'TV/Entertainment', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Personal Items',
        items: [
          { label: 'Personal Items Visible', item_type: 'yes_no' },
          { label: 'Photos/Decorations', item_type: 'yes_no' },
          { label: 'Room Feels Homely', item_type: 'yes_no' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Overall Condition', item_type: 'rating', is_required: true, rating_max: 5 },
          { label: 'Maintenance Required', item_type: 'yes_no' },
          { label: 'Maintenance Details', item_type: 'text' },
          { label: 'Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 5. Pharmacy Audit
  // ============================================
  {
    id: 'healthcare-pharmacy',
    name: 'Pharmacy Audit',
    description: 'Pharmacy stock, storage, and compliance audit',
    record_type_id: 'healthcare',
    sections: [
      {
        name: 'Location Details',
        items: [
          { label: 'Pharmacy/Drug Room Location', item_type: 'text', is_required: true },
          { label: 'Audit Date', item_type: 'date', is_required: true },
          { label: 'Auditor Name', item_type: 'text' },
        ],
      },
      {
        name: 'Security',
        items: [
          { label: 'Room Locked When Unattended', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Controlled Drugs Cabinet Locked', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Keys Secure', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Access Log Maintained', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Storage Conditions',
        items: [
          { label: 'Room Temperature', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
          { label: 'Temperature Within Range (15-25°C)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fridge Temperature', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
          { label: 'Fridge Temp Within Range (2-8°C)', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Temperature Records Up to Date', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Room Clean & Tidy', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Stock Management',
        items: [
          { label: 'No Expired Stock', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Short Dated Items Flagged', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Stock Rotated (FIFO)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Stock Levels Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Emergency Drugs Available', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Controlled Drugs',
        items: [
          { label: 'CD Register Up to Date', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Stock Balance Correct', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Two Signatures for Administration', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Destruction Witnessed & Documented', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Documentation',
        items: [
          { label: 'Prescription Charts Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Administration Records Complete', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Error Reporting Process', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Overall Compliance', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Issues Found', item_type: 'text', placeholder_text: 'List any issues requiring action' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },
];
