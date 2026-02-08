// Supabase Edge Function: send-invite
// Sends team invitation emails using Supabase's inviteUserByEmail()
// This creates proper auth tokens so invited users land on the password setup screen.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:8081';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  invitationId: string;
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
    const body: InviteRequest = await req.json();
    const { invitationId } = body;

    if (!invitationId) {
      return new Response(
        JSON.stringify({ error: 'Missing invitationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invitation details with organisation info
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        invited_by,
        organisation_id,
        organisations (
          name
        )
      `)
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      console.error('Error fetching invitation:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Invitation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get inviter's name
    const { data: inviterProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', invitation.invited_by)
      .single();

    const orgName = invitation.organisations?.name || 'Unknown Organisation';
    const inviterName = inviterProfile?.full_name || 'A team member';

    // Use Supabase's inviteUserByEmail() — this sends a proper Supabase auth invite email
    // with auth tokens that redirect to /auth/callback where the user can set their password.
    const { data: inviteData, error: inviteAuthError } = await supabase.auth.admin.inviteUserByEmail(
      invitation.email,
      {
        data: {
          full_name: '',
          organisation_name: orgName,
          organisation_id: invitation.organisation_id,
          invited_by_name: inviterName,
          invited_role: invitation.role,
        },
        redirectTo: `${APP_URL}/auth/callback`,
      }
    );

    if (inviteAuthError) {
      // If user already exists, that's ok for resends — the invite still works
      if (inviteAuthError.message?.includes('already been registered') ||
          inviteAuthError.message?.includes('already exists')) {
        console.log('User already exists, invite email may still be sent:', invitation.email);
        // For existing users, we can't use inviteUserByEmail. They should use password reset.
        // Generate a magic link instead
        const { error: magicLinkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: invitation.email,
          options: {
            redirectTo: `${APP_URL}/auth/callback`,
          },
        });

        if (magicLinkError) {
          console.error('Magic link error:', magicLinkError);
          // Not critical — the user already exists and can log in normally
        }

        return new Response(
          JSON.stringify({ success: true, message: 'User already exists — they can log in with their existing credentials' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error('Invite error:', inviteAuthError);
      return new Response(
        JSON.stringify({ error: 'Failed to send invite', details: inviteAuthError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If invite created a new user, add them to the organisation
    if (inviteData?.user) {
      // Upsert user profile
      await supabase
        .from('user_profiles')
        .upsert({ id: inviteData.user.id, full_name: '' }, { onConflict: 'id' });

      // Upsert organisation membership
      await supabase
        .from('organisation_users')
        .upsert({
          organisation_id: invitation.organisation_id,
          user_id: inviteData.user.id,
          role: invitation.role,
        }, { onConflict: 'organisation_id,user_id' });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Invitation email sent via Supabase Auth' }),
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
