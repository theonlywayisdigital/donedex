// Supabase Edge Function: provision-org-users
// Creates Supabase Auth accounts for organisation members and adds them to the org.
// Users receive an email to set their password via Supabase's inviteUserByEmail.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:8081';

// Service role client — bypasses RLS, used for admin operations
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserToProvision {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'user';
}

interface ProvisionRequest {
  organisationId: string;
  users: UserToProvision[];
}

interface ProvisionResult {
  email: string;
  status: 'created' | 'existing_user_added' | 'error';
  userId?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Get the Authorization header (passed through by the Supabase gateway)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a user-scoped client using the anon key + the caller's JWT
    // This is the correct way to verify the caller's identity in an edge function
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the authenticated user from the JWT
    const { data: { user: callerUser }, error: authError } = await userClient.auth.getUser();

    if (authError || !callerUser) {
      console.error('Auth error:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Invalid token', detail: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is an active super admin (using service client to bypass RLS)
    const { data: superAdmin, error: saError } = await serviceClient
      .from('super_admins')
      .select('id')
      .eq('user_id', callerUser.id)
      .eq('is_active', true)
      .maybeSingle();

    if (saError) {
      console.error('Super admin check error:', saError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to verify super admin status', detail: saError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!superAdmin) {
      return new Response(
        JSON.stringify({ error: 'Not authorized - super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ProvisionRequest = await req.json();
    const { organisationId, users } = body;

    if (!organisationId || !users || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing organisationId or users array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the organisation exists (using service client)
    const { data: org, error: orgError } = await serviceClient
      .from('organisations')
      .select('id, name')
      .eq('id', organisationId)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organisation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: ProvisionResult[] = [];

    for (const userToAdd of users) {
      try {
        const email = userToAdd.email.toLowerCase().trim();
        const firstName = userToAdd.firstName.trim();
        const lastName = userToAdd.lastName.trim();
        const fullName = `${firstName} ${lastName}`.trim();
        const phone = userToAdd.phone?.trim() || null;
        const role = userToAdd.role;
        let userId: string;
        let status: 'created' | 'existing_user_added' = 'created';

        // Try to create user via inviteUserByEmail first
        // This creates the auth user AND sends them an email to set their password
        const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
          email,
          {
            data: {
              full_name: fullName,
              organisation_name: org.name,
              organisation_id: organisationId,
            },
            redirectTo: `${APP_URL}/auth/callback`,
          }
        );

        if (inviteError) {
          // If user already exists, find them via admin API
          if (inviteError.message?.includes('already been registered') ||
              inviteError.message?.includes('already exists') ||
              inviteError.message?.includes('already_exists') ||
              inviteError.message?.includes('duplicate')) {
            // Try to get user by email using the admin API
            const { data: { users: allUsers }, error: listError } = await serviceClient.auth.admin.listUsers({
              page: 1,
              perPage: 1000,
            });

            if (listError) {
              throw new Error(`Failed to list users: ${listError.message}`);
            }

            const existingUser = allUsers?.find(
              (u: { email?: string }) => u.email?.toLowerCase() === email
            );
            if (existingUser) {
              userId = existingUser.id;
              status = 'existing_user_added';
            } else {
              throw new Error(`User reported as existing but not found: ${inviteError.message}`);
            }
          } else {
            throw new Error(inviteError.message);
          }
        } else {
          userId = inviteData.user.id;
        }

        // Upsert user_profiles (using service client to bypass RLS)
        const profileData: Record<string, unknown> = {
          id: userId!,
          full_name: fullName,
        };
        if (phone) {
          profileData.phone_number = phone;
        }
        const { error: profileError } = await serviceClient
          .from('user_profiles')
          .upsert(profileData, { onConflict: 'id' });

        if (profileError) {
          console.error(`Error upserting profile for ${email}:`, profileError);
        }

        // Insert into organisation_users (skip if already exists)
        const { error: orgUserError } = await serviceClient
          .from('organisation_users')
          .upsert({
            organisation_id: organisationId,
            user_id: userId!,
            role,
          }, { onConflict: 'organisation_id,user_id' })
          .select()
          .single();

        if (orgUserError) {
          // If unique constraint error, the user is already in this org
          if (orgUserError.code === '23505') {
            console.log(`User ${email} already in org ${organisationId}`);
          } else {
            console.error(`Error adding ${email} to org:`, orgUserError);
            throw new Error(`Failed to add to organisation: ${orgUserError.message}`);
          }
        }

        results.push({ email, status, userId: userId! });
      } catch (err) {
        console.error(`Error provisioning user ${userToAdd.email}:`, err);
        results.push({
          email: userToAdd.email,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const errors = results.filter(r => r.status === 'error');

    return new Response(
      JSON.stringify({ results, errors }),
      {
        status: errors.length === results.length ? 500 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
