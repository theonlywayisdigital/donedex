/**
 * Create Customer Portal Cloud Function
 * Creates a Stripe Customer Portal session for billing management
 * Migrated from Supabase Edge Function
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Lazy initialization for Stripe
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(secretKey, { apiVersion: '2023-10-16' });
  }
  return stripeClient;
}

interface PortalRequest {
  organisationId: string;
  returnUrl?: string;
}

export const createCustomerPortal = onCall<PortalRequest>({ region: 'europe-west2', secrets: ['STRIPE_SECRET_KEY'] }, async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const {
    organisationId,
    returnUrl = 'https://app.donedex.com/settings/billing',
  } = request.data;

  if (!organisationId) {
    throw new HttpsError('invalid-argument', 'Missing organisationId');
  }

  const db = admin.firestore();

  // Verify user has access to this organisation
  const userDoc = await db.collection('users').doc(request.auth.uid).get();

  if (!userDoc.exists) {
    throw new HttpsError('permission-denied', 'User not found');
  }

  const userData = userDoc.data()!;

  // Check if user is in this organisation with proper role
  if (userData.organisation_id !== organisationId) {
    throw new HttpsError('permission-denied', 'Access denied to this organisation');
  }

  // Only owners and admins can access billing portal
  if (!['owner', 'admin'].includes(userData.role)) {
    throw new HttpsError(
      'permission-denied',
      'Only organisation owners and admins can access billing'
    );
  }

  // Get organisation's Stripe customer ID
  const orgDoc = await db.collection('organisations').doc(organisationId).get();

  if (!orgDoc.exists) {
    throw new HttpsError('not-found', 'Organisation not found');
  }

  const org = orgDoc.data()!;

  if (!org.stripe_customer_id) {
    throw new HttpsError(
      'failed-precondition',
      'No billing account. Please upgrade to a paid plan first.'
    );
  }

  // Create Stripe Customer Portal session
  const session = await getStripe().billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: returnUrl,
  });

  return {
    url: session.url,
  };
});

// HTTP version
export const createCustomerPortalHttp = onRequest({ cors: true, region: 'europe-west2', secrets: ['STRIPE_SECRET_KEY'] }, async (req, res) => {
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
    const decodedToken = await admin.auth().verifyIdToken(token);

    const {
      organisationId,
      returnUrl = 'https://app.donedex.com/settings/billing',
    } = req.body;

    if (!organisationId) {
      res.status(400).json({ error: 'Missing organisationId' });
      return;
    }

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      res.status(403).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data()!;

    if (userData.organisation_id !== organisationId) {
      res.status(403).json({ error: 'Access denied to this organisation' });
      return;
    }

    if (!['owner', 'admin'].includes(userData.role)) {
      res.status(403).json({ error: 'Only organisation owners and admins can access billing' });
      return;
    }

    const orgDoc = await db.collection('organisations').doc(organisationId).get();

    if (!orgDoc.exists) {
      res.status(404).json({ error: 'Organisation not found' });
      return;
    }

    const org = orgDoc.data()!;

    if (!org.stripe_customer_id) {
      res.status(400).json({ error: 'No billing account. Please upgrade to a paid plan first.' });
      return;
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    });

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
