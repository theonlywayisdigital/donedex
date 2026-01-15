-- ============================================
-- Migration 030: Create Storage Buckets Only
-- ============================================
-- Creates storage buckets for report photos and signatures
-- Policies were already created in a previous partial migration
-- ============================================

-- Create report-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-photos',
    'report-photos',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];

-- Create report-signatures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-signatures',
    'report-signatures',
    true,
    2097152,
    ARRAY['image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png'];

-- Create report_photos table if not exists
CREATE TABLE IF NOT EXISTS report_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_response_id UUID NOT NULL REFERENCES report_responses(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching photos by response
CREATE INDEX IF NOT EXISTS idx_report_photos_response ON report_photos(report_response_id);

-- Enable RLS (idempotent)
ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;

-- Policies for report_photos table (drop and recreate to be safe)
DROP POLICY IF EXISTS "Users can view report photo records" ON report_photos;
DROP POLICY IF EXISTS "Users can insert report photo records" ON report_photos;
DROP POLICY IF EXISTS "Users can delete own report photo records" ON report_photos;

CREATE POLICY "Users can view report photo records"
ON report_photos FOR SELECT
TO authenticated
USING (
    report_response_id IN (
        SELECT rr.id FROM report_responses rr
        JOIN reports r ON rr.report_id = r.id
        WHERE r.organisation_id IN (
            SELECT organisation_id FROM organisation_users
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert report photo records"
ON report_photos FOR INSERT
TO authenticated
WITH CHECK (
    report_response_id IN (
        SELECT rr.id FROM report_responses rr
        JOIN reports r ON rr.report_id = r.id
        WHERE r.user_id = auth.uid() AND r.status = 'draft'
    )
);

CREATE POLICY "Users can delete own report photo records"
ON report_photos FOR DELETE
TO authenticated
USING (
    report_response_id IN (
        SELECT rr.id FROM report_responses rr
        JOIN reports r ON rr.report_id = r.id
        WHERE r.user_id = auth.uid() AND r.status = 'draft'
    )
);
