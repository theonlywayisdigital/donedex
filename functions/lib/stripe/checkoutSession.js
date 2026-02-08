"use strict";
/**
 * Create Checkout Session Cloud Function
 * Creates a Stripe Checkout session for subscription payments
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckoutSessionHttp = exports.createCheckoutSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
// Lazy initialization for Stripe
let stripeClient = null;
function getStripe() {
    if (!stripeClient) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }
        stripeClient = new stripe_1.default(secretKey, { apiVersion: '2023-10-16' });
    }
    return stripeClient;
}
const getStorageAddonPriceId = () => process.env.STRIPE_STORAGE_ADDON_PRICE_ID;
async function createCheckoutLogic(data, callerUid) {
    const { organisationId, planId, billingInterval = 'monthly', userCount, addOnType, quantityBlocks, successUrl = 'https://app.donedex.com/onboarding/payment-success', cancelUrl = 'https://app.donedex.com/onboarding/payment-canceled', } = data;
    if (!organisationId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing organisationId');
    }
    const db = admin.firestore();
    // Get organisation details
    const orgDoc = await db.collection('organisations').doc(organisationId).get();
    if (!orgDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Organisation not found');
    }
    const org = orgDoc.data();
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
    let session;
    // Storage add-on checkout
    if (addOnType === 'storage') {
        const storageAddonPriceId = getStorageAddonPriceId();
        if (!storageAddonPriceId) {
            throw new https_1.HttpsError('failed-precondition', 'Storage add-on price not configured');
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
            throw new https_1.HttpsError('invalid-argument', 'Missing planId');
        }
        // Get plan details
        const planDoc = await db.collection('subscription_plans').doc(planId).get();
        if (!planDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Plan not found');
        }
        const plan = planDoc.data();
        // Build line items
        const lineItems = [];
        // Base plan price
        const basePriceId = billingInterval === 'annual'
            ? plan.stripe_price_id_annual
            : plan.stripe_price_id_monthly;
        if (!basePriceId) {
            throw new https_1.HttpsError('failed-precondition', `No Stripe price configured for ${billingInterval} billing`);
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
exports.createCheckoutSession = (0, https_1.onCall)({ region: 'europe-west2', secrets: ['STRIPE_SECRET_KEY'] }, async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    return createCheckoutLogic(request.data, request.auth.uid);
});
// HTTP version for flexibility
exports.createCheckoutSessionHttp = (0, https_1.onRequest)({ cors: true, region: 'europe-west2', secrets: ['STRIPE_SECRET_KEY'] }, async (req, res) => {
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
        const result = await createCheckoutLogic(req.body, decodedToken.uid);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=checkoutSession.js.map