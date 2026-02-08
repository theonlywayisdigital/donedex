"use strict";
/**
 * Provision Organisation Users Cloud Function
 * Creates Firebase Auth accounts for organisation members
 * Migrated from Supabase Edge Function
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisionOrgUsersHttp = exports.provisionOrgUsers = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const sendEmail_1 = require("../email/sendEmail");
const APP_URL = process.env.APP_URL || 'https://app.donedex.com';
// Generate a secure random password
function generateTempPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}
// Generate welcome email HTML
function generateWelcomeEmail(orgName, userName, role, isNewUser, passwordResetLink) {
    const primaryColor = '#0F4C5C';
    const secondaryColor = '#1F6F8B';
    const actionUrl = passwordResetLink || `${APP_URL}/login`;
    const actionText = isNewUser ? 'Set Password & Get Started' : 'Log In';
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${orgName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Donedex!</h1>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 16px;">Hi ${userName},</p>
    <p style="font-size: 16px; margin-bottom: 16px;">
      Your account has been created for <strong>${orgName}</strong> on Donedex.
      You've been added as ${role === 'admin' ? 'an Admin' : role === 'owner' ? 'the Owner' : 'a Team Member'}.
    </p>
    ${isNewUser ? `
    <p style="font-size: 16px; margin-bottom: 24px; background: #F9FAFB; padding: 16px; border-radius: 8px;">
      Click the button below to set your password and start using Donedex.
    </p>
    ` : `
    <p style="font-size: 16px; margin-bottom: 24px; background: #F9FAFB; padding: 16px; border-radius: 8px;">
      You already have a Donedex account. Log in with your existing credentials to access this organisation.
    </p>
    `}
    <div style="text-align: center; margin: 32px 0;">
      <a href="${actionUrl}"
         style="display: inline-block; background: ${primaryColor}; color: white; padding: 14px 32px;
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${actionText}
      </a>
    </div>
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px;">Getting Started</h3>
      <ol style="margin: 0; padding-left: 20px; color: #4B5563;">
        <li style="margin-bottom: 8px;">Complete inspections using templates</li>
        <li style="margin-bottom: 8px;">Add photos and notes</li>
        <li>Generate professional PDF reports</li>
      </ol>
    </div>
    <p style="font-size: 14px; color: #6B7280;">
      Need help? Reply to this email and our team will be happy to assist.
    </p>
  </div>
  <div style="text-align: center; padding: 24px; color: #6B7280; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} Donedex. All rights reserved.</p>
  </div>
</body>
</html>`;
}
async function provisionUsersLogic(organisationId, users, callerUid) {
    var _a, _b;
    const db = admin.firestore();
    // Verify caller is a super admin
    const superAdminDoc = await db.collection('super_admins')
        .where('user_id', '==', callerUid)
        .where('is_active', '==', true)
        .limit(1)
        .get();
    if (superAdminDoc.empty) {
        throw new https_1.HttpsError('permission-denied', 'Only super admins can provision users');
    }
    // Verify organisation exists
    const orgDoc = await db.collection('organisations').doc(organisationId).get();
    if (!orgDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Organisation not found');
    }
    const orgName = ((_a = orgDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Organisation';
    const results = [];
    for (const userToAdd of users) {
        try {
            const email = userToAdd.email.toLowerCase().trim();
            const firstName = userToAdd.firstName.trim();
            const lastName = userToAdd.lastName.trim();
            const fullName = `${firstName} ${lastName}`.trim();
            const phone = ((_b = userToAdd.phone) === null || _b === void 0 ? void 0 : _b.trim()) || null;
            const role = userToAdd.role;
            let userId;
            let isNewUser = true;
            let passwordResetLink;
            try {
                // Check if user already exists in Firebase Auth
                const existingUser = await admin.auth().getUserByEmail(email);
                userId = existingUser.uid;
                isNewUser = false;
                console.log(`User ${email} already exists (${userId})`);
            }
            catch (error) {
                if (error.code === 'auth/user-not-found') {
                    // Create new user
                    const tempPassword = generateTempPassword();
                    const newUser = await admin.auth().createUser({
                        email,
                        password: tempPassword,
                        displayName: fullName,
                        emailVerified: false,
                    });
                    userId = newUser.uid;
                    console.log(`Created new user ${email} (${userId})`);
                    // Generate password reset link
                    try {
                        passwordResetLink = await admin.auth().generatePasswordResetLink(email, {
                            url: `${APP_URL}/auth/callback`,
                        });
                    }
                    catch (linkError) {
                        console.error('Error generating reset link:', linkError);
                    }
                }
                else {
                    throw error;
                }
            }
            // Create/update user document in Firestore
            const userData = {
                id: userId,
                email,
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                organisation_id: organisationId,
                role,
                email_verified: !isNewUser,
                updated_at: new Date().toISOString(),
            };
            if (phone) {
                userData.phone = phone;
            }
            if (isNewUser) {
                userData.created_at = new Date().toISOString();
            }
            await db.collection('users').doc(userId).set(userData, { merge: true });
            // Send welcome email
            const emailHtml = generateWelcomeEmail(orgName, fullName || email, role, isNewUser, passwordResetLink);
            const subject = `Welcome to ${orgName} on Donedex`;
            const emailResult = await (0, sendEmail_1.sendEmailWithResend)(email, subject, emailHtml);
            if (!emailResult.success) {
                console.error(`Failed to send welcome email to ${email}:`, emailResult.error);
            }
            results.push({
                email,
                status: isNewUser ? 'created' : 'existing_user_added',
                userId,
            });
        }
        catch (err) {
            console.error(`Error provisioning user ${userToAdd.email}:`, err);
            results.push({
                email: userToAdd.email,
                status: 'error',
                error: err.message,
            });
        }
    }
    const errors = results.filter(r => r.status === 'error');
    return {
        results,
        errors,
        success: errors.length < results.length,
    };
}
exports.provisionOrgUsers = (0, https_1.onCall)({ region: 'europe-west2' }, async (request) => {
    // Verify caller is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const { organisationId, users } = request.data;
    if (!organisationId || !users || !Array.isArray(users) || users.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Missing organisationId or users array');
    }
    return provisionUsersLogic(organisationId, users, request.auth.uid);
});
// HTTP version for internal use
exports.provisionOrgUsersHttp = (0, https_1.onRequest)({ cors: true, region: 'europe-west2' }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.status(200).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    // Verify authorization
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
    }
    try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { organisationId, users } = req.body;
        if (!organisationId || !users || !Array.isArray(users) || users.length === 0) {
            res.status(400).json({ error: 'Missing organisationId or users array' });
            return;
        }
        const result = await provisionUsersLogic(organisationId, users, decodedToken.uid);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error:', error);
        if (error.code === 'permission-denied') {
            res.status(403).json({ error: error.message });
        }
        else if (error.code === 'not-found') {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
//# sourceMappingURL=provisionOrgUsers.js.map