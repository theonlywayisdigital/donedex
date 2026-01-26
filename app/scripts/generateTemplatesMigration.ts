/**
 * SQL Migration Generator for Starter Template Library
 *
 * This script converts TypeScript template definitions into SQL INSERT statements
 * for the library_record_types and library_templates tables.
 *
 * Run with: npx ts-node scripts/generateTemplatesMigration.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ALL_TEMPLATES,
  RECORD_TYPES,
  TemplateDefinition,
  RecordTypeDefinition,
} from '../src/constants/starterTemplates';

// Escape single quotes for SQL
function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

// Convert array to PostgreSQL array literal
function toPostgresArray(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) {
    return 'NULL';
  }
  const escaped = arr.map(s => `"${escapeSql(s)}"`).join(',');
  return `'{${escaped}}'`;
}

// Generate SQL for record types
function generateRecordTypesSQL(recordTypes: RecordTypeDefinition[]): string {
  const lines: string[] = [
    '-- ================================================',
    '-- LIBRARY RECORD TYPES',
    '-- ================================================',
    '',
    '-- Insert record types (categories)',
    'INSERT INTO library_record_types (id, name, description, icon, color, category)',
    'VALUES',
  ];

  const values = recordTypes.map((rt, i) => {
    const comma = i < recordTypes.length - 1 ? ',' : '';
    return `  ('${escapeSql(rt.id)}', '${escapeSql(rt.name)}', '${escapeSql(rt.description)}', '${escapeSql(rt.icon)}', '${escapeSql(rt.color)}', '${escapeSql(rt.category)}')${comma}`;
  });

  lines.push(...values);
  lines.push('ON CONFLICT (id) DO UPDATE SET');
  lines.push('  name = EXCLUDED.name,');
  lines.push('  description = EXCLUDED.description,');
  lines.push('  icon = EXCLUDED.icon,');
  lines.push('  color = EXCLUDED.color,');
  lines.push('  category = EXCLUDED.category;');
  lines.push('');

  return lines.join('\n');
}

// Generate SQL for a single template
function generateTemplateSQL(template: TemplateDefinition): string {
  const sectionsJson = JSON.stringify(template.sections);
  return `  ('${escapeSql(template.id)}', '${escapeSql(template.name)}', '${escapeSql(template.description)}', '${escapeSql(template.record_type_id)}', '${escapeSql(sectionsJson)}'::jsonb)`;
}

// Generate SQL for all templates grouped by category
function generateTemplatesSQL(templates: TemplateDefinition[]): string {
  const lines: string[] = [
    '-- ================================================',
    '-- LIBRARY TEMPLATES',
    '-- ================================================',
    '',
  ];

  // Group templates by record_type_id
  const grouped: Record<string, TemplateDefinition[]> = {};
  for (const template of templates) {
    if (!grouped[template.record_type_id]) {
      grouped[template.record_type_id] = [];
    }
    grouped[template.record_type_id].push(template);
  }

  // Generate SQL for each group
  for (const [recordTypeId, groupTemplates] of Object.entries(grouped)) {
    lines.push(`-- ${recordTypeId.toUpperCase()} Templates (${groupTemplates.length})`);
    lines.push('INSERT INTO library_templates (id, name, description, record_type_id, sections)');
    lines.push('VALUES');

    const values = groupTemplates.map((t, i) => {
      const comma = i < groupTemplates.length - 1 ? ',' : '';
      return generateTemplateSQL(t) + comma;
    });

    lines.push(...values);
    lines.push('ON CONFLICT (id) DO UPDATE SET');
    lines.push('  name = EXCLUDED.name,');
    lines.push('  description = EXCLUDED.description,');
    lines.push('  record_type_id = EXCLUDED.record_type_id,');
    lines.push('  sections = EXCLUDED.sections,');
    lines.push('  updated_at = NOW();');
    lines.push('');
  }

  return lines.join('\n');
}

// Generate the full migration file
function generateMigration(): string {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];

  const lines: string[] = [
    '-- ================================================',
    '-- Starter Template Library Migration',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total Templates: ${ALL_TEMPLATES.length}`,
    `-- Total Record Types: ${RECORD_TYPES.length}`,
    '-- ================================================',
    '',
    '-- Ensure tables exist with proper schema',
    'CREATE TABLE IF NOT EXISTS library_record_types (',
    '  id TEXT PRIMARY KEY,',
    '  name TEXT NOT NULL,',
    '  description TEXT,',
    '  icon TEXT,',
    '  color TEXT,',
    '  category TEXT,',
    '  created_at TIMESTAMPTZ DEFAULT NOW(),',
    '  updated_at TIMESTAMPTZ DEFAULT NOW()',
    ');',
    '',
    'CREATE TABLE IF NOT EXISTS library_templates (',
    '  id TEXT PRIMARY KEY,',
    '  name TEXT NOT NULL,',
    '  description TEXT,',
    '  record_type_id TEXT REFERENCES library_record_types(id),',
    '  sections JSONB NOT NULL,',
    '  is_active BOOLEAN DEFAULT true,',
    '  created_at TIMESTAMPTZ DEFAULT NOW(),',
    '  updated_at TIMESTAMPTZ DEFAULT NOW()',
    ');',
    '',
    '-- Create index for faster lookups',
    'CREATE INDEX IF NOT EXISTS idx_library_templates_record_type ON library_templates(record_type_id);',
    '',
    '-- Begin transaction',
    'BEGIN;',
    '',
  ];

  lines.push(generateRecordTypesSQL(RECORD_TYPES));
  lines.push(generateTemplatesSQL(ALL_TEMPLATES));

  lines.push('-- Commit transaction');
  lines.push('COMMIT;');
  lines.push('');
  lines.push('-- Summary');
  lines.push(`-- Inserted/Updated ${RECORD_TYPES.length} record types`);
  lines.push(`-- Inserted/Updated ${ALL_TEMPLATES.length} templates`);

  // Add breakdown by category
  const breakdown: Record<string, number> = {};
  for (const t of ALL_TEMPLATES) {
    breakdown[t.record_type_id] = (breakdown[t.record_type_id] || 0) + 1;
  }

  lines.push('--');
  lines.push('-- Template Breakdown:');
  for (const [category, count] of Object.entries(breakdown)) {
    lines.push(`--   ${category}: ${count}`);
  }

  return lines.join('\n');
}

// Main execution
function main() {
  console.log('🚀 Generating Starter Template Library Migration...\n');

  const migration = generateMigration();

  // Write to file
  const outputDir = path.join(__dirname, '..', 'supabase', 'migrations');

  // Create migrations directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created migrations directory: ${outputDir}`);
  }

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
  const filename = `${timestamp}_starter_template_library.sql`;
  const outputPath = path.join(outputDir, filename);

  fs.writeFileSync(outputPath, migration);

  console.log(`✅ Migration file generated: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Record Types: ${RECORD_TYPES.length}`);
  console.log(`   - Templates: ${ALL_TEMPLATES.length}`);
  console.log(`\n📋 Template Breakdown:`);

  // Show breakdown
  const breakdown: Record<string, number> = {};
  for (const t of ALL_TEMPLATES) {
    breakdown[t.record_type_id] = (breakdown[t.record_type_id] || 0) + 1;
  }

  for (const [category, count] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`   - ${category}: ${count}`);
  }

  console.log(`\n🔧 To apply migration, run:`);
  console.log(`   npx supabase db push`);
  console.log(`   -- or --`);
  console.log(`   Copy the SQL to your Supabase dashboard SQL editor`);
}

main();
