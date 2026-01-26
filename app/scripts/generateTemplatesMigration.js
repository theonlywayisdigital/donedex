/**
 * SQL Migration Generator for Starter Template Library
 * Enhanced version that handles both naming patterns and resolves shared items
 *
 * Run with: node scripts/generateTemplatesMigration.js
 */

const fs = require('fs');
const path = require('path');

// Escape single quotes for SQL
function escapeSql(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/'/g, "''");
}

// Record Types
const RECORD_TYPES = [
  { id: 'property', name: 'Property', description: 'Property inspections, inventories, and condition reports', icon: 'home', color: '#3B82F6', category: 'industry' },
  { id: 'construction', name: 'Construction', description: 'Construction site safety and quality inspections', icon: 'construction', color: '#F59E0B', category: 'industry' },
  { id: 'hospitality', name: 'Hospitality', description: 'Hotel, restaurant, and tourism inspections', icon: 'hotel', color: '#8B5CF6', category: 'industry' },
  { id: 'healthcare', name: 'Healthcare', description: 'Medical facility and care home inspections', icon: 'local-hospital', color: '#EF4444', category: 'industry' },
  { id: 'food', name: 'Food & Beverage', description: 'Food safety and hygiene inspections', icon: 'restaurant', color: '#10B981', category: 'industry' },
  { id: 'education', name: 'Education', description: 'School and educational facility inspections', icon: 'school', color: '#6366F1', category: 'industry' },
  { id: 'fleet', name: 'Fleet & Transport', description: 'Vehicle and fleet management inspections', icon: 'local-shipping', color: '#14B8A6', category: 'industry' },
  { id: 'retail', name: 'Retail', description: 'Store and retail environment inspections', icon: 'store', color: '#EC4899', category: 'industry' },
  { id: 'manufacturing', name: 'Manufacturing', description: 'Factory and production quality inspections', icon: 'precision-manufacturing', color: '#64748B', category: 'industry' },
  { id: 'facilities', name: 'Facilities', description: 'Building and facility maintenance inspections', icon: 'apartment', color: '#0EA5E9', category: 'industry' },
  { id: 'events', name: 'Events', description: 'Event venue and production safety inspections', icon: 'celebration', color: '#F97316', category: 'industry' },
  { id: 'agriculture', name: 'Agriculture', description: 'Farm safety and agricultural inspections', icon: 'agriculture', color: '#22C55E', category: 'industry' },
  { id: 'marine', name: 'Marine', description: 'Vessel and maritime safety inspections', icon: 'sailing', color: '#0284C7', category: 'industry' },
  { id: 'compliance-uk', name: 'UK Compliance', description: 'UK regulatory compliance inspections', icon: 'gavel', color: '#1E40AF', category: 'compliance' },
  { id: 'compliance-us', name: 'US Compliance', description: 'US regulatory compliance inspections (OSHA, FDA, ADA)', icon: 'gavel', color: '#B91C1C', category: 'compliance' },
  { id: 'compliance-intl', name: 'International', description: 'International standards compliance (ISO, GDPR)', icon: 'public', color: '#059669', category: 'compliance' },
  { id: 'compliance-au', name: 'Australia', description: 'Australian regulatory compliance inspections', icon: 'gavel', color: '#D97706', category: 'compliance' },
];

