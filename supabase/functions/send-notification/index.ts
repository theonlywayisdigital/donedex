// Supabase Edge Function: send-notification
// Sends notification emails to targeted users

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendNotificationRequest {
  notificationId: string;
  targetUserIds: string[];
}

interface NotificationData {
  id: string;
  title: string;
  message: string;
  action_url: string | null;
  action_label: string | null;
  category: string;
  priority: string;
}

// Get user emails from auth.users
async function getUserEmails(userIds: string[]): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>();

  // Query in batches of 50
  for (let i = 0; i < userIds.length; i += 50) {
    const batch = userIds.slice(i, i + 50);

    // Use admin API to get user emails
    for (const userId of batch) {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(userId);
        if (!error && data?.user?.email) {
          emailMap.set(userId, data.user.email);
        }
      } catch (err) {
        console.error(`Error getting email for user ${userId}:`, err);
      }
    }
  }

  return emailMap;
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
    const body: SendNotificationRequest = await req.json();
    const { notificationId, targetUserIds } = body;

    // Validate request
    if (!notificationId || !targetUserIds || targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: notificationId, targetUserIds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get notification details
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('id, title, message, action_url, action_label, category, priority')
      .eq('id', notificationId)
      .single();

    if (notifError || !notification) {
      console.error('Error fetching notification:', notifError);
      return new Response(
        JSON.stringify({ error: 'Notification not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notifData = notification as NotificationData;

    // Get user emails
    const emailMap = await getUserEmails(targetUserIds);
    console.log(`Found ${emailMap.size} email addresses for ${targetUserIds.length} users`);

    // Send emails to each user
    let emailsSent = 0;
    const errors: string[] = [];

    for (const [userId, email] of emailMap) {
      try {
        // Call send-email function
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            type: 'notification',
            to: email,
            data: {
              title: notifData.title,
              message: notifData.message,
              actionUrl: notifData.action_url,
              actionLabel: notifData.action_label,
              category: notifData.category,
              priority: notifData.priority,
            },
          },
        });

        if (emailError) {
          console.error(`Error sending email to ${email}:`, emailError);
          errors.push(`${email}: ${emailError.message}`);
        } else {
          emailsSent++;

          // Update receipt with email_sent_at
          await supabase
            .from('notification_receipts')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('notification_id', notificationId)
            .eq('user_id', userId);
        }
      } catch (err) {
        console.error(`Error processing email for ${email}:`, err);
        errors.push(`${email}: ${err.message}`);
      }
    }

    console.log(`Sent ${emailsSent} of ${emailMap.size} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        totalTargeted: targetUserIds.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
