-- ============================================
-- Migration 009a: Fix Library Tables RLS
-- ============================================
-- This fixes the RLS policies for library tables to allow authenticated users to read

-- Enable RLS on library tables
ALTER TABLE library_record_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read library record types
CREATE POLICY "Anyone can read library record types"
ON library_record_types FOR SELECT
TO authenticated
USING (true);

-- All authenticated users can read library templates
CREATE POLICY "Anyone can read library templates"
ON library_templates FOR SELECT
TO authenticated
USING (true);
