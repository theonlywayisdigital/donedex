// Supabase Edge Function: send-login-otp
// Generates and sends a 6-digit OTP code for 2FA login

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Donedex <noreply@donedex.com>';
const LOGO_URL = 'https://eynaufdznthvmylsaffs.supabase.co/storage/v1/object/public/public-assets/donedex-logo.png';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OTPRequest {
  userId: string;
  email: string;
}

// Generate OTP email HTML
function generateOTPEmail(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:32px 40px;text-align:center;border-bottom:1px solid #e5e7eb;">
              <img src="${LOGO_URL}" alt="Donedex" style="height:100px;width:auto;">
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1a1a1a;text-align:center;">Your Login Code</h2>
              <p style="margin:0 0 24px;font-size:16px;line-height:24px;color:#6b7280;text-align:center;">Enter this code to complete your sign in:</p>
              <div style="background-color:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a1a;">${code}</span>
              </div>
              <p style="margin:0;font-size:14px;line-height:20px;color:#9ca3af;text-align:center;">This code expires in 10 minutes. If you didn't request this code, please ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#f9fafb;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">&copy; 2026 Donedex. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Send email using Resend API
async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return { success: false, error: `Email send failed: ${response.status}` };
    }

    const result = await response.json();
    console.log('OTP email sent successfully:', result.id);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Main request handler
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body: OTPRequest = await req.json();
    const { userId, email } = body;

    // Validate request
    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate OTP using the database function
    const { data: code, error: dbError } = await supabase.rpc('create_email_otp', {
      p_user_id: userId,
      p_email: email,
    });

    if (dbError || !code) {
      console.error('Error creating OTP:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate and send email
    const html = generateOTPEmail(code);
    const result = await sendEmail(email, 'Your Donedex Login Code', html);

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, message: 'OTP sent successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
