-- ============================================
-- Seed: Pre-built Library Data
-- ============================================
-- This file populates library_record_types and library_templates
-- with the 10 pre-built record types and 16 templates

-- ============================================
-- 1. LIBRARY RECORD TYPES (10 types)
-- ============================================

INSERT INTO library_record_types (id, name, name_singular, description, icon, color, sort_order, fields) VALUES

-- 1. Vehicles
('vehicles', 'Vehicles', 'Vehicle', 'Company vehicles, fleet management', 'truck', '#3B82F6', 1,
'[
  {"label": "Registration", "field_type": "text", "is_required": true, "placeholder_text": "e.g., AB12 CDE"},
  {"label": "Make", "field_type": "text", "is_required": true, "placeholder_text": "e.g., Ford"},
  {"label": "Model", "field_type": "text", "is_required": true, "placeholder_text": "e.g., Transit"},
  {"label": "Year", "field_type": "number", "is_required": false, "min_value": 1900, "max_value": 2100},
  {"label": "VIN", "field_type": "text", "is_required": false, "placeholder_text": "Vehicle identification number"},
  {"label": "Current Mileage", "field_type": "number_with_unit", "is_required": false, "unit_type": "distance", "unit_options": ["miles", "km"], "default_unit": "miles"},
  {"label": "MOT Due", "field_type": "expiry_date", "is_required": false},
  {"label": "Insurance Due", "field_type": "expiry_date", "is_required": false},
  {"label": "Colour", "field_type": "text", "is_required": false}
]'::jsonb),

-- 2. Sites/Locations
('sites', 'Sites', 'Site', 'Physical locations, premises, buildings', 'map-pin', '#10B981', 2,
'[
  {"label": "Address", "field_type": "text", "is_required": true, "placeholder_text": "Full address"},
  {"label": "Postcode", "field_type": "text", "is_required": true},
  {"label": "Site Type", "field_type": "select", "is_required": false, "options": [
    {"value": "office", "label": "Office"},
    {"value": "warehouse", "label": "Warehouse"},
    {"value": "retail", "label": "Retail"},
    {"value": "industrial", "label": "Industrial"},
    {"value": "residential", "label": "Residential"},
    {"value": "other", "label": "Other"}
  ]},
  {"label": "Contact Name", "field_type": "text", "is_required": false},
  {"label": "Contact Phone", "field_type": "phone", "is_required": false},
  {"label": "Contact Email", "field_type": "email", "is_required": false},
  {"label": "Access Instructions", "field_type": "text", "is_required": false}
]'::jsonb),

-- 3. Properties
('properties', 'Properties', 'Property', 'Rental properties, landlord/tenant management', 'building', '#8B5CF6', 3,
'[
  {"label": "Address", "field_type": "text", "is_required": true},
  {"label": "Property Type", "field_type": "select", "is_required": false, "options": [
    {"value": "house", "label": "House"},
    {"value": "flat", "label": "Flat/Apartment"},
    {"value": "bungalow", "label": "Bungalow"},
    {"value": "maisonette", "label": "Maisonette"},
    {"value": "studio", "label": "Studio"},
    {"value": "hmo", "label": "HMO"},
    {"value": "commercial", "label": "Commercial"}
  ]},
  {"label": "Bedrooms", "field_type": "number", "is_required": false, "min_value": 0, "max_value": 20},
  {"label": "Landlord Name", "field_type": "text", "is_required": false},
  {"label": "Landlord Contact", "field_type": "phone", "is_required": false},
  {"label": "Tenant Name", "field_type": "text", "is_required": false},
  {"label": "Tenant Contact", "field_type": "phone", "is_required": false},
  {"label": "Lease Start", "field_type": "date", "is_required": false},
  {"label": "Lease End", "field_type": "expiry_date", "is_required": false},
  {"label": "Monthly Rent", "field_type": "currency", "is_required": false}
]'::jsonb),

