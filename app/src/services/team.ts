import { supabase } from './supabase';

export type UserRole = 'owner' | 'admin' | 'user';

export interface TeamMember {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  user_profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  email?: string;
}

export interface Invitation {
  id: string;
  organisation_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

interface ServiceResult<T> {
  data: T;
  error: { message: string } | null;
}

/**
 * Fetch all team members for an organisation
 */
interface OrgUser {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export async function fetchTeamMembers(
  organisationId: string
): Promise<ServiceResult<TeamMember[]>> {
  const { data, error } = await supabase
    .from('organisation_users')
    .select(`
      id,
      user_id,
      role,
      created_at
    `)
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching team members:', error);
    return { data: [], error: { message: error.message } };
  }

  const typedData = data as unknown as OrgUser[];

  // Fetch user profiles separately (no direct FK relationship)
  const userIds = typedData.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  // Fetch emails from auth.users via admin function or use profile data
  // For now, we'll use profile data only

  const profilesMap = new Map(
    ((profiles || []) as Array<{ id: string; full_name: string; avatar_url: string | null }>).map(
      (p) => [p.id, p]
    )
  );

  const membersWithProfiles: TeamMember[] = typedData.map((member) => ({
    ...member,
    role: member.role as UserRole,
    user_profile: profilesMap.get(member.user_id) || null,
  }));

  return { data: membersWithProfiles, error: null };
}

/**
 * Update a team member's role
 */
export async function updateMemberRole(
  memberId: string,
  newRole: UserRole
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('organisation_users')
    .update({ role: newRole } as never)
    .eq('id', memberId);

  if (error) {
    console.error('Error updating member role:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: null, error: null };
}

/**
 * Remove a team member from the organisation
 */
export async function removeMember(memberId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('organisation_users')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('Error removing member:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: null, error: null };
}

/**
 * Fetch pending invitations for an organisation
 */
export async function fetchInvitations(
  organisationId: string
): Promise<ServiceResult<Invitation[]>> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('organisation_id', organisationId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    // Table might not exist yet
    if (error.code === '42P01') {
      return { data: [], error: null };
    }
    console.error('Error fetching invitations:', error);
    return { data: [], error: { message: error.message } };
  }

  return { data: data || [], error: null };
}

/**
 * Create an invitation for a new team member
 */
export async function createInvitation(
  organisationId: string,
  email: string,
  role: UserRole,
  invitedBy: string
): Promise<ServiceResult<Invitation | null>> {
  // Set expiration to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organisation_id: organisationId,
      email: email.toLowerCase().trim(),
      role,
      invited_by: invitedBy,
      expires_at: expiresAt.toISOString(),
    } as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    return { data: null, error: { message: error.message } };
  }

  const invitation = data as Invitation;

  // Send invitation email via Edge Function
  if (invitation) {
    try {
      await supabase.functions.invoke('send-invite', {
        body: { invitationId: invitation.id },
      });
    } catch (emailError) {
      // Log but don't fail - invitation was created successfully
      console.error('Error sending invitation email:', emailError);
    }
  }

  return { data: invitation, error: null };
}

/**
 * Cancel/delete an invitation
 */
export async function cancelInvitation(invitationId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);

  if (error) {
    console.error('Error canceling invitation:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: null, error: null };
}

/**
 * Resend an invitation (update expires_at and send email)
 */
export async function resendInvitation(invitationId: string): Promise<ServiceResult<null>> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await supabase
    .from('invitations')
    .update({ expires_at: expiresAt.toISOString() } as never)
    .eq('id', invitationId);

  if (error) {
    console.error('Error resending invitation:', error);
    return { data: null, error: { message: error.message } };
  }

  // Re-send invitation email
  try {
    await supabase.functions.invoke('send-invite', {
      body: { invitationId },
    });
  } catch (emailError) {
    console.error('Error sending invitation email:', emailError);
  }

  return { data: null, error: null };
}

/**
 * Fetch records assigned to a user
 */
export async function fetchUserRecordAssignments(
  userId: string
): Promise<ServiceResult<string[]>> {
  const { data, error } = await supabase
    .from('user_record_assignments')
    .select('record_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user record assignments:', error);
    return { data: [], error: { message: error.message } };
  }

  const typedData = data as unknown as { record_id: string }[];
  return { data: typedData.map((d) => d.record_id), error: null };
}

/**
 * @deprecated Use fetchUserRecordAssignments instead
 */
export const fetchUserSiteAssignments = fetchUserRecordAssignments;

/**
 * Update record assignments for a user
 */
export async function updateUserRecordAssignments(
  userId: string,
  recordIds: string[]
): Promise<ServiceResult<null>> {
  // Delete existing assignments
  const { error: deleteError } = await supabase
    .from('user_record_assignments')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting record assignments:', deleteError);
    return { data: null, error: { message: deleteError.message } };
  }

  // Insert new assignments
  if (recordIds.length > 0) {
    const { error: insertError } = await supabase
      .from('user_record_assignments')
      .insert(recordIds.map((recordId) => ({ user_id: userId, record_id: recordId })) as never);

    if (insertError) {
      console.error('Error inserting record assignments:', insertError);
      return { data: null, error: { message: insertError.message } };
    }
  }

  return { data: null, error: null };
}

/**
 * @deprecated Use updateUserRecordAssignments instead
 */
export const updateUserSiteAssignments = updateUserRecordAssignments;
