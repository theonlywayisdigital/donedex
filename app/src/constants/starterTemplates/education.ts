/**
 * Education Templates (5)
 */

import type { TemplateDefinition } from './types';
import { SIGN_OFF_ITEMS, ROOM_INSPECTION_ITEMS } from './types';

export const educationTemplates: TemplateDefinition[] = [
  // ============================================
  // 1. Classroom Condition Report
  // ============================================
  {
    id: 'education-classroom',
    name: 'Classroom Condition Report',
    description: 'Classroom condition and maintenance inspection',
    record_type_id: 'education',
    sections: [
      {
        name: 'Room Details',
        items: [
          { label: 'Room Number', item_type: 'text', is_required: true },
          { label: 'Room Name/Type', item_type: 'select', options: ['General Classroom', 'Science Lab', 'Art Room', 'Music Room', 'Computer Lab', 'Library', 'Sports Hall', 'Other'] },
          { label: 'Building', item_type: 'text' },
          { label: 'Floor', item_type: 'number' },
          { label: 'Capacity', item_type: 'number' },
        ],
      },
      {
        name: 'Structure & Fabric',
        items: [
          { label: 'Ceiling Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Walls Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Floor Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Windows Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Doors Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Paintwork', item_type: 'condition', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Furniture',
        items: [
          { label: 'Desks/Tables Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Chairs Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Teacher Desk', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Storage Units', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Notice Boards', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Whiteboard/Blackboard', item_type: 'condition', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Equipment & Services',
        items: [
          { label: 'Lighting Adequate', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'All Lights Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Heating Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Ventilation Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Projector/Display Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Computer Equipment Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Electrical Sockets Safe', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Safety',
        items: [
          { label: 'Fire Exit Clear', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fire Exit Sign Visible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Trip Hazards', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Window Restrictors Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'First Aid Kit Accessible', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Cleanliness',
        items: [
          { label: 'Room Clean', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Bins Emptied', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Surfaces Dusted', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Overall Condition', item_type: 'rating', is_required: true, rating_max: 5 },
          { label: 'Maintenance Required', item_type: 'yes_no' },
          { label: 'Maintenance Priority', item_type: 'severity' },
          { label: 'Maintenance Details', item_type: 'text', placeholder_text: 'Describe maintenance required' },
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
  // 2. Playground Safety Inspection
  // ============================================
  {
    id: 'education-playground',
    name: 'Playground Safety Inspection',
    description: 'Outdoor play area safety and equipment inspection',
    record_type_id: 'education',
    sections: [
      {
        name: 'Location Details',
        items: [
          { label: 'School Name', item_type: 'text', is_required: true },
          { label: 'Playground Area', item_type: 'select', options: ['Main Playground', 'Infant Play Area', 'Junior Play Area', 'Sports Field', 'MUGA', 'Adventure Playground'] },
          { label: 'Inspection Date', item_type: 'date', is_required: true },
          { label: 'Weather Conditions', item_type: 'auto_weather' },
        ],
      },
      {
        name: 'Surface Inspection',
        items: [
          { label: 'Surface Type', item_type: 'select', is_required: true, options: ['Rubber Safety Surface', 'Bark/Woodchip', 'Sand', 'Grass', 'Tarmac', 'Concrete', 'Mixed'] },
          { label: 'Surface Condition', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'No Loose/Missing Sections', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'No Trip Hazards', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Drainage Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Standing Water', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Free from Debris/Glass', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Equipment - General',
        items: [
          { label: 'All Equipment Secure', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'No Sharp Edges/Protrusions', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'No Rust/Corrosion', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Paintwork Intact', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Entrapment Hazards', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Age Appropriate Signage', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Individual Equipment',
        items: [
          { label: 'Swings', item_type: 'pass_fail', photo_rule: 'on_fail', help_text: 'Seats, chains, frame secure' },
          { label: 'Slides', item_type: 'pass_fail', photo_rule: 'on_fail', help_text: 'Surface, steps, handrails' },
          { label: 'Climbing Frames', item_type: 'pass_fail', photo_rule: 'on_fail', help_text: 'Structure, fixings, platforms' },
          { label: 'Roundabouts', item_type: 'pass_fail', photo_rule: 'on_fail', help_text: 'Bearings, surface' },
          { label: 'See-saws', item_type: 'pass_fail', photo_rule: 'on_fail', help_text: 'Pivot, handles, bumpers' },
          { label: 'Spring Rockers', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Other Equipment', item_type: 'text', placeholder_text: 'List and assess any other equipment' },
        ],
      },
      {
        name: 'Boundaries & Access',
        items: [
          { label: 'Fencing Secure', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Gates Self-Closing', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Gaps in Boundary', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Paths Clear & Safe', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Hazards',
        items: [
          { label: 'No Animal Fouling', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'No Hazardous Plants', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Overhanging Branches', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Vandalism/Graffiti', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Overall Safety Rating', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Safe for Use', item_type: 'yes_no', is_required: true },
          { label: 'Equipment Out of Service', item_type: 'text', placeholder_text: 'List any equipment to be closed' },
          { label: 'Urgent Actions Required', item_type: 'text' },
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
  // 3. Fire Safety Audit
  // ============================================
  {
    id: 'education-fire-safety',
    name: 'Fire Safety Audit',
    description: 'School fire safety compliance audit',
    record_type_id: 'education',
    sections: [
      {
        name: 'School Details',
        items: [
          { label: 'School Name', item_type: 'text', is_required: true },
          { label: 'Address', item_type: 'composite_address_uk' },
          { label: 'Audit Date', item_type: 'date', is_required: true },
          { label: 'Building/Block', item_type: 'text' },
        ],
      },
      {
        name: 'Fire Risk Assessment',
        items: [
          { label: 'Current FRA in Place', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'FRA Date', item_type: 'date' },
          { label: 'FRA Review Due', item_type: 'expiry_date', warning_days_before: 30 },
          { label: 'Actions from FRA Complete', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Means of Escape',
        items: [
          { label: 'Fire Exits Clearly Marked', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'All Fire Exits Unlocked', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fire Exits Open Easily', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Escape Routes Clear', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Emergency Lighting Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Exit Signs Illuminated', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Assembly Points Signed', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Fire Detection & Alarm',
        items: [
          { label: 'Fire Alarm System Type', item_type: 'select', options: ['L1', 'L2', 'L3', 'L4', 'L5', 'M', 'P1', 'P2'] },
          { label: 'Weekly Test Done', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Last Service Date', item_type: 'date' },
          { label: 'Next Service Due', item_type: 'expiry_date', warning_days_before: 30 },
          { label: 'Call Points Visible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Detectors Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Fire Fighting Equipment',
        items: [
          { label: 'Extinguishers in Place', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Extinguishers Serviced', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Service Date', item_type: 'expiry_date', warning_days_before: 30 },
          { label: 'Fire Blankets (Kitchen)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hose Reels (if present)', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Fire Doors',
        items: [
          { label: 'Fire Doors Self-Closing', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fire Doors Close Fully', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Seals & Strips Intact', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Not Wedged Open', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Signage Correct', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Procedures & Training',
        items: [
          { label: 'Fire Drill This Term', item_type: 'pass_fail', is_required: true },
          { label: 'Last Drill Date', item_type: 'date' },
          { label: 'Evacuation Time (mins)', item_type: 'number' },
          { label: 'Fire Procedures Displayed', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Staff Trained', item_type: 'pass_fail' },
          { label: 'Fire Wardens Appointed', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Housekeeping',
        items: [
          { label: 'No Combustible Storage', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Electrical Cupboards Clear', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Waste Bins Managed', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Overall Compliance', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Actions Required', item_type: 'text', placeholder_text: 'List any remedial actions needed' },
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
  // 4. Science Lab Safety Check
  // ============================================
  {
    id: 'education-science-lab',
    name: 'Science Lab Safety Check',
    description: 'Science laboratory safety and compliance inspection',
    record_type_id: 'education',
    sections: [
      {
        name: 'Lab Details',
        items: [
          { label: 'Lab Name/Number', item_type: 'text', is_required: true },
          { label: 'Subject', item_type: 'select', options: ['Chemistry', 'Physics', 'Biology', 'General Science'] },
          { label: 'Building', item_type: 'text' },
          { label: 'Inspection Date', item_type: 'date', is_required: true },
        ],
      },
      {
        name: 'General Safety',
        items: [
          { label: 'Safety Rules Displayed', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Emergency Procedures Posted', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'First Aid Kit Available', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Eye Wash Station', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Eye Wash Tested Recently', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Safety Shower (if present)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Blanket Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Extinguisher Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'PPE & Equipment',
        items: [
          { label: 'Safety Goggles Available', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Goggles Clean & Intact', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Lab Coats Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Gloves Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fume Cupboard Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Gas Taps Secure', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Master Gas Shut-off Known', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Chemical Storage',
        items: [
          { label: 'Chemicals Stored Securely', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Chemicals Labelled', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Incompatibles Separated', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Expired Chemicals', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'COSHH Assessments Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Spill Kit Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Electrical Safety',
        items: [
          { label: 'Equipment PAT Tested', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Damaged Cables', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Sockets Not Overloaded', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'RCD Protection', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Housekeeping',
        items: [
          { label: 'Benches Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Floor Clear', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Waste Disposed Correctly', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Sinks Clear', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Overall Safety Rating', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Safe for Practical Work', item_type: 'yes_no', is_required: true },
          { label: 'Actions Required', item_type: 'text' },
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
  // 5. School Bus Inspection
  // ============================================
  {
    id: 'education-bus',
    name: 'School Bus Inspection',
    description: 'School transport vehicle safety inspection',
    record_type_id: 'education',
    sections: [
      {
        name: 'Vehicle Details',
        items: [
          { label: 'Vehicle', item_type: 'composite_vehicle', is_required: true },
          { label: 'Operator/School', item_type: 'text' },
          { label: 'Driver Name', item_type: 'text', is_required: true },
          { label: 'Mileage', item_type: 'meter_reading', photo_rule: 'always' },
          { label: 'Inspection Date', item_type: 'date', is_required: true },
        ],
      },
      {
        name: 'Documentation',
        items: [
          { label: 'MOT Valid', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'MOT Expiry', item_type: 'expiry_date', warning_days_before: 30 },
          { label: 'Tax Valid', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Insurance Valid', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Driver DBS Current', item_type: 'pass_fail', is_required: true },
          { label: 'Driver Licence Valid', item_type: 'pass_fail', is_required: true },
        ],
      },
      {
        name: 'Exterior',
        items: [
          { label: 'Bodywork Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'School Signage Visible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Lights Working', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Indicators Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Tyres Condition', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Mirrors Intact', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Doors Open/Close Properly', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Interior',
        items: [
          { label: 'Interior Clean', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Seats in Good Condition', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Seat Belts Working', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Aisle Clear', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Windows Clean & Intact', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Floor Clean & Safe', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Emergency Exits Accessible', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Emergency Hammer Present', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Safety Equipment',
        items: [
          { label: 'First Aid Kit Present', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'First Aid Kit Stocked', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Extinguisher Present', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fire Extinguisher In Date', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Warning Triangle', item_type: 'pass_fail' },
          { label: 'Hi-Vis Vest', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Vehicle Safe for Service', item_type: 'yes_no', is_required: true },
          { label: 'Defects Found', item_type: 'text', placeholder_text: 'List any defects' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Sign Off',
        items: [
          { label: 'Driver Signature', item_type: 'signature', is_required: true, signature_requires_name: true },
          { label: 'Completed', item_type: 'auto_timestamp' },
        ],
      },
    ],
  },
];
