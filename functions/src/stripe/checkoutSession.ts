/**
 * Create Checkout Session Cloud Function
 * Creates a Stripe Checkout session for subscription payments
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

const getStorageAddonPriceId = () => process.env.STRIPE_STORAGE_ADDON_PRICE_ID;

interface CheckoutRequest {
  organisationId: string;
  planId?: string;
  billingInterval?: 'monthly' | 'annual';
  userCount?: number;
  addOnType?: 'storage';
  quantityBlocks?: number;
  successUrl?: string;
  cancelUrl?: string;
}

async function createCheckoutLogic(
  data: CheckoutRequest,
  callerUid: string
): Promise<{ url: string | null; sessionId: string }> {
  const {
    organisationId,
    planId,
    billingInterval = 'monthly',
    userCount,
    addOnType,
    quantityBlocks,
    successUrl = 'https://app.donedex.com/onboarding/payment-success',
    cancelUrl = 'https://app.donedex.com/onboarding/payment-canceled',
  } = data;

  if (!organisationId) {
    throw new HttpsError('invalid-argument', 'Missing organisationId');
  }

  const db = admin.firestore();

  // Get organisation details
  const orgDoc = await db.collection('organisations').doc(organisationId).get();

  if (!orgDoc.exists) {
    throw new HttpsError('not-found', 'Organisation not found');
  }

  const org = orgDoc.data()!;

  // Get or create Stripe customer
  let customerId = org.stripe_customer_id;

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: org.billing_email || org.contact_email,
      name: org.name,
      metadata: {
        organisation_id: organisationId,
        firebase_org_id: organisationId,
      },
    });
    customerId = customer.id;

    await orgDoc.ref.update({ stripe_customer_id: customerId });
  }

  let session: Stripe.Checkout.Session;

  // Storage add-on checkout
  if (addOnType === 'storage') {
    const storageAddonPriceId = getStorageAddonPriceId();
    if (!storageAddonPriceId) {
      throw new HttpsError('failed-precondition', 'Storage add-on price not configured');
    }

    const blocks = quantityBlocks || 1;

    session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: storageAddonPriceId,
          quantity: blocks,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        organisation_id: organisationId,
        add_on_type: 'storage',
        quantity_blocks: String(blocks),
      },
    });
  }
  // Plan subscription checkout
  else {
    if (!planId) {
      throw new HttpsError('invalid-argument', 'Missing planId');
    }

    // Get plan details
    const planDoc = await db.collection('subscription_plans').doc(planId).get();

    if (!planDoc.exists) {
      throw new HttpsError('not-found', 'Plan not found');
    }

    const plan = planDoc.data()!;

    // Build line items
    const lineItems: Array<{ price: string; quantity: number }> = [];

    // Base plan price
    const basePriceId = billingInterval === 'annual'
      ? plan.stripe_price_id_annual
      : plan.stripe_price_id_monthly;

    if (!basePriceId) {
      throw new HttpsError(
        'failed-precondition',
        `No Stripe price configured for ${billingInterval} billing`
      );
    }

    lineItems.push({ price: basePriceId, quantity: 1 });

    // Per-user price (additional users beyond base_users_included)
    const perUserPriceId = billingInterval === 'annual'
      ? plan.stripe_per_user_price_id_annual
      : plan.stripe_per_user_price_id_monthly;

    if (perUserPriceId && userCount && userCount > (plan.base_users_included || 0)) {
      const additionalUsers = userCount - (plan.base_users_included || 0);
      lineItems.push({ price: perUserPriceId, quantity: additionalUsers });
    }

    session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          organisation_id: organisationId,
          plan_id: planId,
          billing_interval: billingInterval,
        },
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        organisation_id: organisationId,
        plan_id: planId,
        billing_interval: billingInterval,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
    });

    // Update onboarding state with checkout session ID
    const onboardingQuery = await db.collection('onboarding_state')
      .where('organisation_id', '==', organisationId)
      .limit(1)
      .get();

    if (!onboardingQuery.empty) {
      await onboardingQuery.docs[0].ref.update({
        stripe_checkout_session_id: session.id,
        selected_plan_id: planId,
        billing_interval: billingInterval,
      });
    }
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}

export const createCheckoutSession = onCall<CheckoutRequest>({ region: 'europe-west2', secrets: ['STRIPE_SECRET_KEY'] }, async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  return createCheckoutLogic(request.data, request.auth.uid);
});

// HTTP version for flexibility
export const createCheckoutSessionHttp = onRequest({ cors: true, region: 'europe-west2', secrets: ['STRIPE_SECRET_KEY'] }, async (req, res) => {
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
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    const result = await createCheckoutLogic(req.body, decodedToken.uid);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