-- 4. Equipment/Assets
('equipment', 'Equipment', 'Equipment', 'Tools, machinery, assets requiring maintenance', 'wrench', '#F59E0B', 4,
'[
  {"label": "Asset Tag", "field_type": "text", "is_required": true, "placeholder_text": "e.g., ASSET-001"},
  {"label": "Serial Number", "field_type": "text", "is_required": false},
  {"label": "Make", "field_type": "text", "is_required": false},
  {"label": "Model", "field_type": "text", "is_required": false},
  {"label": "Category", "field_type": "select", "is_required": false, "options": [
    {"value": "electrical", "label": "Electrical"},
    {"value": "mechanical", "label": "Mechanical"},
    {"value": "it", "label": "IT Equipment"},
    {"value": "furniture", "label": "Furniture"},
    {"value": "safety", "label": "Safety Equipment"},
    {"value": "other", "label": "Other"}
  ]},
  {"label": "Location", "field_type": "text", "is_required": false},
  {"label": "Purchase Date", "field_type": "date", "is_required": false},
  {"label": "Purchase Cost", "field_type": "currency", "is_required": false},
  {"label": "PAT Test Due", "field_type": "expiry_date", "is_required": false},
  {"label": "Service Due", "field_type": "expiry_date", "is_required": false}
]'::jsonb),

-- 5. People/Employees
('people', 'People', 'Person', 'Employees, staff, contractors', 'user', '#EC4899', 5,
'[
  {"label": "Full Name", "field_type": "text", "is_required": true},
  {"label": "Employee ID", "field_type": "text", "is_required": false},
  {"label": "Department", "field_type": "select", "is_required": false, "options": [
    {"value": "operations", "label": "Operations"},
    {"value": "admin", "label": "Administration"},
    {"value": "sales", "label": "Sales"},
    {"value": "hr", "label": "HR"},
    {"value": "finance", "label": "Finance"},
    {"value": "it", "label": "IT"},
    {"value": "other", "label": "Other"}
  ]},
  {"label": "Role/Title", "field_type": "text", "is_required": false},
  {"label": "Email", "field_type": "email", "is_required": false},
  {"label": "Phone", "field_type": "phone", "is_required": false},
  {"label": "Start Date", "field_type": "date", "is_required": false},
  {"label": "Emergency Contact", "field_type": "text", "is_required": false},
  {"label": "Emergency Phone", "field_type": "phone", "is_required": false}
]'::jsonb),

-- 6. Projects
('projects', 'Projects', 'Project', 'Client projects, jobs, work orders', 'folder-kanban', '#6366F1', 6,
'[
  {"label": "Project Name", "field_type": "text", "is_required": true},
  {"label": "Project Code", "field_type": "text", "is_required": false, "placeholder_text": "e.g., PRJ-001"},
  {"label": "Client", "field_type": "text", "is_required": false},
  {"label": "Status", "field_type": "select", "is_required": false, "options": [
    {"value": "planning", "label": "Planning"},
    {"value": "in_progress", "label": "In Progress"},
    {"value": "on_hold", "label": "On Hold"},
    {"value": "completed", "label": "Completed"},
    {"value": "cancelled", "label": "Cancelled"}
  ]},
  {"label": "Start Date", "field_type": "date", "is_required": false},
  {"label": "Due Date", "field_type": "expiry_date", "is_required": false},
  {"label": "Budget", "field_type": "currency", "is_required": false},
  {"label": "Description", "field_type": "text", "is_required": false}
]'::jsonb),

-- 7. Clients/Customers
('clients', 'Clients', 'Client', 'Customers, accounts, business contacts', 'building-2', '#14B8A6', 7,
'[
  {"label": "Company Name", "field_type": "text", "is_required": true},
  {"label": "Account Number", "field_type": "text", "is_required": false},
  {"label": "Primary Contact", "field_type": "text", "is_required": false},
  {"label": "Email", "field_type": "email", "is_required": false},
  {"label": "Phone", "field_type": "phone", "is_required": false},
  {"label": "Address", "field_type": "text", "is_required": false},
  {"label": "Industry", "field_type": "select", "is_required": false, "options": [
    {"value": "construction", "label": "Construction"},
    {"value": "retail", "label": "Retail"},
    {"value": "hospitality", "label": "Hospitality"},
    {"value": "healthcare", "label": "Healthcare"},
    {"value": "education", "label": "Education"},
    {"value": "manufacturing", "label": "Manufacturing"},
    {"value": "other", "label": "Other"}
  ]},
  {"label": "Notes", "field_type": "text", "is_required": false}
]'::jsonb),

