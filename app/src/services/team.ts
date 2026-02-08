/**
 * Team Service
 * Handles team member management and invitations
 *
 * Uses Firebase/Firestore
 */

import { auth, db } from './firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { collections, generateId } from './firestore';

// Cloud Function URL
const CLOUD_FUNCTION_BASE_URL = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL ||
  'https://europe-west2-donedex-72116.cloudfunctions.net';

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
export async function fetchTeamMembers(
  organisationId: string
): Promise<ServiceResult<TeamMember[]>> {
  try {
    // Query users in this organisation
    const usersQuery = query(
      collection(db, collections.users),
      where('organisation_id', '==', organisationId)
    );
    const usersSnapshot = await getDocs(usersQuery);

    const members: TeamMember[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      members.push({
        id: userDoc.id,
        user_id: userDoc.id,
        role: userData.role || 'user',
        created_at: userData.created_at || '',
        user_profile: {
          id: userDoc.id,
          full_name: userData.full_name || userData.first_name
            ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
            : 'Unknown',
          avatar_url: userData.avatar_url || null,
        },
        email: userData.email,
      });
    }

    // Sort by created_at
    members.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return { data: members, error: null };
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return { data: [], error: { message: error.message } };
  }
}

/**
 * Update a team member's role
 */
export async function updateMemberRole(
  memberId: string,
  newRole: UserRole
): Promise<ServiceResult<null>> {
  try {
    const userRef = doc(db, collections.users, memberId);
    await updateDoc(userRef, {
      role: newRole,
      updated_at: new Date().toISOString(),
    });

    return { data: null, error: null };
  } catch (error: any) {
    console.error('Error updating member role:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Remove a team member from the organisation
 */
export async function removeMember(memberId: string): Promise<ServiceResult<null>> {
  try {
    const userRef = doc(db, collections.users, memberId);

    // Instead of deleting the user, just remove their organisation association
    await updateDoc(userRef, {
      organisation_id: null,
      role: null,
      updated_at: new Date().toISOString(),
    });

    return { data: null, error: null };
  } catch (error: any) {
    console.error('Error removing member:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Fetch pending invitations for an organisation
 */
export async function fetchInvitations(
  organisationId: string
): Promise<ServiceResult<Invitation[]>> {
  try {
    const now = new Date().toISOString();
    const invitationsQuery = query(
      collection(db, collections.invitations),
      where('organisation_id', '==', organisationId),
      where('expires_at', '>', now)
    );
    const snapshot = await getDocs(invitationsQuery);

    const invitations: Invitation[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Invitation));

    // Sort by created_at descending
    invitations.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { data: invitations, error: null };
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    return { data: [], error: { message: error.message } };
  }
}

/**
 * Send invitation email via Firebase Cloud Function
 */
async function sendInviteEmail(invitationId: string): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('Cannot send invite email: not authenticated');
      return;
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/sendInviteHttp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ invitationId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send invitation email:', errorText);
    } else {
      console.log('Invitation email sent successfully');
    }
  } catch (error) {
    console.error('Error sending invitation email:', error);
  }
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
  try {
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationId = generateId();
    const invitationRef = doc(db, collections.invitations, invitationId);

    const invitationData: Omit<Invitation, 'id'> = {
      organisation_id: organisationId,
      email: email.toLowerCase().trim(),
      role,
      invited_by: invitedBy,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    };

    await setDoc(invitationRef, invitationData);

    const invitation: Invitation = { id: invitationId, ...invitationData };

    // Send invitation email via Firebase Cloud Function
    // Fire and forget - don't block on email sending
    sendInviteEmail(invitationId).catch(err => {
      console.error('Background email send failed:', err);
    });

    return { data: invitation, error: null };
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Cancel/delete an invitation
 */
export async function cancelInvitation(invitationId: string): Promise<ServiceResult<null>> {
  try {
    const invitationRef = doc(db, collections.invitations, invitationId);
    await deleteDoc(invitationRef);

    return { data: null, error: null };
  } catch (error: any) {
    console.error('Error canceling invitation:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Resend an invitation (update expires_at and send email)
 */
export async function resendInvitation(invitationId: string): Promise<ServiceResult<null>> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationRef = doc(db, collections.invitations, invitationId);
    await updateDoc(invitationRef, {
      expires_at: expiresAt.toISOString(),
    });

    // Re-send invitation email via Firebase Cloud Function
    sendInviteEmail(invitationId).catch(err => {
      console.error('Background email resend failed:', err);
    });

    return { data: null, error: null };
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Fetch records assigned to a user
 */
export async function fetchUserRecordAssignments(
  userId: string
): Promise<ServiceResult<string[]>> {
  try {
    const assignmentsQuery = query(
      collection(db, 'user_record_assignments'),
      where('user_id', '==', userId)
    );
    const snapshot = await getDocs(assignmentsQuery);

    const recordIds = snapshot.docs.map(doc => doc.data().record_id as string);

    return { data: recordIds, error: null };
  } catch (error: any) {
    console.error('Error fetching user record assignments:', error);
    return { data: [], error: { message: error.message } };
  }
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
  try {
    const batch = writeBatch(db);

    // Delete existing assignments
    const existingQuery = query(
      collection(db, 'user_record_assignments'),
      where('user_id', '==', userId)
    );
    const existingSnapshot = await getDocs(existingQuery);

    existingSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Insert new assignments
    for (const recordId of recordIds) {
      const assignmentId = generateId();
      const assignmentRef = doc(db, 'user_record_assignments', assignmentId);
      batch.set(assignmentRef, {
        user_id: userId,
        record_id: recordId,
        created_at: new Date().toISOString(),
      });
    }

    await batch.commit();

    return { data: null, error: null };
  } catch (error: any) {
    console.error('Error updating record assignments:', error);
    return { data: null, error: { message: error.message } };
  }
}

/**
 * @deprecated Use updateUserRecordAssignments instead
 */
export const updateUserSiteAssignments = updateUserRecordAssignments;
