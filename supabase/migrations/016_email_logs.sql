-- Email logs table for tracking sent emails
-- This helps with debugging, analytics, and preventing duplicate sends

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by recipient
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient);

-- Index for querying by type
CREATE INDEX idx_email_logs_type ON email_logs(email_type);

-- Index for querying by organisation
CREATE INDEX idx_email_logs_org ON email_logs(organisation_id);

-- Index for recent emails
CREATE INDEX idx_email_logs_created ON email_logs(created_at DESC);

-- RLS policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view email logs
CREATE POLICY "Super admins can view email logs"
  ON email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  );

-- Service role can insert (used by Edge Functions)
-- No explicit policy needed as service role bypasses RLS

COMMENT ON TABLE email_logs IS 'Tracks all emails sent by the system for debugging and analytics';
COMMENT ON COLUMN email_logs.email_type IS 'Type of email: team_invite, trial_ending, payment_failed, invoice_paid, subscription_canceled, welcome';
COMMENT ON COLUMN email_logs.metadata IS 'Additional data passed to the email template';
