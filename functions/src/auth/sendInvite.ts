/**
 * Send Invite Cloud Function
 * Creates Firebase Auth user and sends invitation email
 * Migrated from Supabase Edge Function
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { sendEmailWithResend } from '../email/sendEmail';

const APP_URL = process.env.APP_URL || 'https://app.donedex.com';

interface InviteRequest {
  invitationId: string;
}

// Generate a secure random password for new users
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate invite email HTML
function generateInviteEmail(
  orgName: string,
  inviterName: string,
  role: string,
  inviteToken: string,
  isNewUser: boolean
): string {
  const primaryColor = '#0F4C5C';
  const secondaryColor = '#1F6F8B';

  const actionUrl = isNewUser
    ? `${APP_URL}/accept-invite?token=${inviteToken}`
    : `${APP_URL}/login`;

  const actionText = isNewUser
    ? 'Accept Invitation'
    : 'Log In';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
    <p style="font-size: 16px; margin-bottom: 16px;">
      <strong>${inviterName}</strong> has invited you to join
      <strong>${orgName}</strong> on Donedex as ${role === 'admin' ? 'an Admin' : 'a Team Member'}.
    </p>
    <p style="font-size: 16px; margin-bottom: 24px;">
      Donedex helps teams conduct property inspections efficiently with customizable templates,
      photo documentation, and professional PDF reports.
    </p>
    ${isNewUser ? `
    <p style="font-size: 16px; margin-bottom: 24px; background: #F9FAFB; padding: 16px; border-radius: 8px;">
      Click the button below to create your account and set your password.
    </p>
    ` : `
    <p style="font-size: 16px; margin-bottom: 24px; background: #F9FAFB; padding: 16px; border-radius: 8px;">
      You already have a Donedex account. Just log in with your existing credentials to access this organisation.
    </p>
    `}
    <div style="text-align: center; margin: 32px 0;">
      <a href="${actionUrl}"
         style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px;
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${actionText}
      </a>
    </div>
    <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
      This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
  <div style="text-align: center; padding: 24px; color: #6B7280; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} Donedex. All rights reserved.</p>
  </div>
</body>
</html>`;
}

export const sendInvite = onCall<InviteRequest>({ region: 'europe-west2' }, async (request) => {
  const { invitationId } = request.data;

  if (!invitationId) {
    throw new HttpsError('invalid-argument', 'Missing invitationId');
  }

  const db = admin.firestore();

  // Fetch invitation details
  const invitationDoc = await db.collection('invitations').doc(invitationId).get();

  if (!invitationDoc.exists) {
    throw new HttpsError('not-found', 'Invitation not found');
  }

  const invitation = invitationDoc.data()!;

  // Get organisation name
  const orgDoc = await db.collection('organisations').doc(invitation.organisation_id).get();
  const orgName = orgDoc.exists ? orgDoc.data()?.name : 'Unknown Organisation';

  // Get inviter's name
  let inviterName = 'A team member';
  if (invitation.invited_by) {
    const inviterDoc = await db.collection('users').doc(invitation.invited_by).get();
    if (inviterDoc.exists) {
      const inviterData = inviterDoc.data();
      inviterName = inviterData?.full_name ||
                   `${inviterData?.first_name || ''} ${inviterData?.last_name || ''}`.trim() ||
                   'A team member';
    }
  }

  const email = invitation.email.toLowerCase().trim();
  let isNewUser = true;
  let userId: string;

  try {
    // Check if user already exists in Firebase Auth
    const existingUser = await admin.auth().getUserByEmail(email);
    userId = existingUser.uid;
    isNewUser = false;
    console.log(`User ${email} already exists (${userId})`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // Create new user with password reset link flow
      const tempPassword = generateTempPassword();
      const newUser = await admin.auth().createUser({
        email,
        password: tempPassword,
        emailVerified: false,
      });
      userId = newUser.uid;
      console.log(`Created new user ${email} (${userId})`);
    } else {
      throw error;
    }
  }

  // Create/update user document in Firestore
  const userData = {
    id: userId,
    email,
    first_name: invitation.first_name || '',
    last_name: invitation.last_name || '',
    full_name: invitation.first_name && invitation.last_name
      ? `${invitation.first_name} ${invitation.last_name}`.trim()
      : '',
    phone: invitation.phone || null,
    organisation_id: invitation.organisation_id,
    role: invitation.role,
    email_verified: false,
    updated_at: new Date().toISOString(),
  };

  await db.collection('users').doc(userId).set(userData, { merge: true });

  // Generate password reset link for new users
  let inviteToken = invitationId;
  if (isNewUser) {
    try {
      const resetLink = await admin.auth().generatePasswordResetLink(email, {
        url: `${APP_URL}/auth/callback?invitation=${invitationId}`,
      });
      // Extract token from reset link for a cleaner flow
      inviteToken = resetLink;
    } catch (error) {
      console.error('Error generating reset link:', error);
      // Fall back to using invitation ID
    }
  }

  // Update invitation status
  await db.collection('invitations').doc(invitationId).update({
    status: 'sent',
    user_id: userId,
    sent_at: new Date().toISOString(),
  });

  // Send invitation email
  const emailHtml = generateInviteEmail(
    orgName,
    inviterName,
    invitation.role,
    inviteToken,
    isNewUser
  );

  const subject = `You've been invited to join ${orgName} on Donedex`;
  const result = await sendEmailWithResend(email, subject, emailHtml);

  if (!result.success) {
    console.error('Failed to send invite email:', result.error);
    throw new HttpsError('internal', `Failed to send invite: ${result.error}`);
  }

  return {
    success: true,
    message: isNewUser
      ? 'Invitation sent - user will create account'
      : 'Invitation sent - user already has an account',
    userId,
    isNewUser,
  };
});

// HTTP version for internal calls
export const sendInviteHttp = onRequest({ cors: true, region: 'europe-west2' }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    await admin.auth().verifyIdToken(token);

    const { invitationId } = req.body;

    if (!invitationId) {
      res.status(400).json({ error: 'Missing invitationId' });
      return;
    }

    // Inline the logic since we can't call .run() on v2 functions
    const db = admin.firestore();
    const invitationDoc = await db.collection('invitations').doc(invitationId).get();

    if (!invitationDoc.exists) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }

    const invitation = invitationDoc.data()!;
    const orgDoc = await db.collection('organisations').doc(invitation.organisation_id).get();
    const orgName = orgDoc.exists ? orgDoc.data()?.name : 'Unknown Organisation';

    let inviterName = 'A team member';
    if (invitation.invited_by) {
      const inviterDoc = await db.collection('users').doc(invitation.invited_by).get();
      if (inviterDoc.exists) {
        const inviterData = inviterDoc.data();
        inviterName = inviterData?.full_name ||
                     `${inviterData?.first_name || ''} ${inviterData?.last_name || ''}`.trim() ||
                     'A team member';
      }
    }

    const email = invitation.email.toLowerCase().trim();
    let isNewUser = true;
    let userId: string;

    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      userId = existingUser.uid;
      isNewUser = false;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        const tempPassword = generateTempPassword();
        const newUser = await admin.auth().createUser({
          email,
          password: tempPassword,
          emailVerified: false,
        });
        userId = newUser.uid;
      } else {
        throw error;
      }
    }

    const userData = {
      id: userId,
      email,
      first_name: invitation.first_name || '',
      last_name: invitation.last_name || '',
      full_name: invitation.first_name && invitation.last_name
        ? `${invitation.first_name} ${invitation.last_name}`.trim()
        : '',
      phone: invitation.phone || null,
      organisation_id: invitation.organisation_id,
      role: invitation.role,
      email_verified: false,
      updated_at: new Date().toISOString(),
    };

    await db.collection('users').doc(userId).set(userData, { merge: true });

    let inviteToken = invitationId;
    if (isNewUser) {
      try {
        inviteToken = await admin.auth().generatePasswordResetLink(email, {
          url: `${APP_URL}/auth/callback?invitation=${invitationId}`,
        });
      } catch (error) {
        console.error('Error generating reset link:', error);
      }
    }

    await db.collection('invitations').doc(invitationId).update({
      status: 'sent',
      user_id: userId,
      sent_at: new Date().toISOString(),
    });

    const emailHtml = generateInviteEmail(orgName, inviterName, invitation.role, inviteToken, isNewUser);
    const subject = `You've been invited to join ${orgName} on Donedex`;
    const result = await sendEmailWithResend(email, subject, emailHtml);

    if (!result.success) {
      res.status(500).json({ error: `Failed to send invite: ${result.error}` });
      return;
    }

    res.status(200).json({
      success: true,
      message: isNewUser ? 'Invitation sent - user will create account' : 'Invitation sent - user already has an account',
      userId,
      isNewUser,
    });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
