/**
 * Construction & Building Templates (6)
 */

import type { TemplateDefinition } from './types';
import { SIGN_OFF_ITEMS, SIGN_OFF_WITH_WITNESS_ITEMS } from './types';

export const constructionTemplates: TemplateDefinition[] = [
  // ============================================
  // 1. Site Safety Inspection
  // ============================================
  {
    id: 'construction-site-safety',
    name: 'Site Safety Inspection',
    description: 'Construction site health and safety inspection',
    record_type_id: 'construction',
    sections: [
      {
        name: 'Site Details',
        items: [
          { label: 'Site Name/Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Contractor', item_type: 'composite_contact' },
          { label: 'Project Phase', item_type: 'select', options: ['Demolition', 'Foundation', 'Structure', 'Fit-out', 'Finishing', 'Handover'] },
          { label: 'Weather Conditions', item_type: 'auto_weather' },
          { label: 'Workers on Site', item_type: 'counter', counter_min: 0, counter_max: 500 },
        ],
      },
      {
        name: 'Site Access & Security',
        items: [
          { label: 'Site Fencing Secure', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Access Control in Place', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Site Signage Displayed', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Visitor Sign-in System', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Emergency Contact Info Posted', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'PPE Compliance',
        items: [
          { label: 'Hard Hats Worn', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Hi-Vis Worn', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Safety Footwear', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Eye Protection (where needed)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Gloves (where needed)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hearing Protection (where needed)', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Housekeeping',
        items: [
          { label: 'Work Areas Tidy', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Walkways Clear', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Materials Stored Safely', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Waste Disposal Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Welfare Facilities Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Working at Height',
        items: [
          { label: 'Scaffolding Inspected', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Scaffold Tags Current', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Ladders Secured', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Edge Protection in Place', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'MEWPs Inspected', item_type: 'pass_fail', photo_rule: 'on_fail', help_text: 'Mobile Elevating Work Platforms' },
        ],
      },
      {
        name: 'Electrical Safety',
        items: [
          { label: '110V Equipment Used', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Cables Protected', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Distribution Boards Secured', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'PAT Testing Current', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Fire Prevention',
        items: [
          { label: 'Fire Extinguishers Available', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Hot Work Permits in Use', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Points Marked', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Flammables Stored Correctly', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Issues Found',
        items: [
          { label: 'Issues Identified', item_type: 'yes_no' },
          { label: 'Issue Severity', item_type: 'severity', photo_rule: 'on_fail' },
          { label: 'Corrective Actions Required', item_type: 'text', placeholder_text: 'List required corrective actions' },
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
  // 2. Snagging List
  // ============================================
  {
    id: 'construction-snagging',
    name: 'Snagging List',
    description: 'Track defects and snags for remediation',
    record_type_id: 'construction',
    sections: [
      {
        name: 'Project Details',
        items: [
          { label: 'Site/Property Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Project Name', item_type: 'text' },
          { label: 'Contractor', item_type: 'composite_contact' },
          { label: 'Inspection Date', item_type: 'date', is_required: true },
          { label: 'Unit/Plot Number', item_type: 'text' },
        ],
      },
      {
        name: 'Snag Items',
        items: [
          { label: 'Instructions', item_type: 'instruction', instruction_style: 'info', help_text: 'Use the repeater below to add each snag item with location, description, and photos.' },
        ],
      },
      {
        name: 'External Snags',
        items: [
          { label: 'Location', item_type: 'text', placeholder_text: 'e.g., Front elevation, roof, driveway' },
          { label: 'Description', item_type: 'text', is_required: true, placeholder_text: 'Describe the defect' },
          { label: 'Severity', item_type: 'severity', is_required: true, photo_rule: 'always' },
          { label: 'Trade Responsible', item_type: 'select', options: ['Builder', 'Roofer', 'Plasterer', 'Electrician', 'Plumber', 'Painter', 'Landscaper', 'Other'] },
          { label: 'Photos', item_type: 'photo', is_required: true, max_media_count: 5 },
          { label: 'GPS Location', item_type: 'gps_location' },
        ],
      },
      {
        name: 'Internal Snags - Ground Floor',
        items: [
          { label: 'Room', item_type: 'text', placeholder_text: 'e.g., Kitchen, Living Room' },
          { label: 'Description', item_type: 'text', is_required: true, placeholder_text: 'Describe the defect' },
          { label: 'Severity', item_type: 'severity', is_required: true, photo_rule: 'always' },
          { label: 'Trade Responsible', item_type: 'select', options: ['Builder', 'Plasterer', 'Electrician', 'Plumber', 'Painter', 'Joiner', 'Tiler', 'Other'] },
          { label: 'Photos', item_type: 'photo', is_required: true, max_media_count: 5 },
        ],
      },
      {
        name: 'Internal Snags - First Floor',
        items: [
          { label: 'Room', item_type: 'text', placeholder_text: 'e.g., Bedroom 1, Bathroom' },
          { label: 'Description', item_type: 'text', is_required: true, placeholder_text: 'Describe the defect' },
          { label: 'Severity', item_type: 'severity', is_required: true, photo_rule: 'always' },
          { label: 'Trade Responsible', item_type: 'select', options: ['Builder', 'Plasterer', 'Electrician', 'Plumber', 'Painter', 'Joiner', 'Tiler', 'Other'] },
          { label: 'Photos', item_type: 'photo', is_required: true, max_media_count: 5 },
        ],
      },
      {
        name: 'Summary',
        items: [
          { label: 'Total Snags Found', item_type: 'counter', counter_min: 0, counter_max: 200 },
          { label: 'High Priority Count', item_type: 'counter', counter_min: 0, counter_max: 50 },
          { label: 'Target Completion Date', item_type: 'date' },
          { label: 'Additional Notes', item_type: 'text' },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },

  // ============================================
  // 3. Scaffold Inspection
  // ============================================
  {
    id: 'construction-scaffold',
    name: 'Scaffold Inspection',
    description: 'Weekly scaffold inspection checklist',
    record_type_id: 'construction',
    sections: [
      {
        name: 'Scaffold Details',
        items: [
          { label: 'Site Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Scaffold Location', item_type: 'text', is_required: true, placeholder_text: 'e.g., North elevation, rear extension' },
          { label: 'Scaffold Type', item_type: 'select', is_required: true, options: ['Independent', 'Putlog', 'System', 'Mobile Tower', 'Birdcage', 'Other'] },
          { label: 'Maximum Height', item_type: 'measurement', unit_type: 'length', default_unit: 'm' },
          { label: 'Scaffold Contractor', item_type: 'composite_contact' },
          { label: 'Last Inspection Date', item_type: 'date' },
        ],
      },
      {
        name: 'Base & Foundation',
        items: [
          { label: 'Base Plates in Place', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Sole Boards Adequate', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Ground Conditions Stable', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Standards Vertical', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Structure',
        items: [
          { label: 'All Couplers Tight', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Ledgers Horizontal', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Bracing Adequate', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Ties to Building Secure', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'No Damaged Components', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Platforms',
        items: [
          { label: 'Boards in Good Condition', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Boards Fully Supported', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Gaps > 25mm', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Platform Width Adequate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hop-ups Secured', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Edge Protection',
        items: [
          { label: 'Guardrails in Place (950mm)', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Toeboards in Place (150mm)', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Intermediate Rails in Place', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Brick Guards Where Needed', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Access',
        items: [
          { label: 'Ladder Access Safe', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Ladders Secured', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Access Gates Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Loading Bay Safe', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'General',
        items: [
          { label: 'Scaffold Tag Displayed', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Tag Shows Safe to Use', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Overloading', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Sheeting/Netting Secure', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Outcome',
        items: [
          { label: 'Overall Status', item_type: 'traffic_light', is_required: true, photo_rule: 'on_fail' },
          { label: 'Defects Found', item_type: 'text', placeholder_text: 'List any defects requiring action' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Sign Off',
        items: [
          { label: 'Inspector Name', item_type: 'text', is_required: true },
          { label: 'CISRS Card Number', item_type: 'text' },
          { label: 'Inspector Signature', item_type: 'signature', is_required: true, signature_requires_name: true },
          { label: 'Completed', item_type: 'auto_timestamp' },
        ],
      },
    ],
  },

  // ============================================
  // 4. Work at Height Assessment
  // ============================================
  {
    id: 'construction-work-height',
    name: 'Work at Height Assessment',
    description: 'Risk assessment for working at height activities',
    record_type_id: 'construction',
    sections: [
      {
        name: 'Activity Details',
        items: [
          { label: 'Site Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Activity Description', item_type: 'text', is_required: true, placeholder_text: 'Describe the work at height activity' },
          { label: 'Location on Site', item_type: 'text' },
          { label: 'Working Height', item_type: 'measurement', is_required: true, unit_type: 'length', default_unit: 'm' },
          { label: 'Duration of Work', item_type: 'select', options: ['< 1 hour', '1-4 hours', '4-8 hours', '> 1 day'] },
          { label: 'Contractor', item_type: 'contractor' },
        ],
      },
      {
        name: 'Can Work at Height Be Avoided?',
        items: [
          { label: 'Can work be done from ground?', item_type: 'yes_no', is_required: true },
          { label: 'If no, justification', item_type: 'text', placeholder_text: 'Explain why work at height is necessary' },
        ],
      },
      {
        name: 'Equipment Selection',
        items: [
          { label: 'Access Equipment Type', item_type: 'select', is_required: true, options: ['Scaffold', 'Mobile Tower', 'MEWP', 'Podium Steps', 'Ladder', 'Stepladder', 'Harness System', 'Other'] },
          { label: 'Equipment Suitable for Task', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Equipment Inspected', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Operators Trained', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Hazard Assessment',
        items: [
          { label: 'Fall from Height Risk', item_type: 'severity', is_required: true, photo_rule: 'on_fail' },
          { label: 'Falling Objects Risk', item_type: 'severity', photo_rule: 'on_fail' },
          { label: 'Overhead Hazards', item_type: 'severity', photo_rule: 'on_fail' },
          { label: 'Weather Conditions', item_type: 'traffic_light', photo_rule: 'on_fail' },
          { label: 'Other Hazards', item_type: 'text', placeholder_text: 'List any other identified hazards' },
        ],
      },
      {
        name: 'Control Measures',
        items: [
          { label: 'Guardrails/Edge Protection', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Exclusion Zone Below', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Tool Lanyards Used', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Rescue Plan in Place', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Emergency Procedures Known', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Control Measures Adequate', item_type: 'yes_no', is_required: true },
        ],
      },
      {
        name: 'Approval',
        items: [
          { label: 'Work at Height Approved', item_type: 'yes_no', is_required: true },
          { label: 'Conditions/Restrictions', item_type: 'text' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_WITH_WITNESS_ITEMS,
      },
    ],
  },

  // ============================================
  // 5. Building Handover
  // ============================================
  {
    id: 'construction-handover',
    name: 'Building Handover',
    description: 'Practical completion and building handover checklist',
    record_type_id: 'construction',
    sections: [
      {
        name: 'Project Details',
        items: [
          { label: 'Property Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Project Name', item_type: 'text' },
          { label: 'Contractor', item_type: 'composite_contact', is_required: true },
          { label: 'Client', item_type: 'composite_contact' },
          { label: 'Handover Date', item_type: 'date', is_required: true },
        ],
      },
      {
        name: 'Documentation',
        items: [
          { label: 'O&M Manuals Provided', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'As-Built Drawings', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Building Regulations Certificate', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Warranties & Guarantees', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Test Certificates', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'EPC Certificate', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Risk Assessment', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Meter Readings',
        items: [
          { label: 'Electric Meter', item_type: 'meter_reading', photo_rule: 'always' },
          { label: 'Gas Meter', item_type: 'meter_reading', photo_rule: 'always' },
          { label: 'Water Meter', item_type: 'meter_reading', photo_rule: 'always' },
        ],
      },
      {
        name: 'Keys & Access',
        items: [
          { label: 'All Keys Provided', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Key Schedule Complete', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Access Codes Provided', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fobs/Remotes Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Systems Demonstration',
        items: [
          { label: 'Heating System', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hot Water System', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Electrical Systems', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fire Alarm System', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Security System', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Ventilation/HVAC', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Appliances Demonstrated', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Snagging',
        items: [
          { label: 'All Snags Complete', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Outstanding Snags', item_type: 'text', placeholder_text: 'List any outstanding items' },
          { label: 'Remediation Deadline', item_type: 'date' },
        ],
      },
      {
        name: 'Final Walkthrough',
        items: [
          { label: 'External Complete', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Internal Complete', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Clean & Ready', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Handover Photos', item_type: 'photo', max_media_count: 20 },
        ],
      },
      {
        name: 'Acceptance',
        items: [
          { label: 'Building Accepted', item_type: 'yes_no', is_required: true },
          { label: 'Conditions of Acceptance', item_type: 'text' },
          { label: 'Contractor Signature', item_type: 'signature', is_required: true, signature_requires_name: true },
          { label: 'Client Signature', item_type: 'signature', is_required: true, signature_requires_name: true },
          { label: 'Completed', item_type: 'auto_timestamp' },
        ],
      },
    ],
  },

  // ============================================
  // 6. Progress Report
  // ============================================
  {
    id: 'construction-progress',
    name: 'Progress Report',
    description: 'Weekly construction progress report with photos',
    record_type_id: 'construction',
    sections: [
      {
        name: 'Project Details',
        items: [
          { label: 'Project Name', item_type: 'text', is_required: true },
          { label: 'Site Address', item_type: 'composite_address_uk', is_required: true },
          { label: 'Report Week Ending', item_type: 'date', is_required: true },
          { label: 'Report Number', item_type: 'number' },
          { label: 'Weather This Week', item_type: 'select', options: ['Good', 'Mixed', 'Poor', 'Severe'] },
          { label: 'Days Lost to Weather', item_type: 'counter', counter_min: 0, counter_max: 7 },
        ],
      },
      {
        name: 'Overall Progress',
        items: [
          { label: 'Overall % Complete', item_type: 'slider' },
          { label: 'On Programme', item_type: 'traffic_light', is_required: true },
          { label: 'Programme Notes', item_type: 'text', placeholder_text: 'Explain any delays or acceleration' },
        ],
      },
      {
        name: 'Work Completed This Week',
        items: [
          { label: 'Key Activities Completed', item_type: 'text', is_required: true, placeholder_text: 'List main activities completed' },
          { label: 'Before/After Photos', item_type: 'photo_before_after' },
          { label: 'Progress Photos', item_type: 'photo', max_media_count: 20 },
        ],
      },
      {
        name: 'Work Planned Next Week',
        items: [
          { label: 'Planned Activities', item_type: 'text', placeholder_text: 'List activities planned for next week' },
          { label: 'Key Milestones', item_type: 'text' },
        ],
      },
      {
        name: 'Resources',
        items: [
          { label: 'Average Workers on Site', item_type: 'counter', counter_min: 0, counter_max: 200 },
          { label: 'Subcontractors on Site', item_type: 'text', placeholder_text: 'List subcontractors working this week' },
          { label: 'Resource Issues', item_type: 'text' },
        ],
      },
      {
        name: 'Issues & Risks',
        items: [
          { label: 'Issues This Week', item_type: 'text', placeholder_text: 'List any issues encountered' },
          { label: 'Risks Identified', item_type: 'text' },
          { label: 'RFIs Outstanding', item_type: 'counter', counter_min: 0, counter_max: 100 },
          { label: 'Variations Pending', item_type: 'counter', counter_min: 0, counter_max: 50 },
        ],
      },
      {
        name: 'Health & Safety',
        items: [
          { label: 'Incidents This Week', item_type: 'counter', counter_min: 0, counter_max: 10 },
          { label: 'Near Misses', item_type: 'counter', counter_min: 0, counter_max: 10 },
          { label: 'Safety Observations', item_type: 'text' },
        ],
      },
      {
        name: 'Sign Off',
        items: SIGN_OFF_ITEMS,
      },
    ],
  },
];
