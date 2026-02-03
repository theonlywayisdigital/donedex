/**
 * Manufacturing Industry Templates
 * 4 templates for manufacturing facilities and quality control
 */

import { TemplateDefinition, SAFETY_CHECKLIST_ITEMS, SIGN_OFF_ITEMS } from './types';

export const MANUFACTURING_TEMPLATES: TemplateDefinition[] = [
  // ============================================
  // 1. EQUIPMENT MAINTENANCE INSPECTION
  // ============================================
  {
    id: 'manufacturing-equipment-maintenance',
    name: 'Equipment Maintenance Inspection',
    description: 'Preventive maintenance check for manufacturing equipment and machinery',
    record_type_id: 'manufacturing',
    sections: [
      {
        name: 'Equipment Details',
        items: [
          { label: 'Equipment ID/Asset Number', item_type: 'text', is_required: true },
          { label: 'Equipment Name', item_type: 'text', is_required: true },
          { label: 'Equipment Type', item_type: 'select', is_required: true, options: ['CNC Machine', 'Press', 'Conveyor', 'Packaging Machine', 'Assembly Line', 'Robot/Automation', 'Pump', 'Compressor', 'HVAC Unit', 'Electrical Panel', 'Other'] },
          { label: 'Manufacturer', item_type: 'text' },
          { label: 'Model Number', item_type: 'text' },
          { label: 'Serial Number', item_type: 'text' },
          { label: 'Location/Department', item_type: 'text', is_required: true },
          { label: 'Maintenance Type', item_type: 'select', is_required: true, options: ['Preventive', 'Corrective', 'Predictive', 'Emergency', 'Routine'] },
          { label: 'Last Maintenance Date', item_type: 'date' },
          { label: 'Operating Hours Since Last Service', item_type: 'number' },
        ],
      },
      {
        name: 'Visual Inspection',
        items: [
          { label: 'Overall Equipment Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Equipment Photo', item_type: 'photo', is_required: true },
          { label: 'Signs of Wear or Damage', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Corrosion or Rust Present', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Leaks Detected (Oil, Coolant, Air)', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Safety Guards in Place', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Warning Labels Visible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Visual Inspection Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Mechanical Systems',
        items: [
          { label: 'Belts and Chains Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Bearings Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Gears and Gearbox', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Hydraulic System', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Pneumatic System', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Lubrication Adequate', item_type: 'yes_no' },
          { label: 'Unusual Noises or Vibrations', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Mechanical Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Electrical Systems',
        items: [
          { label: 'Power Supply Status', item_type: 'pass_fail', is_required: true },
          { label: 'Wiring Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Control Panel Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Emergency Stop Functions', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Sensors and Switches Working', item_type: 'pass_fail' },
          { label: 'Motor Temperature Normal', item_type: 'yes_no' },
          { label: 'Current Draw Reading (Amps)', item_type: 'number' },
          { label: 'Electrical Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Performance Testing',
        items: [
          { label: 'Equipment Starts Properly', item_type: 'pass_fail', is_required: true },
          { label: 'Operating Speed Normal', item_type: 'yes_no' },
          { label: 'Output Quality Acceptable', item_type: 'pass_fail' },
          { label: 'Cycle Time (seconds)', item_type: 'number' },
          { label: 'Temperature Reading (°C)', item_type: 'temperature' },
          { label: 'Pressure Reading (if applicable)', item_type: 'number' },
          { label: 'Calibration Required', item_type: 'yes_no' },
          { label: 'Performance Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Maintenance Actions',
        items: [
          { label: 'Cleaning Performed', item_type: 'yes_no' },
          { label: 'Lubrication Performed', item_type: 'yes_no' },
          { label: 'Parts Replaced', item_type: 'yes_no' },
          { label: 'Parts Replaced Details', item_type: 'text' },
          { label: 'Adjustments Made', item_type: 'text' },
          { label: 'Consumables Replenished', item_type: 'yes_no' },
          { label: 'Next Scheduled Maintenance', item_type: 'date' },
          { label: 'Estimated Next Service Hours', item_type: 'number' },
        ],
      },
      {
        name: 'Completion',
        items: [
          { label: 'Equipment Status After Maintenance', item_type: 'select', is_required: true, options: ['Operational', 'Operational with Limitations', 'Requires Further Repair', 'Out of Service'] },
          { label: 'Follow-up Required', item_type: 'yes_no' },
          { label: 'Follow-up Description', item_type: 'text' },
          { label: 'Spare Parts Needed', item_type: 'text' },
          { label: 'Total Maintenance Time (minutes)', item_type: 'number' },
          { label: 'Technician Name', item_type: 'text', is_required: true },
          { label: 'Technician Signature', item_type: 'signature', is_required: true },
          { label: 'Supervisor Approval', item_type: 'signature' },
        ],
      },
    ],
  },

  // ============================================
  // 2. QUALITY CONTROL INSPECTION
  // ============================================
  {
    id: 'manufacturing-quality-control',
    name: 'Quality Control Inspection',
    description: 'Product quality inspection and defect tracking for manufacturing',
    record_type_id: 'manufacturing',
    sections: [
      {
        name: 'Production Information',
        items: [
          { label: 'Production Date', item_type: 'date', is_required: true },
          { label: 'Production Shift', item_type: 'select', is_required: true, options: ['Day Shift', 'Evening Shift', 'Night Shift'] },
          { label: 'Production Line', item_type: 'text', is_required: true },
          { label: 'Product Name/SKU', item_type: 'text', is_required: true },
          { label: 'Batch/Lot Number', item_type: 'text', is_required: true },
          { label: 'Work Order Number', item_type: 'text' },
          { label: 'Quantity Produced', item_type: 'number', is_required: true },
          { label: 'Sample Size Inspected', item_type: 'number', is_required: true },
        ],
      },
      {
        name: 'Visual Quality Check',
        items: [
          { label: 'Overall Visual Appearance', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Sample Photo', item_type: 'photo', is_required: true },
          { label: 'Color Consistency', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Surface Finish Quality', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Scratches or Marks', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Dents or Deformations', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Contamination Present', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Visual Defects Found', item_type: 'number' },
          { label: 'Visual Check Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Dimensional Inspection',
        items: [
          { label: 'Dimensions Within Tolerance', item_type: 'pass_fail', is_required: true },
          { label: 'Length Measurement (mm)', item_type: 'number' },
          { label: 'Width Measurement (mm)', item_type: 'number' },
          { label: 'Height/Thickness (mm)', item_type: 'number' },
          { label: 'Weight (g/kg)', item_type: 'number' },
          { label: 'Tolerance Deviation', item_type: 'text' },
          { label: 'Measuring Equipment Used', item_type: 'text' },
          { label: 'Dimensional Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Functional Testing',
        items: [
          { label: 'Functional Test Performed', item_type: 'yes_no', is_required: true },
          { label: 'Product Functions as Intended', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Assembly Complete', item_type: 'pass_fail' },
          { label: 'Moving Parts Function', item_type: 'pass_fail' },
          { label: 'Electrical Test (if applicable)', item_type: 'pass_fail' },
          { label: 'Pressure/Leak Test (if applicable)', item_type: 'pass_fail' },
          { label: 'Test Results Documentation', item_type: 'text' },
        ],
      },
      {
        name: 'Packaging & Labeling',
        items: [
          { label: 'Packaging Condition', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Correct Packaging Used', item_type: 'yes_no' },
          { label: 'Labels Correct and Legible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Barcode Scannable', item_type: 'pass_fail' },
          { label: 'Batch/Lot on Label', item_type: 'yes_no' },
          { label: 'Expiry Date Correct (if applicable)', item_type: 'yes_no' },
          { label: 'Packaging Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Defect Summary',
        items: [
          { label: 'Total Defects Found', item_type: 'number', is_required: true },
          { label: 'Critical Defects', item_type: 'number' },
          { label: 'Major Defects', item_type: 'number' },
          { label: 'Minor Defects', item_type: 'number' },
          { label: 'Defect Types Found', item_type: 'multi_select', options: ['Dimensional', 'Visual', 'Functional', 'Packaging', 'Labeling', 'Contamination', 'Material', 'Assembly'] },
          { label: 'Defect Photos', item_type: 'photo', photo_rule: 'always' },
          { label: 'Root Cause Analysis', item_type: 'text' },
          { label: 'Corrective Action Required', item_type: 'yes_no' },
          { label: 'Corrective Action Details', item_type: 'text' },
        ],
      },
      {
        name: 'Quality Decision',
        items: [
          { label: 'Batch Status', item_type: 'select', is_required: true, options: ['Approved', 'Approved with Deviation', 'On Hold', 'Rejected', 'Requires Rework'] },
          { label: 'Rejection Quantity', item_type: 'number' },
          { label: 'Rework Quantity', item_type: 'number' },
          { label: 'Pass Rate (%)', item_type: 'number' },
          { label: 'Quality Notes', item_type: 'text' },
          { label: 'QC Inspector Name', item_type: 'text', is_required: true },
          { label: 'Inspector Signature', item_type: 'signature', is_required: true },
          { label: 'QA Manager Review', item_type: 'signature' },
        ],
      },
    ],
  },

  // ============================================
  // 3. WAREHOUSE SAFETY INSPECTION
  // ============================================
  {
    id: 'manufacturing-warehouse-safety',
    name: 'Warehouse Safety Inspection',
    description: 'Safety inspection for warehouse and storage facilities',
    record_type_id: 'manufacturing',
    sections: [
      {
        name: 'Inspection Details',
        items: [
          { label: 'Warehouse/Location Name', item_type: 'text', is_required: true },
          { label: 'Inspection Date', item_type: 'date', is_required: true },
          { label: 'Inspection Time', item_type: 'time', is_required: true },
          { label: 'Inspector Name', item_type: 'text', is_required: true },
          { label: 'Area Inspected', item_type: 'multi_select', is_required: true, options: ['Receiving', 'Storage', 'Picking', 'Packing', 'Shipping', 'Loading Dock', 'Office', 'Break Room'] },
        ],
      },
      {
        name: 'Floor and Aisles',
        items: [
          { label: 'Floors Clean and Dry', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Aisles Clear of Obstructions', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Floor Markings Visible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Pedestrian Walkways Clear', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Trip Hazards Present', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Spills or Leaks', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Floor Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Floor Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Racking and Storage',
        items: [
          { label: 'Racking Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Racking Damage Present', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Load Capacity Signs Posted', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Loads Within Capacity', item_type: 'yes_no' },
          { label: 'Items Stored Safely', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Heavier Items on Lower Shelves', item_type: 'yes_no' },
          { label: 'Protruding Items', item_type: 'yes_no', photo_rule: 'on_yes' },
          { label: 'Racking Anchored Properly', item_type: 'pass_fail' },
          { label: 'Storage Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Equipment Safety',
        items: [
          { label: 'Forklift/Equipment Inspection Current', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Equipment Parked Properly', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Charging Stations Safe', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Ladders in Good Condition', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Pallet Jacks Operational', item_type: 'pass_fail' },
          { label: 'Conveyors Guarded', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Equipment Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Fire Safety',
        items: [
          { label: 'Fire Extinguishers Accessible', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fire Extinguishers Inspected', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fire Exits Clear', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Emergency Lighting Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Alarm Accessible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Sprinkler Heads Unobstructed', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Flammable Materials Stored Properly', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Safety Notes', item_type: 'text' },
        ],
      },
      {
        name: 'PPE and First Aid',
        items: [
          { label: 'PPE Signs Posted', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Workers Wearing Required PPE', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'First Aid Kit Stocked', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'First Aid Kit Location Marked', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Eye Wash Station Available', item_type: 'yes_no' },
          { label: 'Eye Wash Station Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'PPE Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Loading Dock',
        items: [
          { label: 'Dock Plates/Levelers Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Dock Locks Working', item_type: 'pass_fail' },
          { label: 'Wheel Chocks Available', item_type: 'yes_no' },
          { label: 'Dock Area Clear', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Adequate Lighting', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Weather Protection Adequate', item_type: 'pass_fail' },
          { label: 'Dock Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Summary and Sign-Off',
        items: [
          { label: 'Overall Safety Rating', item_type: 'select', is_required: true, options: ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement', 'Unsatisfactory'] },
          { label: 'Hazards Identified', item_type: 'number' },
          { label: 'Immediate Actions Required', item_type: 'yes_no' },
          { label: 'Immediate Action Details', item_type: 'text' },
          { label: 'Follow-up Items', item_type: 'text' },
          { label: 'Inspector Signature', item_type: 'signature', is_required: true },
          { label: 'Warehouse Manager Acknowledgment', item_type: 'signature' },
        ],
      },
    ],
  },

  // ============================================
  // 4. PPE COMPLIANCE AUDIT
  // ============================================
  {
    id: 'manufacturing-ppe-compliance',
    name: 'PPE Compliance Audit',
    description: 'Personal Protective Equipment compliance audit for manufacturing environments',
    record_type_id: 'manufacturing',
    sections: [
      {
        name: 'Audit Information',
        items: [
          { label: 'Audit Date', item_type: 'date', is_required: true },
          { label: 'Audit Time', item_type: 'time', is_required: true },
          { label: 'Auditor Name', item_type: 'text', is_required: true },
          { label: 'Department/Area', item_type: 'text', is_required: true },
          { label: 'Shift', item_type: 'select', is_required: true, options: ['Day Shift', 'Evening Shift', 'Night Shift'] },
          { label: 'Number of Workers Observed', item_type: 'number', is_required: true },
        ],
      },
      {
        name: 'Head Protection',
        items: [
          { label: 'Hard Hats Required in Area', item_type: 'yes_no' },
          { label: 'Workers Wearing Hard Hats', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hard Hats in Good Condition', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Bump Caps Where Required', item_type: 'pass_fail' },
          { label: 'Head Protection Compliance %', item_type: 'number' },
          { label: 'Head Protection Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Eye and Face Protection',
        items: [
          { label: 'Safety Glasses Required', item_type: 'yes_no' },
          { label: 'Workers Wearing Safety Glasses', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Glasses Meet Standards', item_type: 'pass_fail' },
          { label: 'Face Shields Where Required', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Goggles Where Required', item_type: 'pass_fail' },
          { label: 'Eye Protection Clean', item_type: 'pass_fail' },
          { label: 'Eye Protection Compliance %', item_type: 'number' },
          { label: 'Eye Protection Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Hearing Protection',
        items: [
          { label: 'Hearing Protection Required', item_type: 'yes_no' },
          { label: 'Workers Wearing Hearing Protection', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Correct Type for Noise Level', item_type: 'pass_fail' },
          { label: 'Earplugs Properly Inserted', item_type: 'pass_fail' },
          { label: 'Earmuffs in Good Condition', item_type: 'pass_fail' },
          { label: 'Hearing Protection Compliance %', item_type: 'number' },
          { label: 'Hearing Protection Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Hand Protection',
        items: [
          { label: 'Gloves Required', item_type: 'yes_no' },
          { label: 'Workers Wearing Gloves', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Correct Glove Type for Task', item_type: 'pass_fail' },
          { label: 'Gloves in Good Condition', item_type: 'pass_fail' },
          { label: 'Chemical Resistant Where Required', item_type: 'pass_fail' },
          { label: 'Cut Resistant Where Required', item_type: 'pass_fail' },
          { label: 'Hand Protection Compliance %', item_type: 'number' },
          { label: 'Hand Protection Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Foot Protection',
        items: [
          { label: 'Safety Footwear Required', item_type: 'yes_no' },
          { label: 'Workers Wearing Safety Footwear', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Steel/Composite Toe Where Required', item_type: 'pass_fail' },
          { label: 'Slip Resistant Soles', item_type: 'pass_fail' },
          { label: 'Footwear in Good Condition', item_type: 'pass_fail' },
          { label: 'Foot Protection Compliance %', item_type: 'number' },
          { label: 'Foot Protection Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Respiratory Protection',
        items: [
          { label: 'Respiratory Protection Required', item_type: 'yes_no' },
          { label: 'Workers Wearing Respirators', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Correct Respirator Type', item_type: 'pass_fail' },
          { label: 'Fit Test Current', item_type: 'pass_fail' },
          { label: 'Cartridges/Filters Current', item_type: 'pass_fail' },
          { label: 'Proper Seal Achieved', item_type: 'pass_fail' },
          { label: 'Respiratory Compliance %', item_type: 'number' },
          { label: 'Respiratory Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Body Protection',
        items: [
          { label: 'Protective Clothing Required', item_type: 'yes_no' },
          { label: 'High-Visibility Wear Where Required', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Aprons Where Required', item_type: 'pass_fail' },
          { label: 'Coveralls/Lab Coats Where Required', item_type: 'pass_fail' },
          { label: 'No Loose Clothing Near Machinery', item_type: 'pass_fail' },
          { label: 'Body Protection Compliance %', item_type: 'number' },
          { label: 'Body Protection Notes', item_type: 'text' },
        ],
      },
      {
        name: 'PPE Availability and Training',
        items: [
          { label: 'PPE Readily Available', item_type: 'pass_fail', is_required: true },
          { label: 'PPE Storage Clean and Organized', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Replacement PPE Available', item_type: 'pass_fail' },
          { label: 'PPE Signs Posted', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Workers Trained on PPE Use', item_type: 'pass_fail' },
          { label: 'PPE Training Records Current', item_type: 'pass_fail' },
          { label: 'Availability Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Audit Summary',
        items: [
          { label: 'Overall Compliance Rate %', item_type: 'number', is_required: true },
          { label: 'Major Non-Conformances', item_type: 'number' },
          { label: 'Minor Non-Conformances', item_type: 'number' },
          { label: 'Non-Compliance Details', item_type: 'text' },
          { label: 'Corrective Actions Required', item_type: 'text' },
          { label: 'Target Completion Date', item_type: 'date' },
          { label: 'Audit Rating', item_type: 'select', is_required: true, options: ['Excellent (95-100%)', 'Good (85-94%)', 'Satisfactory (75-84%)', 'Needs Improvement (65-74%)', 'Unsatisfactory (<65%)'] },
          { label: 'Auditor Signature', item_type: 'signature', is_required: true },
          { label: 'Area Supervisor Signature', item_type: 'signature' },
        ],
      },
    ],
  },
];
