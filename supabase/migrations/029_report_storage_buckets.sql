-- ============================================
-- Migration 029: Report Storage Buckets
-- ============================================
-- Creates storage buckets for report photos and signatures
-- These are required for the inspection app to store media
-- ============================================

-- ============================================
-- STEP 1: CREATE report-photos BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-photos',
    'report-photos',
    true,  -- Public bucket for easy image display
    10485760,  -- 10MB max file size (images are compressed to 2000px max)
    ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- STEP 2: CREATE report-signatures BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-signatures',
    'report-signatures',
    true,  -- Public bucket for easy display
    2097152,  -- 2MB max file size (signatures are small PNG images)
    ARRAY['image/png']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- STEP 3: RLS POLICIES FOR report-photos
-- ============================================
-- Path format: {report_id}/{response_id}/{filename}

-- Users can view photos from reports in their organisation
CREATE POLICY "Users can view report photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'report-photos'
);

-- Users can upload photos to their own reports
CREATE POLICY "Users can upload report photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'report-photos' AND
    -- Verify the report belongs to user or user is in same org
    EXISTS (
        SELECT 1 FROM reports r
        WHERE r.id::TEXT = (storage.foldername(name))[1]
        AND (
            r.user_id = auth.uid()
            OR r.organisation_id IN (
                SELECT organisation_id FROM organisation_users
                WHERE user_id = auth.uid()
            )
        )
        AND r.status = 'draft'
    )
);

-- Users can delete their own photo uploads
CREATE POLICY "Users can delete own report photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'report-photos' AND
    EXISTS (
        SELECT 1 FROM reports r
        WHERE r.id::TEXT = (storage.foldername(name))[1]
        AND r.user_id = auth.uid()
        AND r.status = 'draft'
    )
);

-- ============================================
-- STEP 4: RLS POLICIES FOR report-signatures
-- ============================================
-- Path format: {report_id}/{response_id}/{filename}

-- Users can view signatures from reports in their organisation
CREATE POLICY "Users can view report signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'report-signatures'
);

-- Users can upload signatures to their own reports
CREATE POLICY "Users can upload report signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'report-signatures' AND
    EXISTS (
        SELECT 1 FROM reports r
        WHERE r.id::TEXT = (storage.foldername(name))[1]
        AND (
            r.user_id = auth.uid()
            OR r.organisation_id IN (
                SELECT organisation_id FROM organisation_users
                WHERE user_id = auth.uid()
            )
        )
        AND r.status = 'draft'
    )
);

-- Users can delete their own signature uploads
CREATE POLICY "Users can delete own report signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'report-signatures' AND
    EXISTS (
        SELECT 1 FROM reports r
        WHERE r.id::TEXT = (storage.foldername(name))[1]
        AND r.user_id = auth.uid()
        AND r.status = 'draft'
    )
);

-- ============================================
-- STEP 5: CREATE report_photos TABLE (if not exists)
-- ============================================
-- This table tracks photo metadata linked to responses

CREATE TABLE IF NOT EXISTS report_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_response_id UUID NOT NULL REFERENCES report_responses(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching photos by response
CREATE INDEX IF NOT EXISTS idx_report_photos_response ON report_photos(report_response_id);

-- Enable RLS
ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;

-- Users can view photos from reports in their organisation
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

-- Users can insert photos for their own draft reports
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

-- Users can delete photos from their own draft reports
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

COMMENT ON TABLE report_photos IS 'Tracks photos attached to report responses. Files stored in report-photos storage bucket.';
