-- Organisation Branding
-- Allows organisations to customize their branding in PDF exports, email templates, and reports screen

-- Add branding fields to organisations table
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS logo_path TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0F4C5C';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#1F6F8B';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create storage bucket for organisation logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organisation-logos',
  'organisation-logos',
  true,
  2097152,  -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for organisation logos

-- Allow org admins to upload logos (files stored as {org_id}/logo.{ext})
CREATE POLICY "Org admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organisation-logos'
  AND is_org_admin((storage.foldername(name))[1]::uuid)
);

-- Allow anyone to view logos (public bucket)
CREATE POLICY "Anyone can view org logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'organisation-logos');

-- Allow org admins to update their logos
CREATE POLICY "Org admins can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'organisation-logos'
  AND is_org_admin((storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id = 'organisation-logos'
  AND is_org_admin((storage.foldername(name))[1]::uuid)
);

-- Allow org admins to delete their logos
CREATE POLICY "Org admins can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'organisation-logos'
  AND is_org_admin((storage.foldername(name))[1]::uuid)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organisations_branding ON organisations(logo_path) WHERE logo_path IS NOT NULL;
