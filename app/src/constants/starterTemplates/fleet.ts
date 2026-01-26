/**
 * Fleet & Transport Templates (5)
 */

import type { TemplateDefinition } from './types';
import { SIGN_OFF_ITEMS, VEHICLE_PRE_TRIP_ITEMS } from './types';

export const fleetTemplates: TemplateDefinition[] = [
  // ============================================
  // 1. Vehicle Pre-Trip Inspection
  // ============================================
  {
    id: 'fleet-pre-trip',
    name: 'Vehicle Pre-Trip Inspection',
    description: 'Daily vehicle walkaround check before use',
    record_type_id: 'fleet',
    sections: [
      {
        name: 'Vehicle Details',
        items: [
          { label: 'Vehicle', item_type: 'composite_vehicle', is_required: true },
          { label: 'Driver Name', item_type: 'text', is_required: true },
          { label: 'Odometer Reading', item_type: 'meter_reading', is_required: true, photo_rule: 'always' },
          { label: 'Inspection Date', item_type: 'date', is_required: true },
          { label: 'Inspection Time', item_type: 'time' },
        ],
      },
      {
        name: 'Vehicle Checks',
        items: VEHICLE_PRE_TRIP_ITEMS,
      },
      {
        name: 'Fluid Levels',
        items: [
          { label: 'Engine Oil', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Coolant', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Windscreen Wash', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Brake Fluid', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Power Steering Fluid', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Fuel Level', item_type: 'select', options: ['Full', '3/4', '1/2', '1/4', 'Empty'] },
          { label: 'AdBlue (if applicable)', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Interior',
        items: [
          { label: 'Interior Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Dashboard Lights Clear', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Controls Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Heating/AC Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Load Security',
        items: [
          { label: 'Load Secure', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Not Overloaded', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Load Evenly Distributed', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Vehicle Fit for Use', item_type: 'yes_no', is_required: true },
          { label: 'Defects Found', item_type: 'text', placeholder_text: 'List any defects' },
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

  // ============================================
  // 2. HGV Daily Check
  // ============================================
  {
    id: 'fleet-hgv-daily',
    name: 'HGV Daily Check',
    description: 'Heavy goods vehicle daily walkaround inspection',
    record_type_id: 'fleet',
    sections: [
      {
        name: 'Vehicle Details',
        items: [
          { label: 'Vehicle', item_type: 'composite_vehicle', is_required: true },
          { label: 'Trailer Registration', item_type: 'text' },
          { label: 'Driver Name', item_type: 'text', is_required: true },
          { label: 'Odometer Reading', item_type: 'meter_reading', is_required: true, photo_rule: 'always' },
          { label: 'Inspection Date/Time', item_type: 'datetime', is_required: true },
        ],
      },
      {
        name: 'Cab Checks',
        items: [
          { label: 'Windscreen - Clean & Intact', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Wipers & Washers', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'All Mirrors Clean & Secure', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Horn Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Cab Locks & Door Catches', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Seat & Seat Belt', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Dashboard Warnings Clear', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Tachograph Working', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Lights & Reflectors',
        items: [
          { label: 'Headlights (dip & main)', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Side Lights', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Rear Lights', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Brake Lights', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Indicators All Round', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Hazard Lights', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Reversing Lights & Alarm', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Reflectors & Markers', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Wheels & Tyres',
        items: [
          { label: 'Tyre Condition - Steer Axle', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Tyre Condition - Drive Axle', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Tyre Condition - Trailer', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Wheel Nuts Secure', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Wheel Nut Indicators', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Visible Damage', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Brakes',
        items: [
          { label: 'Service Brake', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Parking Brake', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Air Pressure Gauge', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Air Leaks', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Brake Lines & Hoses', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Trailer Checks',
        items: [
          { label: 'Coupling Secure', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Landing Legs Raised', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Airlines Connected', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Electrical Connection', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Trailer Lights Working', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Curtains/Doors Secure', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Load Secure', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Safety Equipment',
        items: [
          { label: 'Fire Extinguisher', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'First Aid Kit', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Warning Triangle', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hi-Vis Vest', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Wheel Chocks', item_type: 'pass_fail' },
          { label: 'Spare Bulbs/Fuses', item_type: 'pass_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Vehicle Roadworthy', item_type: 'yes_no', is_required: true },
          { label: 'Defects Reported', item_type: 'text', placeholder_text: 'List all defects found' },
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

  // ============================================
  // 3. Accident/Incident Report
  // ============================================
  {
    id: 'fleet-accident',
    name: 'Accident/Incident Report',
    description: 'Vehicle accident or incident documentation',
    record_type_id: 'fleet',
    sections: [
      {
        name: 'Incident Details',
        items: [
          { label: 'Date of Incident', item_type: 'date', is_required: true },
          { label: 'Time of Incident', item_type: 'time', is_required: true },
          { label: 'Location', item_type: 'composite_address_uk' },
          { label: 'GPS Location', item_type: 'gps_location' },
          { label: 'Weather Conditions', item_type: 'auto_weather' },
          { label: 'Road Conditions', item_type: 'select', options: ['Dry', 'Wet', 'Icy', 'Snow', 'Other'] },
        ],
      },
      {
        name: 'Our Vehicle',
        items: [
          { label: 'Vehicle', item_type: 'composite_vehicle', is_required: true },
          { label: 'Driver Name', item_type: 'composite_person_name', is_required: true },
          { label: 'Driver Contact', item_type: 'composite_contact' },
          { label: 'Driver Licence Number', item_type: 'text' },
          { label: 'Purpose of Journey', item_type: 'text' },
          { label: 'Speed at Time', item_type: 'number' },
        ],
      },
      {
        name: 'Third Party (if applicable)',
        items: [
          { label: 'Third Party Involved', item_type: 'yes_no' },
          { label: 'TP Vehicle', item_type: 'composite_vehicle' },
          { label: 'TP Driver Name', item_type: 'composite_person_name' },
          { label: 'TP Driver Contact', item_type: 'composite_contact' },
          { label: 'TP Insurance Company', item_type: 'text' },
          { label: 'TP Insurance Policy Number', item_type: 'text' },
        ],
      },
      {
        name: 'Incident Description',
        items: [
          { label: 'Incident Type', item_type: 'select', is_required: true, options: ['Collision - Vehicle', 'Collision - Pedestrian', 'Collision - Object', 'Theft', 'Vandalism', 'Fire', 'Breakdown', 'Near Miss', 'Other'] },
          { label: 'Description of What Happened', item_type: 'text', is_required: true, placeholder_text: 'Detailed description of the incident' },
          { label: 'Speed Limit at Location', item_type: 'number' },
          { label: 'Traffic Signals Present', item_type: 'yes_no' },
          { label: 'Signal State', item_type: 'select', options: ['Green', 'Amber', 'Red', 'Not Working', 'N/A'] },
        ],
      },
      {
        name: 'Injuries',
        items: [
          { label: 'Any Injuries', item_type: 'yes_no', is_required: true },
          { label: 'Our Driver Injured', item_type: 'yes_no' },
          { label: 'Injury Details', item_type: 'text', placeholder_text: 'Describe any injuries' },
          { label: 'Ambulance Called', item_type: 'yes_no' },
          { label: 'Hospital Attended', item_type: 'yes_no' },
        ],
      },
      {
        name: 'Damage',
        items: [
          { label: 'Our Vehicle Damage', item_type: 'text', placeholder_text: 'Describe damage to our vehicle' },
          { label: 'TP Vehicle Damage', item_type: 'text', placeholder_text: 'Describe damage to third party' },
          { label: 'Property Damage', item_type: 'text' },
          { label: 'Vehicle Drivable', item_type: 'yes_no' },
          { label: 'Damage Photos', item_type: 'photo', is_required: true, max_media_count: 20 },
        ],
      },
      {
        name: 'Witnesses',
        items: [
          { label: 'Witnesses Present', item_type: 'yes_no' },
          { label: 'Witness 1', item_type: 'witness' },
          { label: 'Witness 2', item_type: 'witness' },
          { label: 'Witness Statements', item_type: 'text' },
        ],
      },
      {
        name: 'Authorities',
        items: [
          { label: 'Police Attended', item_type: 'yes_no' },
          { label: 'Police Reference Number', item_type: 'text' },
          { label: 'Officer Name/Number', item_type: 'text' },
          { label: 'Reported to Our Insurers', item_type: 'yes_no' },
          { label: 'Our Claim Number', item_type: 'text' },
        ],
      },
      {
        name: 'Scene Evidence',
        items: [
          { label: 'Scene Photos', item_type: 'photo', max_media_count: 20 },
          { label: 'Dashcam Footage Available', item_type: 'yes_no' },
          { label: 'Sketch/Diagram Made', item_type: 'yes_no' },
        ],
      },
      {
        name: 'Sign Off',
        items: [
          { label: 'Driver Signature', item_type: 'signature', is_required: true, signature_requires_name: true },
          { label: 'Report Completed', item_type: 'auto_timestamp' },
        ],
      },
    ],
  },

  // ============================================
  // 4. Vehicle Return Inspection
  // ============================================
  {
    id: 'fleet-return',
    name: 'Vehicle Return Inspection',
    description: 'End of shift or rental return vehicle inspection',
    record_type_id: 'fleet',
    sections: [
      {
        name: 'Vehicle Details',
        items: [
          { label: 'Vehicle', item_type: 'composite_vehicle', is_required: true },
          { label: 'Returning Driver', item_type: 'text', is_required: true },
          { label: 'Return Date/Time', item_type: 'datetime', is_required: true },
          { label: 'Odometer Reading', item_type: 'meter_reading', is_required: true, photo_rule: 'always' },
          { label: 'Fuel Level', item_type: 'select', is_required: true, options: ['Full', '3/4', '1/2', '1/4', 'Empty'] },
        ],
      },
      {
        name: 'Exterior Condition',
        items: [
          { label: 'Front Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Rear Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Driver Side', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Passenger Side', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Roof', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'New Damage Found', item_type: 'yes_no', is_required: true, photo_rule: 'on_yes' },
          { label: 'Damage Description', item_type: 'text' },
          { label: 'Damage Photos', item_type: 'photo', max_media_count: 10 },
        ],
      },
      {
        name: 'Interior Condition',
        items: [
          { label: 'Interior Cleanliness', item_type: 'condition', is_required: true, photo_rule: 'on_fail' },
          { label: 'Seats Condition', item_type: 'condition', photo_rule: 'on_fail' },
          { label: 'Dashboard Clean', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'All Controls Working', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Warning Lights', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Items Return',
        items: [
          { label: 'Keys Returned', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Number of Keys', item_type: 'counter', counter_min: 0, counter_max: 5 },
          { label: 'Fuel Card Returned', item_type: 'pass_fail' },
          { label: 'Toll Tag Returned', item_type: 'pass_fail' },
          { label: 'Equipment Returned', item_type: 'checklist', sub_items: ['Satav', 'Phone charger', 'First aid kit', 'Hi-vis vest', 'Other equipment'] },
        ],
      },
      {
        name: 'Issues Reported',
        items: [
          { label: 'Any Issues to Report', item_type: 'yes_no' },
          { label: 'Issue Details', item_type: 'text', placeholder_text: 'Describe any issues' },
          { label: 'Maintenance Required', item_type: 'yes_no' },
          { label: 'Maintenance Details', item_type: 'text' },
        ],
      },
      {
        name: 'Sign Off',
        items: [
          { label: 'Driver Signature', item_type: 'signature', is_required: true, signature_requires_name: true },
          { label: 'Fleet Manager Review', item_type: 'signature', signature_requires_name: true },
          { label: 'Completed', item_type: 'auto_timestamp' },
        ],
      },
    ],
  },

  // ============================================
  // 5. Forklift Daily Check
  // ============================================
  {
    id: 'fleet-forklift',
    name: 'Forklift Daily Check',
    description: 'Daily forklift truck pre-use inspection',
    record_type_id: 'fleet',
    sections: [
      {
        name: 'Equipment Details',
        items: [
          { label: 'Forklift ID/Number', item_type: 'text', is_required: true },
          { label: 'Make/Model', item_type: 'text' },
          { label: 'Operator Name', item_type: 'text', is_required: true },
          { label: 'Hour Meter', item_type: 'meter_reading', photo_rule: 'always' },
          { label: 'Inspection Date', item_type: 'date', is_required: true },
          { label: 'Shift', item_type: 'select', options: ['Day', 'Afternoon', 'Night'] },
        ],
      },
      {
        name: 'Operator Checks',
        items: [
          { label: 'Valid Licence/Certification', item_type: 'pass_fail', is_required: true },
          { label: 'PPE Worn (safety boots, hi-vis)', item_type: 'pass_fail', is_required: true },
        ],
      },
      {
        name: 'General Inspection',
        items: [
          { label: 'Forks - Straight, No Damage', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Forks - Locking Pins', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Mast - Chains', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Mast - Rollers', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Hydraulics - No Leaks', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Overhead Guard', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Backrest Extension', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Load Capacity Plate Visible', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Tyres & Wheels',
        items: [
          { label: 'Tyres - Condition', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Tyres - No Chunking', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Wheel Nuts Tight', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Operator Controls',
        items: [
          { label: 'Steering', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Foot Brake', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Parking Brake', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Lift Controls', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Tilt Controls', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Side Shift (if fitted)', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Seat & Seatbelt', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Dead Man Switch', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Warning Devices',
        items: [
          { label: 'Horn', item_type: 'pass_fail', is_required: true, photo_rule: 'on_fail' },
          { label: 'Reversing Alarm', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Flashing Beacon', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Headlights', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'Rear Lights', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Battery/Fuel',
        items: [
          { label: 'Power Type', item_type: 'select', options: ['Electric', 'LPG', 'Diesel'] },
          { label: 'Battery Charge/Fuel Level', item_type: 'pass_fail' },
          { label: 'Battery/Fuel Connections', item_type: 'pass_fail', photo_rule: 'on_fail' },
          { label: 'No Leaks', item_type: 'pass_fail', photo_rule: 'on_fail' },
        ],
      },
      {
        name: 'Assessment',
        items: [
          { label: 'Forklift Safe to Use', item_type: 'yes_no', is_required: true },
          { label: 'Defects Found', item_type: 'text', placeholder_text: 'List any defects' },
          { label: 'Evidence Photos', item_type: 'photo', max_media_count: 5 },
        ],
      },
      {
        name: 'Sign Off',
        items: [
          { label: 'Operator Signature', item_type: 'signature', is_required: true, signature_requires_name: true },
          { label: 'Completed', item_type: 'auto_timestamp' },
        ],
      },
    ],
  },
];
