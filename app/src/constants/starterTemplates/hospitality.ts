/**
 * Hospitality & Hotels Templates (5)
 */

import type { TemplateDefinition } from './types';
import { SIGN_OFF_ITEMS } from './types';

export const hospitalityTemplates: TemplateDefinition[] = [
  // ============================================
  // 1. Hotel Room Inspection
  // ============================================
  {
    id: 'hospitality-room',
    name: 'Hotel Room Inspection',
    description: 'Guest room condition and cleanliness inspection',
    record_type_id: 'hospitality',
    sections: [
      {
        name: 'Room Details',
        items: [
          { label: 'Room Number', item_type: 'text', is_required: true },
          { label: 'Room Type', item_type: 'select', is_required: true, options: ['Single', 'Double', 'Twin', 'Suite', 'Family', 'Accessible'] },
          { label: 'Floor', item_type: 'number' },
          { label: 'Inspection Type', item_type: 'select', options: ['Pre-Arrival', 'Post-Checkout', 'Spot Check', 'Deep Clean Verification'] },
        ],
      },
      {
        name: 'Entrance & General',
        items: [
          { label: 'Door & Lock', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Door Signage', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hallway/Entrance Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Wardrobe/Closet', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Hangers Present', item_type: 'pass_fail' },
          { label: 'Safe Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Bedroom',
        items: [
          { label: 'Bed Made Correctly', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Linen Clean & Fresh', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Pillows (correct count)', item_type: 'pass_fail' },
          { label: 'Mattress Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Bedside Tables Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Lamps Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Curtains/Blinds', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Windows Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Carpet/Floor', item_type: 'condition', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Bathroom',
        items: [
          { label: 'Toilet Clean', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Shower/Bath Clean', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Sink Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Mirror Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Towels Fresh', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Towel Count Correct', item_type: 'pass_fail' },
          { label: 'Amenities Stocked', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hair Dryer Present', item_type: 'pass_fail' },
          { label: 'Floor Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Extractor Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Mould/Mildew', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'In-Room Amenities',
        items: [
          { label: 'TV Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Remote Present & Working', item_type: 'pass_fail' },
          { label: 'Phone Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Kettle/Coffee Machine', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Tea/Coffee Supplies', item_type: 'pass_fail' },
          { label: 'Mini Bar Stocked', item_type: 'pass_fail' },
          { label: 'Iron & Board', item_type: 'pass_fail' },
          { label: 'Guest Directory Present', item_type: 'pass_fail' },
          { label: 'WiFi Information', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Air Quality & Comfort',
        items: [
          { label: 'Air Conditioning Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Odours', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Room Temperature', item_type: 'temperature', unit_type: 'temperature', default_unit: '°C' },
        ],
      },
      {
        name: 'Overall Rating',
        items: [
          { label: 'Overall Cleanliness', item_type: 'rating', is_required: true, rating_max: 5 },
          { label: 'Overall Condition', item_type: 'rating', rating_max: 5 },
          { label: 'Ready for Guest', item_type: 'yes_no', is_required: true },
          { label: 'Issues Found', item_type: 'text', placeholder_text: 'List any issues requiring attention' },
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
  // 2. Housekeeping Turnaround
  // ============================================
  {
    id: 'hospitality-housekeeping',
    name: 'Housekeeping Turnaround',
    description: 'Quick room turnaround checklist between guests',
    record_type_id: 'hospitality',
    sections: [
      {
        name: 'Room Info',
        items: [
          { label: 'Room Number', item_type: 'text', is_required: true },
          { label: 'Previous Guest Checkout Time', item_type: 'time' },
          { label: 'Start Time', item_type: 'auto_timestamp' },
        ],
      },
      {
        name: 'Strip & Remove',
        items: [
          { label: 'All Linen Stripped', item_type: 'pass_fail', is_required: true },
          { label: 'All Towels Removed', item_type: 'pass_fail', is_required: true },
          { label: 'Rubbish Collected', item_type: 'pass_fail', is_required: true },
          { label: 'Lost Property Checked', item_type: 'pass_fail' },
          { label: 'Mini Bar Checked', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Clean',
        items: [
          { label: 'Bathroom Deep Cleaned', item_type: 'pass_fail', is_required: true },
          { label: 'Toilet Sanitised', item_type: 'pass_fail', is_required: true },
          { label: 'Mirrors & Glass', item_type: 'pass_fail' },
          { label: 'All Surfaces Dusted', item_type: 'pass_fail' },
          { label: 'Floor Vacuumed/Mopped', item_type: 'pass_fail', is_required: true },
          { label: 'Under Bed Checked', item_type: 'pass_fail' },
          { label: 'Windows Spot Cleaned', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Make Up',
        items: [
          { label: 'Fresh Linen Applied', item_type: 'pass_fail', is_required: true },
          { label: 'Bed Made to Standard', item_type: 'pass_fail', is_required: true },
          { label: 'Fresh Towels Set', item_type: 'pass_fail', is_required: true },
          { label: 'Amenities Restocked', item_type: 'pass_fail' },
          { label: 'Tea/Coffee Restocked', item_type: 'pass_fail' },
          { label: 'Stationery Replaced', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Final Check',
        items: [
          { label: 'Lights Working', item_type: 'pass_fail' },
          { label: 'TV Working', item_type: 'pass_fail' },
          { label: 'AC Set to Standard', item_type: 'pass_fail' },
          { label: 'No Odours', item_type: 'pass_fail' },
          { label: 'Presentation Check', item_type: 'pass_fail', is_required: true },
          { label: 'Room Ready', item_type: 'yes_no', is_required: true },
        ],
      },
      {
        name: 'Completion',
        items: [
          { label: 'End Time', item_type: 'auto_timestamp' },
          { label: 'Housekeeper Initials', item_type: 'text', is_required: true },
        ],
      },
    ],
  },

  // ============================================
  // 3. Pool & Spa Safety
  // ============================================
  {
    id: 'hospitality-pool-spa',
    name: 'Pool & Spa Safety',
    description: 'Swimming pool and spa water quality and safety inspection',
    record_type_id: 'hospitality',
    sections: [
      {
        name: 'Facility Details',
        items: [
          { label: 'Facility Name', item_type: 'text', is_required: true },
          { label: 'Pool Type', item_type: 'select', options: ['Indoor Pool', 'Outdoor Pool', 'Spa/Hot Tub', 'Childrens Pool', 'Lap Pool'] },
          { label: 'Inspection Time', item_type: 'auto_timestamp' },
        ],
      },
      {
        name: 'Water Quality',
        items: [
          { label: 'Water Temperature', item_type: 'temperature', is_required: true, unit_type: 'temperature', default_unit: '°C' },
          { label: 'pH Level', item_type: 'number', is_required: true, help_text: 'Target: 7.2-7.6' },
          { label: 'pH Status', item_type: 'traffic_light', is_required: true },
          { label: 'Chlorine Level (ppm)', item_type: 'number', is_required: true, help_text: 'Target: 1-3 ppm' },
          { label: 'Chlorine Status', item_type: 'traffic_light', is_required: true },
          { label: 'Water Clarity', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Water Level Correct', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Safety Equipment',
        items: [
          { label: 'Life Ring Present', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Rescue Pole Present', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'First Aid Kit Available', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Emergency Phone/Alarm', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Depth Markers Visible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Pool Rules Posted', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Running Signs', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Pool Area',
        items: [
          { label: 'Deck Surfaces Safe', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'No Trip Hazards', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Drain Covers Secure', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Ladders/Steps Secure', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Lighting Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Shower Facilities Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Changing Rooms Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Equipment',
        items: [
          { label: 'Pump Running', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Filter Pressure Normal', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Chemical Dosing System', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Plant Room Secure', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Pool Safe for Use', item_type: 'yes_no', is_required: true },
          { label: 'Issues Found', item_type: 'text', placeholder_text: 'List any issues' },
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
  // 4. Restaurant Table Check
  // ============================================
  {
    id: 'hospitality-restaurant',
    name: 'Restaurant Table Check',
    description: 'Table setup and presentation inspection',
    record_type_id: 'hospitality',
    sections: [
      {
        name: 'Location',
        items: [
          { label: 'Restaurant/Area', item_type: 'text', is_required: true },
          { label: 'Service', item_type: 'select', options: ['Breakfast', 'Lunch', 'Dinner', 'Event'] },
          { label: 'Tables Checked', item_type: 'counter', counter_min: 1, counter_max: 100 },
        ],
      },
      {
        name: 'Table Setup',
        items: [
          { label: 'Tablecloths/Placemats', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Napkins Folded', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Cutlery Polished', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Cutlery Placement', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Glassware Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Crockery Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Centrepiece/Flowers', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Salt & Pepper', item_type: 'pass_fail' },
          { label: 'Menus Present', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Seating',
        items: [
          { label: 'Chairs Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Chairs Aligned', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Chair Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'High Chairs Available', item_type: 'yes_no' },
        ],
      },
      {
        name: 'Environment',
        items: [
          { label: 'Lighting Appropriate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Music/Ambience', item_type: 'pass_fail' },
          { label: 'Temperature Comfortable', item_type: 'pass_fail' },
          { label: 'Floor Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Rating',
        items: [
          { label: 'Overall Presentation', item_type: 'rating', is_required: true, rating_max: 5 },
          { label: 'Ready for Service', item_type: 'yes_no', is_required: true },
          { label: 'Notes', item_type: 'text' },
          { label: 'Photos', item_type: 'photo', max_media_count: 5 },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 5. Guest Complaint Report
  // ============================================
  {
    id: 'hospitality-complaint',
    name: 'Guest Complaint Report',
    description: 'Document and track guest complaints with resolution',
    record_type_id: 'hospitality',
    sections: [
      {
        name: 'Guest Details',
        items: [
          { label: 'Guest Name', item_type: 'composite_person_name', is_required: true },
          { label: 'Room Number', item_type: 'text' },
          { label: 'Contact Details', item_type: 'composite_contact' },
          { label: 'Booking Reference', item_type: 'text' },
        ],
      },
      {
        name: 'Complaint Details',
        items: [
          { label: 'Date of Incident', item_type: 'date', is_required: true },
          { label: 'Time of Incident', item_type: 'time' },
          { label: 'Complaint Category', item_type: 'select', is_required: true, options: ['Room Condition', 'Cleanliness', 'Noise', 'Service', 'Food & Beverage', 'Billing', 'Facilities', 'Staff Conduct', 'Other'] },
          { label: 'Complaint Description', item_type: 'text', is_required: true, placeholder_text: 'Detailed description of the complaint' },
          { label: 'Severity', item_type: 'severity', is_required: true, photo_rule: 'always' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Immediate Action',
        items: [
          { label: 'Immediate Action Taken', item_type: 'text', placeholder_text: 'What was done immediately to address the complaint?' },
          { label: 'Staff Involved', item_type: 'text' },
          { label: 'Manager Notified', item_type: 'yes_no' },
          { label: 'Compensation Offered', item_type: 'yes_no' },
          { label: 'Compensation Details', item_type: 'text' },
        ],
      },
      {
        name: 'Guest Satisfaction',
        items: [
          { label: 'Guest Satisfied with Response', item_type: 'traffic_light', is_required: true },
          { label: 'Further Action Required', item_type: 'yes_no' },
          { label: 'Follow-up Actions', item_type: 'text', placeholder_text: 'What additional actions are needed?' },
          { label: 'Follow-up Deadline', item_type: 'date' },
        ],
      },
      {
        name: 'Resolution',
        items: [
          { label: 'Complaint Status', item_type: 'select', is_required: true, options: ['Open', 'In Progress', 'Resolved', 'Escalated'] },
          { label: 'Resolution Summary', item_type: 'text', placeholder_text: 'How was the complaint finally resolved?' },
          { label: 'Guest Signature', item_type: 'signature', signature_requires_name: true, help_text: 'If guest agrees to sign' },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },
];
