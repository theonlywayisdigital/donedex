/**
 * Firebase Cloud Functions for Donedex
 * Migrated from Supabase Edge Functions
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Email functions
export { sendEmail, sendEmailHttp } from './email/sendEmail';

// Auth functions
export { sendInvite, sendInviteHttp } from './auth/sendInvite';
export { provisionOrgUsers, provisionOrgUsersHttp } from './auth/provisionOrgUsers';

// Stripe functions
export { stripeWebhook } from './stripe/webhook';
export { createCheckoutSession, createCheckoutSessionHttp } from './stripe/checkoutSession';
export { createCustomerPortal, createCustomerPortalHttp } from './stripe/customerPortal';

// AI functions
export { templateBuilderChat, templateBuilderChatHttp } from './ai/templateBuilderChat';
export { templateFromDocument, templateFromDocumentHttp } from './ai/templateFromDocument';
