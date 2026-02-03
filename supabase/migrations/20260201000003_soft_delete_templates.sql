-- Add archived column to templates for soft delete
ALTER TABLE templates ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Index for filtering out archived templates efficiently
CREATE INDEX IF NOT EXISTS idx_templates_archived ON templates (archived) WHERE archived = false;

-- Update RLS: prevent selecting archived templates for non-admin queries
-- (Existing RLS already scopes by organisation; archived filtering is done app-side)
