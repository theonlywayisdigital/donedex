-- Create a SECURITY DEFINER function for permanently deleting an organisation
-- This bypasses RLS so super admins can delete all child data
-- The function validates that the caller is an active super admin

CREATE OR REPLACE FUNCTION public.delete_organisation_permanently(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is an active super admin
  IF NOT EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Permission denied: only super admins can delete organisations';
  END IF;

  -- Verify the organisation exists
  IF NOT EXISTS (
    SELECT 1 FROM organisations WHERE id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  -- Delete billing_events first (NO ACTION FK constraint)
  DELETE FROM billing_events WHERE organisation_id = p_org_id;

  -- Delete the organisation - all other child tables use ON DELETE CASCADE
  -- This will automatically cascade to:
  --   records, record_types, reports, templates, template_sections, template_items,
  --   organisation_users, invitations, organisation_usage, report_usage_history,
  --   billing_history, subscription_history, invoices, notifications
  DELETE FROM organisations WHERE id = p_org_id;
END;
$$;
