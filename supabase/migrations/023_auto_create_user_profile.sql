-- ============================================
-- Migration 023: Auto-create user_profiles on signup
-- ============================================
-- Creates a trigger to automatically create a user_profiles entry
-- when a new user signs up via auth.users
-- ============================================

-- ============================================
-- STEP 1: Create function to handle new user signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    invite_record RECORD;
BEGIN
    -- Create user_profiles entry for new user
    INSERT INTO public.user_profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)  -- Use email prefix as fallback name
        ),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;  -- Don't fail if profile already exists

    -- Check if user has a pending invitation
    SELECT * INTO invite_record
    FROM public.invitations
    WHERE LOWER(email) = LOWER(NEW.email)
    AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- If invitation found, add user to organisation
    IF FOUND THEN
        -- Add user to organisation from invitation
        INSERT INTO public.organisation_users (organisation_id, user_id, role)
        VALUES (invite_record.organisation_id, NEW.id, invite_record.role)
        ON CONFLICT (organisation_id, user_id) DO NOTHING;

        -- Delete the used invitation
        DELETE FROM public.invitations WHERE id = invite_record.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Creates user_profiles entry and processes pending invitations when a new user signs up';

-- ============================================
-- STEP 2: Create trigger on auth.users
-- ============================================

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to fire after INSERT on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 3: Backfill existing users without profiles
-- ============================================

-- Create profiles for any existing auth users who don't have one
INSERT INTO public.user_profiles (id, full_name, avatar_url)
SELECT
    au.id,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        split_part(au.email, '@', 1)
    ),
    au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
WHERE up.id IS NULL;

-- ============================================
-- STEP 4: Add unique constraint to organisation_users if missing
-- ============================================

-- Ensure unique constraint exists for organisation_users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'organisation_users_org_user_unique'
    ) THEN
        ALTER TABLE organisation_users
        ADD CONSTRAINT organisation_users_org_user_unique
        UNIQUE (organisation_id, user_id);
    END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Automatically creates user_profiles and processes invitations when new user signs up';
