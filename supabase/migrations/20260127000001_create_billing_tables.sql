-- ============================================================
-- Billing Tables Migration
-- Creates subscription_plans, storage_addons, billing_events,
-- invoices, subscription_history tables.
-- Adds billing columns to organisations.
-- ============================================================

-- -----------------------------------------------
-- 1. subscription_plans
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Stripe integration
  stripe_product_id TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,
  stripe_per_user_price_id_monthly TEXT,
  stripe_per_user_price_id_annual TEXT,

  -- Usage limits (-1 = unlimited)
  max_users INTEGER NOT NULL DEFAULT 1,
  max_records INTEGER NOT NULL DEFAULT -1,
  max_reports_per_month INTEGER NOT NULL DEFAULT 10,
  max_storage_gb INTEGER NOT NULL DEFAULT 1,

  -- Feature flags
  feature_ai_templates BOOLEAN NOT NULL DEFAULT false,
  feature_pdf_export BOOLEAN NOT NULL DEFAULT false,
  feature_api_access BOOLEAN NOT NULL DEFAULT false,
  feature_custom_branding BOOLEAN NOT NULL DEFAULT false,
  feature_priority_support BOOLEAN NOT NULL DEFAULT false,
  feature_white_label BOOLEAN NOT NULL DEFAULT false,
  feature_advanced_analytics BOOLEAN NOT NULL DEFAULT false,
  feature_photos BOOLEAN NOT NULL DEFAULT false,
  feature_starter_templates BOOLEAN NOT NULL DEFAULT false,
  feature_all_field_types BOOLEAN NOT NULL DEFAULT false,

  -- Pricing (in pence GBP)
  price_monthly_gbp INTEGER NOT NULL DEFAULT 0,
  price_annual_gbp INTEGER NOT NULL DEFAULT 0,
  price_per_user_monthly_gbp INTEGER NOT NULL DEFAULT 0,
  price_per_user_annual_gbp INTEGER NOT NULL DEFAULT 0,
  base_users_included INTEGER NOT NULL DEFAULT 0,

  -- Field type gating (JSON array of category slugs)
  allowed_field_categories JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Meta
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------
-- 2. storage_addons
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  quantity_blocks INTEGER NOT NULL DEFAULT 1,
  block_size_gb INTEGER NOT NULL DEFAULT 10,
  price_per_block_monthly_gbp INTEGER NOT NULL DEFAULT 500, -- £5 in pence
  stripe_subscription_item_id TEXT,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One active add-on per org
  CONSTRAINT unique_active_addon_per_org UNIQUE (organisation_id) WHERE (is_active = true)
);

CREATE INDEX IF NOT EXISTS idx_storage_addons_org
  ON public.storage_addons(organisation_id)
  WHERE is_active = true;

-- -----------------------------------------------
-- 3. billing_events (Stripe webhook log)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_org
  ON public.billing_events(organisation_id);

CREATE INDEX IF NOT EXISTS idx_billing_events_type
  ON public.billing_events(event_type);

-- -----------------------------------------------
-- 4. invoices (synced from Stripe)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  amount_due INTEGER NOT NULL DEFAULT 0,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  amount_remaining INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'gbp',
  tax INTEGER NOT NULL DEFAULT 0,
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org
  ON public.invoices(organisation_id);

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_sub
  ON public.invoices(stripe_subscription_id);

-- -----------------------------------------------
-- 5. subscription_history (plan change audit trail)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_org
  ON public.subscription_history(organisation_id);

-- -----------------------------------------------
-- 6. Add billing columns to organisations (if missing)
-- -----------------------------------------------
DO $$
BEGIN
  -- billing_email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisations' AND column_name = 'billing_email'
  ) THEN
    ALTER TABLE public.organisations ADD COLUMN billing_email TEXT;
  END IF;

  -- user_count (cached count of active users)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisations' AND column_name = 'user_count'
  ) THEN
    ALTER TABLE public.organisations ADD COLUMN user_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- current_plan_id FK (column may already exist without FK)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'organisations' AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'id' AND ccu.table_name = 'subscription_plans'
  ) THEN
    -- Add FK if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'organisations' AND column_name = 'current_plan_id'
    ) THEN
      ALTER TABLE public.organisations
        ADD CONSTRAINT fk_organisations_current_plan
        FOREIGN KEY (current_plan_id) REFERENCES public.subscription_plans(id);
    END IF;
  END IF;
END
$$;

-- -----------------------------------------------
-- 7. RLS Policies
-- -----------------------------------------------

-- subscription_plans: anyone can read active public plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active public plans"
  ON public.subscription_plans
  FOR SELECT
  USING (is_active = true AND is_public = true);

-- storage_addons: org members can read their own
ALTER TABLE public.storage_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read their storage addons"
  ON public.storage_addons
  FOR SELECT
  USING (
    organisation_id IN (
      SELECT ou.organisation_id FROM public.organisation_users ou
      WHERE ou.user_id = auth.uid()
    )
  );

-- invoices: org members can read their own
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read their invoices"
  ON public.invoices
  FOR SELECT
  USING (
    organisation_id IN (
      SELECT ou.organisation_id FROM public.organisation_users ou
      WHERE ou.user_id = auth.uid()
    )
  );

-- subscription_history: org members can read their own
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read their subscription history"
  ON public.subscription_history
  FOR SELECT
  USING (
    organisation_id IN (
      SELECT ou.organisation_id FROM public.organisation_users ou
      WHERE ou.user_id = auth.uid()
    )
  );

-- billing_events: no direct access (service role only)
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- 8. Updated_at triggers
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_storage_addons_updated_at
  BEFORE UPDATE ON public.storage_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
