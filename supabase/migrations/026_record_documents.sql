-- ============================================
-- Migration 026: Record Documents
-- ============================================
-- Enables storing documents (files) associated with records.
-- Documents can be contracts, photos, certificates, PDFs, etc.
-- Files are stored in Supabase Storage, metadata stored here.
-- ============================================

-- ============================================
-- STEP 1: CREATE DOCUMENTS TABLE
-- ============================================

CREATE TABLE record_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationship
    record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

    -- File metadata
    name TEXT NOT NULL,                    -- Display name (editable)
    original_filename TEXT NOT NULL,       -- Original uploaded filename
    file_path TEXT NOT NULL,               -- Storage bucket path
    file_size INTEGER NOT NULL,            -- Size in bytes
    mime_type TEXT NOT NULL,               -- MIME type (application/pdf, image/jpeg, etc.)

    -- Categorization
    category TEXT DEFAULT 'general' CHECK (category IN (
        'general',        -- Miscellaneous documents
        'contract',       -- Legal contracts
        'certificate',    -- Certifications, licenses
        'photo',          -- Images/photos
        'report',         -- External reports
        'correspondence', -- Letters, emails
        'other'           -- Catch-all
    )),

    -- Optional description/notes
    description TEXT,

    -- Audit fields
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE record_documents IS 'Documents (files) attached to records. File data stored in Supabase Storage.';
COMMENT ON COLUMN record_documents.name IS 'User-editable display name for the document';
COMMENT ON COLUMN record_documents.original_filename IS 'Original filename when uploaded';
COMMENT ON COLUMN record_documents.file_path IS 'Path in the record-documents storage bucket';
COMMENT ON COLUMN record_documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN record_documents.mime_type IS 'MIME type for file handling and preview';
COMMENT ON COLUMN record_documents.category IS 'Document category for organization and filtering';

-- ============================================
-- STEP 2: INDEXES
-- ============================================

-- Index for fetching documents by record
CREATE INDEX idx_record_documents_record ON record_documents(record_id, created_at DESC);

-- Index for organisation-wide queries (admin)
CREATE INDEX idx_record_documents_organisation ON record_documents(organisation_id, created_at DESC);

-- Index for filtering by category
CREATE INDEX idx_record_documents_category ON record_documents(record_id, category);

-- Index for uploaded_by (user's uploads)
CREATE INDEX idx_record_documents_uploaded_by ON record_documents(uploaded_by);

-- ============================================
-- STEP 3: UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER set_record_documents_updated_at
    BEFORE UPDATE ON record_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 4: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE record_documents ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all documents"
ON record_documents FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Users can view documents for records they have access to
-- (through their organisation membership)
CREATE POLICY "Users can view documents in their organisation"
ON record_documents FOR SELECT
TO authenticated
USING (
    organisation_id IN (
        SELECT organisation_id
        FROM organisation_users
        WHERE user_id = auth.uid()
    )
);

-- Admins/owners can insert documents for their organisation
CREATE POLICY "Admins can upload documents"
ON record_documents FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organisation_users
        WHERE user_id = auth.uid()
        AND organisation_id = record_documents.organisation_id
        AND role IN ('admin', 'owner')
    )
);

-- Admins/owners can update documents in their organisation
CREATE POLICY "Admins can update documents"
ON record_documents FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organisation_users
        WHERE user_id = auth.uid()
        AND organisation_id = record_documents.organisation_id
        AND role IN ('admin', 'owner')
    )
);

-- Admins/owners can delete documents in their organisation
CREATE POLICY "Admins can delete documents"
ON record_documents FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organisation_users
        WHERE user_id = auth.uid()
        AND organisation_id = record_documents.organisation_id
        AND role IN ('admin', 'owner')
    )
);

-- ============================================
-- STEP 5: STORAGE BUCKET
-- ============================================

-- Create the storage bucket for record documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'record-documents',
    'record-documents',
    false,  -- Private bucket (requires auth)
    52428800,  -- 50MB max file size
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- STEP 6: STORAGE RLS POLICIES
-- ============================================

-- Storage bucket policies
-- Path format: {organisation_id}/{record_id}/{filename}

-- Users can read files from their organisation
CREATE POLICY "Users can view document files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'record-documents' AND
    (storage.foldername(name))[1]::UUID IN (
        SELECT organisation_id
        FROM organisation_users
        WHERE user_id = auth.uid()
    )
);

-- Admins can upload files to their organisation
CREATE POLICY "Admins can upload document files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'record-documents' AND
    (storage.foldername(name))[1]::UUID IN (
        SELECT organisation_id
        FROM organisation_users
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
);

-- Admins can update files in their organisation
CREATE POLICY "Admins can update document files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'record-documents' AND
    (storage.foldername(name))[1]::UUID IN (
        SELECT organisation_id
        FROM organisation_users
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
);

-- Admins can delete files from their organisation
CREATE POLICY "Admins can delete document files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'record-documents' AND
    (storage.foldername(name))[1]::UUID IN (
        SELECT organisation_id
        FROM organisation_users
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
);

-- ============================================
-- STEP 7: HELPER FUNCTIONS
-- ============================================

-- Get document count for a record
CREATE OR REPLACE FUNCTION get_record_document_count(p_record_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM record_documents
    WHERE record_id = p_record_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_record_document_count IS 'Returns the number of documents attached to a record.';

-- Get documents with pagination for a record
CREATE OR REPLACE FUNCTION get_record_documents(
    p_record_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    original_filename TEXT,
    file_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    category TEXT,
    description TEXT,
    uploaded_by UUID,
    uploader_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
    SELECT
        d.id,
        d.name,
        d.original_filename,
        d.file_path,
        d.file_size,
        d.mime_type,
        d.category,
        d.description,
        d.uploaded_by,
        up.full_name as uploader_name,
        d.created_at
    FROM record_documents d
    LEFT JOIN user_profiles up ON up.user_id = d.uploaded_by
    WHERE d.record_id = p_record_id
    AND (p_category IS NULL OR d.category = p_category)
    ORDER BY d.created_at DESC
    LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_record_documents IS 'Returns paginated documents for a record with optional category filter.';
