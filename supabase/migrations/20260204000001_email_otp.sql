-- Email OTP (One-Time Passcode) table for 2FA
-- Codes are sent to user's email after password verification

CREATE TABLE IF NOT EXISTS email_otp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_email_otp_user_id ON email_otp(user_id);
CREATE INDEX idx_email_otp_email ON email_otp(email);
CREATE INDEX idx_email_otp_expires ON email_otp(expires_at);

-- RLS policies
ALTER TABLE email_otp ENABLE ROW LEVEL SECURITY;

-- Only the service role can manage OTP records (via Edge Functions)
-- Users cannot directly read/write OTP codes
CREATE POLICY "Service role only" ON email_otp
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to generate a 6-digit OTP
CREATE OR REPLACE FUNCTION generate_otp_code()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN lpad(floor(random() * 1000000)::text, 6, '0');
END;
$$;

-- Function to create an OTP for a user
CREATE OR REPLACE FUNCTION create_email_otp(p_user_id uuid, p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
BEGIN
  -- Delete any existing OTPs for this user
  DELETE FROM email_otp WHERE user_id = p_user_id;

  -- Generate new code
  v_code := generate_otp_code();

  -- Insert new OTP (expires in 10 minutes)
  INSERT INTO email_otp (user_id, email, code, expires_at)
  VALUES (p_user_id, p_email, v_code, now() + interval '10 minutes');

  RETURN v_code;
END;
$$;

-- Function to verify an OTP
CREATE OR REPLACE FUNCTION verify_email_otp(p_user_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_otp record;
BEGIN
  -- Get the OTP record
  SELECT * INTO v_otp
  FROM email_otp
  WHERE user_id = p_user_id
    AND verified = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- No valid OTP found
  IF v_otp IS NULL THEN
    RETURN false;
  END IF;

  -- Increment attempts
  UPDATE email_otp SET attempts = attempts + 1 WHERE id = v_otp.id;

  -- Too many attempts (max 5)
  IF v_otp.attempts >= 5 THEN
    DELETE FROM email_otp WHERE id = v_otp.id;
    RETURN false;
  END IF;

  -- Check code
  IF v_otp.code = p_code THEN
    -- Mark as verified and delete
    DELETE FROM email_otp WHERE id = v_otp.id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Clean up expired OTPs periodically (can be called by cron or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM email_otp WHERE expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
