-- ============================================
-- Migration 031: Report Videos Storage Bucket
-- ============================================
-- Creates storage bucket for report videos
-- Videos can be played directly via public URL
-- ============================================

-- Create report-videos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-videos',
    'report-videos',
    true,  -- Public for easy playback
    104857600,  -- 100MB max (videos are larger)
    ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];

-- RLS policies for report-videos bucket

-- Anyone authenticated can view videos
DROP POLICY IF EXISTS "Users can view report videos" ON storage.objects;
CREATE POLICY "Users can view report videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'report-videos');

-- Users can upload videos to their own reports
DROP POLICY IF EXISTS "Users can upload report videos" ON storage.objects;
CREATE POLICY "Users can upload report videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'report-videos' AND
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

-- Users can delete their own video uploads
DROP POLICY IF EXISTS "Users can delete own report videos" ON storage.objects;
CREATE POLICY "Users can delete own report videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'report-videos' AND
    EXISTS (
        SELECT 1 FROM reports r
        WHERE r.id::TEXT = (storage.foldername(name))[1]
        AND r.user_id = auth.uid()
        AND r.status = 'draft'
    )
);
