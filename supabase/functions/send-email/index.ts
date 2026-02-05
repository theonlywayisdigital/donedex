// Supabase Edge Function: send-email
// Generic email sending function using Resend API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const APP_URL = Deno.env.get('APP_URL') || 'https://donedex-app.netlify.app';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Donedex <noreply@donedex.com>';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Email template types
type EmailType =
  | 'team_invite'
  | 'trial_ending'
  | 'payment_failed'
  | 'invoice_paid'
  | 'subscription_canceled'
  | 'welcome'
  | 'notification';

interface EmailBranding {
  orgName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
}

interface EmailRequest {
  type: EmailType;
  to: string;
  data: Record<string, unknown>;
  branding?: EmailBranding;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default branding values
const DEFAULT_BRANDING: EmailBranding = {
  orgName: 'Donedex',
  primaryColor: '#0F4C5C',
  secondaryColor: '#1F6F8B',
};

// Helper to generate logo HTML if available
function getLogoHtml(branding: EmailBranding): string {
  if (branding.logoUrl) {
    return `<img src="${branding.logoUrl}" alt="${branding.orgName}" style="max-height: 40px; max-width: 150px; margin-bottom: 16px;" />`;
  }
  return '';
}

// Generate email templates
function generateTemplate(type: EmailType, data: Record<string, unknown>, branding?: EmailBranding): EmailTemplate {
  // Use custom branding or defaults
  const brand = branding || DEFAULT_BRANDING;
  const primaryColor = brand.primaryColor;
  const secondaryColor = brand.secondaryColor;
  const brandName = brand.orgName;
  const logoHtml = getLogoHtml(brand);

  const templates: Record<EmailType, () => EmailTemplate> = {
    team_invite: () => ({
      subject: `You've been invited to join ${data.organisationName} on ${brandName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    ${logoHtml}
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
    <p style="font-size: 16px; margin-bottom: 16px;">
      <strong>${data.invitedByName || 'A team member'}</strong> has invited you to join
      <strong>${data.organisationName}</strong> on ${brandName} as ${data.role === 'admin' ? 'an Admin' : 'a Team Member'}.
    </p>
    <p style="font-size: 16px; margin-bottom: 24px;">
      ${brandName} helps teams conduct property inspections efficiently with customizable templates,
      photo documentation, and professional PDF reports.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${APP_URL}/accept-invite?token=${data.inviteToken}"
         style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px;
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
      This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
  <div style="text-align: center; padding: 24px; color: #6B7280; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
  </div>
</body>
</html>`,
    }),

    trial_ending: () => ({
      subject: `Your ${brandName} trial ends in ${data.daysRemaining} days`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Ending Soon</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #D97706 0%, #B45309 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    ${logoHtml}
    <h1 style="color: white; margin: 0; font-size: 24px;">Your Trial is Ending Soon</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${data.organisationName},</p>
    <p style="font-size: 16px; margin-bottom: 16px;">
      Your free trial of ${brandName} ends in <strong>${data.daysRemaining} days</strong>.
    </p>
    <p style="font-size: 16px; margin-bottom: 24px;">
      To continue using all features without interruption, please add your payment details before
      <strong>${data.trialEndDate}</strong>.
    </p>
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px;">What happens after the trial?</h3>
      <ul style="margin: 0; padding-left: 20px; color: #4B5563;">
        <li>Without a subscription, you'll be moved to our free tier</li>
        <li>Free tier includes limited inspections per month</li>
        <li>Your data will remain safe and accessible</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${APP_URL}/settings/billing"
         style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px;
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Upgrade Now
      </a>
    </div>
    <p style="font-size: 14px; color: #6B7280;">
      Questions? Reply to this email and we'll be happy to help.
    </p>
  </div>
  <div style="text-align: center; padding: 24px; color: #6B7280; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
  </div>
</body>
</html>`,
    }),

    payment_failed: () => ({
      subject: `Action required: Payment failed for your ${brandName} subscription`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    ${logoHtml}
    <h1 style="color: white; margin: 0; font-size: 24px;">Payment Failed</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${data.organisationName},</p>
    <p style="font-size: 16px; margin-bottom: 16px;">
      We weren't able to process your payment of <strong>${data.currency?.toUpperCase() || 'USD'} ${((data.amount as number) / 100).toFixed(2)}</strong>
      for your ${brandName} subscription.
    </p>
    <p style="font-size: 16px; margin-bottom: 24px;">
      Please update your payment method to avoid any interruption to your service.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${APP_URL}/settings/billing"
         style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px;
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Update Payment Method
      </a>
    </div>
    <p style="font-size: 14px; color: #6B7280;">
      If you believe this is an error or need assistance, please reply to this email.
    </p>
  </div>
  <div style="text-align: center; padding: 24px; color: #6B7280; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
  </div>
</body>
</html>`,
    }),

    invoice_paid: () => ({
      subject: `Receipt for your ${brandName} payment`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    ${logoHtml}
    <h1 style="color: white; margin: 0; font-size: 24px;">Payment Received</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${data.organisationName},</p>
    <p style="font-size: 16px; margin-bottom: 24px;">
      Thank you for your payment! Here's your receipt:
    </p>
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Amount Paid</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.currency?.toUpperCase() || 'USD'} ${((data.amount as number) / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Date</td>
          <td style="padding: 8px 0; text-align: right;">${data.paidDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280;">Invoice Number</td>
          <td style="padding: 8px 0; text-align: right;">${data.invoiceNumber}</td>
        </tr>
      </table>
    </div>
    ${data.invoicePdfUrl ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.invoicePdfUrl}"
         style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px;
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Download Invoice PDF
      </a>
    </div>
    ` : ''}
    <p style="font-size: 14px; color: #6B7280;">
      You can view all your invoices in the <a href="${APP_URL}/settings/billing" style="color: ${primaryColor};">Billing section</a> of your account.
    </p>
  </div>
  <div style="text-align: center; padding: 24px; color: #6B7280; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
  </div>
</body>
</html>`,
    }),

    subscription_canceled: () => ({
      subject: `Your ${brandName} subscription has been canceled`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Canceled</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    ${logoHtml}
    <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Canceled</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${data.organisationName},</p>
    <p style="font-size: 16px; margin-bottom: 16px;">
      Your ${brandName} subscription has been canceled. We're sorry to see you go!
    </p>
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px;">What happens now?</h3>
      <ul style="margin: 0; padding-left: 20px; color: #4B5563;">
        <li>Your account has been moved to our free tier</li>
        <li>All your existing data is safe and accessible</li>
        <li>You can resubscribe at any time</li>
      </ul>
    </div>
    <p style="font-size: 16px; margin-bottom: 24px;">
      If you have any feedback on how we could improve, we'd love to hear from you.
      Just reply to this email.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${APP_URL}/settings/billing"
         style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px;
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Resubscribe
      </a>
    </div>
  </div>
  <div style="text-align: center; padding: 24px; color: #6B7280; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
  </div>
</body>
</html>`,
    }),

    welcome: () => ({
      subject: `Welcome to ${brandName}!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${brandName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    ${logoHtml}
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to ${brandName}!</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${data.userName || 'there'},</p>
    <p style="font-size: 16px; margin-bottom: 24px;">
      Welcome to ${brandName}! We're excited to have you on board. Your account for
      <strong>${data.organisationName}</strong> is all set up and ready to go.
    </p>
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px;">Getting Started</h3>
      <ol style="margin: 0; padding-left: 20px; color: #4B5563;">
        <li style="margin-bottom: 8px;">Create your first inspection template or use our AI builder</li>
        <li style="margin-bottom: 8px;">Add your sites/properties to inspect</li>
        <li style="margin-bottom: 8px;">Start your first inspection</li>
        <li>Export professional PDF reports</li>
      </ol>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${APP_URL}"
         style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px;
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Get Started
      </a>
    </div>
    <p style="font-size: 14px; color: #6B7280;">
      Need help? Reply to this email and our team will be happy to assist.
    </p>
  </div>
  <div style="text-align: center; padding: 24px; color: #6B7280; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
  </div>
</body>
</html>`,
    }),

    notification: () => {
      // Get category color for styling
      const categoryColors: Record<string, string> = {
        general: '#6B7280',
        announcement: primaryColor,
        alert: '#D97706',
        update: '#059669',
      };
      const priorityColors: Record<string, string> = {
        low: '#6B7280',
        normal: primaryColor,
        high: '#DC2626',
      };
      const categoryColor = categoryColors[data.category as string] || primaryColor;
      const priorityColor = priorityColors[data.priority as string] || primaryColor;
      const isHighPriority = data.priority === 'high';

      return {
        subject: `${isHighPriority ? '[IMPORTANT] ' : ''}${data.title}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}CC 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    ${logoHtml}
    <h1 style="color: white; margin: 0; font-size: 24px;">${data.title}</h1>
    ${isHighPriority ? '<p style="color: #FEE2E2; margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">High Priority</p>' : ''}
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
    <div style="font-size: 16px; margin-bottom: 24px; white-space: pre-wrap;">${data.message}</div>
    ${data.actionUrl && data.actionLabel ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.actionUrl}"
         style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px;
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${data.actionLabel}
      </a>
    </div>
    ` : ''}
    <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
      This notification was sent via ${brandName}. You can view all your notifications in the app.
    </p>
  </div>
  <div style="text-align: center; padding: 24px; color: #6B7280; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
  </div>
</body>
</html>`,
      };
    },
  };

  return templates[type]();
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
    console.log('Email sent successfully:', result.id);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Log email event
async function logEmailEvent(
  type: EmailType,
  to: string,
  success: boolean,
  error?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('email_logs').insert({
      email_type: type,
      recipient: to,
      sent_at: success ? new Date().toISOString() : null,
      status: success ? 'sent' : 'failed',
      error: error || null,
      metadata: metadata || null,
    });
  } catch (err) {
    // Don't fail if logging fails
    console.error('Error logging email event:', err);
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
    const body: EmailRequest = await req.json();
    const { type, to, data, branding } = body;

    // Validate request
    if (!type || !to || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, to, data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email template with optional branding
    const template = generateTemplate(type, data, branding);

    // Send email
    const result = await sendEmail(to, template.subject, template.html);

    // Log the event
    await logEmailEvent(type, to, result.success, result.error, data);

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, message: 'Email sent successfully' }),
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