-- 8. Residents
('residents', 'Residents', 'Resident', 'Care home residents, patients', 'heart', '#EF4444', 8,
'[
  {"label": "Full Name", "field_type": "text", "is_required": true},
  {"label": "Preferred Name", "field_type": "text", "is_required": false},
  {"label": "Room Number", "field_type": "text", "is_required": false},
  {"label": "Date of Birth", "field_type": "date", "is_required": false},
  {"label": "NHS Number", "field_type": "text", "is_required": false},
  {"label": "GP Name", "field_type": "text", "is_required": false},
  {"label": "GP Phone", "field_type": "phone", "is_required": false},
  {"label": "Next of Kin", "field_type": "text", "is_required": false},
  {"label": "Next of Kin Phone", "field_type": "phone", "is_required": false},
  {"label": "Dietary Requirements", "field_type": "text", "is_required": false},
  {"label": "Medical Notes", "field_type": "text", "is_required": false}
]'::jsonb),

-- 9. Rooms/Spaces
('rooms', 'Rooms', 'Room', 'Physical spaces, meeting rooms, areas', 'door-open', '#78716C', 9,
'[
  {"label": "Room Name", "field_type": "text", "is_required": true, "placeholder_text": "e.g., Conference Room A"},
  {"label": "Floor", "field_type": "text", "is_required": false},
  {"label": "Building", "field_type": "text", "is_required": false},
  {"label": "Room Type", "field_type": "select", "is_required": false, "options": [
    {"value": "office", "label": "Office"},
    {"value": "meeting", "label": "Meeting Room"},
    {"value": "kitchen", "label": "Kitchen/Break Room"},
    {"value": "bathroom", "label": "Bathroom"},
    {"value": "storage", "label": "Storage"},
    {"value": "reception", "label": "Reception"},
    {"value": "other", "label": "Other"}
  ]},
  {"label": "Capacity", "field_type": "number", "is_required": false, "min_value": 0},
  {"label": "Area", "field_type": "number_with_unit", "is_required": false, "unit_type": "area", "unit_options": ["sqm", "sqft"], "default_unit": "sqm"}
]'::jsonb),

-- 10. Events
('events', 'Events', 'Event', 'Scheduled events, functions, activities', 'calendar', '#F97316', 10,
'[
  {"label": "Event Name", "field_type": "text", "is_required": true},
  {"label": "Event Type", "field_type": "select", "is_required": false, "options": [
    {"value": "meeting", "label": "Meeting"},
    {"value": "training", "label": "Training"},
    {"value": "inspection", "label": "Inspection"},
    {"value": "maintenance", "label": "Maintenance"},
    {"value": "social", "label": "Social"},
    {"value": "other", "label": "Other"}
  ]},
  {"label": "Venue/Location", "field_type": "text", "is_required": false},
  {"label": "Date", "field_type": "date", "is_required": false},
  {"label": "Start Time", "field_type": "time", "is_required": false},
  {"label": "End Time", "field_type": "time", "is_required": false},
  {"label": "Expected Attendance", "field_type": "number", "is_required": false},
  {"label": "Organiser", "field_type": "text", "is_required": false},
  {"label": "Notes", "field_type": "text", "is_required": false}
]'::jsonb);

-- ============================================
-- 2. LIBRARY TEMPLATES (16 templates)
-- ============================================

INSERT INTO library_templates (id, name, description, record_type_id, sort_order, sections) VALUES

