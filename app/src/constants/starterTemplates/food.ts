/**
 * Food & Beverage Templates (5)
 */

import type { TemplateDefinition } from './types';
import { SIGN_OFF_ITEMS } from './types';

export const foodTemplates: TemplateDefinition[] = [
  // ============================================
  // 1. Kitchen Hygiene Audit
  // ============================================
  {
    id: 'food-kitchen-hygiene',
    name: 'Kitchen Hygiene Audit',
    description: 'Commercial kitchen hygiene and cleanliness inspection',
    record_type_id: 'food',
    sections: [
      {
        name: 'Premises Details',
        items: [
          { label: 'Business Name', item_type: 'text', is_required: true },
          { label: 'Address', item_type: 'composite_address_uk' },
          { label: 'Manager on Duty', item_type: 'text' },
          { label: 'Audit Date', item_type: 'date', is_required: true },
        ],
      },
      {
        name: 'Staff Hygiene',
        items: [
          { label: 'Clean Uniforms Worn', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Hair Covered/Tied Back', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'No Jewellery/Watches', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Hand Washing Observed', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'No Illness/Wounds Visible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Food Handler Training Current', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Food Storage',
        items: [
          { label: 'Fridge Temperature', item_type: 'temperature', is_required: true, unit_type: 'temperature', default_unit: '°C' },
          { label: 'Fridge Temp Acceptable (0-5°C)', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Freezer Temperature', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
          { label: 'Freezer Temp Acceptable (-18°C or below)', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Raw/Cooked Separated', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Food Covered & Labelled', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Date Labels Present', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Stock Rotation (FIFO)', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'No Expired Products', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Food Preparation',
        items: [
          { label: 'Surfaces Clean', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Colour-Coded Boards Used', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Utensils Clean', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Cross-Contamination Prevented', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Probe Thermometer Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Cooking Temps Recorded', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Cleaning',
        items: [
          { label: 'Floor Clean', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Walls & Ceiling Clean', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Equipment Clean', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Extraction Hood Clean', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Cleaning Schedule Displayed', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Cleaning Records Up to Date', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Chemicals Stored Correctly', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Pest Control',
        items: [
          { label: 'No Signs of Pests', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fly Screens on Windows', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Doors Close Properly', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Pest Control Contract', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Waste',
        items: [
          { label: 'Bins Lined & Lidded', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Bins Not Overflowing', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Waste Area Clean', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Waste Disposal Regular', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Overall Assessment',
        items: [
          { label: 'Overall Hygiene Rating', item_type: 'rating', is_required: true, rating_max: 5 },
          { label: 'Issues Found', item_type: 'text', placeholder_text: 'List any issues requiring action' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 15 },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 2. HACCP Compliance Check
  // ============================================
  {
    id: 'food-haccp',
    name: 'HACCP Compliance Check',
    description: 'HACCP critical control points monitoring',
    record_type_id: 'food',
    sections: [
      {
        name: 'Premises Details',
        items: [
          { label: 'Business Name', item_type: 'text', is_required: true },
          { label: 'Date', item_type: 'date', is_required: true },
          { label: 'Shift', item_type: 'select', options: ['Morning', 'Afternoon', 'Evening'] },
          { label: 'Person Completing', item_type: 'text', is_required: true },
        ],
      },
      {
        name: 'CCP1: Delivery/Receiving',
        items: [
          { label: 'Delivery Vehicle Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Chilled Products Temp on Arrival', item_type: 'temperature', is_required: true, unit_type: 'temperature', default_unit: '°C' },
          { label: 'Chilled Temp Acceptable (0-5°C)', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Frozen Products Temp on Arrival', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
          { label: 'Frozen Temp Acceptable (-15°C or below)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Packaging Intact', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Products Within Date', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Rejected Items (if any)', item_type: 'text' },
        ],
      },
      {
        name: 'CCP2: Cold Storage',
        items: [
          { label: 'Fridge 1 Temperature', item_type: 'temperature', is_required: true, unit_type: 'temperature', default_unit: '°C' },
          { label: 'Fridge 2 Temperature', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
          { label: 'Walk-in Chiller Temperature', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
          { label: 'Freezer Temperature', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
          { label: 'All Temps Within Range', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Corrective Action if Out of Range', item_type: 'text' },
        ],
      },
      {
        name: 'CCP3: Cooking',
        items: [
          { label: 'Core Temp Reached (75°C)', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Sample Product & Temp', item_type: 'text', placeholder_text: 'e.g., Chicken breast - 78°C' },
          { label: 'Probe Thermometer Used', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Probe Calibrated', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'CCP4: Cooling',
        items: [
          { label: 'Cooled to 8°C Within 90 mins', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Product & Time Recorded', item_type: 'text' },
          { label: 'Blast Chiller Used', item_type: 'yes_no' },
        ],
      },
      {
        name: 'CCP5: Hot Holding',
        items: [
          { label: 'Hot Hold Temp (>63°C)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Sample Temp Reading', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
          { label: 'Time Limited Display', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'CCP6: Reheating',
        items: [
          { label: 'Reheated to 75°C Core', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Only Reheated Once', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Served Immediately', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Verification',
        items: [
          { label: 'All CCPs Monitored', item_type: 'pass_fail', is_required: true },
          { label: 'Records Complete', item_type: 'pass_fail' },
          { label: 'Corrective Actions Taken', item_type: 'text' },
        ],
      },
      {
        name: 'Sign Off',
        items: [
          { label: 'Completed By', item_type: 'signature', is_required: true, signature_requires_name: true },
          { label: 'Manager Verification', item_type: 'signature', signature_requires_name: true },
          { label: 'Timestamp', item_type: 'auto_timestamp' },
        ],
      },
    ],
  },

  // ============================================
  // 3. Food Storage Inspection
  // ============================================
  {
    id: 'food-storage',
    name: 'Food Storage Inspection',
    description: 'Dry store, fridge, and freezer inspection',
    record_type_id: 'food',
    sections: [
      {
        name: 'Location',
        items: [
          { label: 'Business Name', item_type: 'text', is_required: true },
          { label: 'Inspection Date', item_type: 'date', is_required: true },
          { label: 'Inspector Name', item_type: 'text' },
        ],
      },
      {
        name: 'Dry Store',
        items: [
          { label: 'Clean & Tidy', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Products Off Floor', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Shelving Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Stock Rotated (FIFO)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Expired Products', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'No Pest Evidence', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Chemicals Separated', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Room Temperature', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
        ],
      },
      {
        name: 'Refrigerators',
        items: [
          { label: 'Fridge 1 - Location', item_type: 'text' },
          { label: 'Fridge 1 - Temperature', item_type: 'temperature', is_required: true, unit_type: 'temperature', default_unit: '°C' },
          { label: 'Fridge 1 - Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fridge 2 - Location', item_type: 'text' },
          { label: 'Fridge 2 - Temperature', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
          { label: 'Fridge 2 - Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'All Items Covered', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Date Labels Present', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Raw/Cooked Separated', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'No Expired Products', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Freezers',
        items: [
          { label: 'Freezer 1 - Location', item_type: 'text' },
          { label: 'Freezer 1 - Temperature', item_type: 'temperature', is_required: true, unit_type: 'temperature', default_unit: '°C' },
          { label: 'Freezer 1 - Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Ice Build-up', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Products Well Wrapped', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Stock Identifiable', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Door Seals Intact', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Issues & Actions',
        items: [
          { label: 'Expired Items Found', item_type: 'counter', counter_min: 0, counter_max: 50 },
          { label: 'Items for Disposal', item_type: 'text', placeholder_text: 'List items to be disposed' },
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
  // 4. Restaurant Opening Checklist
  // ============================================
  {
    id: 'food-opening',
    name: 'Restaurant Opening Checklist',
    description: 'Daily opening procedures and checks',
    record_type_id: 'food',
    sections: [
      {
        name: 'Details',
        items: [
          { label: 'Restaurant Name', item_type: 'text', is_required: true },
          { label: 'Date', item_type: 'date', is_required: true },
          { label: 'Opening Manager', item_type: 'text', is_required: true },
          { label: 'Opening Time', item_type: 'auto_timestamp' },
        ],
      },
      {
        name: 'Security & Access',
        items: [
          { label: 'Building Secure Overnight', item_type: 'pass_fail' },
          { label: 'Alarm Deactivated', item_type: 'pass_fail' },
          { label: 'All Lights Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'CCTV Operating', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Kitchen Checks',
        items: [
          { label: 'Fridge Temp Check', item_type: 'temperature', is_required: true, unit_type: 'temperature', default_unit: '°C' },
          { label: 'Fridge Temp OK (0-5°C)', item_type: 'pass_fail', is_required: true },
          { label: 'Freezer Temp Check', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
          { label: 'Freezer Temp OK (-18°C or below)', item_type: 'pass_fail' },
          { label: 'Gas/Electric On', item_type: 'pass_fail' },
          { label: 'Equipment Pre-heated', item_type: 'pass_fail' },
          { label: 'Prep Started', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Front of House',
        items: [
          { label: 'Tables Set', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Floor Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Toilets Checked & Stocked', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Menus Ready', item_type: 'pass_fail' },
          { label: 'POS System On', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Music/Ambience Set', item_type: 'pass_fail' },
          { label: 'Heating/AC Set', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Safety',
        items: [
          { label: 'Fire Exits Clear', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'First Aid Kit Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Accident Book Available', item_type: 'pass_fail' },
          { label: 'Staff Briefed', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Staff',
        items: [
          { label: 'Staff Arrived', item_type: 'counter', counter_min: 0, counter_max: 50 },
          { label: 'Staff in Uniform', item_type: 'pass_fail' },
          { label: 'Any Staff Absences', item_type: 'text' },
        ],
      },
      {
        name: 'Ready to Open',
        items: [
          { label: 'Ready for Customers', item_type: 'yes_no', is_required: true },
          { label: 'Issues to Address', item_type: 'text' },
        ],
      },
    ],
  },

  // ============================================
  // 5. Food Delivery Receiving
  // ============================================
  {
    id: 'food-delivery',
    name: 'Food Delivery Receiving',
    description: 'Goods receiving inspection for food deliveries',
    record_type_id: 'food',
    sections: [
      {
        name: 'Delivery Details',
        items: [
          { label: 'Supplier Name', item_type: 'text', is_required: true },
          { label: 'Delivery Date', item_type: 'date', is_required: true },
          { label: 'Delivery Time', item_type: 'time', is_required: true },
          { label: 'Order/Invoice Number', item_type: 'text' },
          { label: 'Driver Name', item_type: 'text' },
        ],
      },
      {
        name: 'Vehicle Check',
        items: [
          { label: 'Vehicle Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Vehicle Refrigerated (if required)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Contamination Risk', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Product Check',
        items: [
          { label: 'Products as Ordered', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Quantities Correct', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Packaging Intact', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'No Damage/Contamination', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Labels Present & Legible', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Temperature Check',
        items: [
          { label: 'Chilled Items Temperature', item_type: 'temperature', is_required: true, unit_type: 'temperature', default_unit: '°C' },
          { label: 'Chilled Temp Acceptable (0-5°C)', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Frozen Items Temperature', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
          { label: 'Frozen Temp Acceptable (-15°C or below)', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Date Check',
        items: [
          { label: 'All Products in Date', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Shortest Date Item', item_type: 'expiry_date', warning_days_before: 3 },
        ],
      },
      {
        name: 'Acceptance',
        items: [
          { label: 'Delivery Accepted', item_type: 'yes_no', is_required: true },
          { label: 'Items Rejected', item_type: 'text', placeholder_text: 'List any rejected items and reasons' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 5 },
        ],
      },
      {
        name: 'Sign Off',
        items: [
          { label: 'Received By', item_type: 'signature', is_required: true, signature_requires_name: true },
          { label: 'Timestamp', item_type: 'auto_timestamp' },
        ],
      },
    ],
  },
];