// Parse shared items from types.ts
function parseSharedItems(typesContent) {
  const sharedItems = {};

  // Find all exported const arrays of TemplateItemDef
  const exportRegex = /export const (\w+_ITEMS):\s*TemplateItemDef\[\]\s*=\s*\[/g;

  let match;
  while ((match = exportRegex.exec(typesContent)) !== null) {
    const name = match[1];
    const startIdx = match.index + match[0].length;

    // Find the closing bracket
    let depth = 1;
    let endIdx = startIdx;
    while (depth > 0 && endIdx < typesContent.length) {
      if (typesContent[endIdx] === '[') depth++;
      if (typesContent[endIdx] === ']') depth--;
      endIdx++;
    }

    const itemsContent = typesContent.substring(startIdx, endIdx - 1);
    const items = parseItemsArray(itemsContent);
    sharedItems[name] = items;
  }

  return sharedItems;
}

// Parse an array of items from content
function parseItemsArray(content) {
  const items = [];

  // Find each item object
  const itemRegex = /\{\s*label:\s*['"]([^'"]+)['"]/g;

  let match;
  while ((match = itemRegex.exec(content)) !== null) {
    const startIdx = match.index;

    // Find the closing brace for this item
    let depth = 1;
    let endIdx = startIdx + 1;
    while (depth > 0 && endIdx < content.length) {
      if (content[endIdx] === '{') depth++;
      if (content[endIdx] === '}') depth--;
      endIdx++;
    }

    const itemStr = content.substring(startIdx, endIdx);
    const item = parseItemObject(itemStr);
    if (item) {
      items.push(item);
    }
  }

  return items;
}

// Parse a single item object
function parseItemObject(itemStr) {
  const item = {};

  // Extract label
  const labelMatch = itemStr.match(/label:\s*['"]([^'"]+)['"]/);
  if (labelMatch) item.label = labelMatch[1];

  // Extract item_type
  const typeMatch = itemStr.match(/item_type:\s*['"]([^'"]+)['"]/);
  if (typeMatch) item.item_type = typeMatch[1];

  // Extract is_required
  const requiredMatch = itemStr.match(/is_required:\s*(true|false)/);
  if (requiredMatch) item.is_required = requiredMatch[1] === 'true';

  // Extract photo_rule
  const photoRuleMatch = itemStr.match(/photo_rule:\s*['"]([^'"]+)['"]/);
  if (photoRuleMatch) item.photo_rule = photoRuleMatch[1];

  // Extract help_text
  const helpMatch = itemStr.match(/help_text:\s*['"]([^'"]+)['"]/);
  if (helpMatch) item.help_text = helpMatch[1];

  // Extract placeholder_text
  const placeholderMatch = itemStr.match(/placeholder_text:\s*['"]([^'"]+)['"]/);
  if (placeholderMatch) item.placeholder_text = placeholderMatch[1];

  // Extract options array
  const optionsMatch = itemStr.match(/options:\s*\[([^\]]+)\]/);
  if (optionsMatch) {
    const optionsStr = optionsMatch[1];
    const options = optionsStr.match(/['"]([^'"]+)['"]/g);
    if (options) {
      item.options = options.map(o => o.replace(/['\"]/g, ''));
    }
  }

  // Extract coloured_options
  const colouredMatch = itemStr.match(/coloured_options:\s*\[/);
  if (colouredMatch) {
    const startIdx = colouredMatch.index + colouredMatch[0].length;
    let depth = 1;
    let endIdx = startIdx;
    while (depth > 0 && endIdx < itemStr.length) {
      if (itemStr[endIdx] === '[') depth++;
      if (itemStr[endIdx] === ']') depth--;
      endIdx++;
    }
    const colouredContent = itemStr.substring(startIdx, endIdx - 1);
    const colouredOptions = [];
    const optionRegex = /\{\s*label:\s*['"]([^'"]+)['"]\s*,\s*color:\s*['"]([^'"]+)['"]\s*\}/g;
    let optMatch;
    while ((optMatch = optionRegex.exec(colouredContent)) !== null) {
      colouredOptions.push({ label: optMatch[1], color: optMatch[2] });
    }
    if (colouredOptions.length > 0) {
      item.coloured_options = colouredOptions;
    }
  }

  // Extract numeric properties
  const numericProps = ['counter_min', 'counter_max', 'counter_step', 'max_media_count', 'min_value', 'max_value', 'rating_max'];
  numericProps.forEach(prop => {
    const match = itemStr.match(new RegExp(`${prop}:\\s*(\\d+)`));
    if (match) item[prop] = parseInt(match[1]);
  });

  // Extract declaration_text
  const declMatch = itemStr.match(/declaration_text:\s*['"]([^'"]+)['"]/);
  if (declMatch) item.declaration_text = declMatch[1];

  // Extract signature_requires_name
  const sigMatch = itemStr.match(/signature_requires_name:\s*(true|false)/);
  if (sigMatch) item.signature_requires_name = sigMatch[1] === 'true';

  return item.label ? item : null;
}

// Parse sections from content, resolving spreads
function parseSections(sectionsContent, sharedItems) {
  const sections = [];

  // Find each section object
  const sectionRegex = /\{\s*name:\s*['"]([^'"]+)['"]\s*,\s*items:\s*\[/g;

  let match;
  while ((match = sectionRegex.exec(sectionsContent)) !== null) {
    const sectionName = match[1];
    const startIdx = match.index + match[0].length;

    // Find the closing bracket for items array
    let depth = 1;
    let endIdx = startIdx;
    while (depth > 0 && endIdx < sectionsContent.length) {
      if (sectionsContent[endIdx] === '[') depth++;
      if (sectionsContent[endIdx] === ']') depth--;
      endIdx++;
    }

    const itemsContent = sectionsContent.substring(startIdx, endIdx - 1);
    const items = parseItemsWithSpreads(itemsContent, sharedItems);

    sections.push({
      name: sectionName,
      items
    });
  }

  return sections;
}

// Parse items, resolving spread operators
function parseItemsWithSpreads(content, sharedItems) {
  const items = [];

  // Check for spread operators and resolve them
  const spreadRegex = /\.\.\.(\w+)/g;
  let spreadMatch;
  const spreads = [];

  while ((spreadMatch = spreadRegex.exec(content)) !== null) {
    const name = spreadMatch[1];
    if (sharedItems[name]) {
      spreads.push({ index: spreadMatch.index, name, items: sharedItems[name] });
    }
  }

  // If there are spreads, we need to handle them
  if (spreads.length > 0) {
    // Add items from spreads first (they usually come first)
    spreads.forEach(spread => {
      items.push(...spread.items);
    });
  }

  // Then parse any inline items
  const inlineItems = parseItemsArray(content);
  items.push(...inlineItems);

  return items;
}

// Extract templates from a file
function extractTemplatesFromFile(filePath, sharedItems) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Find the template array export (handle both naming patterns)
  const exportMatch = content.match(/export const (\w+(?:Templates|_TEMPLATES)):\s*TemplateDefinition\[\]\s*=\s*\[/);
  if (!exportMatch) {
    console.log(`  No templates found in ${path.basename(filePath)}`);
    return [];
  }

  const templates = [];

  // Find all template objects in the array
  // Match the opening of a template object
  const templateRegex = /\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]\s*,\s*description:\s*['"]([^'"]+)['"]\s*,\s*record_type_id:\s*['"]([^'"]+)['"]\s*,\s*sections:\s*\[/g;

  let match;
  while ((match = templateRegex.exec(content)) !== null) {
    const id = match[1];
    const name = match[2];
    const description = match[3];
    const record_type_id = match[4];

    // Find the sections for this template
    const startIdx = match.index + match[0].length;

    // Find the matching closing bracket for sections
    let depth = 1;
    let endIdx = startIdx;
    while (depth > 0 && endIdx < content.length) {
      if (content[endIdx] === '[') depth++;
      if (content[endIdx] === ']') depth--;
      endIdx++;
    }

    // Extract sections array content
    const sectionsContent = content.substring(startIdx, endIdx - 1);

    // Parse sections
    const sections = parseSections(sectionsContent, sharedItems);

    templates.push({
      id,
      name,
      description,
      record_type_id,
      sections
    });
  }

  return templates;
}

// Main execution
function main() {
  console.log('🚀 Generating Starter Template Library Migration...\n');

  const templatesDir = path.join(__dirname, '..', 'src', 'constants', 'starterTemplates');

  // First, read and parse types.ts for shared items
  console.log('📋 Parsing shared items from types.ts...');
  const typesPath = path.join(templatesDir, 'types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  const sharedItems = parseSharedItems(typesContent);
  console.log(`   Found ${Object.keys(sharedItems).length} shared item arrays:`);
  Object.entries(sharedItems).forEach(([name, items]) => {
    console.log(`   - ${name}: ${items.length} items`);
  });

  const templateFiles = [
    'property.ts',
    'construction.ts',
    'hospitality.ts',
    'healthcare.ts',
    'food.ts',
    'education.ts',
    'fleet.ts',
    'retail.ts',
    'manufacturing.ts',
    'facilities.ts',
    'events.ts',
    'agriculture.ts',
    'marine.ts',
    'compliance-uk.ts',
    'compliance-us.ts',
    'compliance-intl.ts',
    'compliance-au.ts',
  ];

  console.log('\n📂 Reading template files...');

  const allTemplates = [];
  for (const file of templateFiles) {
    const filePath = path.join(templatesDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`  Reading ${file}...`);
      const templates = extractTemplatesFromFile(filePath, sharedItems);
      console.log(`    Found ${templates.length} templates`);
      allTemplates.push(...templates);
    }
  }

  console.log(`\n📊 Total templates: ${allTemplates.length}`);

  // Generate SQL - matching existing schema from 009_record_type_fields.sql
  const lines = [
    '-- ================================================',
    '-- Starter Template Library Migration',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total Templates: ${allTemplates.length}`,
    `-- Total Record Types: ${RECORD_TYPES.length}`,
    '-- ================================================',
    '',
    '-- Tables already exist from 009_record_type_fields.sql',
    '-- Schema: library_record_types(id, name, name_singular, description, icon, color, sort_order, fields)',
    '-- Schema: library_templates(id, name, description, record_type_id, sections, sort_order)',
    '',
    'BEGIN;',
    '',
    '-- Record Types',
    'INSERT INTO library_record_types (id, name, name_singular, description, icon, color, sort_order, fields)',
    'VALUES',
  ];

  // Add record types with sort_order based on position
  RECORD_TYPES.forEach((rt, i) => {
    const comma = i < RECORD_TYPES.length - 1 ? ',' : '';
    const nameSingular = rt.name.replace(/ies$/, 'y').replace(/s$/, ''); // Basic singularization
    lines.push(`  ('${escapeSql(rt.id)}', '${escapeSql(rt.name)}', '${escapeSql(nameSingular)}', '${escapeSql(rt.description)}', '${escapeSql(rt.icon)}', '${escapeSql(rt.color)}', ${i * 10}, '[]'::jsonb)${comma}`);
  });

  lines.push('ON CONFLICT (id) DO UPDATE SET');
  lines.push('  name = EXCLUDED.name,');
  lines.push('  name_singular = EXCLUDED.name_singular,');
  lines.push('  description = EXCLUDED.description,');
  lines.push('  icon = EXCLUDED.icon,');
  lines.push('  color = EXCLUDED.color,');
  lines.push('  sort_order = EXCLUDED.sort_order;');
  lines.push('');

  // Group templates by record_type_id
  const grouped = {};
  for (const template of allTemplates) {
    if (!grouped[template.record_type_id]) {
      grouped[template.record_type_id] = [];
    }
    grouped[template.record_type_id].push(template);
  }

  // Add templates by category - with sort_order
  let templateSortOrder = 0;
  for (const [recordTypeId, templates] of Object.entries(grouped)) {
    lines.push(`-- ${recordTypeId.toUpperCase()} Templates (${templates.length})`);
    lines.push('INSERT INTO library_templates (id, name, description, record_type_id, sections, sort_order)');
    lines.push('VALUES');

    templates.forEach((t, i) => {
      const comma = i < templates.length - 1 ? ',' : '';
      const sectionsJson = JSON.stringify(t.sections);
      lines.push(`  ('${escapeSql(t.id)}', '${escapeSql(t.name)}', '${escapeSql(t.description)}', '${escapeSql(t.record_type_id)}', '${escapeSql(sectionsJson)}'::jsonb, ${templateSortOrder})${comma}`);
      templateSortOrder += 10;
    });

    lines.push('ON CONFLICT (id) DO UPDATE SET');
    lines.push('  name = EXCLUDED.name,');
    lines.push('  description = EXCLUDED.description,');
    lines.push('  record_type_id = EXCLUDED.record_type_id,');
    lines.push('  sections = EXCLUDED.sections,');
    lines.push('  sort_order = EXCLUDED.sort_order;');
    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');
  lines.push(`-- Summary: ${RECORD_TYPES.length} record types, ${allTemplates.length} templates`);

  // Write to file
  const outputDir = path.join(__dirname, '..', 'supabase', 'migrations');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
  const filename = `${timestamp}_starter_template_library.sql`;
  const outputPath = path.join(outputDir, filename);

  fs.writeFileSync(outputPath, lines.join('\n'));

  console.log(`\n✅ Migration file generated: ${outputPath}`);
  console.log(`\n📋 Template Breakdown:`);
  for (const [category, templates] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   - ${category}: ${templates.length}`);
  }
}

main();
