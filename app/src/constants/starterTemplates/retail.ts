/**
 * Retail Templates (4)
 */

import type { TemplateDefinition } from './types';
import { SIGN_OFF_ITEMS } from './types';

export const retailTemplates: TemplateDefinition[] = [
  // ============================================
  // 1. Store Opening Procedure
  // ============================================
  {
    id: 'retail-opening',
    name: 'Store Opening Procedure',
    description: 'Daily store opening checklist',
    record_type_id: 'retail',
    sections: [
      {
        name: 'Details',
        items: [
          { label: 'Store Name/Number', item_type: 'text', is_required: true },
          { label: 'Date', item_type: 'date', is_required: true },
          { label: 'Opening Manager', item_type: 'text', is_required: true },
          { label: 'Opening Time', item_type: 'auto_timestamp' },
        ],
      },
      {
        name: 'Security',
        items: [
          { label: 'Premises Secure Overnight', item_type: 'pass_fail' },
          { label: 'Alarm Deactivated', item_type: 'pass_fail' },
          { label: 'CCTV Operating', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Safe Secure', item_type: 'pass_fail' },
          { label: 'Any Signs of Break-in', item_type: 'yes_no', photo_rule: 'on_yes' },
        ],
      },
      {
        name: 'Store Exterior',
        items: [
          { label: 'Entrance Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Windows Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Signage Lit/Visible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Trolleys/Baskets Available', item_type: 'pass_fail' },
          { label: 'No Hazards Outside', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Store Interior',
        items: [
          { label: 'All Lights Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Music/PA Working', item_type: 'pass_fail' },
          { label: 'Temperature Comfortable', item_type: 'pass_fail' },
          { label: 'Floors Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Aisles Clear', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Shelves Stocked', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'POS Displays Current', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Tills & Payments',
        items: [
          { label: 'Tills Powered On', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Floats Counted & Correct', item_type: 'pass_fail', is_required: true },
          { label: 'Card Machines Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Receipt Paper Stocked', item_type: 'pass_fail' },
          { label: 'Till Bags Available', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Health & Safety',
        items: [
          { label: 'Fire Exits Clear', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'First Aid Kit Available', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Accident Book Available', item_type: 'pass_fail' },
          { label: 'No Wet Floor Hazards', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Staff Area Clean', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Staff',
        items: [
          { label: 'Staff Present', item_type: 'counter', counter_min: 0, counter_max: 50 },
          { label: 'All Staff in Uniform', item_type: 'pass_fail' },
          { label: 'Staff Briefed', item_type: 'pass_fail' },
          { label: 'Absences', item_type: 'text' },
        ],
      },
      {
        name: 'Completion',
        items: [
          { label: 'Store Ready to Open', item_type: 'yes_no', is_required: true },
          { label: 'Issues to Address', item_type: 'text' },
        ],
      },
    ],
  },

  // ============================================
  // 2. Visual Merchandising Audit
  // ============================================
  {
    id: 'retail-merchandising',
    name: 'Visual Merchandising Audit',
    description: 'Store presentation and merchandising standards audit',
    record_type_id: 'retail',
    sections: [
      {
        name: 'Store Details',
        items: [
          { label: 'Store Name', item_type: 'text', is_required: true },
          { label: 'Audit Date', item_type: 'date', is_required: true },
          { label: 'Auditor Name', item_type: 'text' },
          { label: 'Department/Zone', item_type: 'text' },
        ],
      },
      {
        name: 'Window Displays',
        items: [
          { label: 'Windows Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Display Current/Seasonal', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Lighting Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Price Points Visible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Props in Good Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Window Display Rating', item_type: 'rating', rating_max: 5 },
        ],
      },
      {
        name: 'Floor Layout',
        items: [
          { label: 'Fixtures Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fixtures Positioned Correctly', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Sightlines Clear', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Customer Flow Logical', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Promotional Areas Set', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Floor Layout Rating', item_type: 'rating', rating_max: 5 },
        ],
      },
      {
        name: 'Product Presentation',
        items: [
          { label: 'Products Fully Stocked', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Products Faced Up', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Size Runs Complete', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Color Stories Followed', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hangers Consistent', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Folding Standards Met', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Product Presentation Rating', item_type: 'rating', rating_max: 5 },
        ],
      },
      {
        name: 'Pricing & Signage',
        items: [
          { label: 'All Products Priced', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Prices Clearly Visible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Sale Signs Correct', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Category Signage Clear', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Damaged Signage', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Pricing & Signage Rating', item_type: 'rating', rating_max: 5 },
        ],
      },
      {
        name: 'Fitting Rooms (if applicable)',
        items: [
          { label: 'Rooms Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Mirrors Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Lighting Good', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hooks Available', item_type: 'pass_fail' },
          { label: 'Limit Signs Displayed', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Overall Assessment',
        items: [
          { label: 'Overall Visual Standards', item_type: 'rating', is_required: true, rating_max: 5 },
          { label: 'Compliance Score', item_type: 'slider' },
          { label: 'Areas for Improvement', item_type: 'text', placeholder_text: 'List areas needing attention' },
          { label: 'Best Practice Examples', item_type: 'text' },
          { label: 'Photos', item_type: 'photo', max_media_count: 15 },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 3. Stock Room Check
  // ============================================
  {
    id: 'retail-stockroom',
    name: 'Stock Room Check',
    description: 'Stockroom organisation and safety inspection',
    record_type_id: 'retail',
    sections: [
      {
        name: 'Location',
        items: [
          { label: 'Store Name', item_type: 'text', is_required: true },
          { label: 'Inspection Date', item_type: 'date', is_required: true },
          { label: 'Inspector', item_type: 'text' },
        ],
      },
      {
        name: 'Safety',
        items: [
          { label: 'Fire Exit Clear', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Fire Extinguisher Accessible', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Trip Hazards', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Aisles Clear', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Ladders Stored Safely', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Step Ladder Available', item_type: 'pass_fail' },
          { label: 'Lighting Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Organisation',
        items: [
          { label: 'Stock Organised by Category', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Locations Labelled', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Heavy Items Stored Low', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Nothing Stored on Floor', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Easy to Find Products', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Stock Condition',
        items: [
          { label: 'Stock in Good Condition', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Damaged Stock', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Old Stock Identified', item_type: 'pass_fail' },
          { label: 'Returns Processed', item_type: 'pass_fail' },
          { label: 'Deliveries Unpacked', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Cleanliness',
        items: [
          { label: 'Floor Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Shelving Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Pest Evidence', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Rubbish Cleared', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Overall Stockroom Rating', item_type: 'rating', is_required: true, rating_max: 5 },
          { label: 'Actions Required', item_type: 'text', placeholder_text: 'List any actions needed' },
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
  // 4. Loss Prevention Audit
  // ============================================
  {
    id: 'retail-loss-prevention',
    name: 'Loss Prevention Audit',
    description: 'Security and loss prevention compliance audit',
    record_type_id: 'retail',
    sections: [
      {
        name: 'Store Details',
        items: [
          { label: 'Store Name', item_type: 'text', is_required: true },
          { label: 'Audit Date', item_type: 'date', is_required: true },
          { label: 'Auditor Name', item_type: 'text' },
        ],
      },
      {
        name: 'CCTV & Surveillance',
        items: [
          { label: 'CCTV System Operational', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'All Cameras Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Coverage Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Recordings Retained (30 days)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'CCTV Signs Displayed', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Monitor Visible to Staff', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'EAS System',
        items: [
          { label: 'EAS Gates Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'High Value Items Tagged', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Tags Removed at Till', item_type: 'pass_fail' },
          { label: 'Detachers Secured', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Cash Handling',
        items: [
          { label: 'Cash Procedures Followed', item_type: 'pass_fail', is_required: true },
          { label: 'Safe Secure', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Regular Safe Drops', item_type: 'pass_fail' },
          { label: 'Till Floats Correct', item_type: 'pass_fail' },
          { label: 'Refund Process Followed', item_type: 'pass_fail' },
          { label: 'Voids Authorised', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Stock Security',
        items: [
          { label: 'Stockroom Locked', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Delivery Area Secure', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'High Value Stock Secured', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Stock Counts Current', item_type: 'pass_fail' },
          { label: 'Discrepancies Investigated', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Staff Procedures',
        items: [
          { label: 'Staff Bags Checked', item_type: 'pass_fail' },
          { label: 'Staff Purchases Logged', item_type: 'pass_fail' },
          { label: 'Lockers Provided', item_type: 'pass_fail' },
          { label: 'Staff Training Current', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Physical Security',
        items: [
          { label: 'Door Locks Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Alarm System Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Windows Secure', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Exits Alarmed', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Key Control in Place', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Overall Risk Level', item_type: 'severity', is_required: true, photo_rule: 'on_fail' },
          { label: 'Compliance Score', item_type: 'slider' },
          { label: 'Actions Required', item_type: 'text', placeholder_text: 'List security improvements needed' },
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
