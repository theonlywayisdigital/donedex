-- ============================================
-- Migration 024: Create invitations table
-- ============================================

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organisation_id, email)
);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view org invitations"
ON invitations FOR SELECT
USING (organisation_id IN (
    SELECT organisation_id FROM organisation_users
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
));

CREATE POLICY "Admins can create invitations"
ON invitations FOR INSERT
WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM organisation_users
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
));

CREATE POLICY "Admins can delete invitations"
ON invitations FOR DELETE
USING (organisation_id IN (
    SELECT organisation_id FROM organisation_users
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
));

CREATE POLICY "Admins can update invitations"
ON invitations FOR UPDATE
USING (organisation_id IN (
    SELECT organisation_id FROM organisation_users
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
));