-- VEHICLES (4 templates)
('daily-vehicle-walkaround', 'Daily Vehicle Walkaround', 'Quick pre-journey check for drivers', 'vehicles', 1,
'[
  {
    "name": "Exterior Checks",
    "items": [
      {"label": "Lights working (front, rear, indicators)", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Tyres - condition and pressure", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Mirrors clean and adjusted", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Windscreen clean, no cracks", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Wipers working", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Body damage", "item_type": "condition", "is_required": false, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Interior Checks",
    "items": [
      {"label": "Seatbelt working", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Horn working", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Dashboard warning lights", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Interior cleanliness", "item_type": "condition", "is_required": false, "photo_rule": "never"}
    ]
  },
  {
    "name": "Under Bonnet",
    "items": [
      {"label": "Oil level", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Coolant level", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Washer fluid level", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"}
    ]
  },
  {
    "name": "Documentation",
    "items": [
      {"label": "Current odometer reading", "item_type": "number", "is_required": true, "photo_rule": "never"},
      {"label": "Fuel level", "item_type": "select", "is_required": false, "photo_rule": "never", "options": [
        {"value": "full", "label": "Full"},
        {"value": "three_quarter", "label": "3/4"},
        {"value": "half", "label": "1/2"},
        {"value": "quarter", "label": "1/4"},
        {"value": "empty", "label": "Empty"}
      ]},
      {"label": "Additional notes", "item_type": "text", "is_required": false, "photo_rule": "never"}
    ]
  }
]'::jsonb),

('weekly-vehicle-inspection', 'Weekly Vehicle Inspection', 'Comprehensive weekly vehicle check', 'vehicles', 2,
'[
  {
    "name": "Exterior Condition",
    "items": [
      {"label": "All lights functioning", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Front tyres - tread depth ok", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Rear tyres - tread depth ok", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Spare tyre condition", "item_type": "pass_fail", "is_required": false, "photo_rule": "on_fail"},
      {"label": "Windscreen condition", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "All windows clean", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"},
      {"label": "Bodywork condition", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Number plates clean and visible", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Engine Bay",
    "items": [
      {"label": "Engine oil level and condition", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Coolant level", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Brake fluid level", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Power steering fluid", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"},
      {"label": "Washer fluid level", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Battery condition", "item_type": "condition", "is_required": false, "photo_rule": "on_fail"},
      {"label": "Visible leaks under vehicle", "item_type": "yes_no", "is_required": true, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Interior & Safety",
    "items": [
      {"label": "Seatbelts - all working", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Horn working", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "All dashboard gauges working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Air conditioning working", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"},
      {"label": "Heater working", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"},
      {"label": "First aid kit present", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Warning triangle present", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Fire extinguisher present (if required)", "item_type": "yes_no", "is_required": false, "photo_rule": "never"},
      {"label": "Interior cleanliness", "item_type": "condition", "is_required": false, "photo_rule": "never"}
    ]
  },
  {
    "name": "Documentation",
    "items": [
      {"label": "MOT certificate valid", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Insurance valid", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Vehicle handbook present", "item_type": "yes_no", "is_required": false, "photo_rule": "never"},
      {"label": "Current mileage", "item_type": "number", "is_required": true, "photo_rule": "never"},
      {"label": "Inspector comments", "item_type": "text", "is_required": false, "photo_rule": "never"}
    ]
  }
]'::jsonb),

('vehicle-accident-report', 'Vehicle Accident Report', 'Document vehicle incidents and damage', 'vehicles', 3,
'[
  {
    "name": "Incident Details",
    "items": [
      {"label": "Date of incident", "item_type": "date", "is_required": true, "photo_rule": "never"},
      {"label": "Time of incident", "item_type": "time", "is_required": true, "photo_rule": "never"},
      {"label": "Location of incident", "item_type": "text", "is_required": true, "photo_rule": "never"},
      {"label": "Weather conditions", "item_type": "select", "is_required": false, "photo_rule": "never", "options": [
        {"value": "clear", "label": "Clear"},
        {"value": "rain", "label": "Rain"},
        {"value": "snow", "label": "Snow/Ice"},
        {"value": "fog", "label": "Fog"},
        {"value": "other", "label": "Other"}
      ]},
      {"label": "Road conditions", "item_type": "select", "is_required": false, "photo_rule": "never", "options": [
        {"value": "dry", "label": "Dry"},
        {"value": "wet", "label": "Wet"},
        {"value": "icy", "label": "Icy"},
        {"value": "other", "label": "Other"}
      ]}
    ]
  },
  {
    "name": "Damage Assessment",
    "items": [
      {"label": "Front damage", "item_type": "severity", "is_required": true, "photo_rule": "always"},
      {"label": "Rear damage", "item_type": "severity", "is_required": true, "photo_rule": "always"},
      {"label": "Driver side damage", "item_type": "severity", "is_required": true, "photo_rule": "always"},
      {"label": "Passenger side damage", "item_type": "severity", "is_required": true, "photo_rule": "always"},
      {"label": "Roof damage", "item_type": "severity", "is_required": false, "photo_rule": "on_fail"},
      {"label": "Undercarriage damage", "item_type": "severity", "is_required": false, "photo_rule": "on_fail"},
      {"label": "Vehicle driveable", "item_type": "yes_no", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "Other Parties",
    "items": [
      {"label": "Other vehicle involved", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Other vehicle registration", "item_type": "text", "is_required": false, "photo_rule": "never"},
      {"label": "Other driver name", "item_type": "text", "is_required": false, "photo_rule": "never"},
      {"label": "Other driver insurance", "item_type": "text", "is_required": false, "photo_rule": "never"},
      {"label": "Witnesses present", "item_type": "yes_no", "is_required": false, "photo_rule": "never"},
      {"label": "Witness details", "item_type": "text", "is_required": false, "photo_rule": "never"},
      {"label": "Police involved", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Police reference number", "item_type": "text", "is_required": false, "photo_rule": "never"}
    ]
  },
  {
    "name": "Description",
    "items": [
      {"label": "Description of incident", "item_type": "text", "is_required": true, "photo_rule": "never"},
      {"label": "Scene photos", "item_type": "photo", "is_required": true, "photo_rule": "always"},
      {"label": "Any injuries", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Injury details", "item_type": "text", "is_required": false, "photo_rule": "never"}
    ]
  }
]'::jsonb),

('mileage-log', 'Mileage Log', 'Record journey mileage', 'vehicles', 4,
'[
  {
    "name": "Journey Details",
    "items": [
      {"label": "Date", "item_type": "date", "is_required": true, "photo_rule": "never"},
      {"label": "Start location", "item_type": "text", "is_required": true, "photo_rule": "never"},
      {"label": "End location", "item_type": "text", "is_required": true, "photo_rule": "never"},
      {"label": "Purpose", "item_type": "select", "is_required": true, "photo_rule": "never", "options": [
        {"value": "business", "label": "Business"},
        {"value": "personal", "label": "Personal"},
        {"value": "commute", "label": "Commute"}
      ]},
      {"label": "Start odometer", "item_type": "number", "is_required": true, "photo_rule": "never"},
      {"label": "End odometer", "item_type": "number", "is_required": true, "photo_rule": "never"},
      {"label": "Trip notes", "item_type": "text", "is_required": false, "photo_rule": "never"}
    ]
  }
]'::jsonb),

-- SITES (4 templates)
('site-opening-checklist', 'Site Opening Checklist', 'Daily opening procedures', 'sites', 1,
'[
  {
    "name": "Security",
    "items": [
      {"label": "Premises secure on arrival", "item_type": "yes_no", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Alarm deactivated", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "All entry points checked", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Any signs of break-in", "item_type": "yes_no", "is_required": true, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Utilities",
    "items": [
      {"label": "Lights working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Heating/AC working", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"},
      {"label": "Water supply ok", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "Safety",
    "items": [
      {"label": "Fire exits clear", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "First aid kit stocked", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Spillages/hazards", "item_type": "yes_no", "is_required": true, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "General",
    "items": [
      {"label": "Time of opening", "item_type": "time", "is_required": true, "photo_rule": "never"},
      {"label": "Any issues to report", "item_type": "text", "is_required": false, "photo_rule": "never"}
    ]
  }
]'::jsonb),

('site-closing-checklist', 'Site Closing Checklist', 'End of day closing procedures', 'sites', 2,
'[
  {
    "name": "Security",
    "items": [
      {"label": "All visitors signed out", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "All windows closed and locked", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "All doors locked", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Alarm set", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "Utilities",
    "items": [
      {"label": "Lights turned off", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Equipment powered down", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Heating/AC set appropriately", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"}
    ]
  },
  {
    "name": "General",
    "items": [
      {"label": "Time of closing", "item_type": "time", "is_required": true, "photo_rule": "never"},
      {"label": "Any incidents to report", "item_type": "text", "is_required": false, "photo_rule": "never"}
    ]
  }
]'::jsonb),

('health-safety-inspection', 'Health & Safety Inspection', 'Regular H&S workplace inspection', 'sites', 3,
'[
  {
    "name": "Fire Safety",
    "items": [
      {"label": "Fire extinguishers accessible", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Fire extinguishers in date", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Fire exits clear and unlocked", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Emergency lighting working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Fire alarm test up to date", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Evacuation plan displayed", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "First Aid",
    "items": [
      {"label": "First aid kit stocked", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "First aiders list displayed", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Accident book available", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "General Safety",
    "items": [
      {"label": "Walkways clear", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Cables properly managed", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Adequate lighting", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Ventilation adequate", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"},
      {"label": "Temperature comfortable", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"},
      {"label": "PPE available where required", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Housekeeping",
    "items": [
      {"label": "General cleanliness", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Toilets clean and stocked", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Kitchen area hygienic", "item_type": "pass_fail", "is_required": false, "photo_rule": "on_fail"},
      {"label": "Waste disposed of properly", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Additional Comments",
    "items": [
      {"label": "Issues requiring attention", "item_type": "text", "is_required": false, "photo_rule": "always"},
      {"label": "Recommended actions", "item_type": "text", "is_required": false, "photo_rule": "never"}
    ]
  }
]'::jsonb),

('security-patrol', 'Security Patrol Log', 'Security patrol checkpoint log', 'sites', 4,
'[
  {
    "name": "Patrol Details",
    "items": [
      {"label": "Patrol start time", "item_type": "time", "is_required": true, "photo_rule": "never"},
      {"label": "Patrol end time", "item_type": "time", "is_required": true, "photo_rule": "never"},
      {"label": "Weather conditions", "item_type": "select", "is_required": false, "photo_rule": "never", "options": [
        {"value": "clear", "label": "Clear"},
        {"value": "rain", "label": "Rain"},
        {"value": "snow", "label": "Snow"},
        {"value": "fog", "label": "Fog"}
      ]}
    ]
  },
  {
    "name": "Checkpoint Log",
    "items": [
      {"label": "Main entrance secured", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Car park checked", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Perimeter fence secure", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Fire exits secured", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Loading bay secured", "item_type": "pass_fail", "is_required": false, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Observations",
    "items": [
      {"label": "Suspicious activity", "item_type": "yes_no", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Unusual vehicles", "item_type": "yes_no", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Maintenance issues noted", "item_type": "text", "is_required": false, "photo_rule": "always"},
      {"label": "Incidents to report", "item_type": "text", "is_required": false, "photo_rule": "always"}
    ]
  }
]'::jsonb),

-- PROPERTIES (2 templates)
('property-inventory', 'Property Inventory', 'Full property inventory and condition report', 'properties', 1,
'[
  {
    "name": "General Information",
    "items": [
      {"label": "Inspection type", "item_type": "select", "is_required": true, "photo_rule": "never", "options": [
        {"value": "check_in", "label": "Check In"},
        {"value": "check_out", "label": "Check Out"},
        {"value": "periodic", "label": "Periodic"}
      ]},
      {"label": "Meter readings - Electric", "item_type": "number", "is_required": false, "photo_rule": "always"},
      {"label": "Meter readings - Gas", "item_type": "number", "is_required": false, "photo_rule": "always"},
      {"label": "Meter readings - Water", "item_type": "number", "is_required": false, "photo_rule": "always"},
      {"label": "Keys provided/returned", "item_type": "number", "is_required": false, "photo_rule": "never"}
    ]
  },
  {
    "name": "Living Areas",
    "items": [
      {"label": "Walls condition", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Ceiling condition", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Flooring condition", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Windows condition", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Doors condition", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Light fittings working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Sockets working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Furniture inventory", "item_type": "text", "is_required": false, "photo_rule": "always"}
    ]
  },
  {
    "name": "Kitchen",
    "items": [
      {"label": "Kitchen cleanliness", "item_type": "condition", "is_required": true, "photo_rule": "always"},
      {"label": "Oven/hob condition", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Fridge/freezer condition", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Washing machine condition", "item_type": "condition", "is_required": false, "photo_rule": "on_fail"},
      {"label": "Dishwasher condition", "item_type": "condition", "is_required": false, "photo_rule": "on_fail"},
      {"label": "Sink and taps working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Extractor working", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"}
    ]
  },
  {
    "name": "Bathroom",
    "items": [
      {"label": "Bathroom cleanliness", "item_type": "condition", "is_required": true, "photo_rule": "always"},
      {"label": "Toilet working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Bath/shower condition", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Basin and taps working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Extractor working", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"},
      {"label": "Any leaks", "item_type": "yes_no", "is_required": true, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Safety",
    "items": [
      {"label": "Smoke alarms working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "CO detector working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Gas safety certificate in date", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "EICR in date", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "Summary",
    "items": [
      {"label": "Overall property condition", "item_type": "condition", "is_required": true, "photo_rule": "never"},
      {"label": "Recommended actions", "item_type": "text", "is_required": false, "photo_rule": "never"},
      {"label": "Additional photos", "item_type": "photo", "is_required": false, "photo_rule": "always"}
    ]
  }
]'::jsonb),

('periodic-inspection', 'Periodic Inspection', 'Quick mid-tenancy check', 'properties', 2,
'[
  {
    "name": "General Condition",
    "items": [
      {"label": "Property cleanliness", "item_type": "condition", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Garden/exterior maintained", "item_type": "condition", "is_required": false, "photo_rule": "on_fail"},
      {"label": "Ventilation adequate", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Signs of damp/mould", "item_type": "yes_no", "is_required": true, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Safety Checks",
    "items": [
      {"label": "Smoke alarms working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "CO detector working", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "No electrical hazards", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Maintenance",
    "items": [
      {"label": "Any repairs needed", "item_type": "yes_no", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Repair details", "item_type": "text", "is_required": false, "photo_rule": "always"},
      {"label": "Tenant concerns", "item_type": "text", "is_required": false, "photo_rule": "never"}
    ]
  }
]'::jsonb),

-- EQUIPMENT (2 templates)
('equipment-safety-check', 'Equipment Safety Check', 'Pre-use equipment safety inspection', 'equipment', 1,
'[
  {
    "name": "Visual Inspection",
    "items": [
      {"label": "Equipment clean", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "No visible damage", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Safety guards in place", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Warning labels visible", "item_type": "pass_fail", "is_required": false, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Operational Check",
    "items": [
      {"label": "Powers on correctly", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "No unusual noises", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Emergency stop working", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Controls function correctly", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "Documentation",
    "items": [
      {"label": "Last service date", "item_type": "date", "is_required": false, "photo_rule": "never"},
      {"label": "Safe to use", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Issues noted", "item_type": "text", "is_required": false, "photo_rule": "always"}
    ]
  }
]'::jsonb),

('pat-test-record', 'PAT Test Record', 'Portable appliance testing record', 'equipment', 2,
'[
  {
    "name": "Test Details",
    "items": [
      {"label": "Test date", "item_type": "date", "is_required": true, "photo_rule": "never"},
      {"label": "Tester name", "item_type": "text", "is_required": true, "photo_rule": "never"},
      {"label": "Equipment class", "item_type": "select", "is_required": true, "photo_rule": "never", "options": [
        {"value": "class1", "label": "Class I (earthed)"},
        {"value": "class2", "label": "Class II (double insulated)"}
      ]}
    ]
  },
  {
    "name": "Visual Inspection",
    "items": [
      {"label": "Plug condition", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Cable condition", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Casing condition", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Switches/controls ok", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "Electrical Tests",
    "items": [
      {"label": "Earth continuity (Class I)", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"},
      {"label": "Insulation resistance", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Polarity correct", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Functional check", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "Result",
    "items": [
      {"label": "Overall result", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Next test due", "item_type": "date", "is_required": true, "photo_rule": "never"},
      {"label": "Comments", "item_type": "text", "is_required": false, "photo_rule": "never"}
    ]
  }
]'::jsonb),

-- PEOPLE (2 templates)
('training-record', 'Training Record', 'Document staff training completion', 'people', 1,
'[
  {
    "name": "Training Details",
    "items": [
      {"label": "Training title", "item_type": "text", "is_required": true, "photo_rule": "never"},
      {"label": "Training provider", "item_type": "text", "is_required": false, "photo_rule": "never"},
      {"label": "Training type", "item_type": "select", "is_required": true, "photo_rule": "never", "options": [
        {"value": "induction", "label": "Induction"},
        {"value": "mandatory", "label": "Mandatory"},
        {"value": "refresher", "label": "Refresher"},
        {"value": "professional", "label": "Professional Development"},
        {"value": "other", "label": "Other"}
      ]},
      {"label": "Date completed", "item_type": "date", "is_required": true, "photo_rule": "never"},
      {"label": "Duration (hours)", "item_type": "number", "is_required": false, "photo_rule": "never"}
    ]
  },
  {
    "name": "Assessment",
    "items": [
      {"label": "Assessment required", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Assessment passed", "item_type": "pass_fail", "is_required": false, "photo_rule": "never"},
      {"label": "Score achieved (%)", "item_type": "number", "is_required": false, "photo_rule": "never"}
    ]
  },
  {
    "name": "Certification",
    "items": [
      {"label": "Certificate issued", "item_type": "yes_no", "is_required": false, "photo_rule": "never"},
      {"label": "Certificate number", "item_type": "text", "is_required": false, "photo_rule": "never"},
      {"label": "Expiry date", "item_type": "expiry_date", "is_required": false, "photo_rule": "never"},
      {"label": "Certificate photo", "item_type": "photo", "is_required": false, "photo_rule": "always"}
    ]
  }
]'::jsonb),

('return-to-work', 'Return to Work Interview', 'Post-absence return to work discussion', 'people', 2,
'[
  {
    "name": "Absence Details",
    "items": [
      {"label": "First day of absence", "item_type": "date", "is_required": true, "photo_rule": "never"},
      {"label": "Return date", "item_type": "date", "is_required": true, "photo_rule": "never"},
      {"label": "Reason for absence", "item_type": "select", "is_required": true, "photo_rule": "never", "options": [
        {"value": "illness", "label": "Illness"},
        {"value": "injury", "label": "Injury"},
        {"value": "medical", "label": "Medical appointment"},
        {"value": "personal", "label": "Personal"},
        {"value": "other", "label": "Other"}
      ]},
      {"label": "Self-certified", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Doctors note provided", "item_type": "yes_no", "is_required": false, "photo_rule": "never"}
    ]
  },
  {
    "name": "Discussion",
    "items": [
      {"label": "Employee fit to return", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Any adjustments needed", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Adjustment details", "item_type": "text", "is_required": false, "photo_rule": "never"},
      {"label": "Further support needed", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Support details", "item_type": "text", "is_required": false, "photo_rule": "never"}
    ]
  },
  {
    "name": "Notes",
    "items": [
      {"label": "Discussion notes", "item_type": "text", "is_required": false, "photo_rule": "never"},
      {"label": "Follow-up required", "item_type": "yes_no", "is_required": true, "photo_rule": "never"},
      {"label": "Follow-up date", "item_type": "date", "is_required": false, "photo_rule": "never"}
    ]
  }
]'::jsonb),

-- GENERAL (2 templates - linked to sites as most generic)
('cleaning-verification', 'Cleaning Verification', 'Verify cleaning tasks completed', 'sites', 5,
'[
  {
    "name": "Common Areas",
    "items": [
      {"label": "Reception/entrance clean", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Corridors vacuumed/mopped", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Stairs clean", "item_type": "pass_fail", "is_required": false, "photo_rule": "on_fail"},
      {"label": "Lift clean", "item_type": "pass_fail", "is_required": false, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Washrooms",
    "items": [
      {"label": "Toilets cleaned and sanitised", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Sinks cleaned", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Floors mopped", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Supplies restocked", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Bins emptied", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "Kitchen/Break Room",
    "items": [
      {"label": "Surfaces wiped", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Appliances cleaned", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Floor cleaned", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
      {"label": "Bins emptied", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "Sign Off",
    "items": [
      {"label": "Overall cleanliness", "item_type": "condition", "is_required": true, "photo_rule": "never"},
      {"label": "Issues noted", "item_type": "text", "is_required": false, "photo_rule": "always"},
      {"label": "Completion time", "item_type": "time", "is_required": true, "photo_rule": "never"}
    ]
  }
]'::jsonb),

('fire-drill-record', 'Fire Drill Record', 'Document fire evacuation drill', 'sites', 6,
'[
  {
    "name": "Drill Information",
    "items": [
      {"label": "Date of drill", "item_type": "date", "is_required": true, "photo_rule": "never"},
      {"label": "Time alarm activated", "item_type": "time", "is_required": true, "photo_rule": "never"},
      {"label": "Drill type", "item_type": "select", "is_required": true, "photo_rule": "never", "options": [
        {"value": "announced", "label": "Announced"},
        {"value": "unannounced", "label": "Unannounced"}
      ]},
      {"label": "Number of occupants", "item_type": "number", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "Evacuation",
    "items": [
      {"label": "All exits used correctly", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Assembly point reached", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Roll call completed", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Total evacuation time (minutes)", "item_type": "number", "is_required": true, "photo_rule": "never"},
      {"label": "All accounted for", "item_type": "yes_no", "is_required": true, "photo_rule": "never"}
    ]
  },
  {
    "name": "Equipment Check",
    "items": [
      {"label": "Alarm audible throughout", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "Emergency lighting worked", "item_type": "pass_fail", "is_required": true, "photo_rule": "never"},
      {"label": "All fire doors closed", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"}
    ]
  },
  {
    "name": "Assessment",
    "items": [
      {"label": "Overall drill rating", "item_type": "condition", "is_required": true, "photo_rule": "never"},
      {"label": "Issues identified", "item_type": "text", "is_required": false, "photo_rule": "never"},
      {"label": "Improvement actions", "item_type": "text", "is_required": false, "photo_rule": "never"},
      {"label": "Fire marshal name", "item_type": "text", "is_required": true, "photo_rule": "never"}
    ]
  }
]'::jsonb);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these to verify the seed worked:
-- SELECT id, name FROM library_record_types ORDER BY sort_order;
-- SELECT id, name, record_type_id FROM library_templates ORDER BY record_type_id, sort_order;
